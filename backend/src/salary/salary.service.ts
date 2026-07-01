import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';

// Leadership Salary Tiers - Applied directly to total revenue of referred users
// Each tier gets a % of TOTAL REFERRED REVENUE (not % of an intermediate pool)
// All tier percentages sum to 15% of total referred user revenue
const SALARY_TIERS = [
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

const TOTAL_POOL_PERCENTAGE = 15; // Sum of all tier percentages = 15% of total referred revenue

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
          // DO NOT reset currentLeadershipSalary - it will be reset after being credited at end of month
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
    try {
      // Get current month/year
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const year = now.getFullYear();

      // Calculate current month date range (from 1st to today)
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      // Get revenue from referred users for CURRENT month
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

      // Get all referred users who are ACTIVE
      const referredUsers = await this.prisma.distributor.findMany({
        where: {
          sponsorId: { not: null },
          status: 'ACTIVE',
        },
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
  async creditEndOfMonthSalary(): Promise<void> {
    try {
      // Check if today is the last day of the month
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // If tomorrow is the 1st, today is the last day of month
      const isLastDayOfMonth = tomorrow.getDate() === 1;

      if (!isLastDayOfMonth) {
        return; // Not the last day, skip
      }

      this.logger.log('🎉 Crediting end-of-month leadership salaries...');

      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get all users with pending salary
      const usersWithSalary = await this.prisma.distributor.findMany({
        where: {
          currentLeadershipSalary: { gt: new Decimal(0) },
          status: 'ACTIVE',
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

      for (const user of usersWithSalary) {
        const salary = user.currentLeadershipSalary as Decimal;

        // Credit to wallet
        await this.prisma.distributor.update({
          where: { id: user.id },
          data: {
            walletBalance: {
              increment: salary,
            },
          },
        });

        // Log wallet transaction
        await this.prisma.walletTransaction.create({
          data: {
            distributorId: user.id,
            type: 'LEADERSHIP_SALARY',
            amount: salary,
            description: `Leadership salary - Tier ≥₹${SALARY_TIERS[user.currentLeadershipRank || 0]?.monthlysSalesThreshold || 'N/A'} (${currentMonth}/${currentYear})`,
          },
        });

        // Record in leadershipSalary table
        await this.prisma.leadershipSalary.create({
          data: {
            distributorId: user.id,
            rank: `Tier_${SALARY_TIERS[user.currentLeadershipRank || 0]?.monthlysSalesThreshold || 'N/A'}`,
            salaryAmount: salary,
            poolPercentage: new Decimal(SALARY_TIERS[user.currentLeadershipRank || 0]?.poolPercentage || 0),
            month: currentMonth,
            year: currentYear,
          },
        });

        totalCredited = totalCredited.plus(salary);

        this.logger.debug(
          `✅ Credited ₹${salary} to ${user.name}`,
        );
      }

      // Now reset all pending salaries to 0
      const resetResult = await this.prisma.distributor.updateMany({
        where: { currentLeadershipSalary: { gt: new Decimal(0) } },
        data: {
          currentLeadershipSalary: new Decimal(0),
          // Keep currentLeadershipRank - it will be updated next month's calculation
        },
      });

      this.logger.log(
        `✅ End-of-month salary credit complete!\n` +
        `   ├─ Users credited: ${usersWithSalary.length}\n` +
        `   ├─ Total credited: ₹${totalCredited}\n` +
        `   └─ Salaries reset: ${resetResult.count}`,
      );
    } catch (error) {
      this.logger.error('Failed to credit end-of-month salary:', error);
      throw error;
    }
  }
}
