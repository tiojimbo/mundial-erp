import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Mundial Telhas', description: 'Nome da marca' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID no Pro Finanças (legado)',
  })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
