import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessInstance, ProcessStatus } from '@prisma/client';

export class ProcessInstanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  processId: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty({ enum: ProcessStatus })
  status: ProcessStatus;

  @ApiPropertyOptional()
  startedAt: Date | null;

  @ApiPropertyOptional()
  completedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ProcessInstance): ProcessInstanceResponseDto {
    const dto = new ProcessInstanceResponseDto();
    dto.id = entity.id;
    dto.processId = entity.processId;
    dto.orderId = entity.orderId;
    dto.status = entity.status;
    dto.startedAt = entity.startedAt;
    dto.completedAt = entity.completedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
