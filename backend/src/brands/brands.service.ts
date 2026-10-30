import { Injectable, NotFoundException } from '@nestjs/common';
import { mapCatalogError } from '../common/catalog-errors';
import { PrismaService } from '../database/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

const label = 'Brand';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });

    if (!brand) {
      throw new NotFoundException(`${label} not found`);
    }

    return brand;
  }

  create(dto: CreateBrandDto) {
    return this.prisma.brand
      .create({ data: { name: dto.name } })
      .catch((error) => mapCatalogError(error, label));
  }

  update(id: string, dto: UpdateBrandDto) {
    return this.prisma.brand
      .update({ where: { id }, data: { name: dto.name } })
      .catch((error) => mapCatalogError(error, label));
  }

  async remove(id: string) {
    await this.prisma.brand
      .delete({ where: { id } })
      .catch((error) => mapCatalogError(error, label));
  }
}
