import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DropdownOptionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ description: 'Hex color (#RRGGBB)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
