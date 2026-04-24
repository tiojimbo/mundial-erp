/**
 * Unit tests — TasksService.create (PLANO-TASKS §7.2).
 *
 * Estrategia: mock profundo das unicas superficies que o metodo toca
 * (repository + sync services + outbox + $transaction). Nao sobe Nest
 * nem Postgres — spec runnable imediato (`npm run test`).
 *
 * Casos cobertos (9):
 *   1. defaults: statusId resolvido via findFirstStatusForProcess quando ausente.
 *   2. com assignees: syncAssignees chamado com add=dto.assignees, rem=[].
 *   3. com tagIds: syncTags chamado.
 *   4. com watchers: syncWatchers chamado.
 *   5. processId nao pertence ao workspace -> NotFoundException (404).
 *   6. sem assignees/watchers/tags -> zero calls aos sync services.
 *   7. outbox.enqueue chamado 1x com eventType CREATED.
 *   8. transacao: se repository.createTask lanca, toda operacao rollback e
 *      outbox NAO enfileira.
 *   9. statusId informado no dto: findFirstStatusForProcess nao e chamado.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import type { CreateTaskDto } from './dtos/create-task.dto';

type TxShape = Record<string, never>;

interface MockPrisma {
  $transaction: jest.Mock;
}

interface MockRepository {
  findProcessInWorkspace: jest.Mock;
  findFirstStatusForProcess: jest.Mock;
  createTask: jest.Mock;
  findBySelect: jest.Mock;
}

interface MockSync {
  syncAssignees?: jest.Mock;
  syncWatchers?: jest.Mock;
  syncTags?: jest.Mock;
}

interface MockOutbox {
  enqueue: jest.Mock;
}

interface Harness {
  service: TasksService;
  prisma: MockPrisma;
  repository: MockRepository;
  depsRepository: { moveEdgesForMerge: jest.Mock };
  linksRepository: { moveEdgesForMerge: jest.Mock };
  outbox: MockOutbox;
  assignees: Required<Pick<MockSync, 'syncAssignees'>>;
  watchers: Required<Pick<MockSync, 'syncWatchers'>>;
  tags: Required<Pick<MockSync, 'syncTags'>>;
}

const WS = 'ws-1';
const PROCESS = 'process-1';
const ACTOR = 'user-actor';
const DEFAULT_STATUS = 'status-not-started-1';
const CREATED_TASK_ID = 'task-created-1';

function buildHarness(opts?: {
  processInWorkspace?: { id: string; departmentId: string } | null;
  defaultStatus?: { id: string } | null;
  createThrows?: Error;
}): Harness {
  const tx: TxShape = {};

  const createdRow = {
    id: CREATED_TASK_ID,
    processId: PROCESS,
    title: 'stub',
    description: null,
    statusId: DEFAULT_STATUS,
    itemType: 'TASK',
    priority: 'NONE',
    primaryAssigneeCache: null,
    creatorId: ACTOR,
    parentId: null,
    startDate: null,
    dueDate: null,
    completedAt: null,
    closedAt: null,
    estimatedMinutes: null,
    trackedMinutes: 0,
    sortOrder: 0,
    archived: false,
    archivedAt: null,
    customTypeId: null,
    points: null,
    timeSpentSeconds: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: {
      id: DEFAULT_STATUS,
      name: 'To Do',
      category: 'NOT_STARTED',
      color: '#94a3b8',
      icon: null,
    },
  };

  const repository: MockRepository = {
    findProcessInWorkspace: jest.fn(async () =>
      opts?.processInWorkspace === undefined
        ? { id: PROCESS, departmentId: 'dept-1' }
        : opts.processInWorkspace,
    ),
    findFirstStatusForProcess: jest.fn(async () =>
      opts?.defaultStatus === undefined
        ? { id: DEFAULT_STATUS }
        : opts.defaultStatus,
    ),
    createTask: jest.fn(async () => {
      if (opts?.createThrows) throw opts.createThrows;
      return createdRow;
    }),
    findBySelect: jest.fn(async () => createdRow),
  };

  const outbox: MockOutbox = {
    enqueue: jest.fn(async () => 'event-id'),
  };

  const assignees = { syncAssignees: jest.fn(async () => undefined) };
  const watchers = { syncWatchers: jest.fn(async () => undefined) };
  const tags = { syncTags: jest.fn(async () => undefined) };

  const prisma: MockPrisma = {
    $transaction: jest.fn(async (cb: (tx: TxShape) => unknown) => cb(tx)),
  };

  const depsRepository = {
    moveEdgesForMerge: jest.fn(async () => undefined),
  };
  const linksRepository = {
    moveEdgesForMerge: jest.fn(async () => undefined),
  };
  const redis = { get: jest.fn(), set: jest.fn() };

  const service = new TasksService(
    prisma as never,
    repository as never,
    depsRepository as never,
    linksRepository as never,
    outbox as never,
    assignees as never,
    watchers as never,
    tags as never,
    redis as never,
  );

  return {
    service,
    prisma,
    repository,
    depsRepository,
    linksRepository,
    outbox,
    assignees,
    watchers,
    tags,
  };
}

function dto(overrides: Partial<CreateTaskDto> = {}): CreateTaskDto {
  return { title: 'Nova task', ...overrides } as CreateTaskDto;
}

describe('TasksService.create', () => {
  it('cria task com defaults; statusId resolvido via findFirstStatusForProcess', async () => {
    const h = buildHarness();

    const env = await h.service.create(WS, PROCESS, dto(), ACTOR);

    expect(h.repository.findProcessInWorkspace).toHaveBeenCalledWith(WS, PROCESS);
    expect(h.repository.findFirstStatusForProcess).toHaveBeenCalledWith(PROCESS);
    expect(h.repository.createTask).toHaveBeenCalledTimes(1);

    const callArg = h.repository.createTask.mock.calls[0][1] as {
      statusId: string;
      processId: string;
      creatorId: string;
      title: string;
    };
    expect(callArg.statusId).toBe(DEFAULT_STATUS);
    expect(callArg.processId).toBe(PROCESS);
    expect(callArg.creatorId).toBe(ACTOR);
    expect(callArg.title).toBe('Nova task');
    // `create` passou a retornar o DTO direto (sem envelope interno); o
    // ResponseInterceptor global aplica o wrap `{data, meta}` ao sair do
    // controller — nao repete aqui.
    expect(env.id).toBe(CREATED_TASK_ID);
  });

  it('com assignees: syncAssignees chamado com add=dto.assignees, rem=[]', async () => {
    const h = buildHarness();

    await h.service.create(
      WS,
      PROCESS,
      dto({ assignees: ['u-1', 'u-2'] }),
      ACTOR,
    );

    expect(h.assignees.syncAssignees).toHaveBeenCalledTimes(1);
    const arg = h.assignees.syncAssignees.mock.calls[0][1] as {
      add: string[];
      rem: string[];
      taskId: string;
      actorUserId: string;
      workspaceId: string;
    };
    expect(arg.add).toEqual(['u-1', 'u-2']);
    expect(arg.rem).toEqual([]);
    expect(arg.taskId).toBe(CREATED_TASK_ID);
    expect(arg.actorUserId).toBe(ACTOR);
    expect(arg.workspaceId).toBe(WS);
  });

  it('com tagIds: syncTags chamado com add=dto.tagIds', async () => {
    const h = buildHarness();

    await h.service.create(
      WS,
      PROCESS,
      dto({ tagIds: ['tag-1', 'tag-2'] }),
      ACTOR,
    );

    expect(h.tags.syncTags).toHaveBeenCalledTimes(1);
    const arg = h.tags.syncTags.mock.calls[0][1] as {
      add: string[];
      rem: string[];
    };
    expect(arg.add).toEqual(['tag-1', 'tag-2']);
    expect(arg.rem).toEqual([]);
  });

  it('com watchers: syncWatchers chamado com add=dto.watchers', async () => {
    const h = buildHarness();

    await h.service.create(
      WS,
      PROCESS,
      dto({ watchers: ['w-1'] }),
      ACTOR,
    );

    expect(h.watchers.syncWatchers).toHaveBeenCalledTimes(1);
    const arg = h.watchers.syncWatchers.mock.calls[0][1] as {
      add: string[];
      rem: string[];
    };
    expect(arg.add).toEqual(['w-1']);
    expect(arg.rem).toEqual([]);
  });

  it('processId nao pertence ao workspace -> NotFoundException 404', async () => {
    const h = buildHarness({ processInWorkspace: null });

    await expect(
      h.service.create(WS, 'process-other-ws', dto(), ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Garantia: nenhuma escrita deve ter ocorrido quando 404.
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
    expect(h.repository.createTask).not.toHaveBeenCalled();
    expect(h.outbox.enqueue).not.toHaveBeenCalled();
  });

  it('sem assignees/watchers/tags: zero calls aos sync services', async () => {
    const h = buildHarness();

    await h.service.create(WS, PROCESS, dto(), ACTOR);

    expect(h.assignees.syncAssignees).not.toHaveBeenCalled();
    expect(h.watchers.syncWatchers).not.toHaveBeenCalled();
    expect(h.tags.syncTags).not.toHaveBeenCalled();
  });

  it('outbox.enqueue chamado 1x com eventType CREATED', async () => {
    const h = buildHarness();

    await h.service.create(WS, PROCESS, dto({ title: 'Task X' }), ACTOR);

    expect(h.outbox.enqueue).toHaveBeenCalledTimes(1);
    const arg = h.outbox.enqueue.mock.calls[0][1] as {
      aggregateId: string;
      eventType: string;
      payload: Record<string, unknown>;
      workspaceId: string;
    };
    expect(arg.eventType).toBe('CREATED');
    expect(arg.aggregateId).toBe(CREATED_TASK_ID);
    expect(arg.workspaceId).toBe(WS);
    expect(arg.payload).toMatchObject({
      taskId: CREATED_TASK_ID,
      processId: PROCESS,
      actorId: ACTOR,
      title: 'Task X',
      statusId: DEFAULT_STATUS,
    });
  });

  it('transacao: se repo.createTask lanca, toda operacao rollback e outbox NAO enfileira', async () => {
    const boom = new Error('db fail');
    const h = buildHarness({ createThrows: boom });

    await expect(
      h.service.create(
        WS,
        PROCESS,
        dto({ assignees: ['u-1'], tagIds: ['t-1'], watchers: ['w-1'] }),
        ACTOR,
      ),
    ).rejects.toBe(boom);

    // A transacao foi aberta mas a falha impede outbox e qualquer sync
    // subsequente (createTask e a primeira escrita da tx).
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(h.outbox.enqueue).not.toHaveBeenCalled();
    expect(h.assignees.syncAssignees).not.toHaveBeenCalled();
    expect(h.tags.syncTags).not.toHaveBeenCalled();
    expect(h.watchers.syncWatchers).not.toHaveBeenCalled();
  });

  it('statusId informado no dto: findFirstStatusForProcess nao e chamado', async () => {
    const h = buildHarness();

    await h.service.create(
      WS,
      PROCESS,
      dto({ statusId: 'status-explicit' }),
      ACTOR,
    );

    expect(h.repository.findFirstStatusForProcess).not.toHaveBeenCalled();
    const arg = h.repository.createTask.mock.calls[0][1] as {
      statusId: string;
    };
    expect(arg.statusId).toBe('status-explicit');
  });

  it('dueDate < startDate -> BadRequestException antes da transacao', async () => {
    const h = buildHarness();

    await expect(
      h.service.create(
        WS,
        PROCESS,
        dto({
          startDate: '2026-05-10T00:00:00.000Z',
          dueDate: '2026-05-01T00:00:00.000Z',
        }),
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(h.prisma.$transaction).not.toHaveBeenCalled();
    expect(h.repository.createTask).not.toHaveBeenCalled();
  });
});
