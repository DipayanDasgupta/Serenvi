import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.distributorId);
  }

  @Get('count')
  async getCartCount(@Req() req: any) {
    return this.cartService.getCartCount(req.user.distributorId);
  }

  @Post('add')
  async addToCart(@Req() req: any, @Body() body: { productId: string; quantity?: number; selectedSize?: string }) {
    return this.cartService.addToCart(req.user.distributorId, body.productId, body.quantity || 1, body.selectedSize);
  }

  @Put('update')
  async updateQuantity(@Req() req: any, @Body() body: { productId: string; quantity: number; selectedSize?: string }) {
    return this.cartService.updateQuantity(req.user.distributorId, body.productId, body.quantity, body.selectedSize);
  }

  @Delete(':productId')
  async removeFromCart(@Req() req: any, @Param('productId') productId: string) {
    return this.cartService.removeFromCart(req.user.distributorId, productId);
  }

  @Delete()
  async clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.distributorId);
  }
}
