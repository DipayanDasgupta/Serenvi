import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(distributorId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { distributorId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      product: {
        ...item.product,
        price: item.product.price.toNumber(),
      },
    }));
  }

  async addToCart(distributorId: string, productId: string, quantity: number = 1, selectedSize?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new BadRequestException('Product not found or unavailable');
    }
    if (product.stockQuantity !== null && product.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Find existing cart item using where conditions instead of unique constraint
    const existing = await this.prisma.cartItem.findFirst({
      where: { 
        distributorId, 
        productId,
        selectedSize: selectedSize || null
      },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stockQuantity !== null && product.stockQuantity < newQty) {
        throw new BadRequestException('Insufficient stock');
      }
      const updated = await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: { product: true },
      });
      return { ...updated, product: { ...updated.product, price: (updated.product as any).price.toNumber() } };
    }

    const item = await this.prisma.cartItem.create({
      data: { distributorId, productId, quantity, selectedSize: selectedSize || null },
      include: { product: true },
    });
    return { ...item, product: { ...item.product, price: (item.product as any).price.toNumber() } };
  }

  async updateQuantity(distributorId: string, productId: string, quantity: number, selectedSize?: string) {
    if (quantity <= 0) {
      return this.removeFromCart(distributorId, productId);
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (product?.stockQuantity !== null && product?.stockQuantity !== undefined && product.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Find existing cart item using where conditions
    const existing = await this.prisma.cartItem.findFirst({
      where: { 
        distributorId, 
        productId,
        selectedSize: selectedSize || null
      },
    });

    if (!existing) {
      throw new BadRequestException('Item not found in cart');
    }

    const item = await this.prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity },
      include: { product: true },
    });
    return { ...item, product: { ...item.product, price: (item.product as any).price.toNumber() } };
  }

  async removeFromCart(distributorId: string, productId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { distributorId, productId },
    });
    return { success: true };
  }

  async clearCart(distributorId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { distributorId },
    });
    return { success: true };
  }

  async getCartCount(distributorId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { distributorId },
      select: { quantity: true },
    });
    return { count: items.reduce((sum: number, i: any) => sum + i.quantity, 0) };
  }
}
