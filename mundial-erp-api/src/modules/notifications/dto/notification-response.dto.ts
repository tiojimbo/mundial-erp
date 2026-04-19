import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Notification } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty({ example: 'cuid-notification-id' })
  id: string;

  @ApiProperty({ example: 'cuid-user-id' })
  userId: string;

  @ApiProperty({
    example: 'task.overdue',
    description: 'Tipo da notificacao em formato dot-notation',
  })
  type: string;

  @ApiProperty({ example: 'primary', description: 'Categoria da notificacao' })
  category: string;

  @ApiProperty({ example: 'Tarefa atrasada' })
  title: string;

  @ApiProperty({ example: 'A tarefa "Revisar pedido #42" esta atrasada.' })
  description: string;

  @ApiPropertyOptional({ example: 'cuid-entity-id' })
  entityId: string | null;

  @ApiPropertyOptional({ example: '/bpm/processes/abc/tasks/xyz' })
  entityUrl: string | null;

  @ApiProperty({ example: 'unread', description: 'Status da notificacao' })
  status: string;

  @ApiPropertyOptional({ example: '2026-04-17T09:00:00.000Z' })
  snoozedUntil: string | null;

  @ApiPropertyOptional({ example: '2026-04-16T14:30:00.000Z' })
  readAt: string | null;

  @ApiPropertyOptional({ example: '2026-04-16T15:00:00.000Z' })
  clearedAt: string | null;

  @ApiProperty({ example: '2026-04-16T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-04-16T12:00:00.000Z' })
  updatedAt: string;

  /**
   * Converts a Prisma Notification entity to a response DTO.
   * Transforms enum values to lowercase dot-notation for the frontend:
   * - Type: TASK_OVERDUE -> 'task.overdue', TASK_DUE_SOON -> 'task.due_soon'
   * - Category: PRIMARY -> 'primary', OTHER -> 'other'
   * - Status: UNREAD -> 'unread', READ -> 'read', CLEARED -> 'cleared', SNOOZED -> 'snoozed'
   */
  static fromEntity(entity: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.type = entity.type.toLowerCase().replace(/_/g, '.');
    dto.category = entity.category.toLowerCase();
    dto.title = entity.title;
    dto.description = entity.description;
    dto.entityId = entity.entityId ?? null;
    dto.entityUrl = entity.entityUrl ?? null;
    dto.status = entity.status.toLowerCase();
    dto.snoozedUntil = entity.snoozedUntil?.toISOString() ?? null;
    dto.readAt = entity.readAt?.toISOString() ?? null;
    dto.clearedAt = entity.clearedAt?.toISOString() ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
