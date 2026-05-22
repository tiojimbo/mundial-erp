import { ApiProperty } from '@nestjs/swagger';
import { CustomFieldDefinition, StatusRequiredField } from '@prisma/client';

export class RequiredFieldCustomFieldDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  label: string;
}

export class StatusRequiredFieldResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  statusId: string;

  @ApiProperty()
  customFieldId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => RequiredFieldCustomFieldDto })
  customField: RequiredFieldCustomFieldDto;

  static fromEntity(
    entity: StatusRequiredField & { customField: CustomFieldDefinition },
  ): StatusRequiredFieldResponseDto {
    const dto = new StatusRequiredFieldResponseDto();
    dto.id = entity.id;
    dto.statusId = entity.statusId;
    dto.customFieldId = entity.customFieldId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.customField = {
      id: entity.customField.id,
      name: entity.customField.key,
      type: entity.customField.type,
      label: entity.customField.label,
    };
    return dto;
  }
}
