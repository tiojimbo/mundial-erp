import { Queue } from 'bullmq';
import { TaskOutboxPollerService } from './task-outbox-poller.service';
import {
  TaskOutboxRepository,
  PendingEventRow,
} from './task-outbox.repository';
import { POLL_BATCH_SIZE, POLL_MIN_AGE_MS } from './task-outbox.constants';

function makeRepo(): jest.Mocked<
  Pick<TaskOutboxRepository, 'findStuckForRepublish'>
> {
  return {
    findStuckForRepublish: jest.fn(),
  };
}

function makeQueue(): jest.Mocked<Pick<Queue, 'add'>> {
  return {
    add: jest.fn().mockResolvedValue(undefined),
  };
}

function row(id: string, eventType: string): PendingEventRow {
  return {
    id,
    aggregateId: `task-${id}`,
    eventType,
    payload: {},
    attempts: 0,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
  };
}

describe('TaskOutboxPollerService', () => {
  it('republica PENDING+FAILED com jobId = eventId', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findStuckForRepublish.mockResolvedValue([
      row('e1', 'CREATED'),
      row('e2', 'DESCRIPTION_CHANGED'),
    ]);
    const service = new TaskOutboxPollerService(
      repo as unknown as TaskOutboxRepository,
      queue as unknown as Queue,
    );

    const result = await service.drainStuck();

    expect(repo.findStuckForRepublish).toHaveBeenCalledWith(
      POLL_BATCH_SIZE,
      POLL_MIN_AGE_MS,
    );
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'CREATED',
      { eventId: 'e1' },
      { jobId: 'e1', removeOnComplete: 1_000, removeOnFail: 5_000 },
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'DESCRIPTION_CHANGED',
      { eventId: 'e2' },
      { jobId: 'e2', removeOnComplete: 1_000, removeOnFail: 5_000 },
    );
    expect(result.republished).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it('drainStuck duas vezes usa jobId determinístico (idempotência)', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findStuckForRepublish.mockResolvedValue([row('e1', 'CREATED')]);
    const service = new TaskOutboxPollerService(
      repo as unknown as TaskOutboxRepository,
      queue as unknown as Queue,
    );

    await service.drainStuck();
    await service.drainStuck();

    const jobIds = queue.add.mock.calls.map(
      (c) => (c[2] as { jobId: string }).jobId,
    );
    expect(jobIds).toEqual(['e1', 'e1']);
  });

  it('sem queue: warn e retorna sem republicar', async () => {
    const repo = makeRepo();
    const service = new TaskOutboxPollerService(
      repo as unknown as TaskOutboxRepository,
      undefined,
    );

    const result = await service.drainStuck();

    expect(repo.findStuckForRepublish).not.toHaveBeenCalled();
    expect(result.republished).toBe(0);
  });

  it('conta skipped quando queue.add falha em um evento', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findStuckForRepublish.mockResolvedValue([
      row('e1', 'CREATED'),
      row('e2', 'CREATED'),
    ]);
    queue.add
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('redis down'));
    const service = new TaskOutboxPollerService(
      repo as unknown as TaskOutboxRepository,
      queue as unknown as Queue,
    );

    const result = await service.drainStuck();

    expect(result.republished).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('onApplicationBootstrap dispara o kick inicial', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findStuckForRepublish.mockResolvedValue([]);
    const service = new TaskOutboxPollerService(
      repo as unknown as TaskOutboxRepository,
      queue as unknown as Queue,
    );

    await service.onApplicationBootstrap();

    expect(repo.findStuckForRepublish).toHaveBeenCalledTimes(1);
  });
});
