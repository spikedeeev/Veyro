import { Injectable, NotFoundException } from '@nestjs/common';
import { mapCatalogError } from '../common/catalog-errors';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const label = 'Category';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`${label} not found`);
    }

    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category
      .create({ data: { name: dto.name } })
      .catch((error) => mapCatalogError(error, label));
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.prisma.category
      .update({ where: { id }, data: { name: dto.name } })
      .catch((error) => mapCatalogError(error, label));
  }

  async remove(id: string) {
    await this.prisma.category
      .delete({ where: { id } })
      .catch((error) => mapCatalogError(error, label));
  }
}
