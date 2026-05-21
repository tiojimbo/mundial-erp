/**
 * Adapter Prometheus de `TaskTypeTemplatesMetrics` (Sprint 5 — TTT-050).
 *
 * Substitui o `NoopTaskTypeTemplatesMetrics` quando o operador configura
 * um `METRICS_TOKEN`. 4 contadores: instanciacao, cache hit, cache miss
 * (com label `reason`) e Redis error (com label `operation`).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Counter, type Registry } from 'prom-client';
import type {
  CacheMissReason,
  RedisOperation,
  TaskTypeTemplatesMetrics,
} from './task-type-templates.metrics';
import { PROM_REGISTRY } from '../../common/metrics/metrics.tokens';

@Injectable()
export class PrometheusTaskTypeTemplatesMetrics
  implements TaskTypeTemplatesMetrics
{
  private readonly logger = new Logger(
    PrometheusTaskTypeTemplatesMetrics.name,
  );

  private readonly instantiated: Counter<'custom_type_id' | 'workspace_id'>;
  private readonly cacheHit: Counter<'workspace_id'>;
  private readonly cacheMiss: Counter<'reason' | 'workspace_id'>;
  private readonly redisError: Counter<'operation'>;

  constructor(@Inject(PROM_REGISTRY) registry: Registry) {
    this.instantiated = new Counter({
      name: 'task_type_templates_instantiated_total',
      help: 'Templates instanciados em tasks.service.create (apos commit).',
      labelNames: ['custom_type_id', 'workspace_id'],
      registers: [registry],
    });

    this.cacheHit = new Counter({
      name: 'task_type_templates_cache_hit_total',
      help: 'Hit no cache de TaskTypeTemplate (memoria ou Redis).',
      labelNames: ['workspace_id'],
      registers: [registry],
    });

    this.cacheMiss = new Counter({
      name: 'task_type_templates_cache_miss_total',
      help: 'Miss no cache rotulado por motivo (first_access, expired, redis_error, corrupted, circuit_open).',
      labelNames: ['reason', 'workspace_id'],
      registers: [registry],
    });

    this.redisError = new Counter({
      name: 'task_type_templates_redis_error_total',
      help: 'Falhas em operacoes Redis (get/set/del) usadas pelo cache.',
      labelNames: ['operation'],
      registers: [registry],
    });
  }

  templatesInstantiatedTotal(args: {
    customTypeId: string;
    workspaceId: string;
  }): void {
    try {
      this.instantiated.inc({
        custom_type_id: args.customTypeId,
        workspace_id: args.workspaceId,
      });
    } catch (err) {
      this.warn('instantiated_total', err);
    }
  }

  cacheHitTotal(args: { workspaceId: string }): void {
    try {
      this.cacheHit.inc({ workspace_id: args.workspaceId });
    } catch (err) {
      this.warn('cache_hit_total', err);
    }
  }

  cacheMissTotal(args: {
    reason: CacheMissReason;
    workspaceId: string;
  }): void {
    try {
      this.cacheMiss.inc({
        reason: args.reason,
        workspace_id: args.workspaceId,
      });
    } catch (err) {
      this.warn('cache_miss_total', err);
    }
  }

  redisErrorTotal(args: { operation: RedisOperation }): void {
    try {
      this.redisError.inc({ operation: args.operation });
    } catch (err) {
      this.warn('redis_error_total', err);
    }
  }

  private warn(metric: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.logger.warn(`task_type_templates_${metric} inc falhou: ${msg}`);
  }
}
