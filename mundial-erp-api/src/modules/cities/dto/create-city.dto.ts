import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCityDto {
  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'clxyz123abc' })
  @IsString()
  stateId: string;

  @ApiPropertyOptional({ example: '3550308' })
  @IsOptional()
  @IsString()
  ibgeCode?: string;

  @ApiPropertyOptional({ example: 456 })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
