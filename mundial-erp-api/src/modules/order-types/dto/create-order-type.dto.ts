import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderTypeDto {
  @ApiProperty({ example: 'Venda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
