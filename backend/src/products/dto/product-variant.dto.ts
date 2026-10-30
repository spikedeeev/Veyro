import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductVariantDto {
  // e.g. "M", "42", "ONE SIZE"
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  size: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  color: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number;
}

export class UpdateProductVariantDto extends PartialType(
  CreateProductVariantDto,
) {}
