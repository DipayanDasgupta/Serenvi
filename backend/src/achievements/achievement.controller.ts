import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AchievementService } from './achievement.service';

interface AuthenticatedRequest extends Request {
  user?: { distributorId: string };
}

@Controller('achievements')
@UseGuards(AuthGuard('jwt'))
export class AchievementController {
  constructor(private achievementService: AchievementService) {}

  /**
   * Get achievement progress for current user
   */
  @Get('progress')
  async getProgressForCurrentUser(@Request() req: AuthenticatedRequest) {
    const distributorId = req.user?.distributorId || '';
    return this.achievementService.getAchievementProgress(distributorId);
  }

  /**
   * Get achievement progress for a specific distributor
   */
  @Get('progress/:distributorId')
  async getProgress(@Param('distributorId') distributorId: string) {
    return this.achievementService.getAchievementProgress(distributorId);
  }

  /**
   * Get all achievement milestones
   */
  @Get('milestones')
  getMilestones() {
    return this.achievementService.getAchievementMilestones();
  }

  /**
   * Get next unclaimed milestone for current user
   */
  @Get('next-milestone')
  async getNextMilestoneForCurrentUser(@Request() req: AuthenticatedRequest) {
    const distributorId = req.user?.distributorId || '';
    return this.achievementService.getNextMilestone(distributorId);
  }

  /**
   * Get next unclaimed milestone for a specific distributor
   */
  @Get('next-milestone/:distributorId')
  async getNextMilestone(@Param('distributorId') distributorId: string) {
    return this.achievementService.getNextMilestone(distributorId);
  }

  /**
   * Claim an achievement reward
   */
  @Post('claim/:rankName')
  async claimAchievement(
    @Param('rankName') rankName: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const distributorId = req.user?.distributorId || '';
    return this.achievementService.claimAchievementReward(distributorId, rankName);
  }
}
