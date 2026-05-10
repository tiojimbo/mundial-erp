import { ActionRunnerService } from './action-runner.service';
import type { TaskEventContext } from '../events/task-events.types';

type MockTx = {
  workItemAssignee: { deleteMany: jest.Mock; upsert: jest.Mock };
  workItemTagLink: { deleteMany: jest.Mock; upsert: jest.Mock };
};

function buildTx(): MockTx {
  return {
    workItemAssignee: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    workItemTagLink: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

function buildPrismaMock() {
  const tx = buildTx();
  return {
    tx,
    workItem: {
      update: jest.fn().mockResolvedValue({ id: 'task-1' }),
      create: jest.fn().mockResolvedValue({ id: 'task-new' }),
      findUnique: jest.fn().mockResolvedValue({
        listId: 'list-1',
        statusId: 'status-1',
        creatorId: 'user-1',
        title: 'origem',
      }),
    },
    workItemAssignee: tx.workItemAssignee,
    workItemTagLink: tx.workItemTagLink,
    customFieldValue: { upsert: jest.fn().mockResolvedValue({}) },
    workItemLink: { create: jest.fn().mockResolvedValue({}) },
    workItemComment: { create: jest.fn().mockResolvedValue({}) },
    notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    folder: {
      findUnique: jest.fn().mockResolvedValue({ spaceId: 'space-1' }),
    },
    list: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (fn: (tx: MockTx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
}

function buildContext(
  overrides: Partial<TaskEventContext> = {},
): TaskEventContext {
  return {
    workspaceId: 'ws-1',
    taskId: 'task-1',
    listId: 'list-1',
    actorUserId: 'user-1',
    automationDepth: 1,
    ...overrides,
  };
}

describe('ActionRunnerService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let runner: ActionRunnerService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    runner = new ActionRunnerService(prisma as never);
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200 } as Response);
  });

  it('change_status atualiza statusId', async () => {
    const result = await runner.run(
      { type: 'change_status', params: { workflowStatusId: 's-2' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { statusId: 's-2' },
    });
  });

  it('move_to_list atualiza listId', async () => {
    const result = await runner.run(
      { type: 'move_to_list', params: { listId: 'list-2' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { listId: 'list-2' },
    });
  });

  it('change_priority atualiza priority', async () => {
    const result = await runner.run(
      { type: 'change_priority', params: { priority: 'HIGH' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItem.update).toHaveBeenCalled();
  });

  it('change_assignees mode=add chama upsert', async () => {
    const result = await runner.run(
      { type: 'change_assignees', params: { mode: 'add', userIds: ['u-2'] } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.tx.workItemAssignee.upsert).toHaveBeenCalled();
  });

  it('change_task_name atualiza title', async () => {
    const result = await runner.run(
      { type: 'change_task_name', params: { name: 'Novo nome' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { title: 'Novo nome' },
    });
  });

  it('change_task_type atualiza customTypeId', async () => {
    const result = await runner.run(
      { type: 'change_task_type', params: { customTaskTypeId: 'tt-2' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
  });

  it('change_tags mode=add chama upsert', async () => {
    const result = await runner.run(
      { type: 'change_tags', params: { mode: 'add', tagIds: ['t-1'] } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.tx.workItemTagLink.upsert).toHaveBeenCalled();
  });

  it('set_custom_field grava valueText', async () => {
    const result = await runner.run(
      {
        type: 'set_custom_field',
        params: { customFieldDefinitionId: 'cf-1', value: 'novo' },
      },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.customFieldValue.upsert).toHaveBeenCalled();
  });

  it('set_time_estimate atualiza estimatedMinutes', async () => {
    const result = await runner.run(
      { type: 'set_time_estimate', params: { estimateMinutes: 60 } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
  });

  it('add_task_link cria WorkItemLink', async () => {
    const result = await runner.run(
      {
        type: 'add_task_link',
        params: { targetTaskId: 't-2', linkType: 'RELATES_TO' },
      },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItemLink.create).toHaveBeenCalled();
  });

  it('change_due_date atualiza dueDate', async () => {
    const result = await runner.run(
      { type: 'change_due_date', params: { dueDate: '2026-12-01' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
  });

  it('change_start_date atualiza startDate', async () => {
    const result = await runner.run(
      { type: 'change_start_date', params: { startDate: '2026-12-01' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
  });

  it('add_comment cria WorkItemComment', async () => {
    const result = await runner.run(
      { type: 'add_comment', params: { content: 'auto' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItemComment.create).toHaveBeenCalled();
  });

  it('send_notification chama createMany', async () => {
    const result = await runner.run(
      {
        type: 'send_notification',
        params: { userIds: ['u-2'], message: 'oi' },
      },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.notification.createMany).toHaveBeenCalled();
  });

  it('create_subtask cria task filha', async () => {
    const result = await runner.run(
      { type: 'create_subtask', params: { name: 'Sub' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItem.create).toHaveBeenCalled();
  });

  it('delete_task faz soft delete', async () => {
    const result = await runner.run(
      { type: 'delete_task', params: {} },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItem.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });
  });

  it('duplicate_task cria copia', async () => {
    const result = await runner.run(
      { type: 'duplicate_task', params: {} },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.workItem.create).toHaveBeenCalled();
  });

  it('create_list cria List nova', async () => {
    const result = await runner.run(
      { type: 'create_list', params: { name: 'L', folderId: 'f-1' } },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(prisma.list.create).toHaveBeenCalled();
  });

  it('call_webhook faz fetch', async () => {
    const result = await runner.run(
      {
        type: 'call_webhook',
        params: { url: 'https://example.com', method: 'POST' },
      },
      buildContext(),
    );
    expect(result.status).toBe('ok');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('send_channel_message retorna not_implemented', async () => {
    const result = await runner.run(
      { type: 'send_channel_message', params: {} },
      buildContext(),
    );
    expect(result.status).toBe('not_implemented');
  });

  it('send_direct_message retorna not_implemented', async () => {
    const result = await runner.run(
      { type: 'send_direct_message', params: {} },
      buildContext(),
    );
    expect(result.status).toBe('not_implemented');
  });
});
