import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StatusMappingItemDto {
  @ApiProperty()
  @IsString()
  sourceStatusId!: string;

  @ApiProperty()
  @IsString()
  targetStatusId!: string;
}

export enum CustomFieldMoveAction {
  KEEP = 'KEEP',
  CLEAR = 'CLEAR',
}

export class CustomFieldActionDto {
  @ApiProperty()
  @IsString()
  customFieldId!: string;

  @ApiProperty({ enum: CustomFieldMoveAction })
  @IsEnum(CustomFieldMoveAction)
  action!: CustomFieldMoveAction;
}

export class MoveToListDto {
  @ApiProperty()
  @IsString()
  targetListId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  taskIds!: string[];

  @ApiProperty({ type: [StatusMappingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusMappingItemDto)
  statusMapping!: StatusMappingItemDto[];

  @ApiPropertyOptional({ type: [CustomFieldActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldActionDto)
  customFieldActions?: CustomFieldActionDto[];
}
