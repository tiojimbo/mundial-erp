import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { StatusType } from '@prisma/client';

export class StatusBulkItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ enum: StatusType })
  @IsEnum(StatusType)
  type!: StatusType;

  @ApiProperty()
  @IsHexColor()
  color!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  position!: number;
}

export class StatusBulkDto {
  @ApiProperty({ type: [StatusBulkItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StatusBulkItemDto)
  statuses!: StatusBulkItemDto[];
}
