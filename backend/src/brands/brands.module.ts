import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [BrandsController],
  providers: [BrandsService],
})
export class BrandsModule {}
