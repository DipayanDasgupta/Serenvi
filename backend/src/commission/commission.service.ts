import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// MLM Commission Structure - 15 levels with 55% total payout
const COMMISSION_STRUCTURE: Record<number, number> = {
  1: 25.0,
  2: 7.0,
  3: 4.5,
  4: 2.5,
  5: 2.0,
  6: 2.0,
  7: 1.8,
  8: 1.6,
  9: 1.4,
  10: 1.2,
  11: 1.0,
  12: 1.0,
  13: 1.0,
  14: 1.0,
  15: 1.0,
};

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
  ): Promise<void> {
    try {
      this.logger.log(`[COMMISSION] Starting distribution for sale ${saleId}, seller ${sellerId}, amount ₹${saleAmount}`);
      
      // Get upline chain (up to 15 levels)
      const uplineChain = await this.getUplineChain(sellerId, 15);
      this.logger.log(`[COMMISSION] Upline chain found: ${JSON.stringify(uplineChain)}`);

      // Distribute commission to each level
      for (let level = 1; level <= 15; level++) {
        const uplineId = uplineChain[level];
        const commissionRate = COMMISSION_STRUCTURE[level];
        const commissionAmount = saleAmount
          .mul(new Decimal(commissionRate))
          .div(100);

        if (uplineId) {
          this.logger.log(`[COMMISSION] Level ${level}: Distributing ₹${commissionAmount} to ${uplineId}`);
          
          // Credit commission to upline wallet
          await this.prisma.distributor.update({
            where: { id: uplineId },
            data: {
              walletBalance: {
                increment: commissionAmount,
              },
            },
          });

          // Record commission
          await this.prisma.commission.create({
            data: {
              distributorId: uplineId,
              saleId,
              level,
              commissionAmount,
              commissionRate: new Decimal(commissionRate),
            },
          });

          // Log transaction
          await this.prisma.walletTransaction.create({
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
        `[COMMISSION] ✓ Distribution COMPLETED for sale ${saleId}. Total distributed: ₹${saleAmount
          .mul(55)
          .div(100)}`,
      );
    } catch (error) {
      this.logger.error(`Failed to distribute commission for sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Get upline chain for a distributor
   * Returns map of level -> distributorId
   */
  private async getUplineChain(
    distributorId: string,
    maxDepth: number,
  ): Promise<Record<number, string>> {
    const chain: Record<number, string> = {};

    const ancestors = await this.prisma.mLMTreeNode.findMany({
      where: {
        descendantId: distributorId,
        depth: { lte: maxDepth },
      },
      orderBy: { depth: 'asc' },
      select: { ancestorId: true, depth: true },
    });

    ancestors.forEach((node: any) => {
      chain[node.depth] = node.ancestorId;
    });

    return chain;
  }

  /**
   * Get commission summary for a distributor
   */
  async getCommissionSummary(distributorId: string) {
    const commissions = await this.prisma.commission.findMany({
      where: { distributorId },
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
   * Get commission structure info
   */
  getCommissionStructure() {
    return COMMISSION_STRUCTURE;
  }

  /**
   * Validate commission calculations
   */
  validateCommissionCalculations(saleAmount: Decimal): Decimal {
    let totalDistributed = new Decimal(0);

    for (let level = 1; level <= 15; level++) {
      const rate = COMMISSION_STRUCTURE[level];
      totalDistributed = totalDistributed.plus(new Decimal(rate));
    }

    if (!totalDistributed.equals(55)) {
      throw new BadRequestException(
        `Invalid commission structure: total is ${totalDistributed}% instead of 55%`,
      );
    }

    const totalToDistribute = saleAmount.mul(55).div(100);
    return totalToDistribute;
  }
}
