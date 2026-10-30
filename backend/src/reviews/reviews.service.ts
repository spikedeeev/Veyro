import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

type Tx = Prisma.TransactionClient;

// Hide most of the reviewer's email in public responses
const maskEmail = (email: string) => `${email.slice(0, 2)}***`;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(productId: string, page = 1, limit = 20) {
    await this.assertProductVisible(productId);
    const where = { productId };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const items = rows.map(({ user, ...review }) => ({
      ...review,
      author: maskEmail(user.email),
    }));

    return { items, total, page, limit };
  }

  async create(userId: number, productId: string, dto: CreateReviewDto) {
    await this.assertProductVisible(productId);
    await this.assertPurchased(userId, productId);

    return this.prisma.$transaction(async (tx) => {
      try {
        const review = await tx.review.create({
          data: { userId, productId, rating: dto.rating, comment: dto.comment },
        });
        await this.recalculate(tx, productId);
        return review;
      } catch (error) {
        if ((error as { code?: string } | null)?.code === 'P2002') {
          throw new ConflictException('You have already reviewed this product');
        }
        throw error;
      }
    });
  }

  async updateMine(userId: number, productId: string, dto: UpdateReviewDto) {
    const review = await this.findMine(userId, productId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: review.id },
        data: { rating: dto.rating, comment: dto.comment },
      });
      await this.recalculate(tx, productId);
      return updated;
    });
  }

  async removeMine(userId: number, productId: string) {
    const review = await this.findMine(userId, productId);
    await this.removeById(review.id);
  }

  async removeById(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });
      await this.recalculate(tx, review.productId);
    });
  }

  private async findMine(userId: number, productId: string) {
    const review = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  private async assertProductVisible(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  // Only buyers whose order was paid can review the product
  private async assertPurchased(userId: number, productId: string) {
    const purchase = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
      },
      select: { id: true },
    });

    if (!purchase) {
      throw new ForbiddenException('Only customers who bought this product can review it');
    }
  }

  private async recalculate(tx: Tx, productId: string) {
    const { _avg, _count } = await tx.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Math.round((_avg.rating ?? 0) * 100) / 100,
        ratingCount: _count._all,
      },
    });
  }
}
