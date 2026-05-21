import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional({ enum: StatusType })
  @IsOptional()
  @IsEnum(StatusType)
  type?: StatusType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
