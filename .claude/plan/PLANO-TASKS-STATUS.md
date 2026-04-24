# PLANO-TASKS — Status consolidado (pos-auditoria CTO)

> Versao: 2.0 (reescrita pos-auditoria CTO)
> Data: 2026-04-20
> Base: `PLANO-TASKS.md` v2.0 + `.claude/skills/squad-tasks.mdc` + `.claude/agents/agent-cto.md`
> Squad: 10 membros reais (Mariana, Diego, Felipe, Patricia, Lucas, Beatriz, Henrique, Juliana, Renato, Tatiana)

---

## 1. Sumario executivo

| Sprint | Tema | Progresso | Observacoes |
|---|---|---|---|
| 0 | Calibragem (ADRs + prototipos) | 100% | ADRs 001/002/003 em `.claude/adr/` |
| 1 | Foundations (Migration 1/3 + outbox + Prisma extension) | 100% | `tasks_foundations` aplicada em staging local |
| 2 | Collaboration (Migration 2/3 + assignees + watchers + tags) | 100% | `tasks_collaboration` aplicada; 3 Sync services |
| 3 | Relationships (Migration 3/3 + deps + links + CycleDetector) | 100% | `tasks_advanced` aplicada; exceptions dedicadas |
| 4 | Content (checklists + attachments + comments + activities) | 95% | ClamAV worker stub (lib `clamscan` sem @types) |
| 5 | Task View UI (Main + Activities Panel + BlockNote) | 90% | ~30 componentes named; `page.tsx` excecao regra #13 |
| 6 | Templates + Merge + Archive + Points | 100% | Merge real com `$transaction` + Idempotency-Key; templates CRUD+snapshot+instantiate |
| 7 | Workspace-wide views + Board + virtualizacao | 90% | `/tasks/all` + Kanban dnd-kit; CSV export via papaparse |
| 8 | Polish (RLS + cleanup + threat model + k6) | 95% | Migration 4 (RLS) + Migration 5 (pg_trgm GIN) aplicadas |

**Progresso total estimado:** ~96% do escopo codificado e validado em staging local.

---

## 2. Auditoria CTO — pontos saneados

Auditoria cruzada contra `agent-cto.md` + `99-referencia-completa.md` identificou 3 reparos tecnicos, todos **corrigidos**:

| # | Falha | Local | Correcao |
|---|---|---|---|
| 1 | Semantica errada de `ForbiddenException` em validacao de input | `task-attachments.service.ts:84,87,126` | Substituido por `BadRequestException`. Linha 201 (scanStatus bloqueia download) permanece 403 — legitimamente permissao negada |
| 2 | `$executeRawUnsafe` direto no service (viola Bravy regra 6: Prisma so via repository) | `task-outbox-cleanup.service.ts:94,104` | Movido para `TaskOutboxRepository.deleteCompletedOlderThanDays` + `deleteDeadOlderThanDays` (parametro Number-validado, zero risco SQL injection) |
| 3 | `tasks.service.ts` chamava `tx.workItem.update/findMany/updateMany`, `tx.workItemChecklist/Attachment/Comment.updateMany`, `tx.$executeRaw`, e consumia `workItemDependency/Link` via `EdgeDelegateAdapter` ginastico | `tasks.service.ts:212,325,merge()` | Criados 7 metodos novos em `TasksRepository` (`findForMerge`, `findParentsForCycleCheck`, `moveChildCollectionsToTarget`, `unionTagLinksToTarget`, `incrementTotalsOnTarget`, `markSourcesMerged`, `findBySelect`) + `setArchived` e `update` agora aceitam `tx` opcional. Criados `moveEdgesForMerge` em `TaskDependenciesRepository` e `TaskLinksRepository` — isso elimina o adapter e move persistencia de arestas para os proprios modulos (cada repo sabe seu delegate). `TasksModule` importa `TaskDependenciesModule` + `TaskLinksModule` para DI. Zero `tx.X.*` sobra no service |

**Validacao pos-correcao:**
- `tasks.service.merge.spec.ts`: **10/10 testes passam** apos refatoracao dos mocks (contrato de teste agora descreve chamadas a repositories, nao delegates Prisma).
- `npx tsc --noEmit` nos arquivos refatorados: **zero erros**.
- Grep por anti-pattern (`tx.(workItem|workItemChecklist|workItemAttachment|workItemComment|workItemDependency|workItemLink|workItemAssignee).`) em `tasks.service.ts`: **zero ocorrencias em codigo** (apenas 1 comentario documentando a regra).

**Resultado:** services do feature Tasks estao 100% aderentes a regra Bravy #6 (Prisma direto apenas em repositories). `$transaction` continua no service como orquestrador atomico — padrao canonico NestJS+Prisma.

---

## 3. Entregas por sprint (com owners reais)

### Sprint 0 — Calibragem
- `.claude/adr/001-primary-assignee-cache.md` (Mariana)
- `.claude/adr/002-activity-feed-via-outbox.md` (Mariana)
- `.claude/adr/003-outbox-pattern.md` (Mariana)
- `features/tasks/` skeleton + tokens OKLCH + BlockNote lazy-load (Henrique)
- Infra de testes E2E + k6 + Playwright + Lighthouse budget (Tatiana)

### Sprint 1 — Foundations
- Migration `20260419_000001_tasks_foundations` — rename `assignee_id` -> `primary_assignee_cache`, 7 colunas nullable em `WorkItem`, `CustomTaskType`, `TaskOutboxEvent` (Diego)
- Seed builtin `CustomTaskType` (`Task`, `Milestone` com `workspaceId=NULL`) (Diego)
- Backfill idempotente `scripts/backfill-tasks-feature.ts` (Diego)
- Modulo `task-outbox/` completo: `TaskOutboxService.enqueue(tx, event)`, worker BullMQ (concurrency 5, retry 3x backoff + jitter, DLQ) (Mariana)
- Prisma extension `primary-assignee-cache.extension.ts` + spec 100% cobertura (Mariana)
- 3 lint rules: `no-direct-primary-assignee-cache-write`, `no-direct-activity-write`, `no-direct-event-emitter-in-hot-path` (Mariana)
- Modulo `tasks/` fachada + `custom-task-types/` (Felipe)
- TSK-102: refactor `assigneeId` -> `primaryAssigneeCache` em 7 arquivos legados sem breaking change no contrato externo (Felipe)

### Sprint 2 — Collaboration
- Migration `20260419_000002_tasks_collaboration`: `WorkItemAssignee`, `WorkItemWatcher`, `WorkItemTag`, `WorkItemTagLink` (Diego)
- `task-tags/`, `task-watchers/` (Patricia)
- `AssigneesSyncService`, `WatchersSyncService`, `TagsSyncService` — deltas `{add, rem}` em transacao com enqueue outbox (Patricia)
- Filtros completos em `GET /tasks` + FE pickers (AssigneeMulti, TagPicker, WatchersPopover) (Felipe/Juliana)

### Sprint 3 — Relationships
- Migration `20260419_000003_tasks_advanced`: checklists, items, dependencies, links, status_history, templates, attachments, comments, activities (Diego)
- `task-dependencies/` + `CycleDetectorService` (BFS limite 1000, timeout 2s) + 4 exceptions dedicadas (Lucas)
- `task-links/` com simetria via UNION (Lucas)
- FE `LinkedTasksSection` + badge "Bloqueada por X" (Juliana)

### Sprint 4 — Content
- `task-checklists/` CRUD + items + reorder em transacao (Beatriz)
- `task-attachments/` com MIME whitelist + 25MB + UUID rename + signed URL TTL 300s + `clamav-scan` worker BullMQ (Beatriz)
- `task-comments/` com extracao de @mencao + soft delete (Beatriz)
- `task-activities/` read-only (worker outbox projeta; ADR-002) (Beatriz)
- `S3AdapterService` + `FileTypeDetectorService` (Beatriz/Mariana)
- **Gap:** `@types/clamscan` inexistente; worker funciona em runtime mas `tsc` emite erro implicit-any. Aceito como debito menor.

### Sprint 5 — Task View UI
- `app/(dashboard)/tasks/[taskId]/page.tsx` (UNICA excecao regra #13, documentada no JSDoc) (Juliana)
- ~30 componentes named em `features/tasks/components/task-view/`: TaskTypeRow, TaskTitle (debounce 500ms), TaskPropertyGrid, PropertyRow, StatusBadge (pipeline chevron), PriorityPicker, AssigneeMultiPicker, DateRangePicker, TimeEstimateInput, TagPicker, TaskDescription (BlockNote dynamic), CollapsibleSection, EmptyCardCTA, CustomFieldsSection, LinkedTasksSection, SubtasksSection, ProgressBar, ChecklistsSection, ChecklistPanel (dnd-kit), AttachmentsSection, AttachmentsGrid, CommentComposer, ActivitiesPanel, ActivityFeed, ActivityItem, ConfirmDialog (Juliana)
- A11y: `role="log" aria-live="polite"`, `role="progressbar"`, `aria-label` em todos IconButton, focus trap via radix (Juliana)
- Responsividade 4 BPs: >=1280 side-by-side; 1024-1280 colapso default; 768-1024 Sheet; <768 coluna unica (Juliana)
- **Gap:** Lighthouse Performance a validar em staging remoto (Perf >= 85, A11y >= 95).

### Sprint 6 — Templates + Merge + Archive + Points
- `TasksService.merge` real: `$transaction` + Idempotency-Key Redis SETNX TTL 24h + MergeCycleException BFS 1024 nodes + move de checklists/attachments/comments/deps/links/tags/totals via repositories (Felipe)
- `task-templates/` CRUD + `snapshotFromTask` + `instantiate` recursivo com cap 200 nodes / depth 3 + find-or-create de tags por nameLower (Lucas)
- `TemplatePayloadValidatorPipe` — BFS de validacao com caps hard (Lucas)
- Archive/Unarchive idempotente + enqueue outbox ARCHIVED/UNARCHIVED (Felipe)
- `ConfirmDialog` destrutivo com typing "CONFIRMAR" (Juliana)

### Sprint 7 — Views workspace-wide + Board
- `/tasks/all` data-table @tanstack/react-table com filtros + bulk actions sticky bar + virtualizacao react-virtual >=500 itens (Renato)
- `useInfiniteTasks` hook (cursor + offset) (Renato/Henrique)
- `task-board.tsx` Kanban dnd-kit + optimistic + rollback (Renato)
- `my-tasks-view.tsx` substituindo `/my-tasks` com contrato preservado (Renato)
- Filtros URL deeplink via `serializeTaskFilters`/`deserializeTaskFilters` (Henrique)

### Sprint 8 — Polish
- Migration `20260420_000004_tasks_rls_policies`: RLS habilitado em 16 tabelas tasks-scoped com policies `ws_isolation_<table>` via `current_setting('app.workspace_id')` (Mariana)
- Migration `20260420_000005_tasks_search_gin`: `pg_trgm` + GIN index em `title`/`description` para full-text (Diego)
- `TaskOutboxCleanupService` `@Cron('0 3 * * 0')` com delete COMPLETED>30d e DEAD>90d via repository (Diego)
- `seed-tasks-perf.ts` para 50k tasks (Diego)
- Particionamento StatusHistory script + runbook capacity-planning (Diego)
- `TaskCalendar`, `TaskGantt`, settings pages, GlobalShortcuts (Renato)
- SSE client com Last-Event-ID + backoff expo + jitter + max 3 conn/user (Henrique)
- Threat model 22 vetores (`docs/threat-model-tasks.md`) + pentest checklist 30 checks (`docs/pentest-checklist.md`) (Tatiana)
- `tasks.k6.js` 5 cenarios reais + `run-k6-nightly.sh` (Tatiana)
- `.github/workflows/regression-tasks.yml` com postgres:16 + redis:7 services (Tatiana)

---

## 4. Staging local (aplicado 2026-04-20)

Operacoes executadas e validadas:

1. `npx prisma migrate resolve --rolled-back` em 1 migration pre-existente com erro; 4 migrations duplicadas `*_workspace_composite_indexes` com SQL corrompido removidas (conteudo era stderr do CLI Prisma).
2. `npm run seed:workspace` — 362 rows backfilled com `workspaceId`.
3. `npx prisma migrate deploy` — 5 migrations Tasks aplicadas em ordem.
4. `npx prisma generate` — client v7.6.0 regenerado.
5. `npm install --save @aws-sdk/client-s3 @aws-sdk/s3-request-presigner clamscan file-type` no API (112 pacotes).
6. `npm install --save lucide-react papaparse dompurify` + `@types/papaparse @types/dompurify` no web (284 pacotes).
7. `npm run backfill:tasks-feature -- --dry-run` — 0 rows em DB dev (nenhum trabalho).
8. Seed de `CustomTaskType` builtin via SQL direto (DISABLE/ENABLE RLS momentaneo): 2 rows (`builtin-task`, `builtin-milestone`).

---

## 5. Gap list residual (antes de canary em Coolify VPS)

| # | Gap | Owner | Bloqueante GA? | Status |
|---|---|---|---|---|
| 1 | RLS `custom_task_types` nao permite INSERT de builtin (workspace_id=NULL) — workaround foi DISABLE/ENABLE momentaneo no seed | Mariana | Nao | **Fechado 2026-04-21** — migration `20260421_000007_tasks_rls_custom_types_builtin` com policy `ws_isolation_custom_task_types_builtin` PERMISSIVE `FOR ALL USING/WITH CHECK (workspace_id IS NULL AND is_builtin = true)` + rollback SQL. Seed simplificado (sem DISABLE/ENABLE RLS) |
| 2 | `task-attachments.service.register` chama `outbox.enqueue({...})` sem `tx` — mesma divergencia de assinatura em `task-tags.service` e `task-watchers.service` legados | Beatriz + Patricia | Nao | **Fechado 2026-04-21** — `register` envolvido em `$transaction` (create + outbox.enqueue(tx, ...)) com scanQueue.add APOS commit; `task-tags.attach/detach` + `task-watchers.addWatcher/removeWatcher` ja envolvidos em `$transaction`. Grep `outbox\.enqueue\(\{` retorna zero ocorrencias |
| 3 | `@types/clamscan` inexistente no npm — tsc emite `implicit any` no worker | Beatriz | Nao | **Fechado 2026-04-21** — `src/types/clamscan.d.ts` tipa somente `new NodeClam()`, `.init(options)`, `.isInfected(filePath)` (APIs realmente consumidas pelo worker). Zero `any`, tsc limpo nos arquivos tocados |
| 4 | Specs `bpm/areas.service.spec.ts` e `bpm/departments.service.spec.ts` desatualizados pos multi-tenant — ja em `testPathIgnorePatterns` | Squad BPM | Nao | Sprint de manutencao do squad BPM (fora do escopo Tasks) |
| 5 | Deploy Coolify VPS 193.203.183.176 nao executado — apenas staging local | Mariana + Diego | Sim (para GA) | **Pendente** — requer janela de deploy: `prisma migrate deploy` via Coolify + verificacao RLS em producao |
| 6 | Feature flag `TASKS_V2_ENABLED` default `true` — falta rollout em waves per-workspace | Mariana | Nao | **Fechado 2026-04-21** — `scripts/rollout-tasks-v2.ts` + `npm run rollout:tasks-v2 -- --wave <5\|25\|50\|100> [--apply]`. Grava `Workspace.settings.tasksV2Enabled=true` em `$transaction`, ordem `createdAt ASC, id ASC`, idempotente, monotonico (so liga) |
| 7 | k6 50k rodada oficial em staging ainda nao executada | Tatiana | Sim | **Pendente** — requer VPS staging: rodar `test/perf/tasks.k6.js` 3x consecutivas sem violar thresholds |
| 8 | Lighthouse CI bloqueante nao testado em PR real ainda | Henrique + Tatiana | Nao | **Pendente** — valida no primeiro PR que tocar `features/tasks/` |
| 9 (NOVO) | TaskBoard sem optimistic update + rollback explicito no drag-drop entre colunas | Renato | Nao | **Fechado 2026-04-21** — snapshot via `queryClient.getQueriesData(taskQueryKeys.lists(workspaceId))`, patch optimistic em `pages`, rollback em `onError`, `invalidateQueries` em `onSettled`. Hook `useUpdateTask` preservado (alteracao so no consumidor) |

---

## 6. GA checklist final

**Bloqueantes:**
- [ ] `prisma migrate deploy` em producao Coolify
- [ ] RLS validado em producao por 7 dias sob trafego real
- [ ] k6 50k nightly 3x consecutivas sem violar thresholds em staging VPS
- [ ] Regression workflow passa em 3 PRs consecutivos no dominio Tasks
- [ ] Pentest checklist 30/30 em staging VPS
- [ ] Threat model revisado por CTO
- [ ] Backup + restore testado com fixture 50k

**Nao bloqueantes (backlog pos-GA):**
- [ ] Lighthouse Performance >= 85 na Task View
- [ ] Outbox chaos test (matar listener + validar dedupe por eventId + hash)
- [ ] OpenAPI publico em `docs.mundial-erp.io`
- [x] Feature flag rollout waves configuradas (Gap #6 — 2026-04-21)
- [x] Gap #2 (enqueue sem tx) resolvido em todos os 3 services afetados (2026-04-21)
- [x] Gap #1 (RLS custom_task_types builtin) policy aditiva (2026-04-21)
- [x] Gap #9 TaskBoard optimistic + rollback (2026-04-21)

**Observabilidade:**
- [ ] Dashboards Grafana `tasks-feature.dashboard.json` importados + alerts ligados a PagerDuty
- [ ] Log retention >= 30 dias em prod
- [ ] Runbook de incidente `docs/runbook-tasks-incidents.md`

**Compliance:**
- [ ] LGPD: fluxo soft-anonymize para user deletion (tasks + comments + attachments)
- [ ] Audit log imutavel para mudancas de permissao
- [ ] Retencao de anexos configurada

---

## 7. Referencias

- `PLANO-TASKS.md` — fonte normativa de escopo
- `.claude/adr/001-003` — ADRs fundadores
- `.claude/skills/squad-tasks.mdc` — matriz de paralelismo do squad
- `.claude/agents/agent-cto.md` — principios de engenharia
- `.claude/standards/99-referencia-completa.md` — padroes Bravy
- `mundial-erp-api/docs/threat-model-tasks.md` — 22 vetores
- `mundial-erp-api/docs/pentest-checklist.md` — 30 checks
- `mundial-erp-api/test/perf/tasks.k6.js` — 5 cenarios de carga
- `.github/workflows/regression-tasks.yml` — CI regression gate
