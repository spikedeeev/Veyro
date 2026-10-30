import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  MAX_IMAGE_BYTES,
  type UploadedImage,
} from '../storage/image-storage.service';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import {
  ImportProductImagesDto,
  MAX_IMAGES_PER_REQUEST,
  ReorderProductImagesDto,
} from './dto/product-image.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query, false);
  }

  // Declared before ':id' so "admin" is not treated as a product id
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllAdmin(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query, true);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOneAdmin(@Param('id') id: string) {
    return this.productsService.findOne(id, true);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // Downloads the given URLs into our own storage and attaches them
  @Post(':id/images/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  importImages(@Param('id') id: string, @Body() dto: ImportProductImagesDto) {
    return this.productsService.importImages(id, dto.images);
  }

  // multipart/form-data, field name "files", up to 10 images at once
  @Post(':id/images/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES_PER_REQUEST, {
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: UploadedImage[] = [],
  ) {
    return this.productsService.uploadImages(id, files);
  }

  @Put(':id/images/order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderProductImagesDto,
  ) {
    return this.productsService.reorderImages(id, dto);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(id, imageId);
  }
}
