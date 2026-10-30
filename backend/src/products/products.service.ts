import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import {
  ListProductsQueryDto,
  ProductSort,
} from './dto/list-products-query.dto';
import {
  ImageStorageService,
  UploadedImage,
} from '../storage/image-storage.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  CreateProductImageDto,
  ReorderProductImagesDto,
} from './dto/product-image.dto';

export const MIN_IMAGES_TO_PUBLISH = 3;

const withImages = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { orderBy: [{ size: 'asc' as const }, { color: 'asc' as const }] },
  category: true,
  brand: true,
};

type NewImage = { url: string; alt?: string | null };

const SORT_ORDER: Record<ProductSort, Prisma.ProductOrderByWithRelationInput> =
  {
    newest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    price_asc: { price: 'asc' },
    price_desc: { price: 'desc' },
    name_asc: { name: 'asc' },
    rating_desc: { ratingAvg: 'desc' },
  };

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorageService,
    private readonly storage: StorageService,
  ) {}

  async findAll(query: ListProductsQueryDto = {}, includeInactive = false) {
    const { page = 1, limit = 20 } = query;

    const price: Prisma.DecimalFilter = {};
    if (query.minPrice !== undefined) price.gte = query.minPrice;
    if (query.maxPrice !== undefined) price.lte = query.maxPrice;

    const where: Prisma.ProductWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(Object.keys(price).length ? { price } : {}),
      ...(query.minRating !== undefined
        ? { ratingAvg: { gte: query.minRating }, ratingCount: { gt: 0 } }
        : {}),
      ...(query.inStock ? { variants: { some: { stock: { gt: 0 } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: withImages,
        orderBy: SORT_ORDER[query.sort ?? 'newest'],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, includeInactive = false) {
    const product = await this.prisma.product.findFirst({
      where: includeInactive ? { id } : { id, isActive: true },
      include: withImages,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const images = dto.images ?? [];
    const isActive = dto.isActive ?? false;

    this.assertCanPublish(isActive, images.length);
    await this.assertRelationsExist(dto);

    const urls = await this.imageStorage.importUrls(images.map((i) => i.url));

    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          isActive,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          images: {
            create: images.map((image, index) => ({
              url: urls[index],
              alt: image.alt,
              sortOrder: index,
              isPrimary: index === 0,
            })),
          },
        },
        include: withImages,
      });
    } catch (error) {
      await this.storage.remove(urls);
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id, true);

    if (dto.isActive === true) {
      this.assertCanPublish(true, product.images.length);
    }

    await this.assertRelationsExist(dto);

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: withImages,
    });
  }

  async remove(id: string) {
    const product = await this.findOne(id, true);
    await this.prisma.product.delete({ where: { id } });
    await this.storage.remove(product.images.map((image) => image.url));
  }

  async importImages(productId: string, images: CreateProductImageDto[]) {
    await this.findOne(productId, true);
    const urls = await this.imageStorage.importUrls(images.map((i) => i.url));

    return this.appendImages(
      productId,
      urls.map((url, index) => ({ url, alt: images[index].alt })),
    );
  }

  async uploadImages(productId: string, files: UploadedImage[]) {
    if (files.length === 0) {
      throw new BadRequestException('Attach at least one image in "files"');
    }

    await this.findOne(productId, true);
    const urls = await this.imageStorage.saveUploadedMany(files);

    return this.appendImages(
      productId,
      urls.map((url) => ({ url })),
    );
  }

  async removeImage(productId: string, imageId: string) {
    const product = await this.findOne(productId, true);
    const image = product.images.find((item) => item.id === imageId);

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    this.assertCanPublish(product.isActive, product.images.length - 1);

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });

      if (image.isPrimary) {
        const next = product.images.find((item) => item.id !== imageId);

        if (next) {
          await tx.productImage.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    await this.storage.remove([image.url]);
  }

  async reorderImages(productId: string, dto: ReorderProductImagesDto) {
    const product = await this.findOne(productId, true);
    const existing = new Set(product.images.map((image) => image.id));

    if (
      dto.imageIds.length !== existing.size ||
      !dto.imageIds.every((id) => existing.has(id))
    ) {
      throw new BadRequestException(
        'imageIds must contain exactly all image ids of the product',
      );
    }

    await this.prisma.$transaction(
      dto.imageIds.map((id, index) =>
        this.prisma.productImage.update({
          where: { id },
          data: { sortOrder: index, isPrimary: index === 0 },
        }),
      ),
    );

    return this.findOne(productId, true);
  }

  // Stored files are removed again if the database write fails
  private async appendImages(productId: string, images: NewImage[]) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.productImage.findMany({
          where: { productId },
          orderBy: { sortOrder: 'asc' },
        });
        const start = existing.length
          ? existing[existing.length - 1].sortOrder + 1
          : 0;

        for (const [index, image] of images.entries()) {
          await tx.productImage.create({
            data: {
              productId,
              url: image.url,
              alt: image.alt,
              sortOrder: start + index,
              isPrimary: existing.length === 0 && index === 0,
            },
          });
        }
      });
    } catch (error) {
      await this.storage.remove(images.map((image) => image.url));
      throw error;
    }

    return this.findOne(productId, true);
  }

  private async assertRelationsExist(dto: {
    categoryId?: string | null;
    brandId?: string | null;
  }) {
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });

      if (!category) {
        throw new BadRequestException('Category does not exist');
      }
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
        select: { id: true },
      });

      if (!brand) {
        throw new BadRequestException('Brand does not exist');
      }
    }
  }

  private assertCanPublish(isActive: boolean, imageCount: number) {
    if (isActive && imageCount < MIN_IMAGES_TO_PUBLISH) {
      throw new BadRequestException(
        `A published product requires at least ${MIN_IMAGES_TO_PUBLISH} images`,
      );
    }
  }
}
