/**
 * Metricas de observabilidade do modulo Custom Fields
 * (PLANO-TASK-TYPES-TEMPLATES Sprint 1 — TTT-013).
 *
 * Estrutura minima para Sprint 1: interface + stub Noop. A integracao
 * real com prom-client/Grafana fica para Sprint 5 (TTT-050), onde sera
 * provido um adapter Prometheus mantendo este contrato.
 */
export interface CustomFieldsMetrics {
  /**
   * Incrementa o contador `custom_fields_written_total` rotulado por
   * tipo de campo e workspace. Chamar apos persistir com sucesso um
   * write de definition ou de value.
   */
  customFieldsWrittenTotal(args: {
    fieldType: string;
    workspaceId: string;
  }): void;
}

/**
 * Implementacao stub. Substituida pelo `PrometheusCustomFieldsMetrics`
 * em Sprint 5 (TTT-050) quando `METRICS_TOKEN` esta configurada.
 * Assinatura publica permanece estavel para evitar churn nos services
 * consumidores.
 */
export class NoopCustomFieldsMetrics implements CustomFieldsMetrics {
  customFieldsWrittenTotal(): void {
    // No-op: sera substituido por adapter Prometheus em Sprint 5.
  }
}

/**
 * Token DI para injecao do `CustomFieldsMetrics`. O modulo provem
 * `NoopCustomFieldsMetrics` por default; quando `METRICS_TOKEN` esta
 * configurada, factory substitui pelo adapter Prometheus mantendo o
 * token estavel para os services consumidores.
 */
export const CUSTOM_FIELDS_METRICS = Symbol('CUSTOM_FIELDS_METRICS');
