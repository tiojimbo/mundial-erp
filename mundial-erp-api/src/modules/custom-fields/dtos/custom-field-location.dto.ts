import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export type CustomFieldLocationType = 'list' | 'folder' | 'space';
export type CustomFieldLocationAction = 'ADD' | 'MOVE';

const LOCATION_TYPES: CustomFieldLocationType[] = ['list', 'folder', 'space'];
const LOCATION_ACTIONS: CustomFieldLocationAction[] = ['ADD', 'MOVE'];

export class AddCustomFieldLocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customFieldId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({ enum: LOCATION_TYPES })
  @IsEnum(LOCATION_TYPES)
  locationType!: CustomFieldLocationType;

  @ApiProperty({ enum: LOCATION_ACTIONS })
  @IsEnum(LOCATION_ACTIONS)
  action!: CustomFieldLocationAction;
}

export class RemoveCustomFieldLocationQueryDto {
  @ApiProperty({ enum: LOCATION_TYPES })
  @IsEnum(LOCATION_TYPES)
  locationType!: CustomFieldLocationType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  locationId!: string;
}
