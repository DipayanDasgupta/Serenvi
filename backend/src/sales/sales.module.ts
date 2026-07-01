import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { DatabaseModule } from '@/database/database.module';
import { CommissionModule } from '@/commission/commission.module';
import { AchievementModule } from '@/achievements/achievement.module';
import { SalaryModule } from '@/salary/salary.module';

@Module({
  imports: [DatabaseModule, CommissionModule, AchievementModule, SalaryModule],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
