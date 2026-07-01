import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SalesModule } from './sales/sales.module';
import { CommissionModule } from './commission/commission.module';
import { AchievementModule } from './achievements/achievement.module';
import { SalaryModule } from './salary/salary.module';
import { WalletModule } from './wallet/wallet.module';
import { ProductModule } from './products/product.module';
import { DistributorModule } from './distributors/distributor.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './cart/cart.module';
import { JwtStrategy } from './common/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    SalesModule,
    CommissionModule,
    AchievementModule,
    SalaryModule,
    WalletModule,
    ProductModule,
    DistributorModule,
    PaymentModule,
    AdminModule,
    CartModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
