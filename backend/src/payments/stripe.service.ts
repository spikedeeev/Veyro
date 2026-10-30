import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

type LineInput = { name: string; unitAmount: number; quantity: number };

type CheckoutInput = {
  orderId: string;
  lines: LineInput[];
};

// Stripe amounts are integers in the smallest currency unit (cents, kopiykas)
export const toMinorUnits = (amount: number | string) => Math.round(Number(amount) * 100);

// https://docs.stripe.com/payments/checkout
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client?: Stripe;

  constructor(private readonly config: ConfigService) {}

  get currency() {
    return (this.config.get<string>('STRIPE_CURRENCY') ?? 'usd').toLowerCase();
  }

  get isConfigured() {
    return Boolean(this.config.get<string>('STRIPE_SECRET_KEY'));
  }

  private get stripe() {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');

    if (!key) {
      throw new ServiceUnavailableException('Online payments are not configured');
    }

    this.client ??= new Stripe(key);
    return this.client;
  }

  async createCheckoutSession(input: CheckoutInput) {
    const frontend = (this.config.get<string>('FRONTEND_URL') ?? '').replace(/\/$/, '');

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId },
        line_items: input.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: this.currency,
            unit_amount: line.unitAmount,
            product_data: { name: line.name },
          },
        })),
        success_url: `${frontend}/orders/${input.orderId}?payment=success`,
        cancel_url: `${frontend}/orders/${input.orderId}?payment=cancelled`,
        // Stripe's minimum session lifetime is 30 minutes
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      });
    } catch (error) {
      this.logger.error(`Stripe checkout session failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Payment provider is unavailable');
    }

    if (!session.url) {
      throw new ServiceUnavailableException('Could not start the payment');
    }

    return { id: session.id, url: session.url };
  }

  // Throws when the signature does not match, so unsigned requests never reach business logic
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!secret) {
      throw new ServiceUnavailableException('Stripe webhook is not configured');
    }

    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  isSignatureError(error: unknown): boolean {
    return error instanceof Stripe.errors.StripeSignatureVerificationError;
  }
}
