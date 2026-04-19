import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductDepartmentDto {
  @ApiProperty({
    example: 'Telhas',
    description: 'Nome do departamento de produto',
  })
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
