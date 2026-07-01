import { Module } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
