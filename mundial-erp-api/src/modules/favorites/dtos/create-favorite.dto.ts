import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteEntity } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateFavoriteDto {
  @ApiProperty({ enum: FavoriteEntity })
  @IsEnum(FavoriteEntity)
  entityType!: FavoriteEntity;

  @ApiProperty()
  @IsString()
  @Length(1, 64)
  entityId!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
