/**
 * Unit tests — TaskTypeTemplatesService (P2 do laudo CTO — Sprint 3 TTT-031).
 *
 * Cobertura focada na resiliencia do cache (5 cenarios principais):
 *   1. Hit em memoria -> nao toca Redis, dispara `cacheHitTotal`.
 *   2. Hit em Redis (miss memoria) -> popula memoria, `cacheHitTotal`.
 *   3. Redis erro no GET -> miss com `reason="redis_error"` +
 *      `redisErrorTotal({operation:"get"})`, sem throw.
 *   4. Redis JSON corrompido -> miss com `reason="corrupted"`, sem throw.
 *   5. Circuit breaker: 10 erros em 60s abrem o circuit por 30s; chamada
 *      subsequente nao toca Redis e responde com `reason="circuit_open"`.
 *
 * Mockamos somente `TaskTypeTemplatesRepository`, `Redis` (ioredis) e o
 * adapter de metricas — zero dependencia de DB/Redis real.
 */

import { NotFoundException } from '@nestjs/common';
import { TaskTypeTemplatesService } from './task-type-templates.service';
import type { TaskTypeTemplatesRepository } from './task-type-templates.repository';
import type {
  CacheMissReason,
  RedisOperation,
  TaskTypeTemplatesMetrics,
} from './task-type-templates.metrics';

type RedisMock = {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
};

type RepoMock = Pick<
  TaskTypeTemplatesRepository,
  'findByCustomTaskTypeId' | 'findVisibleAll'
>;

interface MetricsMock extends TaskTypeTemplatesMetrics {
  templatesInstantiatedTotal: jest.Mock;
  cacheMissTotal: jest.Mock<void, [{ reason: CacheMissReason; workspaceId: string }]>;
  cacheHitTotal: jest.Mock;
  redisErrorTotal: jest.Mock<void, [{ operation: RedisOperation }]>;
}

function buildRedisMock(): RedisMock {
  return {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };
}

function buildMetricsMock(): MetricsMock {
  return {
    templatesInstantiatedTotal: jest.fn(),
    cacheMissTotal: jest.fn(),
    cacheHitTotal: jest.fn(),
    redisErrorTotal: jest.fn(),
  };
}

function buildRepoMock(): jest.Mocked<RepoMock> {
  return {
    findByCustomTaskTypeId: jest.fn(),
    findVisibleAll: jest.fn(),
  } as unknown as jest.Mocked<RepoMock>;
}

const WORKSPACE_ID = 'ws-1';
const CUSTOM_TASK_TYPE_ID = 'ctt-1';
const CACHE_KEY = `task-type-template:${CUSTOM_TASK_TYPE_ID}:${WORKSPACE_ID}`;

function makeRow() {
  return {
    id: 'ttt-1',
    customTaskTypeId: CUSTOM_TASK_TYPE_ID,
    attachmentCategories: null,
    defaultDescriptionBlocks: null,
    createdAt: new Date('2026-04-25T00:00:00.000Z'),
    updatedAt: new Date('2026-04-25T00:00:00.000Z'),
    fields: [],
  };
}

describe('TaskTypeTemplatesService — cache resiliency (P2 laudo CTO)', () => {
  let repo: jest.Mocked<RepoMock>;
  let redis: RedisMock;
  let metrics: MetricsMock;
  let service: TaskTypeTemplatesService;

  beforeEach(() => {
    jest.useFakeTimers({ now: 1745582400000 }); // 2026-04-25T12:00:00.000Z
    repo = buildRepoMock();
    redis = buildRedisMock();
    metrics = buildMetricsMock();
    service = new TaskTypeTemplatesService(
      repo as unknown as TaskTypeTemplatesRepository,
      redis as unknown as import('ioredis').default,
      metrics,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1. cache hit memoria -> dispara cacheHitTotal sem tocar Redis', async () => {
    repo.findByCustomTaskTypeId.mockResolvedValueOnce(makeRow());

    // Primeira chamada: miss memoria + miss Redis -> popula ambos.
    redis.get.mockResolvedValueOnce(null);
    await service.findByCustomTaskTypeId(CUSTOM_TASK_TYPE_ID, WORKSPACE_ID);

    redis.get.mockClear();
    redis.set.mockClear();
    metrics.cacheHitTotal.mockClear();
    metrics.cacheMissTotal.mockClear();

    // Segunda chamada: hit em memoria, Redis nem e tocado.
    const dto = await service.findByCustomTaskTypeId(
      CUSTOM_TASK_TYPE_ID,
      WORKSPACE_ID,
    );
    expect(dto.customTaskTypeId).toBe(CUSTOM_TASK_TYPE_ID);
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(repo.findByCustomTaskTypeId).toHaveBeenCalledTimes(1);
    expect(metrics.cacheHitTotal).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
    });
    expect(metrics.cacheMissTotal).not.toHaveBeenCalled();
  });

  it('2. miss memoria + hit Redis -> popula memoria, cacheHitTotal', async () => {
    // Constroi o payload exatamente como o service serializa.
    const dto = {
      id: 'ttt-1',
      customTaskTypeId: CUSTOM_TASK_TYPE_ID,
      attachmentCategories: null,
      defaultDescriptionBlocks: null,
      fields: [],
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    };
    redis.get.mockResolvedValueOnce(JSON.stringify(dto));

    const result = await service.findByCustomTaskTypeId(
      CUSTOM_TASK_TYPE_ID,
      WORKSPACE_ID,
    );

    expect(result.customTaskTypeId).toBe(CUSTOM_TASK_TYPE_ID);
    expect(redis.get).toHaveBeenCalledWith(CACHE_KEY);
    expect(repo.findByCustomTaskTypeId).not.toHaveBeenCalled();
    expect(metrics.cacheHitTotal).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
    });
    expect(metrics.cacheMissTotal).not.toHaveBeenCalled();

    // Proxima chamada deveria pegar da memoria sem tocar Redis.
    redis.get.mockClear();
    await service.findByCustomTaskTypeId(CUSTOM_TASK_TYPE_ID, WORKSPACE_ID);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('3. Redis erro no GET -> miss(redis_error) + redisErrorTotal(get); sem throw', async () => {
    redis.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    repo.findByCustomTaskTypeId.mockResolvedValueOnce(makeRow());

    const dto = await service.findByCustomTaskTypeId(
      CUSTOM_TASK_TYPE_ID,
      WORKSPACE_ID,
    );
    expect(dto.customTaskTypeId).toBe(CUSTOM_TASK_TYPE_ID);
    expect(metrics.cacheMissTotal).toHaveBeenCalledWith({
      reason: 'redis_error',
      workspaceId: WORKSPACE_ID,
    });
    expect(metrics.redisErrorTotal).toHaveBeenCalledWith({ operation: 'get' });
    // Repo deve ter sido consultado pois fail-open.
    expect(repo.findByCustomTaskTypeId).toHaveBeenCalledTimes(1);
  });

  it('4. Redis JSON corrompido -> miss(corrupted), sem throw', async () => {
    redis.get.mockResolvedValueOnce('{not-json[');
    repo.findByCustomTaskTypeId.mockResolvedValueOnce(makeRow());

    const dto = await service.findByCustomTaskTypeId(
      CUSTOM_TASK_TYPE_ID,
      WORKSPACE_ID,
    );
    expect(dto.customTaskTypeId).toBe(CUSTOM_TASK_TYPE_ID);
    expect(metrics.cacheMissTotal).toHaveBeenCalledWith({
      reason: 'corrupted',
      workspaceId: WORKSPACE_ID,
    });
    // Corrupted nao e erro de IO -> nao incrementa redisErrorTotal.
    expect(metrics.redisErrorTotal).not.toHaveBeenCalled();
    expect(repo.findByCustomTaskTypeId).toHaveBeenCalledTimes(1);
  });

  it('5. circuit breaker abre apos 10 erros em 60s e fecha apos 30s', async () => {
    // Cenario: Redis em cascata — get e set falham. Se o set sucedesse
    // entre os gets, o reset implicito mascararia o threshold (set OK
    // prova conectividade). Replicamos a falha total que e o caso real.
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    redis.set.mockRejectedValue(new Error('ECONNREFUSED'));
    repo.findByCustomTaskTypeId.mockResolvedValue(makeRow());

    // Cada iteracao gera 2 falhas (GET + SET no fail-open). 5 iteracoes
    // × 2 falhas = 10 -> threshold atingido.
    for (let i = 0; i < 5; i++) {
      const ws = `ws-${i}`;
      const ctt = `ctt-${i}`;
      // eslint-disable-next-line no-await-in-loop -- sequencial proposital
      await service.findByCustomTaskTypeId(ctt, ws);
    }

    expect(metrics.redisErrorTotal).toHaveBeenCalledWith({ operation: 'get' });
    expect(metrics.redisErrorTotal).toHaveBeenCalledWith({ operation: 'set' });
    expect(redis.get).toHaveBeenCalledTimes(5);
    expect(redis.set).toHaveBeenCalledTimes(5);

    // 11a chamada: circuit deve estar aberto -> NAO chama Redis.
    redis.get.mockClear();
    redis.set.mockClear();
    metrics.cacheMissTotal.mockClear();
    metrics.redisErrorTotal.mockClear();

    await service.findByCustomTaskTypeId('ctt-x', 'ws-x');
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(metrics.cacheMissTotal).toHaveBeenCalledWith({
      reason: 'circuit_open',
      workspaceId: 'ws-x',
    });
    expect(metrics.redisErrorTotal).not.toHaveBeenCalled();

    // Apos 30s + 1ms o circuit deve fechar; a proxima chamada tenta Redis
    // novamente. Ajustamos o mock para sucesso desta vez.
    jest.advanceTimersByTime(30_001);
    redis.get.mockReset();
    redis.set.mockReset();
    redis.get.mockResolvedValueOnce(null); // miss normal — `first_access`.
    redis.set.mockResolvedValueOnce('OK');
    metrics.cacheMissTotal.mockClear();

    await service.findByCustomTaskTypeId('ctt-y', 'ws-y');
    expect(redis.get).toHaveBeenCalledTimes(1);
    expect(metrics.cacheMissTotal).toHaveBeenCalledWith({
      reason: 'first_access',
      workspaceId: 'ws-y',
    });
  });

  it('cross-tenant -> 404 mesmo com Redis caido (sem cachear o not-found)', async () => {
    redis.get.mockResolvedValueOnce(null);
    repo.findByCustomTaskTypeId.mockResolvedValueOnce(null);

    await expect(
      service.findByCustomTaskTypeId(CUSTOM_TASK_TYPE_ID, WORKSPACE_ID),
    ).rejects.toThrow(NotFoundException);
    // O service NAO deve tentar gravar negative caching.
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('writeCache: erro no SET nao propaga e incrementa redisErrorTotal(set)', async () => {
    redis.get.mockResolvedValueOnce(null);
    redis.set.mockRejectedValueOnce(new Error('OOM'));
    repo.findByCustomTaskTypeId.mockResolvedValueOnce(makeRow());

    await expect(
      service.findByCustomTaskTypeId(CUSTOM_TASK_TYPE_ID, WORKSPACE_ID),
    ).resolves.toMatchObject({ customTaskTypeId: CUSTOM_TASK_TYPE_ID });
    expect(metrics.redisErrorTotal).toHaveBeenCalledWith({ operation: 'set' });
  });
});
