import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Workspace, WorkspacePlan } from '@prisma/client';

// Vive em common/ (não em modules/workspaces/dto) para quebrar o ciclo
// AuthModule ↔ WorkspacesModule.
export class WorkspaceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  logoUrl!: string | null;

  @ApiPropertyOptional()
  color!: string | null;

  @ApiProperty({ enum: WorkspacePlan })
  plan!: WorkspacePlan;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: Workspace): WorkspaceResponseDto {
    const dto = new WorkspaceResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.logoUrl = entity.logoUrl ?? null;
    dto.color = entity.color ?? null;
    dto.plan = entity.plan;
    dto.ownerId = entity.ownerId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

export class WorkspaceSeatsResponseDto {
  @ApiProperty({ example: 3 })
  membersUsed!: number;

  @ApiProperty({ example: 100 })
  membersTotal!: number;

  @ApiProperty({ example: 1 })
  guestsUsed!: number;

  @ApiProperty({ example: 50 })
  guestsTotal!: number;
}
