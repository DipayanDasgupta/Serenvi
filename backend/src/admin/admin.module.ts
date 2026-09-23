import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseModule } from '../database/database.module';
import { AchievementModule } from '../achievements/achievement.module';
import { SalaryModule } from '../salary/salary.module';

@Module({
  imports: [DatabaseModule, AchievementModule, SalaryModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
