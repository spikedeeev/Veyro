import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { StripeService, toMinorUnits } from './stripe.service';

const PROVIDER = 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly stripe: StripeService,
  ) {}

  async createCheckout(userId: number, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new ConflictException('Only pending orders can be paid');
    }

    const lines = order.items.map((item) => ({
      name: `${item.productName} (${item.color}, ${item.size})`,
      unitAmount: toMinorUnits(item.unitPrice.toString()),
      quantity: item.quantity,
    }));
    const itemsTotal = lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0);
    const orderTotal = toMinorUnits(order.total.toString());

    // Itemized lines are nicer on the payment page, but the charged amount must always equal the order total
    const session = await this.stripe.createCheckoutSession({
      orderId: order.id,
      lines:
        itemsTotal === orderTotal
          ? lines
          : [{ name: `Order ${order.id}`, unitAmount: orderTotal, quantity: 1 }],
    });

    await this.prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: PROVIDER,
        amount: order.total,
        currency: this.stripe.currency,
        externalId: session.id,
      },
      update: {
        provider: PROVIDER,
        status: 'PENDING',
        amount: order.total,
        currency: this.stripe.currency,
        externalId: session.id,
        rawStatus: null,
      },
    });

    return { checkoutUrl: session.url };
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing payload or signature');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.constructEvent(rawBody, signature);
    } catch (error) {
      if (this.stripe.isSignatureError(error)) {
        throw new BadRequestException('Invalid signature');
      }
      throw error;
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await this.onSessionResult(event.data.object, event.type, true);
        break;
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        await this.onSessionResult(event.data.object, event.type, false);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async onSessionResult(
    session: Stripe.Checkout.Session,
    eventType: string,
    succeeded: boolean,
  ) {
    const orderId = session.metadata?.orderId ?? session.client_reference_id;
    const payment = orderId
      ? await this.prisma.payment.findUnique({ where: { orderId } })
      : null;

    if (!payment) {
      this.logger.warn(`Stripe event ${eventType} for unknown order ${orderId ?? '-'}`);
      return;
    }

    const known = { rawStatus: `${eventType}:${session.payment_status}` };

    if (succeeded) {
      // completed also fires for delayed payment methods that are not paid yet
      if (session.payment_status !== 'paid') {
        await this.prisma.payment.update({ where: { id: payment.id }, data: known });
        return;
      }

      // Never trust the event alone: the amount and currency must match what we asked for
      if (
        session.amount_total !== toMinorUnits(payment.amount.toString()) ||
        session.currency?.toLowerCase() !== payment.currency.toLowerCase()
      ) {
        this.logger.error(
          `Amount/currency mismatch for order ${payment.orderId}: got ${session.amount_total} ${session.currency}`,
        );
        await this.prisma.payment.update({ where: { id: payment.id }, data: known });
        return;
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { ...known, status: 'SUCCESS', externalId: session.id },
      });
      await this.orders.markPaid(payment.orderId);
      return;
    }

    // A newer checkout session may already be active for this order, so only the latest one can fail the payment
    if (payment.status !== 'SUCCESS' && payment.externalId === session.id) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { ...known, status: 'FAILED' },
      });
    }
  }
}
