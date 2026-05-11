import { ApiProperty } from '@nestjs/swagger';
import { CustomFieldDefinitionResponseDto } from './custom-field-definition-response.dto';

export class GroupedCustomFieldsResponseDto {
  @ApiProperty({ type: [CustomFieldDefinitionResponseDto] })
  space!: CustomFieldDefinitionResponseDto[];

  @ApiProperty({ type: [CustomFieldDefinitionResponseDto] })
  folder!: CustomFieldDefinitionResponseDto[];

  @ApiProperty({ type: [CustomFieldDefinitionResponseDto] })
  list!: CustomFieldDefinitionResponseDto[];

  @ApiProperty({ type: [CustomFieldDefinitionResponseDto] })
  taskType!: CustomFieldDefinitionResponseDto[];
}
