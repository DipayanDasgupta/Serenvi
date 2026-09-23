import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';

// Leadership Salary Tiers - Applied directly to total revenue of referred users
// Each tier gets a % of TOTAL REFERRED REVENUE (not % of an intermediate pool)
// The percentages below sum to 16% (the previously hardcoded "15%" claim was
// never enforced and misreported the pool).
export const SALARY_TIERS = [
  // Higher thresholds must come first for proper tier matching
  // Each percentage is applied DIRECTLY to total referred revenue
  { monthlysSalesThreshold: 5000000, poolPercentage: 0.8 },   // 0.8% of total
  { monthlysSalesThreshold: 1000000, poolPercentage: 1.5 },   // 1.5% of total
  { monthlysSalesThreshold: 500000, poolPercentage: 1.6 },    // 1.6% of total
  { monthlysSalesThreshold: 250000, poolPercentage: 1.6 },    // 1.6% of total
  { monthlysSalesThreshold: 100000, poolPercentage: 1.5 },    // 1.5% of total
  { monthlysSalesThreshold: 50000, poolPercentage: 1.3 },     // 1.3% of total
  { monthlysSalesThreshold: 25000, poolPercentage: 1.1 },     // 1.1% of total
  { monthlysSalesThreshold: 10000, poolPercentage: 2.9 },     // 2.9% of total
  { monthlysSalesThreshold: 5000, poolPercentage: 3.7 },      // 3.7% of total
];

// The tier table above sums to 16.0% (see spec test). The previously
// hardcoded 15% was never enforced and misreported the pool. Derived from the
// table itself so documentation can never drift from the real rates.
const TOTAL_POOL_PERCENTAGE = SALARY_TIERS.reduce(
  (sum, tier) => sum + tier.poolPercentage,
  0,
);

@Injectable()
export class SalaryService {
  private readonly logger = new Logger(SalaryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Reset monthly sales on the 1st of each month at 00:00
   * Leadership salary remains pending until 23:59 on last day of month
   */
  @Cron('0 0 1 * *')
  async resetMonthlyMetrics(): Promise<void> {
    try {
      this.logger.log('Resetting monthly sales for all users...');

      const result = await this.prisma.distributor.updateMany({
        where: { status: 'ACTIVE' },
        data: {
          monthlySales: new Decimal(0),
          // Personal sales (level1Sales) and lifetime team sales NEVER reset.
          // teamMonthlySales resets with the month; teamSales does not.
          teamMonthlySales: new Decimal(0),
          // DO NOT reset currentLeadershipSalary - it is reset after being credited at end of month
        },
      });

      this.logger.log(`✅ Reset monthly sales for ${result.count} users`);
    } catch (error) {
      this.logger.error('Failed to reset monthly metrics:', error);
      throw error;
    }
  }

  /**
   * Find the highest tier a user qualifies for
   * Returns tier index (0=10k, 1=25k, etc) or -1 if not qualified for any tier
   */
  private findHighestTier(monthlySales: Decimal): number {
    for (let i = 0; i < SALARY_TIERS.length; i++) {
      if (monthlySales.gte(new Decimal(SALARY_TIERS[i].monthlysSalesThreshold))) {
        return i;
      }
    }
    return -1; // Not qualified
  }

  /**
   * Calculate leadership salary for the current month
   * Salary is calculated but NOT credited to wallet
   * It will be credited at 23:59 on the last day of the month
   * Runs daily to update salary based on current month's sales
   */
  @Cron('0 * * * *') // Run every hour
  async calculateLeadershipSalary(): Promise<void> {
    return this.runSalaryCalculation();
  }

  /**
   * Public entry point so the sale flow can refresh eligibility immediately
   * after a completed sale (rule 3.12) instead of waiting for the hourly cron.
   */
  async recalculateAfterSale(): Promise<void> {
    return this.runSalaryCalculation();
  }

  private async runSalaryCalculation(): Promise<void> {
    try {
      // Get current month/year
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const year = now.getFullYear();

      // Calculate current month date range (from 1st to today)
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      // Get revenue from referred users for CURRENT month.
      // Only sales that are still COMPLETED count — refunds are excluded
      // (orderStatus filter) so salary never pays out on reversed volume.
      const referredUserRevenue = await this.prisma.sale.aggregate({
        _sum: { saleAmount: true },
        where: {
          seller: {
            sponsorId: { not: null }, // Only users who were referred
          },
          createdAt: { gte: monthStart, lte: monthEnd },
          orderStatus: 'COMPLETED',
        },
      });

      const totalReferredRevenue = referredUserRevenue._sum.saleAmount || new Decimal(0);

      // Get all ACTIVE distributors, not just those with a sponsor: a
      // distributor with no direct recruit can still have team sales and
      // therefore still qualify for a tier.
      const referredUsers = await this.prisma.distributor.findMany({
        where: { status: 'ACTIVE' },
      });

      // Group users by their highest qualifying tier
      const usersByTier: Record<number, Array<{ id: string; name: string; monthlySales: Decimal }>> = {};

      for (const user of referredUsers) {
        const tierIndex = this.findHighestTier(user.monthlySales as Decimal);
        if (tierIndex >= 0) {
          if (!usersByTier[tierIndex]) {
            usersByTier[tierIndex] = [];
          }
          usersByTier[tierIndex].push({
            id: user.id,
            name: user.name,
            monthlySales: user.monthlySales as Decimal,
          });
        }
      }

      // Calculate salary for each user (but don't credit yet)
      for (const tierIndex of Object.keys(usersByTier).map(Number).sort((a, b) => a - b)) {
        const tier = SALARY_TIERS[tierIndex];
        const tierUsers = usersByTier[tierIndex];

        // Apply tier % directly to TOTAL referred revenue (not to an intermediate pool)
        // Example: If tier is 3.7% and total referred revenue is ₹100,000
        //          then tier pool = ₹100,000 × 3.7% = ₹3,700
        //          split among all users in this tier
        const tierPool = totalReferredRevenue
          .mul(new Decimal(tier.poolPercentage))
          .div(100);

        const salaryPerUser = tierPool.div(new Decimal(tierUsers.length));

        for (const user of tierUsers) {
          // Update only the currentLeadershipSalary field (don't credit to wallet yet)
          await this.prisma.distributor.update({
            where: { id: user.id },
            data: {
              currentLeadershipRank: tierIndex,
              currentLeadershipSalary: salaryPerUser,
            },
          });
        }
      }

      this.logger.debug(
        `📋 Salary calculated for ${month}/${year}. Total eligible: ${referredUsers.length}`,
      );
    } catch (error) {
      this.logger.error('Failed to calculate leadership salary:', error);
      // Don't throw - this runs hourly
    }
  }

  /**
   * Get salary summary for a distributor
   */
  async getSalarySummary(distributorId: string) {
    const salaries = await this.prisma.leadershipSalary.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
    });

    const totalSalary = salaries.reduce(
      (sum: any, s: any) => sum.plus(s.salaryAmount),
      new Decimal(0),
    );

    const byRank = Object.entries(
      salaries.reduce(
        (acc: any, s: any) => ({
          ...acc,
          [s.rank]: (acc[s.rank] || new Decimal(0)).plus(s.salaryAmount),
        }),
        {} as Record<string, Decimal>,
      ),
    ).map(([rank, amount]) => ({ rank, amount }));

    const byMonth = Object.entries(
      salaries.reduce(
        (acc: any, s: any) => {
          const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
          return {
            ...acc,
            [key]: (acc[key] || new Decimal(0)).plus(s.salaryAmount),
          };
        },
        {} as Record<string, Decimal>,
      ),
    ).map(([month, amount]) => ({ month, amount }));

    return {
      totalSalary,
      byRank,
      byMonth,
      salaries,
    };
  }

  /**
   * Get salary distribution info
   */
  getSalaryDistribution() {
    const totalPoolPercentage = SALARY_TIERS.reduce((sum, tier) => sum + tier.poolPercentage, 0);
    return {
      poolPercentage: TOTAL_POOL_PERCENTAGE,
      tiers: SALARY_TIERS.map((tier) => ({
        monthlysSalesThreshold: tier.monthlysSalesThreshold,
        poolPercentage: tier.poolPercentage,
      })),
      totalTierPercentages: totalPoolPercentage,
    };
  }

  /**
   * Get estimated salary for distributor
   */
  async getUpcomingSalary(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new Error('Distributor not found');
    }

    // Find which tier the distributor qualifies for
    const qualifyingTier = SALARY_TIERS.find(
      (tier) =>
        (distributor.monthlySales as Decimal).gte(
          new Decimal(tier.monthlysSalesThreshold),
        ),
    );

    const currentDate = new Date();
    const nextMonth = currentDate.getMonth() + 2; // Next month
    const nextYear =
      nextMonth > 12 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    const adjustedMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;

    return {
      distributorId,
      currentMonthlySales: (distributor.monthlySales as Decimal).toNumber(),
      qualifyingTier: qualifyingTier
        ? {
            threshold: qualifyingTier.monthlysSalesThreshold,
            poolPercentage: qualifyingTier.poolPercentage,
          }
        : null,
      estimatedMonth: `${adjustedMonth}/${nextYear}`,
      note: 'Salary is distributed monthly on the 1st, based on previous month monthly sales tier',
    };
  }

  /**
   * Credit pending leadership salary to wallet at 23:59 on last day of month
   * Then reset currentLeadershipSalary to 0
   * Runs daily at 23:59 - checks if it's the last day of month
   */
  @Cron('59 23 * * *') // Run daily at 23:59
  async creditEndOfMonthSalary(asOf?: Date): Promise<void> {
    try {
      // Check if today is the last day of the month (asOf is injectable for
      // tests and for an admin-triggered catch-up run).
      const now = asOf ?? new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // If tomorrow is the 1st, today is the last day of month
      const isLastDayOfMonth = tomorrow.getDate() === 1;

      if (!isLastDayOfMonth) {
        return; // Not the last day, skip
      }

      this.logger.log('🎉 Crediting end-of-month leadership salaries...');

      // Salary is EARNED in the month that just closed, so it is recorded
      // against that month — not the month of the credit run.
      const earnedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonth = earnedMonth.getMonth() + 1;
      const currentYear = earnedMonth.getFullYear();

      // Get all users with pending salary.
      // NOTE: deliberately NOT filtered on status — salary already earned in a
      // prior month must still be paid out if the account was suspended after
      // qualifying. Suspension affects future calculations, not earned money.
      const usersWithSalary = await this.prisma.distributor.findMany({
        where: {
          currentLeadershipSalary: { gt: new Decimal(0) },
        },
        select: {
          id: true,
          name: true,
          walletBalance: true,
          currentLeadershipSalary: true,
          currentLeadershipRank: true,
        },
      });

      this.logger.log(`Found ${usersWithSalary.length} users with pending salary`);

      let totalCredited = new Decimal(0);
      let usersCredited = 0;

      for (const user of usersWithSalary) {
        // One transaction per user: credit + ledger row + pay record + reset
        // commit atomically. Retries are idempotent via the unique
        // (distributorId, month, year) record: a P2002 means this month was
        // already paid, so we just ensure the pending field is cleared.
        try {
          const paid = await this.prisma.$transaction(async (tx) => {
            const fresh = await tx.distributor.findUnique({
              where: { id: user.id },
              select: { currentLeadershipSalary: true },
            });
            const salary = fresh?.currentLeadershipSalary as Decimal | null;
            if (!salary || salary.lte(new Decimal(0))) {
              return new Decimal(0); // Already cleared — nothing to do.
            }
            await tx.distributor.update({
              where: { id: user.id },
              data: {
                walletBalance: { increment: salary },
                currentLeadershipSalary: new Decimal(0),
              },
            });
            await tx.walletTransaction.create({
              data: {
                distributorId: user.id,
                type: 'LEADERSHIP_SALARY',
                amount: salary,
                description: `Leadership salary - Tier ≥₹${SALARY_TIERS[user.currentLeadershipRank || 0]?.monthlysSalesThreshold || 'N/A'} (${currentMonth}/${currentYear})`,
              },
            });
            await tx.leadershipSalary.create({
              data: {
                distributorId: user.id,
                rank: `Tier_${SALARY_TIERS[user.currentLeadershipRank || 0]?.monthlysSalesThreshold || 'N/A'}`,
                salaryAmount: salary,
                poolPercentage: new Decimal(SALARY_TIERS[user.currentLeadershipRank || 0]?.poolPercentage || 0),
                month: currentMonth,
                year: currentYear,
              },
            });
            return salary;
          });
          if (paid.gt(new Decimal(0))) {
            totalCredited = totalCredited.plus(paid);
            usersCredited += 1;
            this.logger.debug(`✅ Credited ₹${paid} to ${user.name}`);
          }
        } catch (error: any) {
          // Unique violation on (distributorId, month, year): a concurrent or
          // retried run already paid this month. Clear any leftover pending
          // amount and move on — never pay twice.
          if (error?.code === 'P2002') {
            await this.prisma.distributor.update({
              where: { id: user.id },
              data: { currentLeadershipSalary: new Decimal(0) },
            });
            this.logger.warn(`⏭️ Salary for ${user.name} already recorded for ${currentMonth}/${currentYear} — skipped duplicate`);
            continue;
          }
          throw error;
        }
      }

      this.logger.log(
        `✅ End-of-month salary credit complete!\n` +
        `   ├─ Users credited: ${usersCredited}\n` +
        `   └─ Total credited: ₹${totalCredited}`,
      );
    } catch (error) {
      this.logger.error('Failed to credit end-of-month salary:', error);
      throw error;
    }
  }
}
