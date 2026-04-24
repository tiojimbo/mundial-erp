/**
 * TaskCommentsService (TSK-407, PLANO §7.3)
 *
 * Regras:
 *   - body em texto puro canonical. bodyBlocks opcional (BlockNote JSON AST).
 *     NUNCA armazenar HTML bruto.
 *   - @Menções resolvem usernames (regex `@([\w.-]+)`) contra WorkspaceMember
 *     do workspace atual. Desconhecidos sao silenciosamente ignorados.
 *   - Enqueue outbox `COMMENT_ADDED` com `mentionedUserIds` => worker dispara
 *     Notification(type=MENTION/TASK_MENTIONED).
 *   - Author-only ou Manager+ para update/delete.
 *   - Log jamais expoe body completo — truncado em 200 chars.
 */
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskCommentsRepository } from './task-comments.repository';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { CommentFiltersDto } from './dtos/comment-filters.dto';
import {
  CommentResponseDto,
  CommentsListResponseDto,
  type CommentShape,
} from './dtos/comment-response.dto';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';

const OUTBOX_COMMENT_ADDED = 'COMMENT_ADDED' as const;
const LOG_BODY_MAX_CHARS = 200;
const MENTION_REGEX = /@([\w.-]+)/g;
const ROLES_MAY_MODERATE: ReadonlySet<Role> = new Set<Role>([
  Role.ADMIN,
  Role.MANAGER,
]);

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...[+${value.length - max}]`;
}

function extractMentionUsernames(body: string): string[] {
  const usernames = new Set<string>();
  for (const match of body.matchAll(MENTION_REGEX)) {
    usernames.add(match[1].toLowerCase());
  }
  return [...usernames];
}

@Injectable()
export class TaskCommentsService {
  private readonly logger = new Logger(TaskCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskCommentsRepository,
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  async findByTask(
    workspaceId: string,
    taskId: string,
    filters: CommentFiltersDto,
  ): Promise<CommentsListResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const { items, total } = await this.repository.findByTask(
      workspaceId,
      taskId,
      { skip: filters.skip, take: filters.limit },
    );
    const response = new CommentsListResponseDto();
    response.items = items.map((r) =>
      CommentResponseDto.fromEntity(r as unknown as CommentShape),
    );
    response.total = total;
    return response;
  }

  async create(
    workspaceId: string,
    taskId: string,
    dto: CreateCommentDto,
    actorUserId: string,
  ): Promise<CommentResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    // Resolve mencoes antes do tx — read-only, nao precisa atomicidade.
    const mentionedUsernames = extractMentionUsernames(dto.body);
    const resolved = mentionedUsernames.length
      ? await this.repository.resolveUsernamesInWorkspace(
          workspaceId,
          mentionedUsernames,
        )
      : [];
    const mentionedUserIds = resolved
      .map((u) => u.id)
      .filter((id) => id !== actorUserId);

    // Insert + outbox enqueue dentro da mesma $transaction (ADR-003).
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await this.repository.create(
        {
          workItemId: taskId,
          authorId: actorUserId,
          body: dto.body,
          bodyBlocks: dto.bodyBlocks as Prisma.InputJsonValue | undefined,
        },
        tx,
      );
      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_COMMENT_ADDED,
        payload: {
          taskId,
          commentId: row.id,
          authorId: actorUserId,
          mentionedUserIds,
          actorId: actorUserId,
        },
        workspaceId,
      });
      return row;
    });

    this.logger.log(
      `task-comment.created task=${taskId} id=${created.id} author=${actorUserId} mentions=${mentionedUserIds.length} bodyPreview="${truncate(dto.body, LOG_BODY_MAX_CHARS)}"`,
    );

    return CommentResponseDto.fromEntity(created as unknown as CommentShape);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateCommentDto,
    actor: { userId: string; role: Role },
  ): Promise<CommentResponseDto> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Comentario nao encontrado');
    }
    if (
      existing.authorId !== actor.userId &&
      !ROLES_MAY_MODERATE.has(actor.role)
    ) {
      throw new ForbiddenException(
        'Apenas o autor ou Manager+ podem editar este comentario',
      );
    }

    const updated = await this.repository.update(id, {
      body: dto.body,
      bodyBlocks: dto.bodyBlocks as Prisma.InputJsonValue | undefined,
      editedAt: new Date(),
    });

    this.logger.log(
      `task-comment.updated id=${id} actor=${actor.userId} bodyPreview="${truncate(dto.body ?? '', LOG_BODY_MAX_CHARS)}"`,
    );

    return CommentResponseDto.fromEntity(updated as unknown as CommentShape);
  }

  async remove(
    workspaceId: string,
    id: string,
    actor: { userId: string; role: Role },
  ): Promise<void> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Comentario nao encontrado');
    }
    if (
      existing.authorId !== actor.userId &&
      !ROLES_MAY_MODERATE.has(actor.role)
    ) {
      throw new ForbiddenException(
        'Apenas o autor ou Manager+ podem remover este comentario',
      );
    }
    await this.repository.softDelete(id);
  }
}
