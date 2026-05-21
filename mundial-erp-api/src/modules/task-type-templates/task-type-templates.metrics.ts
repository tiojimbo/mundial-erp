/**
 * Metricas de observabilidade do modulo Task Type Templates
 * (PLANO-TASK-TYPES-TEMPLATES Sprint 3 — TTT-033, M2).
 *
 * Estrutura minima para Sprint 3: interface + stub Noop. A integracao
 * real com prom-client/Grafana fica para Sprint 5 (TTT-050), onde sera
 * provido um adapter Prometheus mantendo este contrato — mesma estrategia
 * adotada em `custom-fields.metrics.ts`.
 *
 * Cache observability (P2 do laudo CTO):
 *   Alem do contador de instanciacao, expomos contadores de cache hit/miss
 *   por motivo + erros do Redis para que o operador consiga distinguir
 *   "Redis cai com cascata" de "primeiro acesso/expirado/corrompido" sem
 *   precisar grep no log.
 */

/**
 * Motivo do `cache_miss` para diagnose operacional. Valores estaveis;
 * adapters Prometheus exporam como label `reason`.
 *   - `redis_error`: GET no Redis lancou (timeout/conn refused).
 *   - `corrupted`: payload no Redis nao e JSON valido.
 *   - `first_access`: chave nao existe (caminho normal de aquecimento).
 *   - `expired`: entry de memoria caducou (Redis tambem nao tinha).
 *   - `circuit_open`: pulamos Redis pois o circuit breaker esta aberto.
 */
export type CacheMissReason =
  | 'redis_error'
  | 'corrupted'
  | 'first_access'
  | 'expired'
  | 'circuit_open';

/**
 * Operacao Redis instrumentada — usada como label do contador de erros.
 * Mantem alinhamento com nomes do client `ioredis`.
 */
export type RedisOperation = 'get' | 'set' | 'del';

export interface TaskTypeTemplatesMetrics {
  /**
   * Incrementa o contador `task_type_templates_instantiated_total`
   * rotulado por `customTypeId` e `workspaceId`. Chamar apos cada
   * instanciacao bem-sucedida de template em `tasks.service.create`
   * (TTT-035), nao no GET de leitura.
   */
  templatesInstantiatedTotal(args: {
    customTypeId: string;
    workspaceId: string;
  }): void;

  /**
   * Incrementa `task_type_templates_cache_miss_total{reason,workspaceId}`.
   * Chamado em cada caminho de miss para que o operador saiba a causa raiz
   * sem precisar correlacionar logs. Sob cascata Redis (off por minutos),
   * o pico em `reason="redis_error"` e `reason="circuit_open"` permite
   * distinguir do trafico normal de aquecimento (`first_access`).
   */
  cacheMissTotal(args: { reason: CacheMissReason; workspaceId: string }): void;

  /**
   * Incrementa `task_type_templates_cache_hit_total{workspaceId}`. Chamado
   * tanto para hit em memoria (in-process) quanto para hit em Redis — o
   * objetivo e medir efetividade total do cache, nao desambiguar a camada
   * (logs cobrem isso).
   */
  cacheHitTotal(args: { workspaceId: string }): void;

  /**
   * Incrementa `task_type_templates_redis_error_total{operation}`. Usado
   * pelo circuit breaker para sinalizar falha por operacao (get/set/del).
   * Independente do `cacheMissTotal` — um SET que falha conta aqui mas nao
   * gera miss observavel pelo cliente.
   */
  redisErrorTotal(args: { operation: RedisOperation }): void;
}

/**
 * Implementacao stub para Sprint 3. Sera substituida por adapter
 * Prometheus em Sprint 5 (TTT-050) — assinatura publica permanece
 * estavel para evitar churn nos services consumidores.
 */
export class NoopTaskTypeTemplatesMetrics implements TaskTypeTemplatesMetrics {
  templatesInstantiatedTotal(): void {
    // No-op: sera substituido por adapter Prometheus em Sprint 5.
  }
  cacheMissTotal(): void {
    // No-op.
  }
  cacheHitTotal(): void {
    // No-op.
  }
  redisErrorTotal(): void {
    // No-op.
  }
}

/**
 * Token DI para injecao do `TaskTypeTemplatesMetrics`. O modulo provem
 * `NoopTaskTypeTemplatesMetrics` como default; em Sprint 5 (TTT-050) o
 * adapter Prometheus sobrescreve este token sem refactor de consumidores.
 */
export const TASK_TYPE_TEMPLATES_METRICS = Symbol(
  'TASK_TYPE_TEMPLATES_METRICS',
);
