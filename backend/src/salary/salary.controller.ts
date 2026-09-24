import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalaryService } from './salary.service';
import { AdminGuard } from '../common/admin.guard';

@Controller('salary')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class SalaryController {
  constructor(private salaryService: SalaryService) {}

  /**
   * Preview the current month's eligibility without crediting any wallet.
   * Safe to call any time.
   */
  @Get('current')
  async getCurrent() {
    await this.salaryService.calculateLeadershipSalary();
    return this.salaryService.getDistributionSnapshot();
  }

  /**
   * Recovery: re-run the monthly reset (idempotent — sets counters to zero).
   * Use only if a month's reset cron was missed.
   */
  @Post('reset-monthly')
  async resetMonthly() {
    await this.salaryService.resetMonthlyMetrics();
    return { message: 'Monthly sales counters reset' };
  }

  /**
   * Month-end payout. Idempotent: a distributor/month can only be paid once.
   * Refuses to run unless the supplied date is the last day of its month.
   */
  @Post('credit-month-end')
  async creditMonthEnd() {
    return this.salaryService.creditEndOfMonthSalary();
  }
}
