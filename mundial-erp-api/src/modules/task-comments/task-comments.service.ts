import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
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
import { ReactionResponseDto } from './dtos/reaction-response.dto';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import { TaskEventsPublisher } from '../automations/events/task-events.publisher';

const OUTBOX_COMMENT_ADDED = 'COMMENT_ADDED' as const;
const LOG_CONTENT_MAX_CHARS = 200;
const MENTION_REGEX = /@([\w.-]+)/g;
const ROLES_MAY_MODERATE: ReadonlySet<WorkspaceMemberRole> =
  new Set<WorkspaceMemberRole>([
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
  ]);

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...[+${value.length - max}]`;
}

function extractMentionUsernames(content: string): string[] {
  const usernames = new Set<string>();
  for (const match of content.matchAll(MENTION_REGEX)) {
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
    @Optional()
    private readonly automationEvents?: TaskEventsPublisher,
  ) {}

  private async loadTaskContext(
    taskId: string,
    workspaceId: string,
  ): Promise<{
    listId: string;
    folderId: string | null;
    spaceId: string | null;
  } | null> {
    const row = await this.prisma.workItem.findFirst({
      where: { id: taskId, deletedAt: null, list: { space: { workspaceId } } },
      select: {
        listId: true,
        list: {
          select: {
            folderId: true,
            spaceId: true,
            folder: { select: { spaceId: true } },
          },
        },
      },
    });
    if (!row) return null;
    return {
      listId: row.listId,
      folderId: row.list.folderId ?? null,
      spaceId: row.list.spaceId ?? row.list.folder?.spaceId ?? null,
    };
  }

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

  async findOne(workspaceId: string, id: string): Promise<CommentResponseDto> {
    const found = await this.repository.findById(workspaceId, id);
    if (!found) {
      throw new NotFoundException('Comentario nao encontrado');
    }
    return CommentResponseDto.fromEntity(found as unknown as CommentShape);
  }

  async create(
    workspaceId: string,
    dto: CreateCommentDto,
    actorUserId: string,
  ): Promise<CommentResponseDto> {
    const taskId = dto.taskId;
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    if (dto.parentId) {
      const parent = await this.repository.assertParentBelongsToTask(
        taskId,
        dto.parentId,
      );
      if (!parent) {
        throw new BadRequestException(
          'Comentario pai nao pertence a esta tarefa',
        );
      }
    }

    if (dto.assigneeId) {
      const assignee = await this.repository.assertUserInWorkspace(
        workspaceId,
        dto.assigneeId,
      );
      if (!assignee) {
        throw new BadRequestException('Usuario destinatario fora do workspace');
      }
    }

    const mentionedUsernames = extractMentionUsernames(dto.content);
    const resolved = mentionedUsernames.length
      ? await this.repository.resolveUsernamesInWorkspace(
          workspaceId,
          mentionedUsernames,
        )
      : [];
    const mentionedUserIds = resolved
      .map((u) => u.id)
      .filter((id) => id !== actorUserId);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await this.repository.create(
        {
          workItemId: taskId,
          authorId: actorUserId,
          content: dto.content,
          contentBlocks: dto.contentBlocks as Prisma.InputJsonValue | undefined,
          parentId: dto.parentId,
          mentions: mentionedUserIds,
          assigneeId: dto.assigneeId,
          assignedById: dto.assigneeId ? actorUserId : undefined,
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
          parentId: dto.parentId ?? null,
          assigneeId: dto.assigneeId ?? null,
          actorId: actorUserId,
        },
        workspaceId,
      });
      return row;
    });

    this.logger.log(
      `task-comment.created task=${taskId} id=${created.id} author=${actorUserId} mentions=${mentionedUserIds.length} parentId=${dto.parentId ?? '-'} assigneeId=${dto.assigneeId ?? '-'} contentPreview="${truncate(dto.content, LOG_CONTENT_MAX_CHARS)}"`,
    );

    if (this.automationEvents) {
      const ctx = await this.loadTaskContext(taskId, workspaceId);
      if (ctx) {
        this.automationEvents.emitCommentCreated({
          workspaceId,
          taskId,
          listId: ctx.listId,
          folderId: ctx.folderId,
          spaceId: ctx.spaceId,
          actorUserId,
          commentId: created.id,
          authorId: actorUserId,
        });
      }
    }

    return CommentResponseDto.fromEntity(created as unknown as CommentShape);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateCommentDto,
    actor: { userId: string; role: WorkspaceMemberRole },
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

    const newContent = dto.content ?? existing.content;
    const mentionedUsernames = extractMentionUsernames(newContent);
    const resolved = mentionedUsernames.length
      ? await this.repository.resolveUsernamesInWorkspace(
          workspaceId,
          mentionedUsernames,
        )
      : [];
    const mentionedUserIds = resolved
      .map((u) => u.id)
      .filter((id) => id !== actor.userId);

    const updated = await this.repository.update(id, {
      content: dto.content,
      contentBlocks: dto.contentBlocks as Prisma.InputJsonValue | undefined,
      mentions: mentionedUserIds,
      editedAt: new Date(),
    });

    this.logger.log(
      `task-comment.updated id=${id} actor=${actor.userId} mentions=${mentionedUserIds.length} contentPreview="${truncate(dto.content ?? '', LOG_CONTENT_MAX_CHARS)}"`,
    );

    return CommentResponseDto.fromEntity(updated as unknown as CommentShape);
  }

  async remove(
    workspaceId: string,
    id: string,
    actor: { userId: string; role: WorkspaceMemberRole },
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

  async toggleReaction(
    workspaceId: string,
    commentId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionResponseDto> {
    const comment = await this.repository.findById(workspaceId, commentId);
    if (!comment) {
      throw new NotFoundException('Comentario nao encontrado');
    }
    const existing = await this.repository.findReaction(
      commentId,
      userId,
      emoji,
    );
    if (existing) {
      await this.repository.deleteReaction(commentId, userId, emoji);
      return { action: 'removed', commentId, userId, emoji };
    }
    await this.repository.createReaction(commentId, userId, emoji);
    return { action: 'added', commentId, userId, emoji };
  }
}
