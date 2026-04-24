/**
 * Unit tests — TasksService.merge (PLANO-TASKS.md §8.4).
 *
 * Estrategia: mock profundo das unicas superficies que o metodo toca no
 * `tx` injetado por `prisma.$transaction(cb)`. Nao sobe Nest nem PG.
 *
 * Casos cobertos (10):
 *   1. merge 3 sources validas -> success + sources pos-merge.
 *   2. Idempotency-Key: segundo call retorna cached com idempotent=true.
 *   3. Target descendente de source -> MergeCycleException (409).
 *   4. Source ja mergida (mergedIntoId != null) -> 409 SOURCE_ALREADY_MERGED.
 *   5. Source cross-tenant -> 404 NotFoundException.
 *   6. Target esta em sourceTaskIds -> BadRequestException.
 *   7. Tags das sources sao unidas no target sem duplicar (raw SQL ON CONFLICT).
 *   8. timeSpentSeconds + trackedMinutes somados em target (increment).
 *   9. Outbox: 1 MERGED_INTO por source.
 *  10. Sources pos-merge: archived=true, mergedIntoId=target.id, deletedAt nao-nulo.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MergeCycleException } from '../../common/exceptions/merge-cycle.exception';
import { TasksService } from './tasks.service';

type Row = {
  id: string;
  parentId: string | null;
  mergedIntoId: string | null;
  timeSpentSeconds: number;
  trackedMinutes: number;
  deletedAt: Date | null;
};

/**
 * Opaque tx — service passa-o para repositories; nenhum mock inspeciona
 * campos deste valor desde a refatoracao que eliminou `tx.X.*` do service.
 */
type MockTx = Record<string, never>;

interface MockPrisma {
  $transaction: jest.Mock;
}

interface MockRedis {
  get: jest.Mock;
  set: jest.Mock;
}

interface MockOutbox {
  enqueue: jest.Mock;
}

interface MockTasksRepository {
  findForMerge: jest.Mock;
  findParentsForCycleCheck: jest.Mock;
  moveChildCollectionsToTarget: jest.Mock;
  unionTagLinksToTarget: jest.Mock;
  incrementTotalsOnTarget: jest.Mock;
  markSourcesMerged: jest.Mock;
}

interface MockEdgeRepository {
  moveEdgesForMerge: jest.Mock;
}

interface Harness {
  service: TasksService;
  prisma: MockPrisma;
  tx: MockTx;
  redis: MockRedis;
  outbox: MockOutbox;
  repository: MockTasksRepository;
  depsRepository: MockEdgeRepository;
  linksRepository: MockEdgeRepository;
  rows: Map<string, Row>;
  parentMap: Map<string, string | null>;
  rawCalls: Array<{ sourceIds: string[]; targetId: string }>;
}

function row(id: string, overrides: Partial<Row> = {}): Row {
  return {
    id,
    parentId: null,
    mergedIntoId: null,
    timeSpentSeconds: 0,
    trackedMinutes: 0,
    deletedAt: null,
    ...overrides,
  };
}

function buildHarness(params: {
  rows: Row[];
  // Modela BFS de parentId. Se omitido, parent = row.parentId.
  parents?: Record<string, string | null>;
}): Harness {
  const rowMap = new Map(params.rows.map((r) => [r.id, r] as const));
  const parentMap = new Map<string, string | null>();
  for (const r of params.rows) {
    parentMap.set(r.id, r.parentId);
  }
  if (params.parents) {
    for (const [k, v] of Object.entries(params.parents)) {
      parentMap.set(k, v);
    }
  }

  const rawCalls: Array<{ sourceIds: string[]; targetId: string }> = [];
  const tx: MockTx = {};

  const repository: MockTasksRepository = {
    findForMerge: jest.fn(
      async (_ws: string, ids: string[]) =>
        ids
          .filter((id) => rowMap.has(id))
          .map((id) => {
            const r = rowMap.get(id)!;
            return {
              id: r.id,
              parentId: parentMap.get(r.id) ?? null,
              mergedIntoId: r.mergedIntoId,
              timeSpentSeconds: r.timeSpentSeconds,
              trackedMinutes: r.trackedMinutes,
              deletedAt: r.deletedAt,
            };
          }),
    ),
    findParentsForCycleCheck: jest.fn(async (ids: string[]) =>
      ids
        .filter((id) => rowMap.has(id))
        .map((id) => ({ id, parentId: parentMap.get(id) ?? null })),
    ),
    moveChildCollectionsToTarget: jest.fn(async () => undefined),
    unionTagLinksToTarget: jest.fn(
      async (sourceIds: string[], targetId: string) => {
        // Equivalente em memoria ao ON CONFLICT DO NOTHING — registra a chamada.
        rawCalls.push({ sourceIds, targetId });
      },
    ),
    incrementTotalsOnTarget: jest.fn(
      async (targetId: string, seconds: number, minutes: number) => {
        const r = rowMap.get(targetId);
        if (!r) return;
        r.timeSpentSeconds += seconds;
        r.trackedMinutes += minutes;
      },
    ),
    markSourcesMerged: jest.fn(
      async (sourceIds: string[], targetId: string, now: Date) => {
        for (const sid of sourceIds) {
          const r = rowMap.get(sid);
          if (!r) continue;
          r.mergedIntoId = targetId;
          r.deletedAt = now;
        }
      },
    ),
  };

  const depsRepository: MockEdgeRepository = {
    moveEdgesForMerge: jest.fn(async () => undefined),
  };
  const linksRepository: MockEdgeRepository = {
    moveEdgesForMerge: jest.fn(async () => undefined),
  };

  const prisma: MockPrisma = {
    $transaction: jest.fn(async (cb: (tx: MockTx) => unknown) => cb(tx)),
  };

  const redis: MockRedis = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => 'OK'),
  };

  const outbox: MockOutbox = {
    enqueue: jest.fn(async () => 'event-id'),
  };

  // Instanciacao direta (sem Nest DI) — constructor inclui 9 args apos a
  // refatoracao CTO que desacoplou Prisma direto via repositories dedicados.
  const service = new TasksService(
    prisma as never,
    repository as never,
    depsRepository as never,
    linksRepository as never,
    outbox as never,
    { syncAssignees: jest.fn() } as never,
    { syncWatchers: jest.fn() } as never,
    { syncTags: jest.fn() } as never,
    redis as never,
  );

  return {
    service,
    prisma,
    tx,
    redis,
    outbox,
    repository,
    depsRepository,
    linksRepository,
    rows: rowMap,
    parentMap,
    rawCalls,
  };
}

describe('TasksService.merge', () => {
  const WS = 'ws-1';
  const ACTOR = 'user-actor';

  it('merge 3 sources validas -> success', async () => {
    const h = buildHarness({
      rows: [
        row('target', { timeSpentSeconds: 100, trackedMinutes: 10 }),
        row('s1', { timeSpentSeconds: 50, trackedMinutes: 5 }),
        row('s2', { timeSpentSeconds: 25, trackedMinutes: 3 }),
        row('s3', { timeSpentSeconds: 0, trackedMinutes: 0 }),
      ],
    });

    const env = await h.service.merge(
      WS,
      'target',
      { sourceTaskIds: ['s1', 's2', 's3'] },
      ACTOR,
    );

    expect(env.data).toEqual({
      taskId: 'target',
      mergedSourcesCount: 3,
      idempotent: false,
    });
    // A movimentacao de coleções (checklists/attachments/comments) foi
    // delegada ao repository — chamada unica com os ids batch.
    expect(h.repository.moveChildCollectionsToTarget).toHaveBeenCalledWith(
      ['s1', 's2', 's3'],
      'target',
      expect.anything(),
    );
    expect(h.depsRepository.moveEdgesForMerge).toHaveBeenCalledTimes(1);
    expect(h.linksRepository.moveEdgesForMerge).toHaveBeenCalledTimes(1);
  });

  it('idempotency: segunda chamada retorna resultado cacheado', async () => {
    const h = buildHarness({
      rows: [row('target'), row('s1')],
    });
    // Simula cache hit na 2a chamada.
    const cachedPayload = JSON.stringify({
      taskId: 'target',
      mergedSourcesCount: 1,
      idempotent: false,
    });
    h.redis.get.mockResolvedValueOnce(cachedPayload);

    const env = await h.service.merge(
      WS,
      'target',
      { sourceTaskIds: ['s1'] },
      ACTOR,
      'idem-abc',
    );

    expect(env.data.idempotent).toBe(true);
    expect(env.meta).toMatchObject({
      idempotent: true,
      idempotencyKey: 'idem-abc',
    });
    // Nenhuma mutacao deve ter ocorrido.
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
    expect(h.outbox.enqueue).not.toHaveBeenCalled();
    expect(h.redis.get).toHaveBeenCalledWith(`merge:${WS}:idem-abc`);
  });

  it('target descendente de source -> MergeCycleException (409)', async () => {
    // target.parent = s1 -> BFS alcanca s1 (em sourceIdSet) -> lanca.
    const h = buildHarness({
      rows: [row('target', { parentId: 's1' }), row('s1')],
    });

    await expect(
      h.service.merge(WS, 'target', { sourceTaskIds: ['s1'] }, ACTOR),
    ).rejects.toBeInstanceOf(MergeCycleException);
  });

  it('source ja mergida -> 409 SOURCE_ALREADY_MERGED', async () => {
    const h = buildHarness({
      rows: [row('target'), row('s1', { mergedIntoId: 'other-target' })],
    });

    await expect(
      h.service.merge(WS, 'target', { sourceTaskIds: ['s1'] }, ACTOR),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'SOURCE_ALREADY_MERGED',
        sourceId: 's1',
      }),
    });
  });

  it('source cross-tenant -> 404', async () => {
    // Harness so contem target; s-missing simula cross-tenant (findMany nao
    // retorna pois a query ja filtra por process.department.workspaceId).
    const h = buildHarness({ rows: [row('target')] });

    await expect(
      h.service.merge(WS, 'target', { sourceTaskIds: ['s-missing'] }, ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('target em sourceTaskIds -> BadRequestException', async () => {
    const h = buildHarness({ rows: [row('target')] });

    await expect(
      h.service.merge(WS, 'target', { sourceTaskIds: ['target'] }, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tags das sources unidas no target sem duplicar (raw SQL ON CONFLICT)', async () => {
    const h = buildHarness({
      rows: [row('target'), row('s1'), row('s2')],
    });

    await h.service.merge(WS, 'target', { sourceTaskIds: ['s1', 's2'] }, ACTOR);

    // Uniao delegada ao repo — `unionTagLinksToTarget(sourceIds, targetId, tx)`
    // encapsula o raw SQL `ON CONFLICT DO NOTHING` (§8.4, SQL validado no
    // spec do repository, nao aqui).
    expect(h.repository.unionTagLinksToTarget).toHaveBeenCalledTimes(1);
    const call = h.rawCalls[0];
    expect(call.targetId).toBe('target');
    expect(call.sourceIds).toEqual(['s1', 's2']);
  });

  it('timeSpentSeconds + trackedMinutes somados em target', async () => {
    const h = buildHarness({
      rows: [
        row('target', { timeSpentSeconds: 10, trackedMinutes: 1 }),
        row('s1', { timeSpentSeconds: 50, trackedMinutes: 5 }),
        row('s2', { timeSpentSeconds: 25, trackedMinutes: 3 }),
      ],
    });

    await h.service.merge(WS, 'target', { sourceTaskIds: ['s1', 's2'] }, ACTOR);

    expect(h.repository.incrementTotalsOnTarget).toHaveBeenCalledWith(
      'target',
      75,
      8,
      expect.anything(),
    );
    // Estado final refletido no mock (increment aplicado pelo stub do repo).
    expect(h.rows.get('target')!.timeSpentSeconds).toBe(85);
    expect(h.rows.get('target')!.trackedMinutes).toBe(9);
  });

  it('outbox: 1 MERGED_INTO por source com payload correto', async () => {
    const h = buildHarness({
      rows: [row('target'), row('s1'), row('s2'), row('s3')],
    });

    await h.service.merge(
      WS,
      'target',
      { sourceTaskIds: ['s1', 's2', 's3'] },
      ACTOR,
    );

    expect(h.outbox.enqueue).toHaveBeenCalledTimes(3);
    for (const sourceId of ['s1', 's2', 's3']) {
      expect(h.outbox.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateId: sourceId,
          eventType: 'MERGED_INTO',
          payload: {
            sourceId,
            targetId: 'target',
            actorUserId: ACTOR,
          },
          workspaceId: WS,
        }),
      );
    }
  });

  it('sources pos-merge: mergedIntoId=target + deletedAt nao-nulo', async () => {
    const h = buildHarness({
      rows: [row('target'), row('s1'), row('s2')],
    });

    await h.service.merge(WS, 'target', { sourceTaskIds: ['s1', 's2'] }, ACTOR);

    // `markSourcesMerged(sourceIds, targetId, now, tx)` encapsula o updateMany.
    expect(h.repository.markSourcesMerged).toHaveBeenCalledTimes(1);
    const markCall = h.repository.markSourcesMerged.mock.calls[0];
    expect(markCall[0]).toEqual(['s1', 's2']);
    expect(markCall[1]).toBe('target');
    expect(markCall[2]).toBeInstanceOf(Date);

    // Estado reproduzido no mock: stub do repo aplicou mergedIntoId+deletedAt.
    for (const id of ['s1', 's2']) {
      expect(h.rows.get(id)!.mergedIntoId).toBe('target');
      expect(h.rows.get(id)!.deletedAt).not.toBeNull();
    }
  });
});
