import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { OrderStatus } from '../generated/prisma/enums';
import { MailTemplates } from '../mail/mail.templates';
import { CreateOrderDto } from './dto/order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

const orderInclude = { items: true };

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const EXPIRY_CHECK_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailTemplates,
    private readonly config: ConfigService,
  ) {}

  // Unpaid orders release their reserved stock after ORDER_PAYMENT_TIMEOUT_MINUTES (0 disables)
  onModuleInit() {
    if (this.paymentTimeoutMinutes <= 0) {
      return;
    }

    const timer = setInterval(() => {
      this.cancelExpiredOrders().catch((error: Error) =>
        this.logger.error(`Expired order cleanup failed: ${error.message}`),
      );
    }, EXPIRY_CHECK_INTERVAL_MS);
    timer.unref();
  }

  private get paymentTimeoutMinutes() {
    return Number(this.config.get('ORDER_PAYMENT_TIMEOUT_MINUTES') ?? 60);
  }

  async cancelExpiredOrders() {
    const expired = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(Date.now() - this.paymentTimeoutMinutes * 60_000) },
      },
      select: { id: true },
      take: 200,
    });

    for (const { id } of expired) {
      try {
        await this.changeStatus(id, 'CANCELLED', 'The order was not paid in time.');
      } catch (error) {
        this.logger.warn(`Could not expire order ${id}: ${(error as Error).message}`);
      }
    }

    return expired.length;
  }

  // Called by the payment webhook; safe to call repeatedly
  async markPaid(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'PENDING') {
      await this.changeStatus(id, 'PAID');
    } else if (order.status === 'CANCELLED') {
      this.logger.error(`Order ${id} was paid after cancellation: manual refund required`);
    }
  }

  // Turns the cart into an order, reserving stock atomically
  async create(userId: number, dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: { variant: { include: { product: true } } },
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      let total = 0;

      for (const item of cartItems) {
        const { variant } = item;

        if (!variant.product.isActive) {
          throw new BadRequestException(
            `"${variant.product.name}" is no longer available`,
          );
        }

        // Conditional update prevents overselling under concurrent orders
        const reserved = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (reserved.count === 0) {
          throw new ConflictException(
            `Not enough stock for "${variant.product.name}" (${variant.size}, ${variant.color})`,
          );
        }

        total += Number(variant.product.price) * item.quantity;
      }

      const order = await tx.order.create({
        data: {
          userId,
          shippingAddress: dto.shippingAddress,
          total: Math.round(total * 100) / 100,
          items: {
            create: cartItems.map((item) => ({
              variantId: item.variantId,
              productId: item.variant.productId,
              productName: item.variant.product.name,
              size: item.variant.size,
              color: item.variant.color,
              unitPrice: item.variant.product.price,
              quantity: item.quantity,
            })),
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({ where: { userId } });

      return order;
    });

    await this.notifyCreated(userId, order);

    return order;
  }

  async findMine(userId: number, query: ListOrdersQueryDto) {
    return this.list({ userId, ...(query.status && { status: query.status }) }, query);
  }

  async findOneMine(userId: number, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancelMine(userId: number, id: string) {
    const order = await this.findOneMine(userId, id);

    if (order.status !== 'PENDING') {
      throw new ConflictException('Only pending orders can be cancelled');
    }

    return this.changeStatus(id, 'CANCELLED');
  }

  async findAll(query: ListOrdersQueryDto) {
    return this.list(query.status ? { status: query.status } : {}, query);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.changeStatus(id, status);
  }

  private async list(
    where: { userId?: number; status?: OrderStatus },
    { page = 1, limit = 20 }: ListOrdersQueryDto,
  ) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  private async changeStatus(id: string, next: OrderStatus, reason?: string) {
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (!TRANSITIONS[order.status].includes(next)) {
        throw new BadRequestException(
          `Cannot change status from ${order.status} to ${next}`,
        );
      }

      // Guards against a concurrent status change
      const updated = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: next },
      });

      if (updated.count === 0) {
        throw new ConflictException('Order status was changed concurrently');
      }

      if (next === 'CANCELLED') {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.updateMany({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
    });

    await this.notifyStatus(updatedOrder, reason);

    return updatedOrder;
  }

  private async notifyCreated(userId: number, order: Parameters<MailTemplates['sendOrderCreated']>[1]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

    if (user) {
      await this.mail.sendOrderCreated(user.email, order);
    }
  }

  private async notifyStatus(
    order: Parameters<MailTemplates['sendOrderStatus']>[1] & { userId: number },
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true },
    });

    if (user) {
      await this.mail.sendOrderStatus(user.email, order, reason);
    }
  }
}
