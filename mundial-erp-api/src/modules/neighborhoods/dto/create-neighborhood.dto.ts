import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNeighborhoodDto {
  @ApiProperty({ example: 'Centro' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'clxyz123abc' })
  @IsString()
  cityId: string;

  @ApiPropertyOptional({ example: 789 })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
