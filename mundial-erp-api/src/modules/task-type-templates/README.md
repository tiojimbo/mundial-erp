# Task Type Templates (M2)

Modulo da Sprint 3 do PLANO-TASK-TYPES-TEMPLATES — templates 1:1 com
`CustomTaskType` que carregam descricao default, categorias de anexo e
array de `customFieldDefinitionId` consumido por `tasks.service.create`.

## Feature flag

`FEATURE_TASK_TYPE_TEMPLATES_ENABLED` (default `false`). Independente
de `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED` (M1) — rollback granular por
modulo (PLANO §Decisoes-Chave D8).

## Onde aplicar `TaskTypeTemplatesGuard`

Aplicar `@UseGuards(TaskTypeTemplatesGuard)` no nivel do controller
`TaskTypeTemplatesController` (TTT-031/TTT-032 — Felipe), cobrindo:

- `GET /task-type-templates`
- `GET /task-type-templates/:customTaskTypeId`

Quando OFF: 404 (nao 403 — nao vazar existencia da feature).

`tasks.service.create` (TTT-035) consulta a flag diretamente via
`ConfigService` antes de instanciar — guard nao cobre esse caminho.

## Metricas

Interface `TaskTypeTemplatesMetrics` + stub `Noop` em
`task-type-templates.metrics.ts`. Adapter Prometheus deferido para
Sprint 5 (TTT-050).
