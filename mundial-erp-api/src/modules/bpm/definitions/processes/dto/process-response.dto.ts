import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Process, ProcessStatus, ProcessType } from '@prisma/client';

export class ProcessResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  sectorId: string | null;

  @ApiPropertyOptional()
  sectorName?: string;

  @ApiPropertyOptional()
  departmentId: string | null;

  @ApiPropertyOptional()
  areaId: string | null;

  @ApiProperty({ enum: ProcessType })
  processType: ProcessType;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  featureRoute: string | null;

  @ApiProperty()
  isPrivate: boolean;

  @ApiProperty()
  isProtected: boolean;

  @ApiProperty({ enum: ProcessStatus })
  status: ProcessStatus;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional()
  activitiesCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Process & { sector?: { name: string } | null; _count?: { activities: number } },
  ): ProcessResponseDto {
    const dto = new ProcessResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.sectorId = entity.sectorId;
    dto.sectorName = entity.sector?.name;
    dto.departmentId = entity.departmentId;
    dto.areaId = entity.areaId;
    dto.description = entity.description;
    dto.processType = entity.processType;
    dto.featureRoute = entity.featureRoute;
    dto.isPrivate = entity.isPrivate;
    dto.isProtected = entity.isProtected;
    dto.status = entity.status;
    dto.sortOrder = entity.sortOrder;
    dto.activitiesCount = entity._count?.activities;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
