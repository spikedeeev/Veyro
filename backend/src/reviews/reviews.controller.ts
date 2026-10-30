import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PageQueryDto } from '../common/page-query.dto';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

type AuthedRequest = { user: { id: number } };

@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Param('productId') productId: string, @Query() query: PageQueryDto) {
    return this.reviewsService.list(productId, query.page, query.limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @Req() req: AuthedRequest,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, productId, dto);
  }

  @Patch('mine')
  @UseGuards(JwtAuthGuard)
  update(
    @Req() req: AuthedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateMine(req.user.id, productId, dto);
  }

  @Delete('mine')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: AuthedRequest, @Param('productId') productId: string) {
    return this.reviewsService.removeMine(req.user.id, productId);
  }
}

// Moderation: admins can delete any review
@Controller('reviews')
export class ReviewsAdminController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.reviewsService.removeById(id);
  }
}
