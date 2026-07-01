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

    return {
      sales: sales.map((s: any) => ({
        ...s,
        saleAmount: s.saleAmount.toNumber(),
        commissions: s.commissions.map((c: any) => ({
          ...c,
          commissionAmount: c.commissionAmount.toNumber(),
        })),
      })),
      total,
      skip,
      take,
    };
  }

  /**
   * Get sales statistics
   */
  async getSalesStats(sellerId: string) {
    const [totalSales, monthlySales, avgSale, totalCommission] =
      await Promise.all([
        this.prisma.sale.aggregate({
          _sum: { saleAmount: true },
          _count: true,
          where: { sellerId },
        }),
        this.prisma.sale.aggregate({
          _sum: { saleAmount: true },
          _count: true,
          where: {
            sellerId,
            createdAt: {
              gte: new Date(new Date().setDate(1)),
            },
          },
        }),
        this.prisma.sale.aggregate({
          _avg: { saleAmount: true },
          where: { sellerId },
        }),
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { distributorId: sellerId },
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
   * Purchase product directly (deduct from buyer's wallet)
   */
  async purchaseProduct(
    buyerId: string,
    productId: string,
    quantity: number,
    paymentMethod: string,
  ) {
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

    // Check wallet balance if paying with wallet
    if (paymentMethod.toUpperCase() === 'WALLET') {
      if (buyer.walletBalance.lessThan(purchaseAmount)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Deduct from wallet
      await this.prisma.distributor.update({
        where: { id: buyerId },
        data: {
          walletBalance: {
            decrement: purchaseAmount,
          },
        },
      });
    }

    // 1. Create sale record (using buyer as seller for now - system purchase)
    const sale = await this.prisma.sale.create({
      data: {
        sellerId: buyerId, // Buyer is creating this sale record for tracking
        productId,
        quantity,
        saleAmount: purchaseAmount,
        paymentMethod,
        orderStatus: 'COMPLETED',
      },
    });

    // 1.5. UPDATE BUYER'S TOTAL SALES (THIS WAS MISSING!)
    await this.prisma.distributor.update({
      where: { id: buyerId },
      data: {
        totalSales: {
          increment: purchaseAmount,
        },
      },
    });
    this.logger.log(`[PURCHASE] ✓ Updated totalSales for ${buyerId}: +₹${purchaseAmount}`);

    // 2. Update product stock if physical
    if (product.type === 'PHYSICAL') {
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: (product.stockQuantity || 0) - quantity,
        },
      });
    }

    // 3. Log transaction for buyer
    await this.prisma.walletTransaction.create({
      data: {
        distributorId: buyerId,
        type: 'PRODUCT_PURCHASE',
        amount: purchaseAmount.negated(), // Negative because money went out
        description: `Purchased ${quantity}x ${product.name}`,
        referenceId: sale.id,
      },
    });

    // 4. Trigger commission distribution to upline
    this.logger.log(`[PURCHASE] Triggering commission distribution for sale ${sale.id} by ${buyerId} for amount ₹${purchaseAmount}`);
    try {
      await this.commissionService.distributeCommission(sale.id, buyerId, purchaseAmount);
      this.logger.log(`[PURCHASE] ✓ Commission distribution completed successfully`);
    } catch (commissionError) {
      this.logger.error(`[PURCHASE] ✗ Commission distribution FAILED:`, commissionError);
    }

    // Note: Leadership salary is now distributed automatically on the 1st of each month
    // based on monthly sales tiers, not in real-time

    // 5. Check and award achievements
    await this.achievementService.checkAndClaimAchievements(buyerId);

    this.logger.log(
      `[PURCHASE] ✓ Product purchase: ${quantity}x ${product.name} by ${buyer.name} for ₹${purchaseAmount} via ${paymentMethod}`,
    );

    return {
      id: sale.id,
      buyer: { id: buyer.id, name: buyer.name },
      product: { id: product.id, name: product.name, price: product.price.toNumber() },
      quantity,
      totalAmount: purchaseAmount.toNumber(),
      paymentMethod,
      status: 'COMPLETED',
      createdAt: sale.createdAt,
      message: `✅ Successfully purchased ${quantity}x ${product.name} for ₹${purchaseAmount.toNumber()}`,
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
