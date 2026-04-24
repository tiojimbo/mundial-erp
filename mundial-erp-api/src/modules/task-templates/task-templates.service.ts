/**
 * TaskTemplatesService — PLANO-TASKS.md §7.3 / §8.9 (Templates).
 *
 * Responsabilidades:
 *   - CRUD de `WorkItemTemplate` com cross-tenant 404.
 *   - `snapshot(fromTaskId)`: captura subtree (depth ≤ 3, ≤ 200 nodes) e
 *     grava como payload do template.
 *   - `instantiate(processId, templateId)`: expande o payload em WorkItems
 *     + Checklists + Items + Tags dentro de `$transaction`.
 *
 * Todos os metodos sao workspace-scoped (1a clausula `where`). Contagens
 * (`subtaskCount`, `checklistCount`) sao denormalizadas em create/update a
 * partir do payload — evita N+1 em list views.
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma, TaskTemplateScope, TaskPriority } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import { TaskTemplatesRepository } from './task-templates.repository';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { UpdateTemplateDto } from './dtos/update-template.dto';
import {
  InstantiateTemplateDto,
  InstantiateTemplateResponseDto,
} from './dtos/instantiate-template.dto';
import { SnapshotTemplateQueryDto } from './dtos/snapshot-template.dto';
import {
  TemplateResponseDto,
  WorkItemTemplateShape,
} from './dtos/template-response.dto';
import { TemplateFiltersDto } from './dtos/template-filters.dto';
import {
  TEMPLATE_MAX_DEPTH,
  TEMPLATE_MAX_NODES,
} from './pipes/template-payload.validator';

/**
 * Shape do payload de template apos validacao pelo pipe. Todos os campos
 * sao opcionais exceto `title` (validado no pipe). As subtrees sao
 * recursivas; o contador real de profundidade/nos ja esta garantido pelo
 * pipe antes de chegar aqui.
 */
interface TemplatePayloadNode {
  title: string;
  description?: string;
  markdown?: string;
  priority?: string;
  estimatedMinutes?: number;
  tags?: string[];
  checklists?: Array<{
    name: string;
    items?: Array<{ name: string; parentId?: string }>;
  }>;
  subtasks?: TemplatePayloadNode[];
}

interface SnapshotChecklistItem {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
}

interface SnapshotChecklist {
  id: string;
  name: string;
  items: SnapshotChecklistItem[];
}

interface SnapshotTag {
  tag: { id: string; name: string };
}

interface SnapshotTaskNode {
  id: string;
  title: string;
  description: string | null;
  markdownContent: string | null;
  priority: TaskPriority;
  estimatedMinutes: number | null;
  checklists: SnapshotChecklist[];
  tags: SnapshotTag[];
  children?: SnapshotTaskNode[];
}

const OUTBOX_EVENT_SUBTASK_ADDED = 'SUBTASK_ADDED' as const;

@Injectable()
export class TaskTemplatesService {
  private readonly logger = new Logger(TaskTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskTemplatesRepository,
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async findAll(
    workspaceId: string,
    filters: TemplateFiltersDto = new TemplateFiltersDto(),
  ): Promise<{ items: TemplateResponseDto[]; total: number }> {
    const { items, total } = await this.repository.findMany(workspaceId, {
      skip: filters.skip ?? 0,
      take: filters.limit ?? 20,
      scope: filters.scope,
      departmentId: filters.departmentId,
      processId: filters.processId,
      search: filters.search,
    });
    return {
      items: items.map((entity) =>
        TemplateResponseDto.fromEntity(this.toShape(entity)),
      ),
      total,
    };
  }

  async findOne(workspaceId: string, id: string): Promise<TemplateResponseDto> {
    const entity = await this.repository.findById(workspaceId, id);
    if (!entity) {
      // Cross-tenant e inexistente sao indistinguiveis (§8.1).
      throw new NotFoundException('Template nao encontrado');
    }
    return TemplateResponseDto.fromEntity(this.toShape(entity));
  }

  async create(
    workspaceId: string,
    dto: CreateTemplateDto,
    actorUserId: string,
  ): Promise<TemplateResponseDto> {
    const payload = this.asPayload(dto.payload);
    this.assertScopeInvariants(dto.scope, dto.departmentId, dto.processId);

    const { subtaskCount, checklistCount } = this.countDenorm(payload);

    const entity = await this.repository.create({
      workspaceId,
      name: dto.name.trim(),
      scope: dto.scope ?? TaskTemplateScope.WORKSPACE,
      departmentId: dto.departmentId ?? null,
      processId: dto.processId ?? null,
      payload: payload as unknown as Prisma.InputJsonValue,
      subtaskCount,
      checklistCount,
      createdBy: actorUserId,
    });

    this.logger.log(
      `task-template.created id=${entity.id} ws=${workspaceId} actor=${actorUserId}`,
    );
    return TemplateResponseDto.fromEntity(this.toShape(entity));
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateTemplateDto,
    actorUserId: string,
  ): Promise<TemplateResponseDto> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Template nao encontrado');
    }

    const scope = dto.scope ?? existing.scope;
    const departmentId = dto.departmentId ?? existing.departmentId;
    const processId = dto.processId ?? existing.processId;
    this.assertScopeInvariants(scope, departmentId, processId);

    const data: {
      name?: string;
      scope?: TaskTemplateScope;
      departmentId?: string | null;
      processId?: string | null;
      payload?: Prisma.InputJsonValue;
      subtaskCount?: number;
      checklistCount?: number;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.departmentId !== undefined)
      data.departmentId = dto.departmentId ?? null;
    if (dto.processId !== undefined) data.processId = dto.processId ?? null;

    if (dto.payload !== undefined) {
      const payload = this.asPayload(dto.payload);
      const { subtaskCount, checklistCount } = this.countDenorm(payload);
      data.payload = payload as unknown as Prisma.InputJsonValue;
      data.subtaskCount = subtaskCount;
      data.checklistCount = checklistCount;
    }

    const updated = await this.repository.update(workspaceId, id, data);
    this.logger.log(
      `task-template.updated id=${id} ws=${workspaceId} actor=${actorUserId}`,
    );
    return TemplateResponseDto.fromEntity(this.toShape(updated));
  }

  async remove(
    workspaceId: string,
    id: string,
    actorUserId: string,
  ): Promise<void> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Template nao encontrado');
    }
    await this.repository.softDelete(workspaceId, id);
    this.logger.log(
      `task-template.removed id=${id} ws=${workspaceId} actor=${actorUserId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

  /**
   * Captura a subtree de `fromTaskId` como novo payload do template `id`.
   * Respeita os mesmos limites do `TemplatePayloadValidatorPipe` (≤ 200
   * nodes, depth ≤ 3). Falha cedo com 400 se estourar qualquer limite.
   */
  async snapshot(
    workspaceId: string,
    id: string,
    query: SnapshotTemplateQueryDto,
    actorUserId: string,
  ): Promise<TemplateResponseDto> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Template nao encontrado');
    }

    const rootTask = await this.repository.findTaskForSnapshot(
      workspaceId,
      query.fromTaskId,
    );
    if (!rootTask) {
      throw new NotFoundException('Task origem nao encontrada');
    }

    const payload = this.buildPayloadFromTask(rootTask as SnapshotTaskNode, 1);
    const { subtaskCount, checklistCount } = this.countDenorm(payload);

    const updated = await this.repository.update(workspaceId, id, {
      payload: payload as unknown as Prisma.InputJsonValue,
      subtaskCount,
      checklistCount,
    });

    this.logger.log(
      `task-template.snapshot id=${id} from=${query.fromTaskId} ` +
        `ws=${workspaceId} nodes=${subtaskCount + 1} actor=${actorUserId}`,
    );
    return TemplateResponseDto.fromEntity(this.toShape(updated));
  }

  private buildPayloadFromTask(
    node: SnapshotTaskNode,
    depth: number,
  ): TemplatePayloadNode {
    if (depth > TEMPLATE_MAX_DEPTH) {
      throw new BadRequestException(
        `Snapshot excede profundidade ${TEMPLATE_MAX_DEPTH} de subtasks`,
      );
    }

    const tags = (node.tags ?? [])
      .map((link) => link.tag?.name)
      .filter((name): name is string => typeof name === 'string');

    const checklists = (node.checklists ?? []).map((cl) => ({
      name: cl.name,
      items: (cl.items ?? []).map((it) => ({
        name: it.name,
        ...(it.parentId ? { parentId: it.parentId } : {}),
      })),
    }));

    const subtasks = (node.children ?? []).map((child) =>
      this.buildPayloadFromTask(child, depth + 1),
    );

    const out: TemplatePayloadNode = {
      title: node.title,
    };
    if (node.description !== null && node.description !== undefined)
      out.description = node.description;
    if (node.markdownContent !== null && node.markdownContent !== undefined)
      out.markdown = node.markdownContent;
    if (node.priority) out.priority = node.priority;
    if (typeof node.estimatedMinutes === 'number')
      out.estimatedMinutes = node.estimatedMinutes;
    if (tags.length > 0) out.tags = tags;
    if (checklists.length > 0) out.checklists = checklists;
    if (subtasks.length > 0) out.subtasks = subtasks;

    return out;
  }

  // ---------------------------------------------------------------------------
  // Instantiate
  // ---------------------------------------------------------------------------

  /**
   * Expande o payload do template em uma arvore de WorkItems + Checklists +
   * Items + Tags dentro de uma transacao atomica. Ids sao sempre regerados
   * pelo banco (`cuid()` default). Falha transacional faz rollback.
   */
  async instantiate(
    workspaceId: string,
    processId: string,
    templateId: string,
    dto: InstantiateTemplateDto,
    actorUserId: string,
  ): Promise<InstantiateTemplateResponseDto> {
    // 1) Validacoes cheap antes da tx.
    const template = await this.repository.findById(workspaceId, templateId);
    if (!template) {
      throw new NotFoundException('Template nao encontrado');
    }
    const process = await this.repository.findProcessInWorkspace(
      workspaceId,
      processId,
    );
    if (!process) {
      throw new NotFoundException('Process nao encontrado');
    }

    const payload = this.asPayload(template.payload);
    const { subtaskCount } = this.countDenorm(payload);
    // Cap duro adicional mesmo que o pipe tenha sido bypassed (defense-in-depth).
    if (subtaskCount + 1 > TEMPLATE_MAX_NODES) {
      throw new BadRequestException(
        `Template excede ${TEMPLATE_MAX_NODES} nos`,
      );
    }

    const statusId = dto.statusId
      ? dto.statusId
      : (await this.repository.findDefaultStatusForProcess(processId))?.id;
    if (!statusId) {
      throw new BadRequestException(
        'Nenhum WorkflowStatus NOT_STARTED disponivel para este process',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      return this.instantiateInTx(tx, {
        workspaceId,
        processId,
        actorUserId,
        payload,
        statusId,
        rootParentId: dto.parentId ?? null,
        rootTitleOverride: dto.title,
      });
    });

    this.logger.log(
      `task-template.instantiated template=${templateId} ` +
        `root=${result.rootTaskId} nodes=${result.nodesCreated} ` +
        `checklists=${result.checklistsCreated} tags=${result.tagsCreated} ` +
        `ws=${workspaceId} actor=${actorUserId}`,
    );

    return result;
  }

  private async instantiateInTx(
    tx: Prisma.TransactionClient,
    ctx: {
      workspaceId: string;
      processId: string;
      actorUserId: string;
      payload: TemplatePayloadNode;
      statusId: string;
      rootParentId: string | null;
      rootTitleOverride?: string;
    },
  ): Promise<InstantiateTemplateResponseDto> {
    // Cache de tag nameLower -> tagId para dedup entre a raiz e subtasks.
    const tagCache = new Map<string, string>();

    // BFS da arvore de subtasks para respeitar limite de nodes. Processa
    // em DFS recursivo — a arvore nunca passa de depth 3 e 200 nodes.
    const counters = {
      nodes: 0,
      checklists: 0,
      tagsCreated: 0,
    };

    const createWorkItem = async (
      node: TemplatePayloadNode,
      parentId: string | null,
      depth: number,
    ): Promise<string> => {
      if (depth > TEMPLATE_MAX_DEPTH) {
        throw new BadRequestException(
          `Template excede profundidade ${TEMPLATE_MAX_DEPTH} de subtasks`,
        );
      }
      counters.nodes += 1;
      if (counters.nodes > TEMPLATE_MAX_NODES) {
        throw new BadRequestException(
          `Template excede ${TEMPLATE_MAX_NODES} nos`,
        );
      }

      const title =
        depth === 1 && ctx.rootTitleOverride
          ? ctx.rootTitleOverride
          : node.title;

      const priority = this.toPriority(node.priority);

      const created = await tx.workItem.create({
        data: {
          processId: ctx.processId,
          title,
          description: node.description ?? null,
          markdownContent: node.markdown ?? null,
          statusId: ctx.statusId,
          priority,
          estimatedMinutes:
            typeof node.estimatedMinutes === 'number'
              ? node.estimatedMinutes
              : null,
          creatorId: ctx.actorUserId,
          parentId,
        },
        select: { id: true },
      });

      // Checklists + items.
      for (const [clIdx, checklist] of (node.checklists ?? []).entries()) {
        const createdChecklist = await tx.workItemChecklist.create({
          data: {
            workItemId: created.id,
            name: checklist.name,
            position: clIdx,
          },
          select: { id: true },
        });
        counters.checklists += 1;

        // Map nome -> id para resolver parentId por nome (se payload usar
        // parentId textual). Atualmente o payload usa id string livre; se
        // vier um parentId valido corresponde a um item ja criado neste
        // loop. Como o pipe nao valida essa referencia, resolvemos ao
        // melhor esforco; caso nao haja match, parentId fica null.
        const localIdByName = new Map<string, string>();
        for (const [itIdx, item] of (checklist.items ?? []).entries()) {
          const parentLookup =
            item.parentId && localIdByName.has(item.parentId)
              ? (localIdByName.get(item.parentId) ?? null)
              : null;
          const createdItem = await tx.workItemChecklistItem.create({
            data: {
              checklistId: createdChecklist.id,
              name: item.name,
              position: itIdx,
              parentId: parentLookup,
              source: 'TEMPLATE',
            },
            select: { id: true },
          });
          localIdByName.set(item.name, createdItem.id);
        }
      }

      // Tags — dedup dentro do MESMO node (via nameLower) antes de anexar.
      // Dois payload tags "Frontend" e "frontend" contam como 1 link.
      const rawTags = Array.isArray(node.tags) ? node.tags : [];
      const seenOnThisNode = new Set<string>();
      for (const rawTag of rawTags) {
        const key = rawTag.trim().toLowerCase();
        if (key.length === 0) continue;
        if (seenOnThisNode.has(key)) continue;
        seenOnThisNode.add(key);

        let tagId = tagCache.get(key);
        if (!tagId) {
          const upserted = await this.repository.upsertTagByName(
            ctx.workspaceId,
            rawTag,
            tx,
          );
          tagId = upserted.id;
          tagCache.set(key, tagId);
          if (upserted.created) {
            counters.tagsCreated += 1;
          }
        }
        try {
          await tx.workItemTagLink.create({
            data: { workItemId: created.id, tagId },
            select: { workItemId: true },
          });
        } catch (error) {
          // P2002 — link ja existe (race). Propaga demais.
          if (
            !(
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            )
          ) {
            throw error;
          }
        }
      }

      // Subtasks recursivas.
      for (const child of node.subtasks ?? []) {
        const childId = await createWorkItem(child, created.id, depth + 1);

        // Outbox: SUBTASK_ADDED por filho direto (spec do sprint).
        await this.outbox.enqueue(tx, {
          aggregateId: created.id,
          eventType: OUTBOX_EVENT_SUBTASK_ADDED,
          payload: {
            parentTaskId: created.id,
            childTaskId: childId,
            actorId: ctx.actorUserId,
            source: 'TEMPLATE_INSTANTIATE',
          },
          workspaceId: ctx.workspaceId,
        });
      }

      return created.id;
    };

    const rootId = await createWorkItem(ctx.payload, ctx.rootParentId, 1);

    return {
      rootTaskId: rootId,
      nodesCreated: counters.nodes,
      checklistsCreated: counters.checklists,
      tagsCreated: counters.tagsCreated,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Conta (subtaskCount, checklistCount) iterativamente — BFS capado em
   * `TEMPLATE_MAX_NODES`. Defense-in-depth: mesmo que o pipe nao tenha
   * rodado, essa funcao estoura antes de escrever no banco.
   */
  private countDenorm(payload: TemplatePayloadNode): {
    subtaskCount: number;
    checklistCount: number;
  } {
    let nodeCount = 0; // inclui a raiz para defense-in-depth do 200 cap
    let subtaskCount = 0; // exclui a raiz (denorm oficial)
    let checklistCount = 0;

    const queue: Array<{ node: TemplatePayloadNode; isRoot: boolean }> = [
      { node: payload, isRoot: true },
    ];
    while (queue.length > 0) {
      const frame = queue.shift();
      if (!frame) break;
      const { node, isRoot } = frame;
      nodeCount += 1;
      if (nodeCount > TEMPLATE_MAX_NODES) {
        throw new BadRequestException(
          `Template excede ${TEMPLATE_MAX_NODES} nos`,
        );
      }
      if (!isRoot) subtaskCount += 1;

      if (Array.isArray(node.checklists)) {
        checklistCount += node.checklists.length;
      }

      if (Array.isArray(node.subtasks)) {
        for (const child of node.subtasks) {
          queue.push({ node: child, isRoot: false });
        }
      }
    }
    return { subtaskCount, checklistCount };
  }

  /**
   * Casting seguro do payload do DTO para a shape tipada usada pelo service.
   * O pipe `TemplatePayloadValidatorPipe` ja garantiu shape + limites.
   */
  private asPayload(raw: unknown): TemplatePayloadNode {
    if (typeof raw !== 'object' || raw === null) {
      throw new BadRequestException('payload do template deve ser objeto');
    }
    return raw as TemplatePayloadNode;
  }

  private toShape(entity: {
    id: string;
    workspaceId: string;
    name: string;
    scope: TaskTemplateScope;
    departmentId: string | null;
    processId: string | null;
    payload: Prisma.JsonValue;
    subtaskCount: number;
    checklistCount: number;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): WorkItemTemplateShape {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      name: entity.name,
      scope: entity.scope,
      departmentId: entity.departmentId,
      processId: entity.processId,
      payload: (entity.payload ?? {}) as Record<string, unknown>,
      subtaskCount: entity.subtaskCount,
      checklistCount: entity.checklistCount,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    };
  }

  private assertScopeInvariants(
    scope: TaskTemplateScope | undefined,
    departmentId: string | null | undefined,
    processId: string | null | undefined,
  ): void {
    const s = scope ?? TaskTemplateScope.WORKSPACE;
    if (s === TaskTemplateScope.DEPARTMENT && !departmentId) {
      throw new BadRequestException('scope=DEPARTMENT exige departmentId');
    }
    if (s === TaskTemplateScope.PROCESS && !processId) {
      throw new BadRequestException('scope=PROCESS exige processId');
    }
  }

  private toPriority(raw: string | undefined): TaskPriority {
    if (!raw) return TaskPriority.NONE;
    const upper = raw.toUpperCase();
    switch (upper) {
      case 'URGENT':
      case 'HIGH':
      case 'NORMAL':
      case 'LOW':
      case 'NONE':
        return TaskPriority[upper];
      default:
        return TaskPriority.NONE;
    }
  }
}
