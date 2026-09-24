import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CommissionService } from '../commission/commission.service';
import { AchievementService } from '../achievements/achievement.service';
import { SalaryService } from '../salary/salary.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private commissionService: CommissionService,
    private achievementService: AchievementService,
    private salaryService: SalaryService,
  ) {}

  /**
   * Create a new sale
   * Triggers: commission distribution, achievement detection, wallet logging
   */
  async createSale(
    sellerId: string,
    productId: string,
    quantity: number,
    paymentMethod: string,
  ) {
    // Validate seller
    const seller = await this.prisma.distributor.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new BadRequestException('Seller not found');
    }

    // Validate product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Check stock for physical products
    if (product.type === 'PHYSICAL' && (product.stockQuantity ?? 0) < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Calculate sale amount
    const saleAmount = product.price.mul(new Decimal(quantity));

    // 1. Create sale record
    const sale = await this.prisma.sale.create({
      data: {
        sellerId,
        productId,
        quantity,
        saleAmount,
        paymentMethod,
        orderStatus: 'COMPLETED',
      },
    });

    // 2. Update seller's totalSales, and sponsor's level1Sales (personal sales)
    // Personal Sales = Level 1 downline sales only
    // When someone sells, it counts as Personal Sales for their SPONSOR
    
    if (seller.sponsorId) {
      // If seller has a sponsor, increment sponsor's level1Sales and monthlySales
      await this.prisma.distributor.update({
        where: { id: seller.sponsorId },
        data: {
          level1Sales: {
            increment: saleAmount,
          },
          monthlySales: {
            increment: saleAmount,
          },
        },
      });
    }

    // Always increment seller's totalSales (for upline tracking)
    // For multi-level calculations
    // Note: seller's totalSales will include their own sales propagated up

    // 3. Update product stock if physical
    if (product.type === 'PHYSICAL') {
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: (product.stockQuantity || 0) - quantity,
        },
      });
    }

    // 4. Log transaction for seller
    await this.prisma.walletTransaction.create({
      data: {
        distributorId: sellerId,
        type: 'PRODUCT_PURCHASE',
        amount: saleAmount,
        description: `Purchased ${quantity}x ${product.name}`,
        referenceId: sale.id,
      },
    });

    // 5. Trigger commission distribution (to upline)
    await this.commissionService.distributeCommission(sale.id, sellerId, saleAmount);

    // 6. Check and award achievements
    // Achievement check should be on the SPONSOR whose level1Sales was incremented
    if (seller.sponsorId) {
      await this.achievementService.checkAndClaimAchievements(seller.sponsorId);
    }

    this.logger.log(
      `Sale created: ${quantity}x ${product.name} by ${seller.name} for ₹${saleAmount}`,
    );

    return {
      id: sale.id,
      seller: { id: seller.id, name: seller.name },
      product: { id: product.id, name: product.name, price: product.price },
      quantity,
      saleAmount: saleAmount.toNumber(),
      paymentMethod,
      createdAt: sale.createdAt,
    };
  }

  /**
   * Get sales history for a distributor
   */
  async getSalesHistory(
    sellerId: string,
    skip: number = 0,
    take: number = 20,
  ) {
    const sales = await this.prisma.sale.findMany({
      where: { sellerId },
      include: {
        product: { select: { name: true, price: true } },
        commissions: { select: { level: true, commissionAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.sale.count({ where: { sellerId } });

    const rows = sales.map((s: any) => ({
      ...s,
      saleAmount: s.saleAmount.toNumber(),
      // Aliases the frontend Sale contract reads.
      sellerId: s.sellerId,
      amount: s.saleAmount.toNumber(),
      status: s.orderStatus,
      commissions: s.commissions.map((c: any) => ({
        ...c,
        commissionAmount: c.commissionAmount.toNumber(),
      })),
    }));

    return {
      // `data` is the paginated array key the frontend reads.
      data: rows,
      sales: rows,
      total,
      skip,
      take,
    };
  }

  /**
   * Get sales statistics
   */
  async getSalesStats(sellerId: string) {
    // COMPLETED only: pending/cancelled/refunded sales never count.
    const [totalSales, monthlySales, avgSale, totalCommission] =
      await Promise.all([
        this.prisma.sale.aggregate({
          _sum: { saleAmount: true },
          _count: true,
          where: { sellerId, orderStatus: 'COMPLETED' },
        }),
        this.prisma.sale.aggregate({
          _sum: { saleAmount: true },
          _count: true,
          where: {
            sellerId,
            orderStatus: 'COMPLETED',
            createdAt: {
              gte: new Date(new Date().setDate(1)),
            },
          },
        }),
        this.prisma.sale.aggregate({
          _avg: { saleAmount: true },
          where: { sellerId, orderStatus: 'COMPLETED' },
        }),
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { distributorId: sellerId, reversedAt: null },
        }),
      ]);

    return {
      totalSales: totalSales._sum.saleAmount?.toNumber() || 0,
      totalCount: totalSales._count,
      monthlySales: monthlySales._sum.saleAmount?.toNumber() || 0,
      monthlyCount: monthlySales._count,
      averageOrderValue: avgSale._avg.saleAmount?.toNumber() || 0,
      totalCommissionEarned: totalCommission._sum.commissionAmount?.toNumber() || 0,
    };
  }

  /**
   * Get all products (with filtering)
   */
  async getProducts(category?: string, skip: number = 0, take: number = 20) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.product.count({
      where: {
        isActive: true,
        ...(category && { category }),
      },
    });

    return {
      products: products.map((p: any) => ({
        ...p,
        price: p.price.toNumber(),
      })),
      total,
      skip,
      take,
    };
  }

  /**
   * Purchase product directly — wallet only.
   * Money is always deducted from the buyer's wallet balance.
   */
  async purchaseProduct(
    buyerId: string,
    productId: string,
    quantity: number,
    paymentMethod: string,
    idempotencyKey?: string,
  ) {
    if (!paymentMethod || paymentMethod.toUpperCase() !== 'WALLET') {
      throw new BadRequestException('Payments are wallet-only. Please top up your wallet first.');
    }
    paymentMethod = 'WALLET';
    // Validate buyer
    const buyer = await this.prisma.distributor.findUnique({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new BadRequestException('Buyer not found');
    }

    // Validate product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Check stock for physical products
    if (product.type === 'PHYSICAL' && (product.stockQuantity ?? 0) < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Calculate purchase amount
    const purchaseAmount = product.price.mul(new Decimal(quantity));

    // Idempotency: a retried purchase with the same key returns the original
    // sale instead of charging twice.
    if (idempotencyKey) {
      const existing = await this.prisma.sale.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        this.logger.warn(`[PURCHASE] Duplicate key ${idempotencyKey} — returning sale ${existing.id}`);
        return this.getPurchaseResult(existing.id);
      }
    }

    // Wallet-only: balance must cover the purchase
    if (buyer.walletBalance.lessThan(purchaseAmount)) {
      throw new BadRequestException('Insufficient wallet balance. Please deposit funds first.');
    }

    // All money movement runs inside ONE transaction: wallet columns and
    // ledger rows can never diverge (no more ghost credits/debits).
    const sale = await this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.distributor.update({
        where: { id: buyerId },
        data: {
          walletBalance: {
            decrement: purchaseAmount,
          },
        },
      });

      // 1. Create sale record (using buyer as seller for now - system purchase)
      const created = await tx.sale.create({
        data: {
          sellerId: buyerId, // Buyer is creating this sale record for tracking
          productId,
          quantity,
          saleAmount: purchaseAmount,
          paymentMethod,
          orderStatus: 'COMPLETED',
          idempotencyKey: idempotencyKey || undefined,
        },
      });

      // 1.5. UPDATE BUYER'S TOTAL SALES (THIS WAS MISSING!)
      await tx.distributor.update({
        where: { id: buyerId },
        data: {
          totalSales: {
            increment: purchaseAmount,
          },
        },
      });
      this.logger.log(`[PURCHASE] ✓ Updated totalSales for ${buyerId}: +₹${purchaseAmount}`);

      // 1.6. Propagate to SPONSOR's personal/team sales (THIS WAS MISSING —
      // downline purchases never counted anywhere, so team sales, personal
      // sales and achievement progress stayed at zero forever).
      if (buyer.sponsorId) {
        await tx.distributor.update({
          where: { id: buyer.sponsorId },
          data: {
            level1Sales: { increment: purchaseAmount },
            monthlySales: { increment: purchaseAmount },
          },
        });
        this.logger.log(
          `[PURCHASE] ✓ Sponsor ${buyer.sponsorId} level1Sales/monthlySales +₹${purchaseAmount}`,
        );
      }

      // 2. Update product stock if physical
      if (product.type === 'PHYSICAL') {
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity: (product.stockQuantity || 0) - quantity,
          },
        });
      }

      // 3. Log transaction for buyer
      await tx.walletTransaction.create({
        data: {
          distributorId: buyerId,
          type: 'PRODUCT_PURCHASE',
          amount: purchaseAmount.negated(), // Negative because money went out
          description: `Purchased ${quantity}x ${product.name}`,
          referenceId: created.id,
        },
      });

      // 4. Team metrics for EVERY qualifying upline (levels 1-15): lifetime
      // teamSales plus current-month teamMonthlySales. The sponsor additionally
      // got personal level1Sales/monthlySales in step 1.6.
      const uplineIds = await this.commissionService.getUplineIds(buyerId, 15);
      for (const uplineId of uplineIds) {
        await tx.distributor.update({
          where: { id: uplineId },
          data: {
            teamSales: { increment: purchaseAmount },
            teamMonthlySales: { increment: purchaseAmount },
          },
        });
      }
      if (uplineIds.length > 0) {
        this.logger.log(`[PURCHASE] ✓ Team metrics +₹${purchaseAmount} for ${uplineIds.length} upline(s)`);
      }

      // 5. Commission distribution joins the same transaction: either the
      // whole purchase (debit + commissions + sales counters) commits, or
      // nothing does. A failed purchase surfaces as an error to retry —
      // never as a half-written ledger.
      this.logger.log(`[PURCHASE] Triggering commission distribution for sale ${created.id} by ${buyerId} for amount ₹${purchaseAmount}`);
      await this.commissionService.distributeCommission(created.id, buyerId, purchaseAmount, tx);
      this.logger.log(`[PURCHASE] ✓ Commission distribution completed successfully`);

      return created;
    });

    // Note: Leadership salary is now distributed automatically on the 1st of each month
    // based on monthly sales tiers, not in real-time

    // 4.5. Recalculate salary eligibility (rule 3.12) so currentLeadershipSalary /
    // currentLeadershipRank reflect the sale immediately. Wallet credit still
    // only happens at month end.
    try {
      await this.salaryService.recalculateAfterSale();
    } catch (salaryError) {
      this.logger.error(`[PURCHASE] ✗ Salary recalculation FAILED:`, salaryError);
    }

    // 5. Check and award achievements (non-money: best-effort after commit).
    // Check the buyer AND the sponsor whose team volume just moved.
    for (const id of [buyerId, buyer.sponsorId].filter(Boolean) as string[]) {
      try {
        await this.achievementService.checkAndClaimAchievements(id);
      } catch (achievementError) {
        this.logger.error(`[PURCHASE] ✗ Achievement check FAILED for ${id}:`, achievementError);
      }
    }

    this.logger.log(
      `[PURCHASE] ✓ Product purchase: ${quantity}x ${product.name} by ${buyer.name} for ₹${purchaseAmount} via ${paymentMethod}`,
    );

    return this.getPurchaseResult(sale.id);
  }

  /**
   * Shape a completed sale for API responses (also used for idempotent
   * replays: same key returns the original purchase result).
   */
  private async getPurchaseResult(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        seller: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, price: true } },
      },
    });
    if (!sale) {
      throw new BadRequestException('Sale not found');
    }
    const amount = sale.saleAmount as Decimal;
    return {
      id: sale.id,
      buyer: { id: sale.seller.id, name: sale.seller.name },
      product: { id: sale.product.id, name: sale.product.name, price: (sale.product.price as Decimal).toNumber() },
      quantity: sale.quantity,
      totalAmount: amount.toNumber(),
      paymentMethod: sale.paymentMethod,
      status: sale.orderStatus,
      createdAt: sale.createdAt,
      message: `✅ Successfully purchased ${sale.quantity}x ${sale.product.name} for ₹${amount.toNumber()}`,
    };
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    return {
      ...product,
      price: product.price.toNumber(),
    };
  }
}
