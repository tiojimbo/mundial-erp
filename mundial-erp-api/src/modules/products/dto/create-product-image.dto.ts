import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/products/telha-40mm.jpg', description: 'URL da imagem' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: 0, description: 'Ordem de exibição' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
