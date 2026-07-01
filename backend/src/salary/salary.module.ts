import { Module } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule {}
