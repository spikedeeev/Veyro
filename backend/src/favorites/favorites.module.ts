import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
