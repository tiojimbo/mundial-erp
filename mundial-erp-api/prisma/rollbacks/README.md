# Rollbacks — Tasks feature

Scripts SQL manuais para desfazer as migrations `tasks_*`. O Prisma nao gera
`down` automaticamente; estes arquivos sao o runbook oficial.

## Por que manual?

- Prisma Migrate nao suporta rollback declarativo. Em caso de incidente, estes
  scripts sao o unico caminho auditavel para voltar o schema ao estado anterior
  sem perder dados colaterais.
- Cada arquivo e idempotente (`IF EXISTS`) e nao remove colunas legadas que
  ja existiam antes da migration correspondente.

## Ordem de execucao (CRITICA)

Aplique os rollbacks na ORDEM REVERSA das migrations. Ir na ordem errada causa
violacao de FK e aborta a transacao.

| Ordem | Arquivo                                 | Desfaz                                  |
| ----- | --------------------------------------- | --------------------------------------- |
| 1     | `tasks_rls_policies.down.sql`           | Migration 4 — Sprint 8 (RLS)            |
| 2     | `tasks_advanced.down.sql`               | Migration 3/3 — Sprint 3-4              |
| 3     | `tasks_collaboration.down.sql`          | Migration 2/3 — Sprint 2                |
| 4     | `tasks_foundations.down.sql`            | Migration 1/3 — Sprint 1                |

Ou seja: **sempre comece pelo mais novo** e va voltando ate o mais antigo.

## Como executar

```bash
# Dentro do container do Postgres ou com DATABASE_URL exportada:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/rollbacks/tasks_rls_policies.down.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/rollbacks/tasks_advanced.down.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/rollbacks/tasks_collaboration.down.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/rollbacks/tasks_foundations.down.sql
```

Recomenda-se envolver em uma transacao explicita:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
\i prisma/rollbacks/tasks_rls_policies.down.sql
\i prisma/rollbacks/tasks_advanced.down.sql
\i prisma/rollbacks/tasks_collaboration.down.sql
\i prisma/rollbacks/tasks_foundations.down.sql
COMMIT;
SQL
```

## Pre-requisitos

- **Workers BullMQ** de Tasks PAUSADOS antes de rodar qualquer rollback
  (evita insert concorrente em `task_outbox_events` e `work_item_activities`).
- **Extension `primary-assignee-cache`** DESABILITADA antes de rodar o
  rollback de `tasks_collaboration`: o trigger da extension reage a deletes
  em `work_item_assignees` e tentaria escrever em `work_items` ja em drop.
- Backup recente do banco (pg_dump) obrigatorio.

## Perda de dados esperada

Cada rollback lista no topo do arquivo `.down.sql` o que e perdido:

- `tasks_rls_policies`: ZERO perda de dados. Apenas remove policies RLS e
  desativa RLS. Apos esse rollback a base volta a enxergar dados cross-tenant
  sem o `SET LOCAL app.workspace_id`.
- `tasks_advanced`: todos os dados de `work_item_checklists`,
  `work_item_checklist_items`, `work_item_dependencies`, `work_item_links`,
  `work_item_status_history`, `work_item_templates`, `work_item_attachments`,
  `work_item_comments` e `work_item_activities`. Drop dos enums
  `TaskActivityType`, `ChecklistItemSource` e `TaskTemplateScope`.
- `tasks_collaboration`: todos os dados de `work_item_assignees`,
  `work_item_watchers`, `work_item_tags` e `work_item_tag_links`.
  `work_items.primary_assignee_cache` permanece intacto.
- `tasks_foundations`: colunas novas de `work_items`
  (`markdown_content`, `points`, `archived`, `archived_at`,
  `custom_type_id`, `merged_into_id`, `time_spent_seconds`) +
  tabelas `custom_task_types` e `task_outbox_events`.

## Apos o rollback

1. Executar `npx prisma migrate resolve --rolled-back <migration_name>`
   para marcar a migration como revertida no `_prisma_migrations`.
2. Reaplicar o checkout do schema.prisma no estado correspondente (via git).
3. Regenerar o Prisma Client: `npx prisma generate`.
4. Reiniciar API + workers.
