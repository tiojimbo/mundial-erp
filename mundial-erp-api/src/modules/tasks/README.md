# Tasks Module

Facade semantica de Tasks (paridade ClickUp) sobre `WorkItem`. Expoe rotas
workspace-wide em `/tasks/*` e agrega sub-recursos (`/tasks/:id/tags`,
`/tasks/:id/watchers`, etc.) em modulos irmaos.

## Feature Flag `TASKS_V2_ENABLED`

Todas as rotas deste controller passam por `TasksFeatureFlagGuard` (veja
`src/common/feature-flags/tasks-feature-flag.guard.ts`). A ordem de resolucao
(primeira match vence) e:

1. `@SkipTasksV2Flag()` na rota/controller — libera (usado em `/work-items`).
2. `@Public()` ou `@SkipWorkspaceGuard()` — libera (healthchecks, auth).
3. `TASKS_V2_ENABLED=false` — nega (kill switch global).
4. Workspace listado em `TASKS_V2_DISABLED_WORKSPACES` (CSV) — nega.
5. `workspace.settings.tasksV2Enabled === false` — nega.
6. Default — libera.

Em caso de "nega" retornamos **HTTP 404 Not Found**, nao 503. Objetivo:
para o workspace opt-out, a feature simplesmente nao existe; expor 503 vazaria
arquitetura interna.

### Variaveis de ambiente

| Variavel                          | Default | Efeito                                              |
| --------------------------------- | ------- | --------------------------------------------------- |
| `TASKS_V2_ENABLED`                | `true`  | `false` desliga a feature em **todos** os workspaces |
| `TASKS_V2_DISABLED_WORKSPACES`    | `""`    | CSV de workspace ids a excluir (gradual rollback)    |

### Cache

O guard mantem cache em memoria (TTL 60s, max 5k entradas, eviction FIFO ~10%).
Mudanca de `workspace.settings.tasksV2Enabled` propaga no proximo ciclo de
TTL ou via restart dos pods. Ver `TasksFeatureFlagGuard.resolveFromDatabase`.

### Fail-open em erro de banco

Se a leitura de `workspace.settings` falhar, o guard libera a request e
loga `tasks_v2_flag_db_error`. A metrica `tasks_feature_flag_db_errors_total`
alimenta o dashboard Grafana (`observability/grafana/tasks-feature.dashboard.json`).

## Endpoints

Ver `tasks.controller.ts` — lista, detalhe, patch, delete, archive/unarchive,
time-in-status (single + bulk), merge e activities feed. Guards globais
aplicados: `JwtAuthGuard`, `WorkspaceGuard`, `RolesGuard`, `TasksFeatureFlagGuard`.

## Observabilidade

Dashboard base em `observability/grafana/tasks-feature.dashboard.json` com
panels de RED (rate/errors/duration), outbox lag e DLQ, contagem de queries
por request e fila do ClamAV de anexos.

## RLS (Sprint 8)

A partir da migration `20260420_000004_tasks_rls_policies`, todas as tabelas
relacionadas a Tasks tem Row Level Security ativo. Conexoes precisam executar
`SET LOCAL app.workspace_id = $1` no inicio de cada transacao. O wrapper
esta em `PrismaService.runWithWorkspace(workspaceId, fn)`. Migrator, seeds
e workers BullMQ usam role com `BYPASSRLS`.
