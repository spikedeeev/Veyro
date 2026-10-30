import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums';

export class CreateOrderDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  shippingAddress: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
