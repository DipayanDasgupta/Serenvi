import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import {
  COMMISSION_RATES,
  COMMISSION_TOTAL_PERCENT,
  MAX_COMMISSION_DEPTH,
  buildUplineChain,
  chainToUplineIds,
  commissionForLevel,
} from '../mlm/mlm-rules';

// The single source of truth for the rate table lives in mlm-rules.ts and is
// covered by unit tests (which assert the total is 54%, not 55%).
const COMMISSION_STRUCTURE: Record<number, number> = COMMISSION_RATES as Record<number, number>;

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate and distribute commission to 15-level upline
   * Called when a sale is made
   */
  async distributeCommission(
    saleId: string,
    sellerId: string,
    saleAmount: Decimal,
    // Optional interactive-transaction client: when provided, all commission
    // writes join the caller's transaction (all-or-nothing with the sale).
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    try {
      this.logger.log(`[COMMISSION] Starting distribution for sale ${saleId}, seller ${sellerId}, amount ₹${saleAmount}`);

      // Idempotency: a sale distributes commissions exactly once. If any
      // rows already exist for this sale (retry / double-processing), skip.
      const alreadyPaid = await db.commission.findFirst({
        where: { saleId },
        select: { id: true },
      });
      if (alreadyPaid) {
        this.logger.warn(`[COMMISSION] Sale ${saleId} already distributed — skipping (idempotent)`);
        return;
      }

      // Get upline chain (up to 15 levels)
      const uplineChain = await this.getUplineChain(sellerId, MAX_COMMISSION_DEPTH);
      this.logger.log(`[COMMISSION] Upline chain found: ${JSON.stringify(uplineChain)}`);

      // Distribute commission to each level
      for (let level = 1; level <= MAX_COMMISSION_DEPTH; level++) {
        const uplineId = uplineChain.get(level);
        const commissionRate = COMMISSION_STRUCTURE[level];
        const commissionAmount = commissionForLevel(saleAmount, level);

        if (uplineId) {
          this.logger.log(`[COMMISSION] Level ${level}: Distributing ₹${commissionAmount} to ${uplineId}`);
          
          // Credit commission to upline wallet
          await db.distributor.update({
            where: { id: uplineId },
            data: {
              walletBalance: {
                increment: commissionAmount,
              },
            },
          });

          // Record commission
          await db.commission.create({
            data: {
              distributorId: uplineId,
              saleId,
              level,
              commissionAmount,
              commissionRate: new Decimal(commissionRate),
            },
          });

          // Log transaction
          await db.walletTransaction.create({
            data: {
              distributorId: uplineId,
              type: 'MLM_COMMISSION',
              amount: commissionAmount,
              description: `Level ${level} MLM commission from sale`,
              referenceId: saleId,
            },
          });

          this.logger.log(
            `[COMMISSION] ✓ Commission Level ${level}: ${uplineId} earned ₹${commissionAmount} from sale ${saleId}`,
          );
        } else {
          this.logger.log(`[COMMISSION] Level ${level}: No upline, commission (₹${commissionAmount}) retained`);
        }
      }

      this.logger.log(
        `[COMMISSION] ✓ Distribution COMPLETED for sale ${saleId}. ` +
          `Ceiling at ${COMMISSION_TOTAL_PERCENT}%: ₹${saleAmount
            .mul(COMMISSION_TOTAL_PERCENT)
            .div(100)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to distribute commission for sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Upline distributor IDs ordered L1 (direct sponsor) outward, max 15.
   */
  async getUplineIds(distributorId: string, maxDepth = MAX_COMMISSION_DEPTH): Promise<string[]> {
    const chain = await this.getUplineChain(distributorId, maxDepth);
    return chainToUplineIds(chain);
  }

  /**
   * Get upline chain for a distributor
   * Returns map of level -> distributorId
   */
  private async getUplineChain(
    distributorId: string,
    maxDepth: number,
  ): Promise<Map<number, string>> {
    const ancestors = await this.prisma.mLMTreeNode.findMany({
      where: {
        descendantId: distributorId,
        depth: { lte: maxDepth },
      },
      orderBy: { depth: 'asc' },
      select: { ancestorId: true, descendantId: true, depth: true },
    });

    return buildUplineChain(
      ancestors as unknown as Array<{ ancestorId: string; descendantId: string; depth: number }>,
      maxDepth,
    );
  }

  /**
   * Get commission summary for a distributor
   */
  async getCommissionSummary(distributorId: string) {
    const commissions = await this.prisma.commission.findMany({
      where: { distributorId, reversedAt: null },
      select: {
        level: true,
        commissionAmount: true,
        createdAt: true,
        sale: {
          select: {
            id: true,
            saleAmount: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCommission = commissions.reduce(
      (sum: any, c: any) => sum.plus(c.commissionAmount),
      new Decimal(0),
    );

    const byLevel = Object.entries(
      commissions.reduce(
        (acc: any, c: any) => ({
          ...acc,
          [c.level]: (acc[c.level] || new Decimal(0)).plus(c.commissionAmount),
        }),
        {} as Record<number, Decimal>,
      ),
    ).map(([level, amount]) => ({ level: Number(level), amount }));

    return { totalCommission, byLevel, commissions };
  }

  /**
   * Get commission structure info, including the audited total.
   */
  getCommissionStructure() {
    return {
      rates: COMMISSION_STRUCTURE,
      totalPercentage: COMMISSION_TOTAL_PERCENT,
      maxDepth: MAX_COMMISSION_DEPTH,
    };
  }

  /**
   * Validate commission calculations and return the maximum distributable
   * amount across all 15 levels.
   */
  validateCommissionCalculations(saleAmount: Decimal): Decimal {
    let totalDistributed = new Decimal(0);

    for (let level = 1; level <= MAX_COMMISSION_DEPTH; level++) {
      const rate = COMMISSION_STRUCTURE[level];
      totalDistributed = totalDistributed.plus(new Decimal(rate));
    }

    if (!totalDistributed.equals(COMMISSION_TOTAL_PERCENT)) {
      throw new BadRequestException(
        `Invalid commission structure: total is ${totalDistributed}% instead of ${COMMISSION_TOTAL_PERCENT}%`,
      );
    }

    return saleAmount.mul(COMMISSION_TOTAL_PERCENT).div(100);
  }
}
