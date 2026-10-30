import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ProductReviewsController, ReviewsAdminController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ProductReviewsController, ReviewsAdminController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
