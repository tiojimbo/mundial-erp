import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

const MAX_BUCKET_SIZE = 500;

export class SidebarOrderDto {
  @ApiPropertyOptional({ type: [String], maxItems: MAX_BUCKET_SIZE })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BUCKET_SIZE)
  @ArrayUnique()
  @IsString({ each: true })
  spaces?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: MAX_BUCKET_SIZE })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BUCKET_SIZE)
  @ArrayUnique()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: MAX_BUCKET_SIZE })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BUCKET_SIZE)
  @ArrayUnique()
  @IsString({ each: true })
  favorites?: string[];
}

export class SidebarOrderResponseDto {
  @ApiProperty({ type: [String], required: false })
  spaces?: string[];

  @ApiProperty({ type: [String], required: false })
  channels?: string[];

  @ApiProperty({ type: [String], required: false })
  favorites?: string[];
}
