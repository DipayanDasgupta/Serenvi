import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Monthly metric resets live in SalaryService (@Cron '0 0 1 * *'), which is
 * the single owner of the monthly cycle. This class previously registered a
 * SECOND cron doing the same job — a duplicate monthly reset (rule 11: "do not
 * duplicate monthly reset cron jobs"). It is retained as a plain provider only
 * so the module import keeps working; the scheduling was removed.
 */
@Injectable()
export class SchedulerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Manual/recovery reset, callable by an operator if a month was missed.
   * Idempotent: sets the counters to zero, so running it twice is harmless.
   * Never touches level1Sales (achievement basis) or teamSales (lifetime).
   */
  async resetMonthlySales() {
    const { Decimal } = await import('@prisma/client/runtime/library');
    return this.prisma.distributor.updateMany({
      data: {
        monthlySales: new Decimal(0),
        teamMonthlySales: new Decimal(0),
        monthlyResetDate: new Date(),
      },
    });
  }
}
