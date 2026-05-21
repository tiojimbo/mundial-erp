import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Registry } from 'prom-client';
import { TaskTypeTemplatesController } from './task-type-templates.controller';
import { TaskTypeTemplatesRepository } from './task-type-templates.repository';
import { TaskTypeTemplatesService } from './task-type-templates.service';
import { TaskTypeTemplatesGuard } from './task-type-templates.guard';
import {
  NoopTaskTypeTemplatesMetrics,
  TASK_TYPE_TEMPLATES_METRICS,
} from './task-type-templates.metrics';
import { PrometheusTaskTypeTemplatesMetrics } from './task-type-templates-prometheus.metrics';
import { PROM_REGISTRY } from '../../common/metrics/metrics.tokens';

/**
 * TaskTypeTemplatesModule (M2 — Sprint 3 TTT-031).
 *
 * Modulo read-only que expoe o template 1:1 vinculado a `CustomTaskType`
 * (PLANO §"Arquitetura Modular" — M2). Depende APENAS da interface publica
 * de M1 (`CustomFieldDefinition` referenciada via `TaskTypeTemplateField`)
 * — nunca consome repository ou schema interno de M1.
 *
 * Endpoints (gated pelo `TaskTypeTemplatesGuard` no controller):
 *   - GET /task-type-templates
 *   - GET /task-type-templates/:customTaskTypeId
 *
 * `RedisModule` e `@Global` — `REDIS_CLIENT` e injetado no service de
 * forma `@Optional()` para rodar offline (testes / dev sem Redis).
 *
 * Exports: `TaskTypeTemplatesService` e `TaskTypeTemplatesRepository` para
 * que TTT-032 (`TasksService.create`) possa consumir o repository
 * diretamente dentro da `$transaction` sem o overhead de cache do service
 * — leitura quente em cada criacao de task; mesmo padrao adotado em
 * `task-comments` ↔ `tasks-events`.
 */
/**
 * Sprint 5 (TTT-050) — Factory provider escolhe Prometheus quando
 * `METRICS_TOKEN` esta configurado, ou Noop caso contrario. Mantem o
 * mesmo token DI (`TASK_TYPE_TEMPLATES_METRICS`) para que os consumidores
 * (service + cache helpers) nao tenham que mudar nada.
 */
const metricsProvider: Provider = {
  provide: TASK_TYPE_TEMPLATES_METRICS,
  inject: [ConfigService, PROM_REGISTRY],
  useFactory: (config: ConfigService, registry: Registry) => {
    const token = config.get<string>('METRICS_TOKEN');
    if (token) {
      return new PrometheusTaskTypeTemplatesMetrics(registry);
    }
    return new NoopTaskTypeTemplatesMetrics();
  },
};

@Module({
  controllers: [TaskTypeTemplatesController],
  providers: [
    TaskTypeTemplatesRepository,
    TaskTypeTemplatesService,
    TaskTypeTemplatesGuard,
    metricsProvider,
  ],
  exports: [
    TaskTypeTemplatesService,
    TaskTypeTemplatesRepository,
    // TTT-050 — TasksService injeta este token apos commit do create
    // para incrementar `task_type_templates_instantiated_total`.
    TASK_TYPE_TEMPLATES_METRICS,
  ],
})
export class TaskTypeTemplatesModule {}
