import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';
import { TaskTypeTemplatesRepository } from './task-type-templates.repository';
import { TaskTypeTemplateResponseDto } from './dtos/task-type-template-response.dto';
import {
  TASK_TYPE_TEMPLATES_METRICS,
  type CacheMissReason,
  type RedisOperation,
  type TaskTypeTemplatesMetrics,
} from './task-type-templates.metrics';

/**
 * Servico de leitura de Task Type Templates (M2 — Sprint 3 TTT-031).
 *
 * Cache (PLANO TTT-031 AC — "Cache Redis 5min"):
 *   Cacheamos resultados serializados (DTO -> JSON) em Redis com chave
 *   `task-type-template:<customTaskTypeId>:<workspaceId>` TTL 300s.
 *   Se Redis estiver indisponivel, caimos no fallback em memoria via Map
 *   (mesmo padrao do dedup em CustomFieldValuesService — best-effort).
 *
 * Resiliencia (P2 do laudo CTO):
 *   - Circuit breaker: apos `REDIS_FAILURE_THRESHOLD` falhas dentro de
 *     `REDIS_FAILURE_WINDOW_MS`, paramos de chamar Redis por
 *     `REDIS_CIRCUIT_OPEN_MS`. Durante o circuit aberto, o cache em
 *     memoria continua servindo e o miss vai direto ao banco — sem custo
 *     adicional de IO em Redis morto + sem flooding de logs.
 *   - Metricas: `cache_hit_total`, `cache_miss_total{reason}` e
 *     `redis_error_total{operation}` permitem que o operador distinga
 *     "primeiro acesso" (esperado) de "Redis em cascata" (incidente) sem
 *     correlacionar logs.
 *
 * Invalidacao:
 *   Sprint 3 nao implementa write API; logo nao ha PATCH/DELETE para
 *   invalidar. Quando essa API surgir, o caller deve chamar
 *   `invalidate(customTaskTypeId, workspaceId)` antes de responder ao
 *   cliente. O TTL de 5min limita a janela de inconsistencia mesmo sem
 *   invalidacao explicita.
 *
 * Cross-tenant:
 *   Visibilidade derivada do `CustomTaskType.workspaceId`. Cross-tenant
 *   retorna `null` no repository — service responde 404 (PLANO §"Boundaries"
 *   + 99-referencia §8.1).
 */
const CACHE_TTL_SECONDS = 300;
const MEMORY_CACHE_MAX_ENTRIES = 256;
const MEMORY_CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

/**
 * Parametros do circuit breaker (P2 do laudo CTO).
 *
 * Defaults pensados para janela curta (1min) com threshold conservador
 * (10 erros) — Redis de produo aceita >>10 RPS por instancia, entao
 * 10 falhas em 60s e sinal forte de cascata e nao de blip transitorio.
 *
 * Aberto por 30s: tempo suficiente para um restart curto do Redis sem
 * marteladas durante a recuperacao — apos o periodo, o proximo request
 * volta a tentar (half-open implicito; uma falha re-abre imediatamente
 * no proximo limiar).
 */
const REDIS_FAILURE_THRESHOLD = 10;
const REDIS_FAILURE_WINDOW_MS = 60_000;
const REDIS_CIRCUIT_OPEN_MS = 30_000;

interface MemoryCacheEntry {
  payload: string;
  expiresAt: number;
}

@Injectable()
export class TaskTypeTemplatesService {
  private readonly logger = new Logger(TaskTypeTemplatesService.name);

  /**
   * Cache em memoria (fallback). Cap finito para evitar leak quando o
   * processo nao tem acesso ao Redis. Limpeza oportunistica em cada
   * leitura (descarta entradas expiradas; remove o oldest se > MAX).
   */
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();

  // ------------------------------------------------------------------
  // Estado do circuit breaker (P2 — laudo CTO).
  // ------------------------------------------------------------------
  private redisFailureCount = 0;
  private redisFailureWindowStart = 0;
  private redisCircuitOpenUntil = 0;

  private readonly metrics: TaskTypeTemplatesMetrics;

  constructor(
    private readonly repository: TaskTypeTemplatesRepository,
    /**
     * Redis e injetado de forma opcional para que testes unitarios e
     * ambientes sem Redis (dev local sem `redis://...` configurado)
     * continuem funcionando — mesmo padrao adotado por
     * `TaskOutboxService` (`@Optional()` na queue BullMQ).
     */
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
    /**
     * Metrics adapter. Default Noop em Sprint 3; Sprint 5 (TTT-050)
     * fornece adapter Prometheus via override no providers do modulo.
     */
    @Optional()
    @Inject(TASK_TYPE_TEMPLATES_METRICS)
    metrics?: TaskTypeTemplatesMetrics,
  ) {
    this.metrics = metrics ?? this.buildNoopMetrics();
  }

  /**
   * Lista templates visiveis. Sem cache: lista geral muda raramente, mas
   * nao deduplica eficientemente entre callers (cada workspace teria sua
   * propria chave). Optamos por nao cachear o list — o detail e o caminho
   * quente (consultado em cada criacao de task).
   */
  async list(workspaceId: string): Promise<TaskTypeTemplateResponseDto[]> {
    const rows = await this.repository.findVisibleAll(workspaceId);
    return rows.map((row) => TaskTypeTemplateResponseDto.fromEntity(row));
  }

  /**
   * Busca por `customTaskTypeId`. Cross-tenant -> 404.
   * Cacheado em Redis (5min) por `(customTaskTypeId, workspaceId)`.
   */
  async findByCustomTaskTypeId(
    customTaskTypeId: string,
    workspaceId: string,
  ): Promise<TaskTypeTemplateResponseDto> {
    const cacheKey = this.buildCacheKey(customTaskTypeId, workspaceId);

    // 1) Hit -> retorna direto. `readCache` ja registrou `cacheHitTotal`.
    const cached = await this.readCache(cacheKey, workspaceId);
    if (cached) {
      return cached;
    }

    // 2) Miss: vai ao banco.
    const row = await this.repository.findByCustomTaskTypeId(
      customTaskTypeId,
      workspaceId,
    );
    if (!row) {
      // Cross-tenant ou ausente: 404 (nunca 403 — §8.1).
      throw new NotFoundException('Task type template nao encontrado');
    }

    const dto = TaskTypeTemplateResponseDto.fromEntity(row);

    // 3) Best-effort write-through. Falha de Redis nao quebra a request.
    await this.writeCache(cacheKey, JSON.stringify(dto));

    return dto;
  }

  /**
   * Invalida o cache de um template. Sera chamado por mutacoes futuras
   * (PATCH/DELETE) — esta sprint nao tem write API, mas o metodo fica
   * disponivel para que TTT-04x consuma sem refactor.
   */
  async invalidate(
    customTaskTypeId: string,
    workspaceId: string,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(customTaskTypeId, workspaceId);
    this.memoryCache.delete(cacheKey);
    if (!this.redis || this.isRedisCircuitOpen()) return;
    try {
      await this.redis.del(cacheKey);
    } catch (err) {
      this.trackRedisFailure('del');
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `task-type-templates: redis DEL fail (${cacheKey}): ${msg}`,
      );
    }
  }

  // ------------------------------------------------------------------
  // Cache helpers
  // ------------------------------------------------------------------

  private buildCacheKey(customTaskTypeId: string, workspaceId: string): string {
    return `task-type-template:${customTaskTypeId}:${workspaceId}`;
  }

  /**
   * Le do cache na ordem `memoria -> Redis`. Sempre dispara exatamente
   * uma metrica por chamada (hit OU miss) — facilitando dashboards de
   * efetividade do cache.
   */
  private async readCache(
    key: string,
    workspaceId: string,
  ): Promise<TaskTypeTemplateResponseDto | null> {
    // 1) Memoria primeiro: barata, sem IO.
    const memHit = this.readMemoryCache(key);
    if (memHit) {
      try {
        const parsed = JSON.parse(memHit) as TaskTypeTemplateResponseDto;
        this.metrics.cacheHitTotal({ workspaceId });
        return parsed;
      } catch (err) {
        // Memoria nao deveria conter payload invalido (so escrevemos JSON
        // serializado). Se acontecer, descarta e segue para Redis.
        this.memoryCache.delete(key);
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `task-type-templates: memoria corrompida (${key}): ${msg}`,
        );
      }
    }

    // 2) Sem Redis ou circuit aberto -> miss imediato.
    if (!this.redis) {
      this.metrics.cacheMissTotal({ reason: 'first_access', workspaceId });
      return null;
    }
    if (this.isRedisCircuitOpen()) {
      this.metrics.cacheMissTotal({ reason: 'circuit_open', workspaceId });
      return null;
    }

    // 3) Redis.
    let raw: string | null;
    try {
      raw = await this.redis.get(key);
    } catch (err) {
      this.trackRedisFailure('get');
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`task-type-templates: redis GET fail (${key}): ${msg}`);
      this.metrics.cacheMissTotal({ reason: 'redis_error', workspaceId });
      return null; // fail-open: o caller busca no banco.
    }

    if (raw === null) {
      // Reset do contador: GET bem-sucedido prova que Redis voltou.
      this.resetRedisFailureCount();
      this.metrics.cacheMissTotal({ reason: 'first_access', workspaceId });
      return null;
    }

    let parsed: TaskTypeTemplateResponseDto;
    try {
      parsed = JSON.parse(raw) as TaskTypeTemplateResponseDto;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `task-type-templates: cache corrompido (${key}): ${msg}`,
      );
      this.metrics.cacheMissTotal({ reason: 'corrupted', workspaceId });
      return null;
    }

    // GET + parse OK -> reset contador e popula memoria.
    this.resetRedisFailureCount();
    this.writeMemoryCache(key, raw);
    this.metrics.cacheHitTotal({ workspaceId });
    return parsed;
  }

  /**
   * Escreve em memoria sempre; em Redis apenas se circuit fechado e
   * cliente disponivel. Failure NUNCA propaga para o caller.
   */
  private async writeCache(key: string, payload: string): Promise<void> {
    this.writeMemoryCache(key, payload);
    if (!this.redis) return;
    if (this.isRedisCircuitOpen()) return;
    try {
      await this.redis.set(key, payload, 'EX', CACHE_TTL_SECONDS);
      this.resetRedisFailureCount();
    } catch (err) {
      this.trackRedisFailure('set');
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`task-type-templates: redis SET fail (${key}): ${msg}`);
    }
  }

  private readMemoryCache(key: string): string | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.payload;
  }

  private writeMemoryCache(key: string, payload: string): void {
    if (this.memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
      // Remove o oldest (Map preserva ordem de insercao).
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey !== undefined) {
        this.memoryCache.delete(firstKey);
      }
    }
    this.memoryCache.set(key, {
      payload,
      expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    });
  }

  // ------------------------------------------------------------------
  // Circuit breaker (P2 — laudo CTO)
  // ------------------------------------------------------------------

  /**
   * `true` se o circuit estiver aberto agora. Test seam: `Date.now()`
   * pode ser mockado nos specs com `jest.useFakeTimers()`.
   */
  private isRedisCircuitOpen(): boolean {
    return Date.now() < this.redisCircuitOpenUntil;
  }

  /**
   * Registra falha na operacao Redis e abre o circuit se o threshold for
   * atingido dentro da janela. Janela e rollante: a primeira falha apos
   * o periodo expirar reinicia a contagem.
   */
  private trackRedisFailure(operation: RedisOperation): void {
    this.metrics.redisErrorTotal({ operation });
    const now = Date.now();
    if (
      this.redisFailureCount === 0 ||
      now - this.redisFailureWindowStart > REDIS_FAILURE_WINDOW_MS
    ) {
      this.redisFailureCount = 1;
      this.redisFailureWindowStart = now;
    } else {
      this.redisFailureCount += 1;
    }
    if (
      this.redisFailureCount >= REDIS_FAILURE_THRESHOLD &&
      this.redisCircuitOpenUntil <= now
    ) {
      this.redisCircuitOpenUntil = now + REDIS_CIRCUIT_OPEN_MS;
      this.logger.warn(
        `task-type-templates: redis circuit breaker OPEN por ${REDIS_CIRCUIT_OPEN_MS}ms ` +
          `apos ${this.redisFailureCount} falhas (operacao=${operation})`,
      );
    }
  }

  /**
   * Reset do contador apos sucesso confirmado. Mantem a janela em zero
   * para que o proximo blip nao seja amplificado por falhas antigas.
   */
  private resetRedisFailureCount(): void {
    if (this.redisFailureCount === 0) return;
    this.redisFailureCount = 0;
    this.redisFailureWindowStart = 0;
  }

  /**
   * Constroi um stub Noop interno quando nao ha metrics injetado.
   * Inline para evitar import circular em testes que constroem o service
   * sem o modulo (Test.createTestingModule isolado).
   */
  private buildNoopMetrics(): TaskTypeTemplatesMetrics {
    return {
      templatesInstantiatedTotal: () => undefined,
      cacheMissTotal: (_args: {
        reason: CacheMissReason;
        workspaceId: string;
      }) => undefined,
      cacheHitTotal: () => undefined,
      redisErrorTotal: () => undefined,
    };
  }
}
