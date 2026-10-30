import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
} from './dto/product-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(productId: string, dto: CreateProductVariantDto) {
    await this.assertProductExists(productId);

    return this.withConflictMapping(() =>
      this.prisma.productVariant.create({ data: { ...dto, productId } }),
    );
  }

  async update(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    await this.findVariant(productId, variantId);

    return this.withConflictMapping(() =>
      this.prisma.productVariant.update({
        where: { id: variantId },
        data: dto,
      }),
    );
  }

  async remove(productId: string, variantId: string) {
    await this.findVariant(productId, variantId);
    await this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  private async assertProductExists(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async findVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }

  private async withConflictMapping<T>(action: () => Promise<T>) {
    try {
      return await action();
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'P2002') {
        throw new ConflictException(
          'Variant with this size and color already exists',
        );
      }
      throw error;
    }
  }
}
