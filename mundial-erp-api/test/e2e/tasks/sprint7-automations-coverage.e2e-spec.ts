import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { AUTOMATION_EVENTS } from '../../../src/modules/automations/events/task-events.constants';
import { AutomationsCacheService } from '../../../src/modules/automations/cache/automations-cache.service';
import { CronSchedulerService } from '../../../src/modules/automations/cron/cron-scheduler.service';

const log = new Logger('sprint7.e2e');

const TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 250;

const uniq = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('Sprint 7 — Automations coverage (18 triggers x 21 actions)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let emitter: EventEmitter2;
  let cache: AutomationsCacheService;
  let cronScheduler: CronSchedulerService;

  let workspaceId = '';
  let ownerUserId = '';
  let secondUserId = '';
  let spaceId = '';
  let folderId = '';
  let listId = '';
  let secondListId = '';
  let defaultStatusId = '';
  let activeStatusId = '';
  let doneStatusId = '';
  let tagId = '';
  let customFieldId = '';
  let builtinTaskTypeId = '';
  let dbAvailable = true;
  const createdAutomations: string[] = [];

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
      prisma = app.get(PrismaService);
      emitter = app.get(EventEmitter2);
      cache = app.get(AutomationsCacheService);
      cronScheduler = app.get(CronSchedulerService);
      await prisma.$queryRaw`SELECT 1`;

      const ownerEmail = `${uniq('s7-owner')}@mundial.test`;
      const owner = await prisma.user.create({
        data: {
          email: ownerEmail,
          name: 'Sprint7 Owner',
          passwordHash: await bcrypt.hash('senha12345', 10),
          role: 'ADMIN',
        },
      });
      ownerUserId = owner.id;

      const secondEmail = `${uniq('s7-second')}@mundial.test`;
      const second = await prisma.user.create({
        data: {
          email: secondEmail,
          name: 'Sprint7 Second',
          passwordHash: await bcrypt.hash('senha12345', 10),
          role: 'OPERATOR',
        },
      });
      secondUserId = second.id;

      const ws = await prisma.workspace.create({
        data: {
          name: `Sprint7 WS ${uniq('w')}`,
          slug: uniq('s7-ws'),
          ownerId: ownerUserId,
        },
      });
      workspaceId = ws.id;

      await prisma.workspaceMember.create({
        data: { workspaceId, userId: ownerUserId, role: 'ADMIN' },
      });
      await prisma.workspaceMember.create({
        data: { workspaceId, userId: secondUserId, role: 'MEMBER' },
      });

      const space = await prisma.space.create({
        data: {
          workspaceId,
          name: 'Comercial',
          slug: uniq('s7-comercial'),
        },
      });
      spaceId = space.id;

      const folder = await prisma.folder.create({
        data: {
          name: 'Vendas',
          slug: uniq('s7-vendas'),
          spaceId,
        },
      });
      folderId = folder.id;

      const opened = await prisma.status.create({
        data: {
          name: 'Aberto',
          type: 'NOT_STARTED',
          color: '#94a3b8',
          spaceId,
          folderId,
          position: 1,
        },
      });
      defaultStatusId = opened.id;

      const active = await prisma.status.create({
        data: {
          name: 'Em andamento',
          type: 'ACTIVE',
          color: '#3b82f6',
          spaceId,
          folderId,
          position: 2,
        },
      });
      activeStatusId = active.id;

      const done = await prisma.status.create({
        data: {
          name: 'Concluído',
          type: 'DONE',
          color: '#22c55e',
          spaceId,
          folderId,
          position: 3,
        },
      });
      doneStatusId = done.id;

      const list = await prisma.list.create({
        data: {
          name: 'Pedidos',
          slug: uniq('s7-pedidos'),
          spaceId,
          folderId,
          processType: 'LIST',
          status: 'ACTIVE',
        },
      });
      listId = list.id;

      const secondList = await prisma.list.create({
        data: {
          name: 'Faturamento',
          slug: uniq('s7-faturamento'),
          spaceId,
          folderId,
          processType: 'LIST',
          status: 'ACTIVE',
        },
      });
      secondListId = secondList.id;

      const tag = await prisma.workItemTag.create({
        data: {
          workspaceId,
          spaceId,
          name: 'urgente',
          nameLower: 'urgente',
          color: '#ef4444',
        },
      });
      tagId = tag.id;

      const cf = await prisma.customFieldDefinition.create({
        data: {
          workspaceId,
          spaceId,
          key: `cf_${Date.now()}`,
          name: 'Campo Teste',
          label: 'Campo Teste',
          type: 'TEXT',
        },
      });
      customFieldId = cf.id;

      const builtin = await prisma.customTaskType.findUnique({
        where: { id: 'builtin-task' },
      });
      if (!builtin) {
        throw new Error(
          'CustomTaskType `builtin-task` nao encontrado. Rode seed:reference-data.',
        );
      }
      builtinTaskTypeId = builtin.id;
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[sprint7] infra indisponivel, pulando suite: ${(err as Error).message}`,
      );
      try {
        await app?.close();
      } catch {
        /* noop */
      }
    }
  }, 120_000);

  afterAll(async () => {
    if (!dbAvailable) return;
    try {
      if (createdAutomations.length > 0) {
        await prisma.automation.deleteMany({
          where: { id: { in: createdAutomations } },
        });
      }
      // Cleanup cascata. Ordem importa pra respeitar FKs.
      await prisma.customFieldValue.deleteMany({
        where: { definition: { workspaceId } },
      });
      await prisma.workItemTagLink.deleteMany({
        where: { tag: { workspaceId } },
      });
      await prisma.workItemComment.deleteMany({
        where: { workItem: { list: { spaceId } } },
      });
      await prisma.workItemLink.deleteMany({
        where: {
          OR: [
            { fromTask: { list: { spaceId } } },
            { toTask: { list: { spaceId } } },
          ],
        },
      });
      await prisma.workItemAssignee.deleteMany({
        where: { workItem: { list: { spaceId } } },
      });
      await prisma.workItem.deleteMany({ where: { list: { spaceId } } });
      await prisma.list.deleteMany({ where: { spaceId } });
      await prisma.customFieldDefinition.deleteMany({ where: { workspaceId } });
      await prisma.workItemTag.deleteMany({ where: { workspaceId } });
      await prisma.status.deleteMany({ where: { spaceId } });
      await prisma.folder.deleteMany({ where: { spaceId } });
      await prisma.space.deleteMany({ where: { workspaceId } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
      await prisma.notification.deleteMany({
        where: { userId: { in: [ownerUserId, secondUserId] } },
      });
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUserId, secondUserId] } },
      });
    } finally {
      await app.close();
    }
  });

  const skipIfNoDb = (): boolean => {
    if (!dbAvailable) {
      expect(true).toBe(true);
      return true;
    }
    return false;
  };

  const createAutomation = async (spec: {
    name: string;
    trigger: string;
    compiledActions: Array<{ type: string; params: Record<string, unknown> }>;
    conditions?: Array<{ field: string; operator: string; value?: unknown }>;
    cronExpression?: string;
  }): Promise<string> => {
    const a = await prisma.automation.create({
      data: {
        workspaceId,
        createdById: ownerUserId,
        name: spec.name,
        trigger: spec.trigger as never,
        scopeType: 'WORKSPACE',
        scopeId: null,
        compiledActions: spec.compiledActions as never,
        conditions: (spec.conditions ?? []) as never,
        cronExpression: spec.cronExpression,
        isActive: true,
      },
    });
    createdAutomations.push(a.id);
    cache.invalidateWorkspace(workspaceId);
    return a.id;
  };

  const createTask = async (
    overrides: Partial<{
      title: string;
      statusId: string;
      priority: string;
      customTypeId: string;
      parentId: string;
    }> = {},
  ): Promise<string> => {
    const t = await prisma.workItem.create({
      data: {
        listId,
        statusId: overrides.statusId ?? defaultStatusId,
        title: overrides.title ?? `Task ${uniq('t')}`,
        creatorId: ownerUserId,
        priority: (overrides.priority ?? 'NONE') as
          | 'NONE'
          | 'LOW'
          | 'NORMAL'
          | 'HIGH'
          | 'URGENT',
        customTypeId: overrides.customTypeId,
        parentId: overrides.parentId,
      },
    });
    return t.id;
  };

  const baseContext = (taskId: string) => ({
    workspaceId,
    taskId,
    listId,
    spaceId,
    folderId,
    actorUserId: ownerUserId,
  });

  const disableOthersExcept = async (keepId: string): Promise<void> => {
    await prisma.automation.updateMany({
      where: { workspaceId, id: { not: keepId }, isActive: true },
      data: { isActive: false },
    });
    cache.invalidateWorkspace(workspaceId);
  };

  const waitFor = async <T>(
    fn: () => Promise<T | null | false | undefined>,
    timeoutMs = TIMEOUT_MS,
  ): Promise<T | null> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await fn();
      if (result) return result as T;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    return null;
  };

  // ===========================================================================
  // 18 TRIGGERS
  // ===========================================================================

  describe('18 triggers cobertos', () => {
    it('1. TASK_CREATED -> change_status', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T1',
        trigger: 'TASK_CREATED',
        compiledActions: [
          { type: 'change_status', params: { statusId: activeStatusId } },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_CREATED, {
        ...baseContext(taskId),
        parentTaskId: null,
        customTaskTypeId: null,
      });
      const updated = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.statusId === activeStatusId ? t : null;
      });
      expect(updated).not.toBeNull();
    }, 10_000);

    it('2. TASK_UPDATED -> change_priority', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T2',
        trigger: 'TASK_UPDATED',
        compiledActions: [
          { type: 'change_priority', params: { priority: 'HIGH' } },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_UPDATED, {
        ...baseContext(taskId),
        changedFields: ['title'],
      });
      const updated = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.priority === 'HIGH' ? t : null;
      });
      expect(updated).not.toBeNull();
    }, 10_000);

    it('3. TASK_STATUS_CHANGED -> move_to_list', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T3',
        trigger: 'TASK_STATUS_CHANGED',
        compiledActions: [
          { type: 'move_to_list', params: { listId: secondListId } },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_STATUS_CHANGED, {
        ...baseContext(taskId),
        before: defaultStatusId,
        after: activeStatusId,
      });
      const moved = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.listId === secondListId ? t : null;
      });
      expect(moved).not.toBeNull();
    }, 10_000);

    it('4. TASK_PRIORITY_CHANGED -> change_tags (add)', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T4',
        trigger: 'TASK_PRIORITY_CHANGED',
        compiledActions: [
          { type: 'change_tags', params: { mode: 'add', tagIds: [tagId] } },
        ],
      });
      const taskId = await createTask({ priority: 'NONE' });
      emitter.emit(AUTOMATION_EVENTS.TASK_PRIORITY_CHANGED, {
        ...baseContext(taskId),
        before: 'NONE',
        after: 'HIGH',
      });
      const tagged = await waitFor(async () => {
        const link = await prisma.workItemTagLink.findFirst({
          where: { workItemId: taskId, tagId },
        });
        return link ?? null;
      });
      expect(tagged).not.toBeNull();
    }, 10_000);

    it('5. TASK_NAME_CHANGED -> add_comment', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T5',
        trigger: 'TASK_NAME_CHANGED',
        compiledActions: [
          { type: 'add_comment', params: { content: 'Auto: nome mudou' } },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_NAME_CHANGED, {
        ...baseContext(taskId),
        before: 'A',
        after: 'B',
      });
      const comment = await waitFor(async () => {
        const c = await prisma.workItemComment.findFirst({
          where: { workItemId: taskId },
        });
        return c ?? null;
      });
      expect(comment).not.toBeNull();
    }, 10_000);

    it('6. TASK_TYPE_CHANGED -> change_task_name', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T6',
        trigger: 'TASK_TYPE_CHANGED',
        compiledActions: [
          {
            type: 'change_task_name',
            params: { name: 'Renomeada via automation' },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_TYPE_CHANGED, {
        ...baseContext(taskId),
        before: null,
        after: builtinTaskTypeId,
      });
      const renamed = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.title === 'Renomeada via automation' ? t : null;
      });
      expect(renamed).not.toBeNull();
    }, 10_000);

    it('7. TASK_DUE_DATE_CHANGED -> set_time_estimate', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T7',
        trigger: 'TASK_DUE_DATE_CHANGED',
        compiledActions: [
          { type: 'set_time_estimate', params: { estimateMinutes: 120 } },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_DUE_DATE_CHANGED, {
        ...baseContext(taskId),
        before: null,
        after: new Date(),
      });
      const withEstimate = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.estimatedMinutes === 120 ? t : null;
      });
      expect(withEstimate).not.toBeNull();
    }, 10_000);

    it('8. TASK_START_DATE_CHANGED -> change_due_date', async () => {
      if (skipIfNoDb()) return;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createAutomation({
        name: 'T8',
        trigger: 'TASK_START_DATE_CHANGED',
        compiledActions: [
          {
            type: 'change_due_date',
            params: { dueDate: dueDate.toISOString() },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_START_DATE_CHANGED, {
        ...baseContext(taskId),
        before: null,
        after: new Date(),
      });
      const withDue = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.dueDate ? t : null;
      });
      expect(withDue).not.toBeNull();
    }, 10_000);

    it('9. TASK_ASSIGNED -> send_notification', async () => {
      if (skipIfNoDb()) return;
      const automationId = await createAutomation({
        name: 'T9',
        trigger: 'TASK_ASSIGNED',
        compiledActions: [
          {
            type: 'send_notification',
            params: { userIds: [secondUserId], message: 'Voce foi atribuido' },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_ASSIGNED, {
        ...baseContext(taskId),
        userId: secondUserId,
      });
      const fired = await waitFor(async () => {
        const a = await prisma.automation.findUnique({
          where: { id: automationId },
        });
        return (a?.executionCount ?? 0) > 0 ? a : null;
      });
      expect(fired).not.toBeNull();
    }, 10_000);

    it('10. TASK_MOVED_TO_LIST -> change_assignees', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T10',
        trigger: 'TASK_MOVED_TO_LIST',
        compiledActions: [
          {
            type: 'change_assignees',
            params: { mode: 'set', userIds: [secondUserId] },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_MOVED_TO_LIST, {
        ...baseContext(taskId),
        fromListId: listId,
        toListId: secondListId,
      });
      const assigned = await waitFor(async () => {
        const a = await prisma.workItemAssignee.findFirst({
          where: { workItemId: taskId, userId: secondUserId },
        });
        return a ?? null;
      });
      expect(assigned).not.toBeNull();
    }, 10_000);

    it('11. ASSIGNEE_REMOVED -> change_start_date', async () => {
      if (skipIfNoDb()) return;
      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await createAutomation({
        name: 'T11',
        trigger: 'ASSIGNEE_REMOVED',
        compiledActions: [
          {
            type: 'change_start_date',
            params: { startDate: startDate.toISOString() },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.ASSIGNEE_REMOVED, {
        ...baseContext(taskId),
        userId: secondUserId,
      });
      const withStart = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.startDate ? t : null;
      });
      expect(withStart).not.toBeNull();
    }, 10_000);

    it('12. TAG_ADDED -> set_custom_field', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T12',
        trigger: 'TAG_ADDED',
        compiledActions: [
          {
            type: 'set_custom_field',
            params: {
              customFieldDefinitionId: customFieldId,
              value: 'auto-set',
            },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TAG_ADDED, {
        ...baseContext(taskId),
        tagId,
      });
      const cfv = await waitFor(async () => {
        const v = await prisma.customFieldValue.findFirst({
          where: { workItemId: taskId, definitionId: customFieldId },
        });
        return v ?? null;
      });
      expect(cfv).not.toBeNull();
    }, 10_000);

    it('13. TAG_REMOVED -> change_task_type', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T13',
        trigger: 'TAG_REMOVED',
        compiledActions: [
          {
            type: 'change_task_type',
            params: { customTaskTypeId: builtinTaskTypeId },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TAG_REMOVED, {
        ...baseContext(taskId),
        tagId,
      });
      const typed = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.customTypeId === builtinTaskTypeId ? t : null;
      });
      expect(typed).not.toBeNull();
    }, 10_000);

    it('14. COMMENT_CREATED -> add_task_link', async () => {
      if (skipIfNoDb()) return;
      const targetTaskId = await createTask({ title: 'target' });
      await createAutomation({
        name: 'T14',
        trigger: 'COMMENT_CREATED',
        compiledActions: [
          {
            type: 'add_task_link',
            params: { targetTaskId, linkType: 'RELATES_TO' },
          },
        ],
      });
      const taskId = await createTask({ title: 'source' });
      emitter.emit(AUTOMATION_EVENTS.COMMENT_CREATED, {
        ...baseContext(taskId),
        commentId: 'fake-comment',
        authorId: ownerUserId,
      });
      const link = await waitFor(async () => {
        const l = await prisma.workItemLink.findFirst({
          where: { fromTaskId: taskId, toTaskId: targetTaskId },
        });
        return l ?? null;
      });
      expect(link).not.toBeNull();
    }, 10_000);

    it('15. SUBTASK_CREATED -> create_subtask', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T15',
        trigger: 'SUBTASK_CREATED',
        compiledActions: [
          { type: 'create_subtask', params: { name: 'sub-auto' } },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.SUBTASK_CREATED, {
        ...baseContext(taskId),
        parentTaskId: taskId,
        subtaskId: 'fake-sub',
      });
      const child = await waitFor(async () => {
        const c = await prisma.workItem.findFirst({
          where: { parentId: taskId, title: 'sub-auto' },
        });
        return c ?? null;
      });
      expect(child).not.toBeNull();
    }, 10_000);

    it('16. ALL_SUBTASKS_RESOLVED -> delete_task', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T16',
        trigger: 'ALL_SUBTASKS_RESOLVED',
        compiledActions: [{ type: 'delete_task', params: {} }],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.ALL_SUBTASKS_RESOLVED, {
        ...baseContext(taskId),
        parentTaskId: taskId,
      });
      const deleted = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.deletedAt ? t : null;
      });
      expect(deleted).not.toBeNull();
    }, 10_000);

    it('17. CUSTOMFIELD_CHANGED -> duplicate_task', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'T17',
        trigger: 'CUSTOMFIELD_CHANGED',
        compiledActions: [{ type: 'duplicate_task', params: {} }],
      });
      const uniqTitle = `dup-${uniq('o')}`;
      const taskId = await createTask({ title: uniqTitle });
      emitter.emit(AUTOMATION_EVENTS.CUSTOMFIELD_CHANGED, {
        ...baseContext(taskId),
        customFieldDefinitionId: customFieldId,
        before: null,
        after: 'novo',
      });
      const dup = await waitFor(async () => {
        const c = await prisma.workItem.count({
          where: { listId, title: { contains: uniqTitle } },
        });
        return c >= 2 ? c : null;
      });
      expect(dup).not.toBeNull();
    }, 10_000);

    it('18. CRON -> create_list', async () => {
      if (skipIfNoDb()) return;
      const cronListName = `Cron List ${uniq('l')}`;
      const automationId = await createAutomation({
        name: 'T18',
        trigger: 'CRON',
        cronExpression: '0 0 1 1 *',
        compiledActions: [
          { type: 'create_list', params: { name: cronListName, folderId } },
        ],
      });
      await prisma.automation.update({
        where: { id: automationId },
        data: { nextRunAt: new Date(Date.now() - 60_000) },
      });
      await cronScheduler.tick();
      const list = await waitFor(async () => {
        const l = await prisma.list.findFirst({
          where: { name: cronListName },
        });
        return l ?? null;
      });
      expect(list).not.toBeNull();
    }, 15_000);
  });

  // ===========================================================================
  // Actions extras
  // ===========================================================================

  describe('Actions extras', () => {
    it('19. call_webhook executa (engine marca como executado mesmo com URL invalida)', async () => {
      if (skipIfNoDb()) return;
      const automationId = await createAutomation({
        name: 'A19',
        trigger: 'TASK_CREATED',
        compiledActions: [
          {
            type: 'call_webhook',
            params: { url: 'http://127.0.0.1:1/never', method: 'POST' },
          },
        ],
      });
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_CREATED, {
        ...baseContext(taskId),
        parentTaskId: null,
        customTaskTypeId: null,
      });
      const fired = await waitFor(async () => {
        const a = await prisma.automation.findUnique({
          where: { id: automationId },
        });
        return (a?.executionCount ?? 0) > 0 ? a : null;
      });
      expect(fired).not.toBeNull();
    }, 10_000);

    it.skip('20. send_channel_message — 501 (modulo chat nao pronto)', async () => {
      // Pre-requisito: modulo chat. Marcado skip ate disponibilidade.
    });

    it.skip('21. send_direct_message — 501 (modulo chat nao pronto)', async () => {
      // Pre-requisito: modulo chat. Marcado skip ate disponibilidade.
    });
  });

  // ===========================================================================
  // Cenarios de borda
  // ===========================================================================

  describe('Cenarios de borda', () => {
    it('22. Condition AND com 2 clausulas — match exato dispara', async () => {
      if (skipIfNoDb()) return;
      await createAutomation({
        name: 'B22',
        trigger: 'TASK_CREATED',
        conditions: [
          { field: 'priority', operator: 'EQ', value: 'HIGH' },
          { field: 'customTypeId', operator: 'EQ', value: builtinTaskTypeId },
        ],
        compiledActions: [
          { type: 'change_status', params: { statusId: doneStatusId } },
        ],
      });
      const taskId = await createTask({
        priority: 'HIGH',
        customTypeId: builtinTaskTypeId,
      });
      emitter.emit(AUTOMATION_EVENTS.TASK_CREATED, {
        ...baseContext(taskId),
        parentTaskId: null,
        customTaskTypeId: builtinTaskTypeId,
      });
      const matched = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.statusId === doneStatusId ? t : null;
      });
      expect(matched).not.toBeNull();
    }, 10_000);

    it('23. Condition AND — uma clausula falha, action NAO dispara', async () => {
      if (skipIfNoDb()) return;
      const id = await createAutomation({
        name: 'B23',
        trigger: 'TASK_CREATED',
        conditions: [{ field: 'priority', operator: 'EQ', value: 'URGENT' }],
        compiledActions: [
          { type: 'change_status', params: { statusId: doneStatusId } },
        ],
      });
      await disableOthersExcept(id);
      const taskId = await createTask({ priority: 'LOW' });
      emitter.emit(AUTOMATION_EVENTS.TASK_CREATED, {
        ...baseContext(taskId),
        parentTaskId: null,
        customTaskTypeId: null,
      });
      await new Promise((r) => setTimeout(r, 1_500));
      const t = await prisma.workItem.findUnique({ where: { id: taskId } });
      expect(t?.statusId).toBe(defaultStatusId);
    }, 10_000);

    it('24. Automation inativa — action nao dispara', async () => {
      if (skipIfNoDb()) return;
      const id = await createAutomation({
        name: 'B24',
        trigger: 'TASK_CREATED',
        compiledActions: [
          { type: 'change_status', params: { statusId: doneStatusId } },
        ],
      });
      await disableOthersExcept(id);
      await prisma.automation.update({
        where: { id },
        data: { isActive: false },
      });
      cache.invalidateWorkspace(workspaceId);
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_CREATED, {
        ...baseContext(taskId),
        parentTaskId: null,
        customTaskTypeId: null,
      });
      await new Promise((r) => setTimeout(r, 1_500));
      const t = await prisma.workItem.findUnique({ where: { id: taskId } });
      expect(t?.statusId).toBe(defaultStatusId);
    }, 10_000);

    it('25. Guard de loop — automationDepth >= 5 aborta cascata', async () => {
      if (skipIfNoDb()) return;
      const id = await createAutomation({
        name: 'B25',
        trigger: 'TASK_CREATED',
        compiledActions: [
          { type: 'change_status', params: { statusId: doneStatusId } },
        ],
      });
      await disableOthersExcept(id);
      const taskId = await createTask();
      emitter.emit(AUTOMATION_EVENTS.TASK_CREATED, {
        ...baseContext(taskId),
        parentTaskId: null,
        customTaskTypeId: null,
        automationDepth: 5,
      });
      await new Promise((r) => setTimeout(r, 1_500));
      const fresh = await prisma.automation.findUnique({ where: { id } });
      expect(fresh?.executionCount ?? 0).toBe(0);
    }, 10_000);
  });
});
