import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderChecklistItemDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderChecklistItemsDto {
  @ApiProperty({ type: [ReorderChecklistItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReorderChecklistItemDto)
  items!: ReorderChecklistItemDto[];
}
