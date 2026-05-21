import { ApiProperty } from '@nestjs/swagger';
import { CustomFieldDefinitionResponseDto } from './custom-field-definition-response.dto';

export class ManagerCustomFieldLocationDto {
  @ApiProperty({ enum: ['list', 'folder', 'space'] })
  type!: 'list' | 'folder' | 'space';

  @ApiProperty()
  id!: string;
}

export class ManagerCustomFieldTaskTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ManagerCustomFieldItemDto extends CustomFieldDefinitionResponseDto {
  @ApiProperty({ type: [ManagerCustomFieldLocationDto] })
  locations!: ManagerCustomFieldLocationDto[];

  @ApiProperty({ type: [ManagerCustomFieldTaskTypeDto] })
  taskTypes!: ManagerCustomFieldTaskTypeDto[];

  @ApiProperty()
  usageCount!: number;
}
