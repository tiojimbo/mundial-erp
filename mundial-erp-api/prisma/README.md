# Prisma — Migrations, seeds e runbook

Guia de referencia para o diretorio `prisma/`. Aborda:

- Timeline oficial das migrations Tasks
- Como rodar seeds e backfills (e em que ordem)
- Procedimento de rollback

## Estrutura

```
prisma/
├── schema.prisma                     # Fonte unica da verdade do schema
├── migrations/                       # Migrations Prisma (aplicadas por migrate deploy)
│   ├── 20260417235905_workspace_foundation/
│   ├── 20260418000122_workspace_required/
│   ├── 20260418110xxx_workspace_composite_indexes/ (5 migrations)
│   ├── 20260419_000001_tasks_foundations/
│   ├── 20260419_000002_tasks_collaboration/
│   ├── 20260419_000003_tasks_advanced/
│   ├── 20260420_000004_tasks_rls_policies/
│   └── 20260420_000005_tasks_search_gin/
├── migrations-data/                  # Scripts SQL manuais (nao auto)
│   └── partition-status-history.sql
├── rollbacks/                        # Scripts .down.sql para as migrations Tasks
│   ├── README.md
│   ├── tasks_foundations.down.sql
│   ├── tasks_collaboration.down.sql
│   └── tasks_advanced.down.sql
├── seed-admin.ts
├── seed-bpm.ts
├── seed-reference-data.ts
├── seed-workspace.ts                 # Data migration do workspace foundation
├── seed-tasks-perf.ts                # Fixture 50k tasks para load test
└── seed.ts                           # Seed demo geral
```

## Timeline de Migrations — Tasks feature

A feature Tasks foi entregue incrementalmente em 5 migrations. A ordem e
estrita; cada uma depende da anterior.

| #   | Nome                                 | Sprint | Conteudo principal                                                                           |
| --- | ------------------------------------ | ------ | -------------------------------------------------------------------------------------------- |
| 1   | `20260419_000001_tasks_foundations`  | 1      | Colunas novas em `work_items`, `custom_task_types`, `task_outbox_events`, enum OutboxEventStatus |
| 2   | `20260419_000002_tasks_collaboration` | 2      | `work_item_assignees`, `work_item_watchers`, `work_item_tags`, `work_item_tag_links`          |
| 3   | `20260419_000003_tasks_advanced`     | 3-4    | Checklists, dependencies, links, status_history, templates, attachments, comments, activities |
| 4   | `20260420_000004_tasks_rls_policies` | 7      | Row-level security (RLS) por workspace                                                       |
| 5   | `20260420_000005_tasks_search_gin`   | 8      | `pg_trgm` extension + indices GIN em `title` e `description`                                 |

### Migration 1 — `tasks_foundations`

Additive-only: adiciona colunas em `work_items` (todas nullable), cria
`custom_task_types` (com seeds de builtins) e `task_outbox_events`.

Rename especial: coluna `work_items.assignee_id` vira `primary_assignee_cache`
com cache derivado gerenciado pela extension `primary-assignee-cache` do
Prisma Client (ver ADR-001).

### Migration 2 — `tasks_collaboration`

Introduz join tables para multi-assignees, watchers e tags. A partir daqui,
`work_item_assignees` vira a fonte unica da verdade de assignees e
`work_items.primary_assignee_cache` e derivado (ver extension acima).

Tags tem `name_lower` UNIQUE por workspace (case-insensitive por convencao
da aplicacao).

### Migration 3 — `tasks_advanced`

Maior migration em volume — introduz 9 tabelas:

- `work_item_checklists` + `work_item_checklist_items` (nested ate 3 niveis)
- `work_item_dependencies` (bloqueio forte)
- `work_item_links` (link leve)
- `work_item_status_history` (time-in-status)
- `work_item_templates`
- `work_item_attachments`
- `work_item_comments`
- `work_item_activities` (projecao do outbox)

Novos enums: `TaskTemplateScope`, `ChecklistItemSource`, `TaskActivityType`.

**Pos-migration obrigatorio**: rodar backfill (ver secao abaixo) para criar
a primeira linha de `work_item_status_history` para cada task existente.

### Migration 4 — `tasks_rls_policies`

Cria policies de Row-Level Security. Cada tabela task-related recebe
`USING (workspace_id = current_setting('app.workspace_id'))`. A aplicacao
seta a GUC por requisicao no middleware `WorkspaceGuard`.

### Migration 5 — `tasks_search_gin`

Habilita busca fuzzy (ILIKE e %) em `title` e `description` via trigram.
Ver `migration.sql` para rollback detalhado.

## Como rodar

### Primeira instalacao / dev local

```bash
# 1. Gerar cliente
npx prisma generate

# 2. Aplicar todas as migrations
npx prisma migrate deploy

# 3. Seeds basicos
npm run seed:reference-data    # Estados, cidades, bairros BR
npm run seed:bpm               # Departamentos/Areas/Processes padrao
npm run seed:admin             # User admin inicial
npm run seed:workspace         # Cria workspace default + backfill

# 4. Seed de demo (opcional)
npm run seed:demo
```

### Backfill pos Migration 3 (tasks_advanced)

Script: `scripts/backfill-tasks-feature.ts`.

```bash
npm run backfill:tasks-feature
```

Cria:

- 1 linha de `work_item_status_history` por task existente (`enteredAt = work_items.createdAt`).
- Linha de `WorkItemAssignee` para cada task que tinha `assignee_id` (primary=true).

Script e idempotente — pode rodar multiplas vezes.

### Fixture de performance

Ver [seed-tasks-perf.ts](seed-tasks-perf.ts). Usado para load tests (Sprint 8 / R15):

```bash
# Default 50k tasks
npm run perf:seed

# Tamanho customizado
FIXTURE_SIZE=10000 npm run perf:seed

# Limpar antes de criar (idempotente de outra forma)
npm run perf:seed -- --clean
```

### Ordem global de execucao

Para um banco vazio, a sequencia correta e:

1. `prisma migrate deploy`
2. `seed:reference-data`
3. `seed:bpm`
4. `seed:admin`
5. `seed:workspace`  (requer `MULTI_WORKSPACE_ENABLED=true`)
6. `backfill:tasks-feature` (apenas se migrou Migration 3 sobre um banco com tasks pre-existentes)

## Rollback

### Migrations Tasks (1-5)

Ver [`rollbacks/README.md`](rollbacks/README.md) para o runbook completo.

Resumo: aplicar os `.down.sql` em **ordem reversa** das migrations:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
\i prisma/rollbacks/tasks_advanced.down.sql
\i prisma/rollbacks/tasks_collaboration.down.sql
\i prisma/rollbacks/tasks_foundations.down.sql
COMMIT;
SQL
```

Para a **Migration 5 (search_gin)**, o rollback esta inline no proprio
arquivo `migration.sql` (secao `ROLLBACK` ao final). Executar manualmente:

```sql
DROP INDEX IF EXISTS "idx_work_items_desc_trgm";
DROP INDEX IF EXISTS "idx_work_items_title_trgm";
-- DROP EXTENSION IF EXISTS pg_trgm;  -- apenas se nenhum outro indice usa
```

Para a **Migration 4 (rls_policies)**, disable policies:

```sql
ALTER TABLE work_items DISABLE ROW LEVEL SECURITY;
-- repetir para cada tabela tasks-* onde a policy foi criada
```

### Pre-requisitos do rollback

- Workers BullMQ de Tasks PAUSADOS (evita escrita concorrente).
- Backup pg_dump recente.
- Feature flag `TASKS_FEATURE_ENABLED = false` no deploy config.

### Apos o rollback

1. `npx prisma migrate resolve --rolled-back <nome_migration>` para marcar
   como revertida no `_prisma_migrations`.
2. `git checkout` do `schema.prisma` no commit anterior a migration revertida.
3. `npx prisma generate` para regenerar o client.
4. Redeploy da API.

## Scripts SQL manuais (migrations-data)

Pasta `migrations-data/` contem scripts que **nao** sao aplicados
automaticamente pelo Prisma. Devem ser invocados por decisao operacional
(documentada em `docs/capacity-planning.md`).

- **`partition-status-history.sql`** — converte `work_item_status_history`
  em tabela particionada por mes. Gatilho: > 10M rows. Downtime ~30s.

## Dicas de debug

```bash
# Ver migrations aplicadas no banco
psql "$DATABASE_URL" -c "SELECT migration_name, applied_steps_count, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;"

# Diff schema vs banco
npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel prisma/schema.prisma
```

## Referencias

- [ADR-001 — Multi-workspace](../.claude/adr/)
- [ADR-003 — Outbox pattern](../.claude/adr/)
- [PLANO-TASKS.md](../.claude/plan/PLANO-TASKS.md)
- [capacity-planning.md](../docs/capacity-planning.md)
