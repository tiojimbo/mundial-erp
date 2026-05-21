import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { StatusInheritance } from '@prisma/client';
import { StatusBulkItemDto } from '../../spaces/dto/status-bulk.dto';

export class ListStatusInheritBulkDto {
  @ApiProperty({ enum: StatusInheritance })
  @IsEnum(StatusInheritance)
  statusInheritance!: StatusInheritance;

  @ApiPropertyOptional({ type: [StatusBulkItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => StatusBulkItemDto)
  statuses?: StatusBulkItemDto[];
}
