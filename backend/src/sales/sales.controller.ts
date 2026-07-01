import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalesService } from './sales.service';
import { CreateSaleDto } from '../common/dtos';

interface AuthenticatedRequest extends Request {
  user?: { distributorId: string };
}

@Controller('sales')
@UseGuards(AuthGuard('jwt'))
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  async createSale(@Request() req: AuthenticatedRequest, @Body() dto: CreateSaleDto) {
    // Extract buyerId from JWT token
    const buyerId = req.user?.distributorId || '';
    return this.salesService.purchaseProduct(
      buyerId,
      dto.productId,
      dto.quantity,
      dto.paymentMethod,
    );
  }

  @Get('history')
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    // Extract sellerId from JWT
    const sellerId = req.user?.distributorId || '';
    return this.salesService.getSalesHistory(sellerId, parseInt(skip), parseInt(take));
  }

  @Get('stats')
  async getStats(@Request() req: AuthenticatedRequest) {
    // Extract sellerId from JWT
    const sellerId = req.user?.distributorId || '';
    return this.salesService.getSalesStats(sellerId);
  }

  @Get(':productId')
  async getProduct(@Param('productId') productId: string) {
    return this.salesService.getProduct(productId);
  }
}
