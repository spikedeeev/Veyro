import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

type AuthedRequest = { user: { id: number } };

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.favoritesService.list(req.user.id);
  }

  @Put(':productId')
  @HttpCode(204)
  add(@Req() req: AuthedRequest, @Param('productId') productId: string) {
    return this.favoritesService.add(req.user.id, productId);
  }

  @Delete(':productId')
  @HttpCode(204)
  remove(@Req() req: AuthedRequest, @Param('productId') productId: string) {
    return this.favoritesService.remove(req.user.id, productId);
  }
}
