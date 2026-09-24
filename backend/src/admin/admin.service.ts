import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AchievementService } from '../achievements/achievement.service';
import { SalaryService } from '../salary/salary.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private achievementService: AchievementService,
    private salaryService: SalaryService,
  ) {}

  /**
   * Get all users with their distributor details
   */
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            rank: true,
            referralCode: true,
            totalSales: true,
            level1Sales: true,
            monthlySales: true,
            walletBalance: true,
            currentLeadershipSalary: true,
            currentLeadershipRank: true,
            status: true,
            createdAt: true,
            sponsorId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      userId: u.id,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      ...(u.distributor || {}),
    }));
  }

  /**
   * Get all sales/orders
   */
  async getAllOrders(status?: string) {
    const where: any = {};
    if (status) {
      where.orderStatus = status;
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        seller: {
          select: { id: true, name: true, email: true, phone: true },
        },
        product: {
          select: { id: true, name: true, price: true, type: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map((s) => ({
      id: s.id,
      buyer: s.seller,
      product: s.product,
      quantity: s.quantity,
      saleAmount: s.saleAmount,
      paymentMethod: s.paymentMethod,
      orderStatus: s.orderStatus,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Update order status (e.g., PENDING -> SHIPPED -> DELIVERED)
   */
  /**
   * Update order status. Moving a COMPLETED sale to REFUNDED runs the full
   * compensating reversal (rule 9) atomically: stock, wallet, sales metrics,
   * commissions, achievements and salary eligibility.
   */
  async updateOrderStatus(orderId: string, status: string) {
    const normalized = String(status || '').toUpperCase();
    const allowed = [
      'PENDING',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ];
    if (!allowed.includes(normalized)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: orderId },
      include: { product: { select: { id: true, type: true } } },
    });
    if (!sale) {
      throw new BadRequestException('Order not found');
    }
    if (sale.orderStatus === normalized) {
      return sale; // Idempotent retry.
    }
    if (normalized === 'REFUNDED' && sale.orderStatus !== 'COMPLETED') {
      throw new BadRequestException(
        `Only COMPLETED sales can be refunded (current: ${sale.orderStatus})`,
      );
    }

    if (normalized !== 'REFUNDED') {
      const updated = await this.prisma.sale.update({
        where: { id: orderId },
        data: { orderStatus: normalized },
      });
      this.logger.log(`Order ${orderId} status updated to ${normalized}`);
      return updated;
    }

    // --- Refund reversal (all-or-nothing) ---
    const amount = sale.saleAmount as Decimal;
    const sellerId = sale.sellerId;

    const refunded = await this.prisma.$transaction(async (tx) => {
      // 1. Mark sale REFUNDED first: flips COMPLETED→REFUNDED so this sale no
      //    longer qualifies for any COMPLETED-only calculation.
      const updated = await tx.sale.update({
        where: { id: orderId },
        data: { orderStatus: 'REFUNDED' },
      });

      // 2. Restore physical stock.
      if (sale.product.type === 'PHYSICAL') {
        await tx.product.update({
          where: { id: sale.productId },
          data: { stockQuantity: { increment: sale.quantity } },
        });
      }

      // 3. Reverse buyer purchase accounting (refund the wallet).
      await tx.distributor.update({
        where: { id: sellerId },
        data: { walletBalance: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          distributorId: sellerId,
          type: 'REFUND',
          amount,
          description: `Refund for ${sale.quantity}x ${sale.productId}`,
          referenceId: orderId,
        },
      });

      // 4. Reverse seller/team sales metrics.
      await tx.distributor.update({
        where: { id: sellerId },
        data: { totalSales: { decrement: amount } },
      });
      const sponsor = await tx.distributor.findUnique({
        where: { id: sellerId },
        select: { sponsorId: true },
      });
      if (sponsor?.sponsorId) {
        await tx.distributor.update({
          where: { id: sponsor.sponsorId },
          data: {
            level1Sales: { decrement: amount },
            monthlySales: { decrement: amount },
          },
        });
      }
      // Every upline's lifetime + monthly team metrics roll back.
      const ancestors = await tx.mLMTreeNode.findMany({
        where: { descendantId: sellerId, depth: { lte: 15 } },
        select: { ancestorId: true },
      });
      for (const { ancestorId } of ancestors) {
        await tx.distributor.update({
          where: { id: ancestorId },
          data: {
            teamSales: { decrement: amount },
            teamMonthlySales: { decrement: amount },
          },
        });
      }

      // 5. Claw back commissions. If the recipient can absorb it, debit their
      //    wallet (balance may go negative when already withdrawn); otherwise
      //    flip the commission to reversed and keep it as a receivable.
      const commissions = await tx.commission.findMany({
        where: { saleId: orderId, reversedAt: null },
      });
      for (const commission of commissions) {
        const recipient = await tx.distributor.findUnique({
          where: { id: commission.distributorId },
          select: { walletBalance: true },
        });
        const bal = (recipient?.walletBalance as Decimal) ?? new Decimal(0);
        const amt = commission.commissionAmount as Decimal;
        if (bal.gte(amt)) {
          await tx.distributor.update({
            where: { id: commission.distributorId },
            data: { walletBalance: { decrement: amt } },
          });
          await tx.walletTransaction.create({
            data: {
              distributorId: commission.distributorId,
              type: 'REFUND',
              amount: amt.negated(),
              description: `Commission clawback on refund (level ${commission.level})`,
              referenceId: orderId,
            },
          });
          await tx.commission.update({
            where: { id: commission.id },
            data: { reversedAt: new Date() },
          });
        } else {
          // Mark reversed regardless — the payout is no longer valid.
          await tx.commission.update({
            where: { id: commission.id },
            data: { reversedAt: new Date() },
          });
          this.logger.warn(
            `Commission ${commission.id} reversed but wallet short for ${commission.distributorId} — receivable recorded`,
          );
        }
      }

      return updated;
    });

    // 6. Re-evaluate achievement progress for the seller and every upline
    //    whose personal sales just fell, and refresh salary eligibility.
    //    Best-effort: never fails the refund itself.
    try {
      const sponsor = await this.prisma.distributor.findUnique({
        where: { id: sellerId },
        select: { sponsorId: true },
      });
      const affected = [sellerId, sponsor?.sponsorId].filter(Boolean) as string[];
      for (const id of affected) {
        await this.achievementService.syncAchievements(id);
      }
      await this.salaryService.recalculateAfterSale();
    } catch (error) {
      this.logger.error(`Refund post-processing failed for ${sellerId}:`, error);
    }

    this.logger.log(`Order ${orderId} REFUNDED and reversed (₹${amount})`);
    return refunded;
  }

  /**
   * Get dashboard stats (shape matches frontend AdminStats)
   */
  async getDashboardStats() {
    const [
      totalUsers,
      salesAgg,
      totalOrders,
      commissionsAgg,
      pendingDeposits,
      pendingDepositsAgg,
    ] = await Promise.all([
      this.prisma.distributor.count(),
      this.prisma.sale.aggregate({ _sum: { saleAmount: true } }),
      this.prisma.sale.count(),
      this.prisma.commission.aggregate({ _sum: { commissionAmount: true } }),
      this.prisma.deposit.count({ where: { status: 'PENDING' } }),
      this.prisma.deposit.aggregate({
        _sum: { amount: true },
        where: { status: 'PENDING' },
      }),
    ]);

    const [recentOrders, recentDeposits] = await Promise.all([
      this.prisma.sale.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, price: true } },
        },
      }),
      this.prisma.deposit.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          distributor: {
            select: { id: true, name: true, email: true, referralCode: true },
          },
        },
      }),
    ]);

    const toNum = (v: any): number =>
      v == null ? 0 : typeof v.toNumber === 'function' ? v.toNumber() : Number(v);

    return {
      totalUsers,
      totalSales: toNum(salesAgg._sum.saleAmount),
      totalOrders,
      totalCommissions: toNum(commissionsAgg._sum.commissionAmount),
      recentOrders: recentOrders.map((o: any) => ({
        id: o.id,
        distributorId: o.sellerId,
        productId: o.productId,
        quantity: o.quantity,
        amount: toNum(o.saleAmount),
        paymentMethod: o.paymentMethod,
        status: o.orderStatus,
        product: {
          ...o.product,
          price: toNum(o.product?.price),
        },
        createdAt: o.createdAt,
      })),
      depositsSummary: {
        pendingCount: pendingDeposits,
        pendingAmount: toNum(pendingDepositsAgg._sum.amount),
      },
      recentDeposits: recentDeposits.map((d: any) => ({
        ...d,
        amount: toNum(d.amount),
      })),
    };
  }

  /**
   * Get single user details
   */
  async getUserDetails(distributorId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: {
        sales: {
          include: { product: { select: { name: true, price: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        achievements: { orderBy: { createdAt: 'desc' } },
        walletTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        commissions: { orderBy: { createdAt: 'desc' }, take: 20 },
        salaries: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    return distributor;
  }
}
