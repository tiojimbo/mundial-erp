import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductClassification, ProductStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class ListProductsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por nome, código ou EAN' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: ProductClassification })
  @IsOptional()
  @IsEnum(ProductClassification)
  classification?: ProductClassification;

  @ApiPropertyOptional({ description: 'ID do tipo de produto' })
  @IsOptional()
  @IsString()
  productTypeId?: string;

  @ApiPropertyOptional({ description: 'ID da marca' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ description: 'ID do departamento' })
  @IsOptional()
  @IsString()
  departmentCategoryId?: string;
}
