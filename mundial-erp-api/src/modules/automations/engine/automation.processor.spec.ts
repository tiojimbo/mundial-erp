import { Job } from 'bullmq';
import {
  AutomationProcessor,
  MAX_AUTOMATION_DEPTH,
} from './automation.processor';
import type { AutomationJobData } from './automation.job.types';

function buildJob(data: Partial<AutomationJobData>): Job<AutomationJobData> {
  return {
    data: {
      automationId: 'auto-1',
      workspaceId: 'ws-1',
      trigger: 'TASK_CREATED',
      context: {
        workspaceId: 'ws-1',
        taskId: 'task-1',
        listId: 'list-1',
        actorUserId: null,
        automationDepth: 1,
      },
      automationDepth: 1,
      ...data,
    },
  } as unknown as Job<AutomationJobData>;
}

describe('AutomationProcessor (loop guard)', () => {
  let prisma: { workItem: { findUnique: jest.Mock } };
  let repository: { findById: jest.Mock; recordExecution: jest.Mock };
  let actions: { run: jest.Mock };
  let processor: AutomationProcessor;

  beforeEach(() => {
    prisma = {
      workItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'task-1', tags: [] }),
      },
    };
    repository = {
      findById: jest.fn().mockResolvedValue({
        id: 'auto-1',
        isActive: true,
        conditions: [],
        compiledActions: [{ type: 'change_status', params: {} }],
      }),
      recordExecution: jest.fn().mockResolvedValue({}),
    };
    actions = {
      run: jest.fn().mockResolvedValue({ type: 'change_status', status: 'ok' }),
    };
    processor = new AutomationProcessor(
      prisma as never,
      repository as never,
      actions as never,
    );
  });

  it(`aborta quando automationDepth > ${MAX_AUTOMATION_DEPTH}`, async () => {
    const job = buildJob({ automationDepth: MAX_AUTOMATION_DEPTH + 1 });
    await processor.process(job);

    expect(repository.findById).not.toHaveBeenCalled();
    expect(actions.run).not.toHaveBeenCalled();
    expect(repository.recordExecution).not.toHaveBeenCalled();
  });

  it(`executa quando automationDepth = ${MAX_AUTOMATION_DEPTH}`, async () => {
    const job = buildJob({ automationDepth: MAX_AUTOMATION_DEPTH });
    await processor.process(job);

    expect(repository.findById).toHaveBeenCalled();
    expect(actions.run).toHaveBeenCalledTimes(1);
    expect(repository.recordExecution).toHaveBeenCalled();
  });

  it('pula execucao quando automation esta inativa', async () => {
    repository.findById.mockResolvedValue({
      id: 'auto-1',
      isActive: false,
      conditions: [],
      compiledActions: [],
    });
    const job = buildJob({});
    await processor.process(job);

    expect(actions.run).not.toHaveBeenCalled();
  });
});
