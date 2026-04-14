import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCategory, WorkflowStatus } from '@prisma/client';

export class WorkflowStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: StatusCategory })
  category: StatusCategory;

  @ApiProperty()
  color: string;

  @ApiPropertyOptional()
  icon: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  departmentId: string;

  @ApiPropertyOptional()
  departmentName?: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: WorkflowStatus & { department?: { name: string } },
  ): WorkflowStatusResponseDto {
    const dto = new WorkflowStatusResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.category = entity.category;
    dto.color = entity.color;
    dto.icon = entity.icon;
    dto.sortOrder = entity.sortOrder;
    dto.departmentId = entity.departmentId;
    dto.departmentName = entity.department?.name;
    dto.isDefault = entity.isDefault;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
