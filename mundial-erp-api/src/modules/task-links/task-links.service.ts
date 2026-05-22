import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LinkType, Prisma, StatusType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import { TaskLinksRepository, type LinkEdge } from './task-links.repository';
import { CreateLinkDto } from './dtos/create-link.dto';
import {
  DeleteLinkResponseDto,
  LinkedTaskDto,
  WorkItemLinkItemDto,
  type LinkedTaskShape,
} from './dtos/link-response.dto';

const OUTBOX_EVENT_LINK_ADDED = 'LINK_ADDED' as const;
const OUTBOX_EVENT_LINK_REMOVED = 'LINK_REMOVED' as const;

function mapLinkedTask(task: unknown): LinkedTaskDto {
  const t = task as {
    id: string;
    title: string;
    status: {
      id: string;
      name: string;
      color: string;
      type: StatusType;
    } | null;
    customType: { id: string; name: string; icon: string | null } | null;
    list: { id: string; name: string } | null;
  };
  const shape: LinkedTaskShape = {
    id: t.id,
    title: t.title,
    status: t.status,
    customType: t.customType,
    list: t.list,
  };
  return LinkedTaskDto.fromEntity(shape);
}

function inverseType(type: LinkType): LinkType {
  if (type === LinkType.DUPLICATES) return LinkType.IS_DUPLICATED_BY;
  if (type === LinkType.IS_DUPLICATED_BY) return LinkType.DUPLICATES;
  return type;
}

@Injectable()
export class TaskLinksService {
  private readonly logger = new Logger(TaskLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskLinksRepository,
    private readonly outbox: TaskOutboxService,
  ) {}

  async findAll(
    workspaceId: string,
    taskId: string,
  ): Promise<WorkItemLinkItemDto[]> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const [outgoing, incoming] = await Promise.all([
      this.repository.findOutgoing(workspaceId, taskId),
      this.repository.findIncoming(workspaceId, taskId),
    ]);

    const items: WorkItemLinkItemDto[] = [];
    for (const row of outgoing) {
      const item = new WorkItemLinkItemDto();
      item.id = row.id;
      item.type = row.type;
      item.linkedTask = mapLinkedTask((row as { toTask: unknown }).toTask);
      items.push(item);
    }
    for (const row of incoming) {
      const item = new WorkItemLinkItemDto();
      item.id = row.id;
      item.type = inverseType(row.type);
      item.linkedTask = mapLinkedTask((row as { fromTask: unknown }).fromTask);
      items.push(item);
    }

    return items;
  }

  async create(
    workspaceId: string,
    taskId: string,
    dto: CreateLinkDto,
    actorUserId: string,
  ): Promise<WorkItemLinkItemDto> {
    if (taskId === dto.taskToId) {
      throw new BadRequestException('Uma task nao pode ser linkada a si mesma');
    }

    // Normaliza IS_DUPLICATED_BY: armazena sempre como DUPLICATES no sentido oposto.
    let edge: LinkEdge;
    if (dto.type === LinkType.IS_DUPLICATED_BY) {
      edge = {
        fromTaskId: dto.taskToId,
        toTaskId: taskId,
        type: LinkType.DUPLICATES,
      };
    } else {
      edge = {
        fromTaskId: taskId,
        toTaskId: dto.taskToId,
        type: dto.type,
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const [fromTask, toTask] = await Promise.all([
        this.repository.findTaskInWorkspace(workspaceId, taskId, tx),
        this.repository.findTaskInWorkspace(workspaceId, dto.taskToId, tx),
      ]);
      if (!fromTask || !toTask) {
        throw new NotFoundException('Tarefa nao encontrada');
      }

      const existing = await this.repository.findEdgePair(
        edge.fromTaskId,
        edge.toTaskId,
        edge.type,
        tx,
      );
      if (existing) {
        throw new ConflictException('Este link ja existe');
      }

      try {
        const row = await this.repository.createEdge(edge, tx);
        await this.outbox.enqueue(tx, {
          aggregateId: taskId,
          eventType: OUTBOX_EVENT_LINK_ADDED,
          payload: {
            fromTaskId: edge.fromTaskId,
            toTaskId: edge.toTaskId,
            type: edge.type,
            actorId: actorUserId,
          },
          workspaceId,
        });
        return row;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Este link ja existe');
        }
        throw error;
      }
    });

    if (!created) {
      throw new BadRequestException('Falha ao criar link');
    }

    this.logger.log(
      `task-link.created from=${edge.fromTaskId} to=${edge.toTaskId} type=${edge.type} actor=${actorUserId}`,
    );

    // Resposta na perspectiva da task consultada.
    const isOutgoingForCaller = created.fromTaskId === taskId;
    const otherTaskId = isOutgoingForCaller
      ? created.toTaskId
      : created.fromTaskId;
    const perspectivedType = isOutgoingForCaller
      ? created.type
      : inverseType(created.type);

    const otherTask = await this.prisma.workItem.findUnique({
      where: { id: otherTaskId },
      select: {
        id: true,
        title: true,
        status: { select: { id: true, name: true, color: true, type: true } },
        customType: { select: { id: true, name: true, icon: true } },
        list: { select: { id: true, name: true } },
      },
    });

    const item = new WorkItemLinkItemDto();
    item.id = created.id;
    item.type = perspectivedType;
    item.linkedTask = mapLinkedTask(otherTask);
    return item;
  }

  async remove(
    workspaceId: string,
    taskId: string,
    linkId: string,
    actorUserId: string,
  ): Promise<DeleteLinkResponseDto> {
    await this.prisma.$transaction(async (tx) => {
      const link = await this.repository.findEdgeById(workspaceId, linkId, tx);
      if (!link) {
        throw new NotFoundException('Link nao encontrado');
      }
      if (link.fromTaskId !== taskId && link.toTaskId !== taskId) {
        throw new NotFoundException('Link nao encontrado');
      }

      await this.repository.deleteEdgeById(linkId, tx);

      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_LINK_REMOVED,
        payload: {
          fromTaskId: link.fromTaskId,
          toTaskId: link.toTaskId,
          type: link.type,
          actorId: actorUserId,
        },
        workspaceId,
      });
    });

    this.logger.log(
      `task-link.removed linkId=${linkId} taskId=${taskId} actor=${actorUserId}`,
    );

    return { message: 'Link removido com sucesso' };
  }
}
