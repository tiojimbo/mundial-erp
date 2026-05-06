import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class QueryCustomFieldDefinitionsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CustomFieldType })
  @IsOptional()
  @IsEnum(CustomFieldType)
  type?: CustomFieldType;

  @ApiPropertyOptional({
    example: 'cnpj',
    description: 'Busca case-insensitive em key/label.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
