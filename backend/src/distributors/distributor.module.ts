import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DistributorService } from './distributor.service';
import { DistributorController } from './distributor.controller';
import { DatabaseModule } from '../database/database.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [DistributorService, SchedulerService],
  controllers: [DistributorController],
})
export class DistributorModule {}
