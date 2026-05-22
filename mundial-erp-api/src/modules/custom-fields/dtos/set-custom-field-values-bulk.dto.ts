import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CustomFieldValueItemDto {
  @ApiProperty()
  @IsString()
  definitionId!: string;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'null' },
    ],
  })
  @IsDefined()
  value!: unknown;
}

export class SetCustomFieldValuesBulkDto {
  @ApiProperty({ type: [CustomFieldValueItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CustomFieldValueItemDto)
  values!: CustomFieldValueItemDto[];
}
