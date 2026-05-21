# Custom Fields — Sprint 1 (TTT-013)

Feature flag global: `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED` (default `false`).

Quando OFF, o `CustomFieldsWriteGuard` responde **404** nas rotas de WRITE.
GETs continuam funcionando (leitura nao quebra UI).

## Endpoints que precisam de `@UseGuards(CustomFieldsWriteGuard)`

Aplicar SOMENTE nestes (writes); nao aplicar em GETs:

- `POST   /custom-fields/definitions`            — cria definition.
- `PATCH  /custom-fields/definitions/:id`        — edita definition.
- `DELETE /custom-fields/definitions/:id`        — remove definition.
- `PATCH  /custom-fields/values/:entityId`       — atualiza values de uma entidade.

## Como aplicar

```ts
import { UseGuards } from '@nestjs/common';
import { CustomFieldsWriteGuard } from './custom-fields-write.guard';

@UseGuards(CustomFieldsWriteGuard)
@Post('definitions')
create(/* ... */) { /* ... */ }
```

## Metricas

`CustomFieldsMetrics` (interface) + `NoopCustomFieldsMetrics` (stub) em
`custom-fields.metrics.ts`. Adapter Prometheus chega na Sprint 5 (TTT-050).
