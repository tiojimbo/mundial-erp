import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderItemDto {
  @ApiProperty({ description: 'ID do status' })
  @IsString()
  id: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderWorkflowStatusesDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
