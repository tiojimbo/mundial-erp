import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusType } from '@prisma/client';
import { MoveTaskService } from './move-task.service';
import { MoveTaskRepository, MoveTaskRow } from './move-task.repository';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import { TaskEventsPublisher } from '../automations/events/task-events.publisher';
import { CustomFieldMoveAction } from './dtos/move-to-list.dto';

const WS = 'ws-1';
const ACTOR = 'user-1';
const TARGET_LIST = 'list-y';

const targetListRow = {
  id: TARGET_LIST,
  name: 'Agenda Comercial',
  spaceId: 'space-y',
  folderId: null,
  statusInheritance: 'SPACE' as const,
  folder: null,
};

const targetChain = [
  { id: 'y-todo', name: 'A fazer', type: StatusType.NOT_STARTED, position: 0 },
  { id: 'y-doing', name: 'Andamento', type: StatusType.ACTIVE, position: 1 },
  { id: 'y-done', name: 'Feito', type: StatusType.DONE, position: 2 },
];

function makeRepo(): jest.Mocked<MoveTaskRepository> {
  return {
    findTargetList: jest.fn(),
    findTasksInWorkspace: jest.fn(),
    expandSubtasks: jest.fn().mockResolvedValue([]),
    findStatusesByIds: jest.fn(),
    findStatusChainForList: jest.fn().mockResolvedValue(targetChain),
    findListHierarchies: jest.fn().mockResolvedValue(new Map()),
    findListNames: jest.fn().mockResolvedValue(new Map()),
    findApplicableCustomFields: jest.fn().mockResolvedValue([]),
    countTasksWithValue: jest.fn().mockResolvedValue(new Map()),
    applyMove: jest.fn().mockResolvedValue(undefined),
    clearCustomFieldValues: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MoveTaskRepository>;
}

function makeService(repo: MoveTaskRepository) {
  const outbox = {
    enqueue: jest.fn().mockResolvedValue('event-id'),
  } as unknown as jest.Mocked<TaskOutboxService>;
  const events = {
    emitTaskMovedToList: jest.fn(),
    emitTaskStatusChanged: jest.fn(),
  } as unknown as jest.Mocked<TaskEventsPublisher>;
  const prisma = {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb({})),
  } as unknown as { $transaction: jest.Mock };
  const service = new MoveTaskService(prisma as never, repo, outbox, events);
  return { service, outbox, events };
}

const task = (
  id: string,
  statusId: string,
  listId = 'list-x',
  parentId: string | null = null,
): MoveTaskRow => ({ id, statusId, listId, parentId });

describe('MoveTaskService.preview', () => {
  it('marca needsReconciliation=false quando todo status tem equivalente', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-todo')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-todo',
        name: 'Aberto',
        type: StatusType.NOT_STARTED,
        position: 0,
      },
    ]);
    const { service } = makeService(repo);

    const result = await service.preview(WS, ['t1'], TARGET_LIST);

    expect(result.needsReconciliation).toBe(false);
    expect(result.statusDiffs).toEqual([
      expect.objectContaining({
        sourceStatusId: 'x-todo',
        autoTargetStatusId: 'y-todo',
        taskCount: 1,
      }),
    ]);
  });

  it('marca needsReconciliation=true quando falta equivalente de type', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-closed')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-closed',
        name: 'Finalizado',
        type: StatusType.CLOSED,
        position: 3,
      },
    ]);
    const { service } = makeService(repo);

    const result = await service.preview(WS, ['t1'], TARGET_LIST);

    expect(result.needsReconciliation).toBe(true);
    expect(result.statusDiffs[0].autoTargetStatusId).toBeNull();
  });

  it('404 quando list de destino nao existe', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(null);
    const { service } = makeService(repo);

    await expect(service.preview(WS, ['t1'], TARGET_LIST)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('MoveTaskService.moveToList', () => {
  const baseDto = {
    targetListId: TARGET_LIST,
    taskIds: ['t1'],
    statusMapping: [],
  };

  it('aplica auto-map e enfileira MOVED_TO_LIST + STATUS_CHANGED', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-todo')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-todo',
        name: 'Aberto',
        type: StatusType.NOT_STARTED,
        position: 0,
      },
    ]);
    repo.findListNames.mockResolvedValue(
      new Map([
        ['list-x', 'Agenda Interna'],
        [TARGET_LIST, 'Agenda Comercial'],
      ]),
    );
    const { service, outbox, events } = makeService(repo);

    const result = await service.moveToList(WS, baseDto, ACTOR);

    expect(result).toEqual({ moved: 1 });
    expect(repo.applyMove).toHaveBeenCalledWith(
      expect.anything(),
      't1',
      TARGET_LIST,
      'y-todo',
    );
    const enqueuedTypes = outbox.enqueue.mock.calls.map((c) => c[1].eventType);
    expect(enqueuedTypes).toContain('MOVED_TO_LIST');
    expect(enqueuedTypes).toContain('STATUS_CHANGED');
    const statusChanged = outbox.enqueue.mock.calls.find(
      (c) => c[1].eventType === 'STATUS_CHANGED',
    );
    expect(statusChanged?.[1].payload).toMatchObject({ listId: TARGET_LIST });
    expect(events.emitTaskMovedToList).toHaveBeenCalledTimes(1);
  });

  it('move subtask junto com a parent', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-todo')]);
    repo.expandSubtasks.mockResolvedValue([
      task('sub1', 'x-doing', 'list-x', 't1'),
    ]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-todo',
        name: 'Aberto',
        type: StatusType.NOT_STARTED,
        position: 0,
      },
      { id: 'x-doing', name: 'Fazendo', type: StatusType.ACTIVE, position: 1 },
    ]);
    repo.findListNames.mockResolvedValue(
      new Map([[TARGET_LIST, 'Agenda Comercial']]),
    );
    const { service } = makeService(repo);

    const result = await service.moveToList(WS, baseDto, ACTOR);

    expect(result.moved).toBe(2);
    expect(repo.applyMove).toHaveBeenCalledWith(
      expect.anything(),
      'sub1',
      TARGET_LIST,
      'y-doing',
    );
  });

  it('400 quando falta mapping para status sem equivalente', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-closed')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-closed',
        name: 'Finalizado',
        type: StatusType.CLOSED,
        position: 3,
      },
    ]);
    const { service } = makeService(repo);

    await expect(service.moveToList(WS, baseDto, ACTOR)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('usa o statusMapping manual quando fornecido', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-closed')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-closed',
        name: 'Finalizado',
        type: StatusType.CLOSED,
        position: 3,
      },
    ]);
    repo.findListNames.mockResolvedValue(
      new Map([[TARGET_LIST, 'Agenda Comercial']]),
    );
    const { service } = makeService(repo);

    const result = await service.moveToList(
      WS,
      {
        ...baseDto,
        statusMapping: [
          { sourceStatusId: 'x-closed', targetStatusId: 'y-done' },
        ],
      },
      ACTOR,
    );

    expect(result.moved).toBe(1);
    expect(repo.applyMove).toHaveBeenCalledWith(
      expect.anything(),
      't1',
      TARGET_LIST,
      'y-done',
    );
  });

  it('400 quando o targetStatusId manual nao pertence a list de destino', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-closed')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-closed',
        name: 'Finalizado',
        type: StatusType.CLOSED,
        position: 3,
      },
    ]);
    const { service } = makeService(repo);

    await expect(
      service.moveToList(
        WS,
        {
          ...baseDto,
          statusMapping: [
            {
              sourceStatusId: 'x-closed',
              targetStatusId: 'status-de-outra-list',
            },
          ],
        },
        ACTOR,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('limpa custom fields marcados como CLEAR', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-todo')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-todo',
        name: 'Aberto',
        type: StatusType.NOT_STARTED,
        position: 0,
      },
    ]);
    repo.findListNames.mockResolvedValue(
      new Map([[TARGET_LIST, 'Agenda Comercial']]),
    );
    const { service } = makeService(repo);

    await service.moveToList(
      WS,
      {
        ...baseDto,
        customFieldActions: [
          { customFieldId: 'cf-1', action: CustomFieldMoveAction.CLEAR },
        ],
      },
      ACTOR,
    );

    expect(repo.clearCustomFieldValues).toHaveBeenCalledWith(
      expect.anything(),
      ['t1'],
      ['cf-1'],
    );
  });

  it('move 0 quando a task ja esta na list de destino', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([
      task('t1', 'x-todo', TARGET_LIST),
    ]);
    const { service } = makeService(repo);

    const result = await service.moveToList(WS, baseDto, ACTOR);

    expect(result).toEqual({ moved: 0 });
    expect(repo.applyMove).not.toHaveBeenCalled();
  });
});

describe('MoveTaskService.moveToListAuto', () => {
  it('aplica auto-map sem precisar de mapping manual', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-todo')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-todo',
        name: 'Aberto',
        type: StatusType.NOT_STARTED,
        position: 0,
      },
    ]);
    repo.findListNames.mockResolvedValue(
      new Map([[TARGET_LIST, 'Agenda Comercial']]),
    );
    const { service } = makeService(repo);

    const result = await service.moveToListAuto(WS, 't1', TARGET_LIST, ACTOR);

    expect(result).toEqual({ moved: 1 });
    expect(repo.applyMove).toHaveBeenCalledWith(
      expect.anything(),
      't1',
      TARGET_LIST,
      'y-todo',
    );
  });

  it('cai no primeiro status do destino quando nao ha equivalente de type', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(targetListRow as never);
    repo.findTasksInWorkspace.mockResolvedValue([task('t1', 'x-closed')]);
    repo.findStatusesByIds.mockResolvedValue([
      {
        id: 'x-closed',
        name: 'Finalizado',
        type: StatusType.CLOSED,
        position: 3,
      },
    ]);
    repo.findListNames.mockResolvedValue(
      new Map([[TARGET_LIST, 'Agenda Comercial']]),
    );
    const { service } = makeService(repo);

    const result = await service.moveToListAuto(WS, 't1', TARGET_LIST, null);

    expect(result).toEqual({ moved: 1 });
    expect(repo.applyMove).toHaveBeenCalledWith(
      expect.anything(),
      't1',
      TARGET_LIST,
      'y-todo',
    );
  });

  it('move 0 quando a list de destino nao existe (sem lancar)', async () => {
    const repo = makeRepo();
    repo.findTargetList.mockResolvedValue(null);
    const { service } = makeService(repo);

    const result = await service.moveToListAuto(WS, 't1', TARGET_LIST, ACTOR);

    expect(result).toEqual({ moved: 0 });
  });
});
