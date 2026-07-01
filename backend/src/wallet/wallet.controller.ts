import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';
import { RequestWithdrawalDto } from '../common/dtos';
import { BadRequestException } from '@nestjs/common';

interface AuthenticatedRequest extends Request {
  user?: { distributorId: string };
}

@Controller('wallet')
@UseGuards(AuthGuard('jwt'))
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  async getWallet(@Request() req: AuthenticatedRequest) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.getWallet(distributorId);
  }

  @Get('details')
  async getWalletDetails(@Request() req: AuthenticatedRequest) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.getWalletDetails(distributorId);
  }

  @Get('history')
  async getWalletHistory(
    @Request() req: AuthenticatedRequest,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.getCompleteWalletHistory(distributorId, parseInt(skip), parseInt(take));
  }

  @Get('transactions')
  async getTransactions(
    @Request() req: AuthenticatedRequest,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.getTransactionHistory(
      distributorId,
      parseInt(skip),
      parseInt(take),
    );
  }

  @Get('deposits')
  async getDeposits(
    @Request() req: AuthenticatedRequest,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.getDeposits(distributorId, parseInt(skip), parseInt(take));
  }

  @Get('transfers')
  async getTransfers(
    @Request() req: AuthenticatedRequest,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.getTransfers(distributorId, parseInt(skip), parseInt(take));
  }

  @Post('deposit')
  async deposit(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { amount: number; paymentMethod?: string; transactionId?: string },
  ) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.deposit(
      distributorId,
      dto.amount,
      dto.paymentMethod || 'UPI',
      dto.transactionId,
    );
  }

  @Post('send-tpin')
  async sendTPin(@Request() req: AuthenticatedRequest) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.sendTPin(distributorId);
  }

  @Post('transfer')
  async transferWallet(
    @Request() req: AuthenticatedRequest,
    @Body() dto: { toReferralCode: string; amount: number; tPin: string },
  ) {
    if (!dto.tPin || dto.tPin.length !== 6) {
      throw new BadRequestException('Invalid T-PIN. Must be 6 digits.');
    }
    // Validate referral code format - must be exactly 6 characters
    if (!/^[A-Z0-9]{6}$/.test(dto.toReferralCode)) {
      throw new BadRequestException('Invalid referral code. Must be exactly 6 characters (uppercase letters/numbers).');
    }
    const distributorId = req.user?.distributorId || '';
    return this.walletService.transferWallet(
      distributorId,
      dto.toReferralCode,
      dto.amount,
      dto.tPin,
    );
  }

  @Post('withdraw')
  async requestWithdrawal(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RequestWithdrawalDto,
  ) {
    const distributorId = req.user?.distributorId || '';
    return this.walletService.requestWithdrawal(
      distributorId,
      dto.amount,
      dto.bankAccount,
      dto.bankIFSC,
      dto.accountHolder,
    );
  }

  /**
   * Admin endpoint: Validate and fix all wallet balances
   * Checks if wallet balance = sum of all transactions
   */
  @Post('admin/validate-all')
  async validateAllWallets() {
    return this.walletService.validateAndFixWalletBalances();
  }
}
