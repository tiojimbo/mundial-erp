import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChannelVisibility } from '@prisma/client';

export class UpdateChannelDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  topic?: string;

  @ApiPropertyOptional({ enum: ChannelVisibility })
  @IsOptional()
  @IsEnum(ChannelVisibility)
  visibility?: ChannelVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationEntity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;
}
