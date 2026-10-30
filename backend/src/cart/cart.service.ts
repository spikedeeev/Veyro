import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';

const cartInclude = {
  variant: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          images: {
            where: { isPrimary: true },
            select: { url: true, alt: true },
            take: 1,
          },
        },
      },
    },
  },
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: cartInclude,
      orderBy: { createdAt: 'asc' },
    });

    const total = items.reduce(
      (sum, item) => sum + Number(item.variant.product.price) * item.quantity,
      0,
    );

    return { items, total: Math.round(total * 100) / 100 };
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.variantId, product: { isActive: true } },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_variantId: { userId, variantId: variant.id } },
    });
    const quantity = (existing?.quantity ?? 0) + dto.quantity;

    this.assertInStock(variant.stock, quantity);

    await this.prisma.cartItem.upsert({
      where: { userId_variantId: { userId, variantId: variant.id } },
      create: { userId, variantId: variant.id, quantity },
      update: { quantity },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.findOwnItem(userId, itemId);
    this.assertInStock(item.variant.stock, dto.quantity);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: string) {
    await this.findOwnItem(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(userId);
  }

  async clear(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }

  private async findOwnItem(userId: number, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: { variant: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return item;
  }

  private assertInStock(stock: number, quantity: number) {
    if (quantity > stock) {
      throw new BadRequestException(
        `Only ${stock} item(s) available in stock for this variant`,
      );
    }
  }
}
