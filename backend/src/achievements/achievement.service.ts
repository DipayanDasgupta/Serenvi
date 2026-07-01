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
   */
  async checkAndClaimAchievements(distributorId: string): Promise<void> {
    try {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: distributorId },
      });

      if (!distributor) {
        throw new Error(`Distributor not found: ${distributorId}`);
      }

      // Check each milestone based on PERSONAL SALES (level1Sales) only
      for (const milestone of ACHIEVEMENT_MILESTONES) {
        // Only count personal sales, not referred revenue
        // Check if distributor's personal sales meets this milestone
        if (distributor.level1Sales.gte(new Decimal(milestone.salesTarget))) {
          // Check if already unlocked
          const alreadyUnlocked = await this.prisma.achievement.findUnique({
            where: {
              distributorId_rankName: {
                distributorId,
                rankName: milestone.rank,
              },
            },
          });

          if (!alreadyUnlocked) {
            // Create achievement record but DON'T claim yet (claimedAt = null)
            await this.prisma.achievement.create({
              data: {
                distributorId,
                rankName: milestone.rank,
                salesTarget: new Decimal(milestone.salesTarget),
                rewardAmount: new Decimal(milestone.reward),
                claimedAt: null, // User will claim manually
              },
            });

            this.logger.log(
              `✅ Achievement unlocked for ${distributor.name}: ${milestone.rank} ` +
              `(Personal Sales: ₹${distributor.level1Sales} / Target: ₹${milestone.salesTarget})`,
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
  async claimAchievementReward(
    distributorId: string,
    rankName: string,
  ): Promise<any> {
    try {
      const distributor = await this.prisma.distributor.findUnique({
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

      // Check if sales threshold is met
      if (distributor.level1Sales.lt(new Decimal(milestone.salesTarget))) {
        throw new Error(
          `Sales target not met for ${rankName}. Need ₹${milestone.salesTarget}, you have ₹${distributor.level1Sales}`,
        );
      }

      // Get the achievement record
      const achievement = await this.prisma.achievement.findUnique({
        where: {
          distributorId_rankName: {
            distributorId,
            rankName,
          },
        },
      });

      if (!achievement) {
        throw new Error(`Achievement not found: ${rankName}`);
      }

      if (achievement.claimedAt) {
        throw new Error(`Achievement already claimed: ${rankName}`);
      }

      // Award the reward
      const rewardDecimal = new Decimal(milestone.reward);

      await this.prisma.distributor.update({
        where: { id: distributorId },
        data: {
          walletBalance: {
            increment: rewardDecimal,
          },
          rank: rankName, // Update rank
        },
      });

      // Mark as claimed
      await this.prisma.achievement.update({
        where: {
          distributorId_rankName: {
            distributorId,
            rankName,
          },
        },
        data: {
          claimedAt: new Date(),
        },
      });

      // Log transaction
      await this.prisma.walletTransaction.create({
        data: {
          distributorId,
          type: 'ACHIEVEMENT_REWARD',
          amount: rewardDecimal,
          description: `Achievement reward: ${rankName}`,
          referenceId: distributorId,
        },
      });

      this.logger.log(
        `${distributor.name} claimed ${rankName} achievement and earned ₹${milestone.reward}`,
      );

      return {
        success: true,
        message: `Successfully claimed ${rankName} achievement!`,
        reward: milestone.reward,
        newRank: rankName,
        newWalletBalance: distributor.walletBalance.add(rewardDecimal).toNumber(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to claim achievement for distributor ${distributorId}:`,
        error,
      );
      throw error;
    }
  }
}
