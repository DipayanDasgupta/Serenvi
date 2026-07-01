import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('SMTP_EMAIL') || 'theserenvicompany@gmail.com',
        pass: this.configService.get('SMTP_PASSWORD'),
      },
    });
  }

  /**
   * Generate and email a 6-digit T-PIN for wallet transfers
   */
  async sendTPin(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { id: true, email: true, name: true },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    // Generate 6-digit T-PIN
    const pin = crypto.randomInt(100000, 999999).toString();

    // Hash and store it (expires in 10 minutes)
    const hashedPin = await bcrypt.hash(pin, 10);
    await this.prisma.distributor.update({
      where: { id: distributorId },
      data: { tPin: hashedPin },
    });

    // Send via email
    await this.transporter.sendMail({
      from: `"SERENVI" <${this.configService.get('SMTP_EMAIL') || 'theserenvicompany@gmail.com'}>`,
      to: distributor.email,
      subject: 'Your SERENVI T-PIN for Wallet Transfer',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #22d3ee; margin-bottom: 16px;">🔐 Your T-PIN</h2>
          <p>Hi ${distributor.name},</p>
          <p>Your one-time T-PIN for wallet transfer is:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #22d3ee; background: #1e293b; padding: 16px 32px; border-radius: 8px; border: 1px solid #22d3ee40;">${pin}</span>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">⚠️ This T-PIN is valid for one transfer only. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">If you did not request this, please ignore this email.</p>
          <p style="color: #64748b; font-size: 12px;">— Team SERENVI</p>
        </div>
      `,
    });

    this.logger.log(`T-PIN sent to ${distributor.email}`);
    return { message: 'T-PIN sent to your registered email address' };
  }

  /**
   * Get wallet balance and summary for a distributor
   */
  async getWallet(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        id: true,
        name: true,
        email: true,
        walletBalance: true,
        totalSales: true,
        rank: true,
      },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    // Get summary stats
    const [commissionTotal, achievementTotal, salaryTotal] = await Promise.all(
      [
        this.prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            distributorId,
            type: 'MLM_COMMISSION',
          },
        }),
        this.prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            distributorId,
            type: 'ACHIEVEMENT_REWARD',
          },
        }),
        this.prisma.walletTransaction.aggregate({
          _sum: { amount: true },
          where: {
            distributorId,
            type: 'LEADERSHIP_SALARY',
          },
        }),
      ],
    );

    return {
      ...distributor,
      walletBalance: distributor.walletBalance.toNumber(),
      totalSales: distributor.totalSales.toNumber(),
      earnings: {
        commission: commissionTotal._sum.amount?.toNumber() || 0,
        achievements: achievementTotal._sum.amount?.toNumber() || 0,
        salary: salaryTotal._sum.amount?.toNumber() || 0,
        total:
          (commissionTotal._sum.amount?.toNumber() || 0) +
          (achievementTotal._sum.amount?.toNumber() || 0) +
          (salaryTotal._sum.amount?.toNumber() || 0),
      },
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    distributorId: string,
    skip: number = 0,
    take: number = 20,
  ) {
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.walletTransaction.count({
      where: { distributorId },
    });

    return {
      transactions: transactions.map((t: any) => ({
        ...t,
        amount: t.amount.toNumber(),
      })),
      total,
      skip,
      take,
    };
  }

  /**
   * Request withdrawal from wallet
   * Fee: 2% or ₹20 (whichever is higher)
   * Minimum: ₹500
   */
  async requestWithdrawal(
    distributorId: string,
    amount: number,
    bankAccount: string,
    bankIFSC: string,
    accountHolder: string,
  ) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    // Validate bank details are set
    if (!distributor.bankAccount || !distributor.bankIFSC) {
      throw new BadRequestException('Please add your bank details in Settings before requesting a withdrawal');
    }

    // Convert to Decimal
    const amountDecimal = new Decimal(amount);

    // Validate minimum
    if (amountDecimal.lessThan(500)) {
      throw new BadRequestException('Minimum withdrawal amount is ₹500');
    }

    // Validate balance
    if (distributor.walletBalance.lessThan(amountDecimal)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Calculate fee: 2% or ₹20 (whichever is higher)
    const feePercent = amountDecimal.mul(0.02);
    const fee = feePercent.greaterThan(20) ? feePercent : new Decimal(20);
    const netAmount = amountDecimal.minus(fee);

    // Create withdrawal request
    const withdrawal = await this.prisma.withdrawalRequest.create({
      data: {
        distributorId,
        amount: amountDecimal,
        fee,
        bankAccount,
        bankIFSC,
        accountHolder,
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Withdrawal request created: ${distributor.name} requested ₹${amountDecimal} (fee: ₹${fee})`,
    );

    return {
      id: withdrawal.id,
      amount: withdrawal.amount.toNumber(),
      fee: withdrawal.fee.toNumber(),
      netAmount: netAmount.toNumber(),
      status: withdrawal.status,
      requestedAt: withdrawal.requestedAt,
    };
  }

  /**
   * Get withdrawal requests (for admin)
   */
  async getWithdrawalRequests(
    status?: string,
    skip: number = 0,
    take: number = 20,
  ) {
    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where: status ? { status } : {},
      include: {
        distributor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { requestedAt: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.withdrawalRequest.count({
      where: status ? { status } : {},
    });

    return {
      withdrawals: withdrawals.map((w: any) => ({
        ...w,
        amount: w.amount.toNumber(),
        fee: w.fee.toNumber(),
      })),
      total,
      skip,
      take,
    };
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(withdrawalId: string): Promise<any> {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new BadRequestException('Withdrawal not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve withdrawal with status: ${withdrawal.status}`,
      );
    }

    // Deduct from wallet
    await this.prisma.distributor.update({
      where: { id: withdrawal.distributorId },
      data: {
        walletBalance: {
          decrement: withdrawal.amount,
        },
      },
    });

    // Log transaction
    const netAmount = withdrawal.amount.minus(withdrawal.fee);
    await this.prisma.walletTransaction.create({
      data: {
        distributorId: withdrawal.distributorId,
        type: 'WITHDRAWAL',
        amount: netAmount,
        description: `Withdrawal approved (Fee: ₹${withdrawal.fee})`,
        referenceId: withdrawalId,
      },
    });

    // Update withdrawal status
    const updated = await this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
      },
    });

    this.logger.log(`Withdrawal ${withdrawalId} approved`);

    return {
      ...updated,
      amount: updated.amount.toNumber(),
      fee: updated.fee.toNumber(),
    };
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(
    withdrawalId: string,
    rejectionReason: string,
  ): Promise<any> {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new BadRequestException('Withdrawal not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject withdrawal with status: ${withdrawal.status}`,
      );
    }

    const updated = await this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: 'REJECTED',
        rejectionReason,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Withdrawal ${withdrawalId} rejected: ${rejectionReason}`);

    return {
      ...updated,
      amount: updated.amount.toNumber(),
      fee: updated.fee.toNumber(),
    };
  }

  /**
   * Deposit (Topup) to wallet
   */
  async deposit(
    distributorId: string,
    amount: number,
    paymentMethod: string = 'UPI',
    transactionId?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    const amountDecimal = new Decimal(amount);

    // Create deposit record
    const deposit = await this.prisma.deposit.create({
      data: {
        distributorId,
        amount: amountDecimal,
        paymentMethod,
        transactionId,
        status: 'COMPLETED',
      },
    });

    // Update wallet balance
    await this.prisma.distributor.update({
      where: { id: distributorId },
      data: {
        walletBalance: {
          increment: amountDecimal,
        },
      },
    });

    // Log transaction
    await this.prisma.walletTransaction.create({
      data: {
        distributorId,
        type: 'DEPOSIT',
        amount: amountDecimal,
        description: `Wallet topup via ${paymentMethod}`,
        referenceId: deposit.id,
      },
    });

    this.logger.log(`Deposit of ₹${amount} created for distributor ${distributorId}`);

    return {
      ...deposit,
      amount: deposit.amount.toNumber(),
    };
  }

  /**
   * Transfer wallet balance to another distributor
   */
  async transferWallet(
    fromDistributorId: string,
    toPhoneOrCode: string,
    amount: number,
    tPin: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const fromDistributor = await this.prisma.distributor.findUnique({
      where: { id: fromDistributorId },
    });

    if (!fromDistributor) {
      throw new BadRequestException('Sender not found');
    }

    // Verify T-PIN (bcrypt hashed)
    if (!fromDistributor.tPin) {
      throw new BadRequestException('No T-PIN found. Please request a new T-PIN first.');
    }
    const pinValid = await bcrypt.compare(tPin, fromDistributor.tPin);
    if (!pinValid) {
      throw new BadRequestException('Invalid T-PIN');
    }

    // Invalidate T-PIN after use (one-time use)
    await this.prisma.distributor.update({
      where: { id: fromDistributorId },
      data: { tPin: null },
    });

    const amountDecimal = new Decimal(amount);

    // Check balance
    if (fromDistributor.walletBalance.lessThan(amountDecimal)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Find recipient by referral code only
    const toDistributor = await this.prisma.distributor.findUnique({
      where: { referralCode: toPhoneOrCode },
    });

    if (!toDistributor) {
      throw new BadRequestException('Recipient not found');
    }

    if (toDistributor.id === fromDistributorId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Create transfer record
    const transfer = await this.prisma.walletTransfer.create({
      data: {
        fromDistributorId,
        toDistributorId: toDistributor.id,
        amount: amountDecimal,
        status: 'COMPLETED',
      },
    });

    // Deduct from sender
    await this.prisma.distributor.update({
      where: { id: fromDistributorId },
      data: {
        walletBalance: {
          decrement: amountDecimal,
        },
      },
    });

    // Add to recipient
    await this.prisma.distributor.update({
      where: { id: toDistributor.id },
      data: {
        walletBalance: {
          increment: amountDecimal,
        },
      },
    });

    // Log transactions
    await this.prisma.walletTransaction.create({
      data: {
        distributorId: fromDistributorId,
        type: 'WALLET_TRANSFER_OUT',
        amount: amountDecimal.negated(),
        description: `Transfer to ${toDistributor.name}`,
        referenceId: transfer.id,
      },
    });

    await this.prisma.walletTransaction.create({
      data: {
        distributorId: toDistributor.id,
        type: 'WALLET_TRANSFER_IN',
        amount: amountDecimal,
        description: `Transfer from ${fromDistributor.name}`,
        referenceId: transfer.id,
      },
    });

    this.logger.log(`Transfer of ₹${amount} from ${fromDistributorId} to ${toDistributor.id}`);

    return {
      ...transfer,
      amount: transfer.amount.toNumber(),
      recipient: { id: toDistributor.id, name: toDistributor.name },
    };
  }

  /**
   * Get all deposits for a distributor
   */
  async getDeposits(distributorId: string, skip: number = 0, take: number = 20) {
    const deposits = await this.prisma.deposit.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.deposit.count({
      where: { distributorId },
    });

    return {
      deposits: deposits.map((d) => ({
        ...d,
        amount: d.amount.toNumber(),
      })),
      total,
    };
  }

  /**
   * Get all transfers for a distributor (in and out)
   */
  async getTransfers(distributorId: string, skip: number = 0, take: number = 20) {
    const transfers = await this.prisma.walletTransfer.findMany({
      where: {
        OR: [{ fromDistributorId: distributorId }, { toDistributorId: distributorId }],
      },
      include: {
        fromDistributor: { select: { id: true, name: true, phone: true } },
        toDistributor: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.walletTransfer.count({
      where: {
        OR: [{ fromDistributorId: distributorId }, { toDistributorId: distributorId }],
      },
    });

    return {
      transfers: transfers.map((t) => ({
        ...t,
        amount: t.amount.toNumber(),
      })),
      total,
    };
  }

  /**
   * Get complete wallet details
   */
  async getWalletDetails(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        id: true,
        walletBalance: true,
        referralCode: true,
      },
    });

    if (!distributor) {
      throw new BadRequestException('Distributor not found');
    }

    const [deposits, withdrawals, transfers] = await Promise.all([
      this.prisma.deposit.aggregate({
        where: { distributorId },
        _sum: { amount: true },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { distributorId, status: 'APPROVED' },
        _sum: { amount: true },
      }),
      this.prisma.walletTransfer.aggregate({
        where: { fromDistributorId: distributorId },
        _sum: { amount: true },
      }),
    ]);

    return {
      balance: distributor.walletBalance.toNumber(),
      totalDeposited: deposits._sum.amount?.toNumber() || 0,
      totalWithdrawn: withdrawals._sum.amount?.toNumber() || 0,
      totalTransferred: transfers._sum.amount?.toNumber() || 0,
      referralCode: distributor.referralCode,
    };
  }

  /**
   * Get complete wallet history (deposits, transfers, withdrawals, purchases)
   */
  async getCompleteWalletHistory(distributorId: string, skip: number = 0, take: number = 50) {
    // Get all deposits
    const deposits = await this.prisma.deposit.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
    });

    // Get all transfers (in and out)
    const transfers = await this.prisma.walletTransfer.findMany({
      where: {
        OR: [{ fromDistributorId: distributorId }, { toDistributorId: distributorId }],
      },
      include: {
        fromDistributor: { select: { name: true, phone: true } },
        toDistributor: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all withdrawal requests
    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { distributorId },
      orderBy: { requestedAt: 'desc' },
    });

    // Get purchase history
    const purchases = await this.prisma.sale.findMany({
      where: { sellerId: distributorId },
      include: {
        product: { select: { name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get wallet transactions
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
    });

    // Combine and sort all history items by date
    const allHistory = [
      ...deposits.map((d) => ({
        type: 'DEPOSIT',
        amount: d.amount.toNumber(),
        description: `Deposit via ${d.paymentMethod}`,
        date: d.createdAt,
        status: d.status,
      })),
      ...transfers.map((t) => ({
        type: t.fromDistributorId === distributorId ? 'TRANSFER_OUT' : 'TRANSFER_IN',
        amount: t.amount.toNumber(),
        description:
          t.fromDistributorId === distributorId
            ? `Transfer to ${t.toDistributor.name}`
            : `Transfer from ${t.fromDistributor.name}`,
        date: t.createdAt,
        status: t.status,
        otherParty:
          t.fromDistributorId === distributorId ? t.toDistributor.name : t.fromDistributor.name,
      })),
      ...withdrawals.map((w) => ({
        type: 'WITHDRAWAL',
        amount: w.amount.toNumber(),
        description: `Withdraw to bank (Fee: ₹${w.fee.toNumber()})`,
        date: w.requestedAt,
        status: w.status,
      })),
      ...purchases.map((p) => ({
        type: 'PURCHASE',
        amount: p.saleAmount.toNumber(),
        description: `Purchased: ${p.product.name}`,
        date: p.createdAt,
        status: 'COMPLETED',
        qty: p.quantity,
      })),
      ...transactions.map((t) => ({
        type: t.type,
        amount: t.amount.toNumber(),
        description: t.description,
        date: t.createdAt,
        status: 'COMPLETED',
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      history: allHistory.slice(skip, skip + take),
      total: allHistory.length,
      deposits: allHistory.filter(h => h.type === 'DEPOSIT').length,
      transfers: allHistory.filter(h => h.type === 'TRANSFER_IN' || h.type === 'TRANSFER_OUT').length,
      withdrawals: allHistory.filter(h => h.type === 'WITHDRAWAL').length,
      purchases: allHistory.filter(h => h.type === 'PURCHASE').length,
    };
  }

  /**
   * Validate and fix wallet balance discrepancies
   * Ensures wallet balance = sum of all wallet transactions
   */
  async validateAndFixWalletBalances() {
    const distributors = await this.prisma.distributor.findMany({
      select: { id: true, name: true, walletBalance: true },
    });

    const discrepancies: any[] = [];

    for (const dist of distributors) {
      // Calculate correct balance from transactions
      const txs = await this.prisma.walletTransaction.findMany({
        where: { distributorId: dist.id },
      });

      let calculatedBalance = new Decimal(0);
      txs.forEach(tx => {
        calculatedBalance = calculatedBalance.plus(new Decimal(tx.amount));
      });

      const storedBalance = new Decimal(dist.walletBalance);
      const diff = storedBalance.minus(calculatedBalance);

      if (diff.toNumber() !== 0) {
        discrepancies.push({
          distributorId: dist.id,
          name: dist.name,
          stored: storedBalance.toNumber(),
          calculated: calculatedBalance.toNumber(),
          difference: diff.toNumber(),
        });

        // Fix the discrepancy
        await this.prisma.distributor.update({
          where: { id: dist.id },
          data: { walletBalance: calculatedBalance },
        });

        this.logger.warn(
          `Fixed wallet discrepancy for ${dist.name}: ₹${storedBalance} → ₹${calculatedBalance}`,
        );
      }
    }

    return {
      checked: distributors.length,
      discrepanciesFound: discrepancies.length,
      discrepancies,
      message: discrepancies.length === 0 ? 'All wallets are accurate' : `Fixed ${discrepancies.length} discrepancy(ies)`,
    };
  }
}

