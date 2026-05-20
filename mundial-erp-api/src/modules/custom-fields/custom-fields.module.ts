import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Registry } from 'prom-client';
import { CustomFieldDefinitionsController } from './custom-field-definitions.controller';
import { CustomFieldDefinitionsRepository } from './custom-field-definitions.repository';
import { CustomFieldDefinitionsService } from './custom-field-definitions.service';
import { CustomFieldValuesController } from './custom-field-values.controller';
import { CustomFieldValuesRepository } from './custom-field-values.repository';
import { CustomFieldValuesService } from './custom-field-values.service';
import { CustomFieldsWriteGuard } from './custom-fields-write.guard';
import { CustomFieldGroupsController } from './groups/custom-field-groups.controller';
import { CustomFieldGroupsRepository } from './groups/custom-field-groups.repository';
import { CustomFieldGroupsService } from './groups/custom-field-groups.service';
import {
  CUSTOM_FIELDS_METRICS,
  NoopCustomFieldsMetrics,
} from './custom-fields.metrics';
import { PrometheusCustomFieldsMetrics } from './custom-fields-prometheus.metrics';
import { PROM_REGISTRY } from '../../common/metrics/metrics.tokens';
import { CnpjLookupModule } from './cnpj-lookup/cnpj-lookup.module';

/**
 * CustomFieldsModule (M1 — TTT-011).
 *
 * Modulo autonomo (PLANO §"Arquitetura Modular"). Nao depende de M2
 * (TaskTypeTemplate). Funciona em qualquer task com ou sem `customTypeId`.
 *
 * Outbox: o servico de values insere row diretamente em `task_outbox_events`
 * com `eventType=CUSTOM_FIELD_VALUE_CHANGED` (string column). Adicionar
 * handler dedicado no worker fica para sprint posterior — quando ampliarem
 * o enum `TaskActivityType`. Ate la, worker registra warning e marca
 * COMPLETED, mantendo a row historica disponivel.
 *
 * Sprint 5 (TTT-050) — observabilidade:
 *   Factory provider de `CUSTOM_FIELDS_METRICS` escolhe entre Noop
 *   (default) e adapter Prometheus quando `METRICS_TOKEN` esta
 *   configurada. Mantem rollback granular: desligar `METRICS_TOKEN`
 *   volta para Noop sem deploy.
 */
const metricsProvider: Provider = {
  provide: CUSTOM_FIELDS_METRICS,
  inject: [ConfigService, PROM_REGISTRY],
  useFactory: (config: ConfigService, registry: Registry) => {
    const token = config.get<string>('METRICS_TOKEN');
    if (token) {
      return new PrometheusCustomFieldsMetrics(registry);
    }
    return new NoopCustomFieldsMetrics();
  },
};

@Module({
  imports: [CnpjLookupModule],
  controllers: [
    CustomFieldDefinitionsController,
    CustomFieldGroupsController,
    CustomFieldValuesController,
  ],
  providers: [
    CustomFieldDefinitionsRepository,
    CustomFieldDefinitionsService,
    CustomFieldGroupsRepository,
    CustomFieldGroupsService,
    CustomFieldValuesRepository,
    CustomFieldValuesService,
    CustomFieldsWriteGuard,
    metricsProvider,
  ],
  exports: [
    // Exportar services para que M2 (TaskTypeTemplate) possa consumir
    // CustomFieldDefinitionsService como interface estavel — nunca
    // o repository, conforme PLANO §"Boundaries".
    CustomFieldDefinitionsService,
    CustomFieldGroupsService,
    CustomFieldValuesService,
  ],
})
export class CustomFieldsModule {}
