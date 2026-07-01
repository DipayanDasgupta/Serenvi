import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';

interface AuthenticatedRequest extends Request {
  user?: { distributorId: string };
}

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /**
   * Create a Razorpay order (frontend calls this before opening Razorpay checkout)
   */
  @Post('create-order')
  async createOrder(
    @Request() req: AuthenticatedRequest,
    @Body() body: { amount: number; cartSummary: string },
  ) {
    const buyerId = req.user?.distributorId || '';
    return this.paymentService.createOrder(buyerId, body.amount, body.cartSummary);
  }

  /**
   * Verify payment after Razorpay checkout completes
   */
  @Post('verify')
  async verifyPayment(
    @Body() body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    const isValid = this.paymentService.verifyPayment(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
    );

    if (!isValid) {
      return { success: false, message: 'Payment verification failed' };
    }

    return { success: true, message: 'Payment verified successfully', paymentId: body.razorpay_payment_id };
  }
}
