import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shape esperado para uma linha `WorkItemWatcher` (Migration 2 — §5.3).
 * Usamos interface local em vez de importar do Prisma client porque o model
 * ainda nao existe ate a migration ser aplicada.
 */
export interface WorkItemWatcherShape {
  workItemId: string;
  userId: string;
  addedAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export class WatcherResponseDto {
  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  addedAt!: Date;

  @ApiPropertyOptional()
  userName!: string | null;

  @ApiPropertyOptional()
  userEmail!: string | null;

  static fromEntity(entity: WorkItemWatcherShape): WatcherResponseDto {
    const dto = new WatcherResponseDto();
    dto.taskId = entity.workItemId;
    dto.userId = entity.userId;
    dto.addedAt = entity.addedAt;
    dto.userName = entity.user?.name ?? null;
    dto.userEmail = entity.user?.email ?? null;
    return dto;
  }
}
