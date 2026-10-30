import {
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

type AuthedRequest = { user: { id: number } };

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Returns the Stripe Checkout URL the client redirects to
  @Post('orders/:id/pay')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  pay(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.paymentsService.createCheckout(req.user.id, id);
  }

  // Server-to-server webhook from Stripe, authenticated by the signature over the raw body
  @Post('payments/stripe/webhook')
  @HttpCode(200)
  @SkipThrottle()
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}
