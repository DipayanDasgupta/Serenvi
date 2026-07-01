import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Reset monthly sales for all distributors on the 1st of every month at midnight
   * Cron: 0 0 1 * * = At 00:00:00 on day-of-month 1
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetMonthlySales() {
    try {
      this.logger.log('Starting monthly sales reset...');

      const result = await this.prisma.distributor.updateMany({
        data: {
          monthlySales: new Decimal(0),
          monthlyResetDate: new Date(),
        },
      });

      this.logger.log(
        `✓ Monthly sales reset complete. Updated ${result.count} distributors.`,
      );
    } catch (error) {
      this.logger.error('Failed to reset monthly sales:', error);
    }
  }
}
