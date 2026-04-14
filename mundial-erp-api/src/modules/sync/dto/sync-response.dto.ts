import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SyncEntity, SyncStatus } from '@prisma/client';

export class SyncJobResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  message: string;
}

export class SyncLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SyncEntity })
  entity: SyncEntity;

  @ApiProperty({ enum: SyncStatus })
  status: SyncStatus;

  @ApiProperty()
  totalRecords: number;

  @ApiProperty()
  syncedRecords: number;

  @ApiProperty()
  failedRecords: number;

  @ApiPropertyOptional()
  startedAt: Date | null;

  @ApiPropertyOptional()
  completedAt: Date | null;

  @ApiPropertyOptional()
  errorMessage: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class SyncStatusResponseDto {
  @ApiProperty()
  configured: boolean;

  @ApiProperty()
  circuitBreakerOpen: boolean;

  @ApiPropertyOptional()
  lastSyncPerEntity: Record<string, SyncLogResponseDto | null>;

  @ApiProperty()
  queuedJobs: number;

  @ApiProperty()
  activeJobs: number;
}

export class SyncJobStatusResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  state: string;

  @ApiPropertyOptional()
  progress: number | object;

  @ApiPropertyOptional()
  result: unknown;

  @ApiPropertyOptional()
  failedReason: string;
}
