/**
 * Adapter Prometheus de `CustomFieldsMetrics` (Sprint 5 — TTT-050).
 *
 * Substitui o `NoopCustomFieldsMetrics` quando o operador configura um
 * `METRICS_TOKEN`. Mantemos a mesma interface publica para que os
 * services consumidores nao precisem mudar nada.
 *
 * Defensive coding (agent-cto §"Resiliencia"):
 *   `inc()` do prom-client e in-memory e nao lanca em uso normal — mas
 *   protegemos com try/catch defensivo para que uma metrica invalida
 *   (label exotico) nunca derrube o caminho quente de WRITE.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Counter, type Registry } from 'prom-client';
import type { CustomFieldsMetrics } from './custom-fields.metrics';
import { PROM_REGISTRY } from '../../common/metrics/metrics.tokens';

@Injectable()
export class PrometheusCustomFieldsMetrics implements CustomFieldsMetrics {
  private readonly logger = new Logger(PrometheusCustomFieldsMetrics.name);
  private readonly writtenCounter: Counter<'field_type' | 'workspace_id'>;

  constructor(@Inject(PROM_REGISTRY) registry: Registry) {
    this.writtenCounter = new Counter({
      name: 'custom_fields_written_total',
      help: 'Total de writes (definition+value) bem-sucedidos no modulo custom-fields, rotulado por tipo de campo e workspace.',
      labelNames: ['field_type', 'workspace_id'],
      registers: [registry],
    });
  }

  customFieldsWrittenTotal(args: {
    fieldType: string;
    workspaceId: string;
  }): void {
    try {
      this.writtenCounter.inc({
        field_type: args.fieldType,
        workspace_id: args.workspaceId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`custom_fields_written_total inc falhou: ${msg}`);
    }
  }
}
