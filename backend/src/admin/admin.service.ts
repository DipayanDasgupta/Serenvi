import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

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
  async updateOrderStatus(orderId: string, status: string) {
    const sale = await this.prisma.sale.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
    this.logger.log(`Order ${orderId} status updated to ${status}`);
    return sale;
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    const [totalUsers, totalSales, totalOrders, pendingOrders] = await Promise.all([
      this.prisma.distributor.count(),
      this.prisma.sale.aggregate({ _sum: { saleAmount: true } }),
      this.prisma.sale.count(),
      this.prisma.sale.count({ where: { orderStatus: 'PENDING' } }),
    ]);

    const recentOrders = await this.prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { name: true, email: true } },
        product: { select: { name: true, price: true } },
      },
    });

    return {
      totalUsers,
      totalRevenue: totalSales._sum.saleAmount || 0,
      totalOrders,
      pendingOrders,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        buyer: o.seller.name,
        product: o.product.name,
        amount: o.saleAmount,
        status: o.orderStatus,
        date: o.createdAt,
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
