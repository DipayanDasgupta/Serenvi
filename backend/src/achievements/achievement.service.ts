import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Achievement Milestones - 9 ranks based on PERSONAL SALES only (not referred/team sales)
// Each rank requires a personal sales target and gives a fixed reward
const ACHIEVEMENT_MILESTONES = [
  { rank: 'Influencer', salesTarget: 50000, reward: 5000 },
  { rank: 'Master', salesTarget: 100000, reward: 5000 },
  { rank: 'Legend', salesTarget: 250000, reward: 15000 },
  { rank: 'Icon', salesTarget: 500000, reward: 25000 },
  { rank: 'Titan', salesTarget: 1000000, reward: 50000 },
  { rank: 'Global Leader', salesTarget: 2500000, reward: 150000 },
  { rank: 'World Leader', salesTarget: 5000000, reward: 250000 },
  { rank: 'Empire Leader', salesTarget: 10000000, reward: 500000 },
  { rank: 'Global Icon', salesTarget: 50000000, reward: 6500000 },
];

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check and detect achievements for a distributor (unlock, not claim)
   * Based on PERSONAL SALES (level1Sales) only - NOT referred/team sales
   * Achievements are unlocked when personal sales reach or exceed the milestone target
   * User manually claims rewards
   *
   * Delegates to syncAchievements (upsert-based, race-safe).
   */
  async checkAndClaimAchievements(distributorId: string): Promise<void> {
    return this.syncAchievements(distributorId);
  }

  /**
   * Reconcile unlocked achievements with current level1Sales:
   * - unlock any milestone whose target is reached (upsert, no duplicates),
   * - remove any UNCLAIMED achievement whose target is no longer reached
   *   (happens after a refund reverses personal sales). Claimed rewards are
   *   never removed.
   */
  async syncAchievements(distributorId: string): Promise<void> {
    try {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: distributorId },
      });

      if (!distributor) {
        throw new Error(`Distributor not found: ${distributorId}`);
      }

      const personalSales = distributor.level1Sales as Decimal;

      for (const milestone of ACHIEVEMENT_MILESTONES) {
        const target = new Decimal(milestone.salesTarget);
        const reached = personalSales.gte(target);

        if (reached) {
          // upsert: concurrent sale processing can't create duplicates.
          const created = await this.prisma.achievement.upsert({
            where: {
              distributorId_rankName: {
                distributorId,
                rankName: milestone.rank,
              },
            },
            update: {}, // Never touch claimedAt here.
            create: {
              distributorId,
              rankName: milestone.rank,
              salesTarget: target,
              rewardAmount: new Decimal(milestone.reward),
              claimedAt: null, // User will claim manually
            },
          });
          if (!created.claimedAt && created.createdAt.getTime() >= distributor.createdAt.getTime()) {
            this.logger.log(
              `✅ Achievement unlocked for ${distributor.name}: ${milestone.rank} ` +
              `(Personal Sales: ₹${personalSales} / Target: ₹${target})`,
            );
          }
        } else {
          // Target no longer reached (refund reversal) — drop it only if
          // the user never claimed it.
          const removed = await this.prisma.achievement.deleteMany({
            where: { distributorId, rankName: milestone.rank, claimedAt: null },
          });
          if (removed.count > 0) {
            this.logger.log(
              `↩️ Achievement ${milestone.rank} unclaimed progress reverted for ${distributor.name} (personal sales ₹${personalSales} < ₹${target})`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check achievements for distributor ${distributorId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get achievement progress for a distributor based on PERSONAL SALES only
   */
  async getAchievementProgress(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new Error('Distributor not found');
    }

    const achievements = await this.prisma.achievement.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'asc' },
    });

    const claimedRanks = new Set(achievements.map((a: any) => a.rankName));

    const progress = ACHIEVEMENT_MILESTONES.map((milestone) => {
      const claimed = claimedRanks.has(milestone.rank);
      // Calculate progress based on PERSONAL SALES (level1Sales) only
      const progressPercent = distributor.level1Sales
        .div(new Decimal(milestone.salesTarget))
        .mul(100);

      return {
        rank: milestone.rank,
        salesTarget: milestone.salesTarget,
        rewardAmount: milestone.reward,
        personalSalesMade: distributor.level1Sales.toNumber(),
        claimed,
        progressPercent: Math.min(Math.round(parseInt(progressPercent.toString())), 100),
      };
    });

    return {
      currentRank: distributor.rank,
      personalSales: distributor.level1Sales.toNumber(), // Only personal sales - NOT referred revenue
      achievements,
      progress,
    };
  }

  /**
   * Get all achievement milestones info
   */
  getAchievementMilestones() {
    return ACHIEVEMENT_MILESTONES;
  }

  /**
   * Get next unclaimed milestone
   */
  async getNextMilestone(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new Error('Distributor not found');
    }

    const achievements = await this.prisma.achievement.findMany({
      where: { distributorId },
    });

    const claimedRanks = new Set(achievements.map((a: any) => a.rankName));

    const nextMilestone = ACHIEVEMENT_MILESTONES.find(
      (m) => !claimedRanks.has(m.rank),
    );

    if (!nextMilestone) {
      return {
        nextMilestone: null,
        message: 'All milestones achieved!',
      };
    }

    const remaining = new Decimal(nextMilestone.salesTarget).minus(
      distributor.level1Sales,
    );

    return {
      nextMilestone,
      currentLevel1Sales: distributor.level1Sales.toNumber(),
      remaining: remaining.toNumber(),
      progress: distributor.level1Sales
        .div(new Decimal(nextMilestone.salesTarget))
        .mul(100)
        .toNumber(),
    };
  }

  /**
   * Claim an achievement reward by rank name
   * Checks if achievement is unlocked (sales met) and not yet claimed
   */
  // Rank ladder — claims may only move a distributor UP, never backward.
  private static readonly RANK_ORDER = [
    'Rookie',
    'Influencer',
    'Master',
    'Legend',
    'Icon',
    'Titan',
    'Global Leader',
    'World Leader',
    'Empire Leader',
    'Global Icon',
  ];

  async claimAchievementReward(
    distributorId: string,
    rankName: string,
  ): Promise<any> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const distributor = await tx.distributor.findUnique({
          where: { id: distributorId },
        });

        if (!distributor) {
          throw new Error('Distributor not found');
        }

        // Find the milestone
        const milestone = ACHIEVEMENT_MILESTONES.find((m) => m.rank === rankName);
        if (!milestone) {
          throw new Error(`Achievement rank not found: ${rankName}`);
        }

        // Re-confirm the sales target on fresh data (a refund may have
        // dropped volume after the achievement row was created).
        if ((distributor.level1Sales as Decimal).lt(new Decimal(milestone.salesTarget))) {
          throw new Error(
            `Sales target not met for ${rankName}. Need ₹${milestone.salesTarget}, you have ₹${distributor.level1Sales}`,
          );
        }

        // Atomic claim: exactly one concurrent caller flips claimedAt from
        // null. Everyone else sees count 0 and gets "already claimed".
        const claimed = await tx.achievement.updateMany({
          where: { distributorId, rankName, claimedAt: null },
          data: { claimedAt: new Date() },
        });

        if (claimed.count === 0) {
          const exists = await tx.achievement.findUnique({
            where: { distributorId_rankName: { distributorId, rankName } },
            select: { id: true },
          });
          throw new Error(
            exists
              ? `Achievement already claimed: ${rankName}`
              : `Achievement not found: ${rankName}`,
          );
        }

        const achievement = await tx.achievement.findUnique({
          where: { distributorId_rankName: { distributorId, rankName } },
        });

        // Rank never moves backward: keep the higher of current vs claimed.
        const currentIdx = AchievementService.RANK_ORDER.indexOf(distributor.rank);
        const claimedIdx = AchievementService.RANK_ORDER.indexOf(rankName);
        const newRank =
          claimedIdx > currentIdx ? rankName : distributor.rank;

        // Award the reward
        const rewardDecimal = new Decimal(milestone.reward);
        const updated = await tx.distributor.update({
          where: { id: distributorId },
          data: {
            walletBalance: { increment: rewardDecimal },
            rank: newRank,
          },
        });

        // Log transaction
        await tx.walletTransaction.create({
          data: {
            distributorId,
            type: 'ACHIEVEMENT_REWARD',
            amount: rewardDecimal,
            description: `Achievement reward: ${rankName}`,
            referenceId: achievement!.id,
          },
        });

        this.logger.log(
          `${distributor.name} claimed ${rankName} achievement and earned ₹${milestone.reward}`,
        );

        return {
          success: true,
          message: `Successfully claimed ${rankName} achievement!`,
          reward: milestone.reward,
          newRank,
          newWalletBalance: (updated.walletBalance as Decimal).toNumber(),
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to claim achievement for distributor ${distributorId}:`,
        error,
      );
      throw error;
    }
  }
}
