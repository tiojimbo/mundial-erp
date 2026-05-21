import { Logger } from '@nestjs/common';
import { TasksService } from './tasks.service';

type AnyFn = jest.Mock;

const WS = 'ws-1';
const PARENT = 'parent-task-1';
const SUBTASK = 'sub-1';
const LIST = 'list-1';
const FOLDER = 'folder-1';
const SPACE = 'space-1';
const STATUS_DONE = 'status-done';
const ACTOR = 'user-actor';

interface SiblingStatus {
  status: { type: 'DONE' | 'CLOSED' | 'NOT_STARTED' | 'ACTIVE' | 'CANCELLED' };
}

function buildHarness(opts: { siblings: SiblingStatus[] }) {
  const repository = {
    findExistenceRow: jest.fn(async () => ({
      id: SUBTASK,
      deletedAt: null,
    })),
    findForDiff: jest.fn(async () => ({
      id: SUBTASK,
      listId: LIST,
      statusId: 'status-prev',
      parentId: PARENT,
    })),
    update: jest.fn(async () => ({
      id: SUBTASK,
      listId: LIST,
      statusId: STATUS_DONE,
      parentId: PARENT,
    })),
    findBySelect: jest.fn(async () => ({})),
  };

  const prisma = {
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({})),
    workItem: {
      findFirst: jest.fn(async () => ({
        listId: LIST,
        list: { folderId: FOLDER, spaceId: SPACE, folder: { spaceId: SPACE } },
      })),
      findMany: jest.fn(async () => opts.siblings),
    },
  };

  const outbox = { enqueue: jest.fn(async () => undefined) };
  const linksRepository = { moveEdgesForMerge: jest.fn() };
  const assigneesSync = { syncAssignees: jest.fn() };
  const watchersSync = { syncWatchers: jest.fn() };
  const tagsSync = { syncTags: jest.fn() };
  const redis = { get: jest.fn(), set: jest.fn() };

  const publisher = {
    emitTaskCreated: jest.fn(),
    emitTaskUpdated: jest.fn(),
    emitTaskStatusChanged: jest.fn(),
    emitTaskPriorityChanged: jest.fn(),
    emitTaskNameChanged: jest.fn(),
    emitTaskTypeChanged: jest.fn(),
    emitTaskDueDateChanged: jest.fn(),
    emitTaskStartDateChanged: jest.fn(),
    emitTaskAssigned: jest.fn(),
    emitTaskMovedToList: jest.fn(),
    emitAssigneeRemoved: jest.fn(),
    emitAllSubtasksResolved: jest.fn(),
  };

  Logger.overrideLogger([
    { log: () => undefined, warn: () => undefined, error: () => undefined } as never,
  ]);

  const service = new TasksService(
    prisma as never,
    repository as never,
    linksRepository as never,
    outbox as never,
    assigneesSync as never,
    watchersSync as never,
    tagsSync as never,
    redis as never,
    undefined,
    undefined,
    undefined,
    publisher as never,
  );

  return { service, prisma, repository, publisher };
}

describe('TasksService — checkAllSubtasksResolved (emit AllSubtasksResolved)', () => {
  it('emite emitAllSubtasksResolved quando todos os siblings ja estao DONE/CLOSED', async () => {
    const h = buildHarness({
      siblings: [{ status: { type: 'DONE' } }, { status: { type: 'CLOSED' } }],
    });

    await h.service.update(WS, SUBTASK, { statusId: STATUS_DONE }, ACTOR);

    // Aguarda a tarefa fire-and-forget (`void this.checkAllSubtasksResolved(...)`).
    await new Promise((r) => setImmediate(r));

    expect(h.publisher.emitAllSubtasksResolved).toHaveBeenCalledTimes(1);
    const arg = h.publisher.emitAllSubtasksResolved.mock
      .calls[0][0] as Record<string, unknown>;
    expect(arg.taskId).toBe(PARENT);
    expect(arg.parentTaskId).toBe(PARENT);
    expect(arg.workspaceId).toBe(WS);
    expect(arg.listId).toBe(LIST);
  });

  it('NAO emite quando algum sibling nao esta resolvido (ACTIVE)', async () => {
    const h = buildHarness({
      siblings: [
        { status: { type: 'DONE' } },
        { status: { type: 'ACTIVE' } },
      ],
    });

    await h.service.update(WS, SUBTASK, { statusId: STATUS_DONE }, ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(h.publisher.emitAllSubtasksResolved).not.toHaveBeenCalled();
  });

  it('NAO emite quando nao ha siblings', async () => {
    const h = buildHarness({ siblings: [] });

    await h.service.update(WS, SUBTASK, { statusId: STATUS_DONE }, ACTOR);
    await new Promise((r) => setImmediate(r));

    expect(h.publisher.emitAllSubtasksResolved).not.toHaveBeenCalled();
  });
});
