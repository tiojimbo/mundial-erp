# Plano de Implementacao — Feature Tasks (ClickUp-compatible + Task View)

> **Versao:** 2.0 (pos CTO review) · **Data:** 2026-04-19
> **Base normativa:** `.claude/standards/99-referencia-completa.md` + `.claude/agents/agent-cto.md`
> **Spec funcional:** `tasks.md` (API ClickUp Tasks/Checklists/Relationships + Task View UI)
> **Lema do epico:** Codigo simples, tipado, testavel, e que aguenta 10x o trafego atual sem reescrever.
> **Principio mestre:** **additive-only.** Zero breaking change em pedidos, producao, separacao, requisicoes, financeiro, PDF, BPM.

---

## 0. Indice

1. Objetivo, escopo e nao-objetivos
2. ADRs fundadores (3 decisoes criticas)
3. Analise do estado atual
4. Mapeamento de dominio (ClickUp -> Mundial ERP)
5. Modelo de dados Prisma — detalhado
6. Estrutura de modulos backend
7. Contrato de endpoints
8. Regras de negocio
9. Observabilidade e SLIs
10. UI / Design System — Task View integral
11. Estrutura frontend
12. Telas e rotas
13. Backlog ordenado por Sprints (Scrum Master)
14. Estrategia de testes
15. Plano de migracao e rollback (3 migrations)
16. Riscos e mitigacoes
17. Checklist de aprovacao

---

## 1. Objetivo, escopo e nao-objetivos

### 1.1 Problem statement
Hoje `WorkItem` cobre ~70% do que uma Task ClickUp entrega: CRUD, status, prioridade, assignee unico, parent/subtasks, datas, estimativa. Faltam: custom task types arbitrarios, multi-assignees, tags, watchers, checklists, dependencies com detector de ciclo, task links, templates, merge, time-in-status, points, archived, markdown content, anexos — e a **Task View** (layout Main + Activities Panel, BlockNote, slash menu, drag-and-drop).

### 1.2 Objetivo
Entregar paridade semantica com o grupo Tasks + Checklists + Relationships do ClickUp, reusando `WorkItem`. Replicar fielmente a Task View especificada em `tasks.md`. Operar em multi-tenant com isolamento por workspace.

### 1.3 Metricas de sucesso (DoD do epico)
| Metrica | Alvo |
|---|---|
| Cobertura endpoints ClickUp (10 + CT + 6 CL + 4 R) | 100% semantico |
| Cobertura unitaria services novos | ≥ 80% |
| Regressao `orders`, `production-orders`, `financial-summary`, `invoices`, `bpm`, `work-items` | 0 falhas |
| SLI `GET /tasks` workspace-wide p95 | < 500 ms em 50k tasks |
| SLI `GET /tasks/:id` detail p95 | < 300 ms |
| SLI listeners de outbox p95 | < 5 s |
| Queries por endpoint (budget) | ≤ 10 (fail CI acima) |
| Lighthouse Task View Performance | ≥ 85 |
| Lighthouse Task View A11y | ≥ 95 |
| WCAG AA contraste | texto ≥ 15:1, muted ≥ 4.5:1 |

### 1.4 Nao-objetivos (fora deste epico)
- `Set Custom Field Value` (escrita de custom field por task) — epico proprio.
- `Custom Task IDs` (human-readable) — nao oferecemos.
- CRUD de `CustomTaskType` via API (ClickUp tambem nao oferece; via seed).
- Time tracking com sessoes start/stop — so agregamos `timeSpentSeconds`.
- Integracao bidirecional com ClickUp real.
- Hard delete via API (so job administrativo).

---

## 2. ADRs fundadores (decisoes criticas — registradas para rastreio)

> Sera gerado 1 arquivo em `.claude/adr/` para cada. Aqui fica o resumo executivo.

### ADR-001 — Assignee primario como cache derivado
**Contexto:** Hoje `WorkItem.assigneeId` e fonte unica. Queremos multi-assignee, mas `GET /my-tasks`, kanban e filtros existentes dependem de um primary.
**Opcoes:**
A. Manter `assigneeId` gravado pela aplicacao + `WorkItemAssignee[]` em paralelo (dois contratos, espelho frageil).
B. Remover `assigneeId` e refatorar tudo para `WorkItemAssignee[]` agora (alto custo, muito blast radius).
C. **Renomear** `assigneeId` para `primaryAssigneeCache`, marcar como **derivado**, atualizar **apenas** via trigger de aplicacao (Prisma extension que intercepta writes no join table) + lint rule que proibe SET direto fora do extension.
**Decisao:** C.
**Consequencias:** um contrato unico (o join); cache explicito, nunca silencioso; migrations rename e backfill simples; `getMyTasks` continua filtrando por coluna indexada.
**Trade-off:** complexidade da Prisma extension (50 linhas) vs. risco de divergencia silenciosa.

### ADR-002 — Activity feed como projecao do AuditLog (sem dupla escrita)
**Contexto:** `AuditLog` ja captura todas as mutacoes. Plano v1 previa `WorkItemActivity` como tabela paralela — dupla escrita no hot path.
**Opcoes:**
A. Manter `WorkItemActivity` com listener que persiste sincronamente (2x INSERT no caminho critico).
B. Criar `WorkItemActivity` alimentado assincronamente via outbox + BullMQ worker (1x INSERT no hot path, assincrono no feed).
C. Nao criar `WorkItemActivity`; o Activity Panel consome `GET /api/v1/audit-logs?entity=WorkItem&entityId=:id` direto, com indice composto.
**Decisao:** B. Alimentar `WorkItemActivity` via outbox (proxima ADR), **nao** sincrono. Rationale: UI precisa de payload formatado (actor, action, linked entities), custoso demais enriquecer em cada render do feed. Outbox garante consistencia eventual.
**Consequencias:** feed atualiza em ≤ 5 s (tolerado); hot path enxuto; retry automatico; se o worker morrer, nada e perdido.

### ADR-003 — Outbox pattern para side-effects
**Contexto:** Side-effects (status history, activity feed, notifications) emitidos por `EventEmitter2` sao in-process. Crash entre commit e listener = evento perdido. Incidente silencioso.
**Opcoes:**
A. Manter EventEmitter2 e aceitar a perda rara.
B. Outbox: `task_outbox_events` escrita na mesma `$transaction` do commit. Worker BullMQ consome, idempotente, com DLQ.
**Decisao:** B. Stack ja tem BullMQ + Redis.
**Consequencias:** zero perda. Complexidade extra de 1 tabela + 1 worker. DLQ alerta em Grafana.

---

## 3. Analise do estado atual

### 3.1 Reaproveitado
| Conceito ClickUp | Modelo Mundial | Papel |
|---|---|---|
| Team / Workspace | `Workspace` | Tenant raiz (`WorkspaceGuard` global) |
| Space | `Department` | Hierarquia |
| Folder | `Area` | Hierarquia |
| List | `Process` (processType = LIST) | Container |
| Task | `WorkItem` | Ja tem: `title`, `description`, `statusId`, `itemType`, `priority`, `assigneeId`, `creatorId`, `parentId`, `startDate`, `dueDate`, `completedAt`, `closedAt`, `estimatedMinutes`, `trackedMinutes`, `sortOrder`, `deletedAt` |
| Subtask | `WorkItem.parentId` | Self-ref |
| Status | `WorkflowStatus` | Categorias NOT_STARTED/ACTIVE/DONE/CLOSED |
| View | `ProcessView` | LIST/BOARD/CALENDAR/GANTT |
| Auditoria | `AuditLog` + `AuditInterceptor` | Fonte unica (ADR-002) |
| Notificacao | `Notification` | Ja existe |
| Queue | `BullMQ + Redis` | Worker de outbox (ADR-003) |

### 3.2 Gaps
Tags, watchers, multi-assignees, checklists, dependencies, task links, templates, merge, time-in-status, points, archived, markdownContent, anexos, comentarios dedicados, custom task types arbitrarios — todos **a criar**.

---

## 4. Mapeamento de dominio — ClickUp -> Mundial ERP

### 4.1 Dicionario
| ClickUp | Mundial ERP | Route |
|---|---|---|
| `team_id` | `Workspace.id` | Header `X-Workspace-Id` |
| `list_id` | `Process.id` | `:processId` |
| `task_id` | `WorkItem.id` | `:taskId` |
| `checklist_id` | `WorkItemChecklist.id` | `:checklistId` |
| `checklist_item_id` | `WorkItemChecklistItem.id` | `:itemId` |

### 4.2 Mapeamento de endpoints
| # | ClickUp | Mundial ERP | Verbo |
|---|---|---|---|
| 1 | `GET /list/{id}/task` | `GET /api/v1/processes/:processId/tasks` | GET |
| 2 | `POST /list/{id}/task` | `POST /api/v1/processes/:processId/tasks` | POST |
| 3 | `GET /task/{id}` | `GET /api/v1/tasks/:taskId` | GET |
| 4 | `PUT /task/{id}` | `PATCH /api/v1/tasks/:taskId` | PATCH |
| 5 | `DELETE /task/{id}` | `DELETE /api/v1/tasks/:taskId` | DELETE |
| 6 | `GET /team/{id}/task` | `GET /api/v1/tasks` | GET |
| 7 | `POST /task/{id}/merge` | `POST /api/v1/tasks/:taskId/merge` | POST |
| 8 | `GET /task/{id}/time_in_status` | `GET /api/v1/tasks/:taskId/time-in-status` | GET |
| 9 | `GET /task/bulk_time_in_status/task_ids` | **`POST /api/v1/tasks/time-in-status:bulk`** (body `{ taskIds: string[] }`) | POST |
| 10 | `POST /list/{id}/taskTemplate/{tid}` | `POST /api/v1/processes/:processId/task-templates/:templateId/instances` | POST |
| CT | `GET /team/{id}/custom_item` | `GET /api/v1/custom-task-types` | GET |
| CL1-6 | checklists | `/api/v1/tasks/:taskId/checklists` + `/api/v1/task-checklists/:id[/items[/:itemId]]` | POST/PATCH/DELETE |
| R1-4 | dependencies, links | `/api/v1/tasks/:taskId/dependencies`, `/api/v1/tasks/:taskId/links/:linksToId` | POST/DELETE |

> **CTO note #9 resolvido:** `:bulk` via POST com body evita limite de URL (cuids somados estouram 2048 chars). Rompe idempotencia-GET — aceitavel (RFC 7231 permite POST para reads complexos).

---

## 5. Modelo de dados Prisma — detalhado

**Arquivo:** `mundial-erp-api/prisma/schema.prisma`
**Migrations (3 partes — CTO note #16):**
1. `tasks_foundations` — extensoes em `WorkItem`, `CustomTaskType`, seed builtin, `task_outbox_events`.
2. `tasks_collaboration` — `WorkItemAssignee` (rename `assigneeId` -> `primaryAssigneeCache`), `WorkItemWatcher`, `WorkItemTag`, `WorkItemTagLink`.
3. `tasks_advanced` — `WorkItemChecklist` + items, `WorkItemDependency`, `WorkItemLink`, `WorkItemStatusHistory`, `WorkItemTemplate`, `WorkItemAttachment`, `WorkItemComment`, `WorkItemActivity`.

### 5.1 Novos enums
```prisma
enum TaskTemplateScope { WORKSPACE DEPARTMENT PROCESS }
enum ChecklistItemSource { MANUAL TEMPLATE }

enum TaskActivityType {
  CREATED RENAMED DESCRIPTION_CHANGED
  STATUS_CHANGED PRIORITY_CHANGED DUE_DATE_CHANGED START_DATE_CHANGED
  ASSIGNEE_ADDED ASSIGNEE_REMOVED WATCHER_ADDED WATCHER_REMOVED
  TAG_ADDED TAG_REMOVED CUSTOM_TYPE_CHANGED POINTS_CHANGED
  ARCHIVED UNARCHIVED MERGED_INTO
  DEPENDENCY_ADDED DEPENDENCY_REMOVED LINK_ADDED LINK_REMOVED
  CHECKLIST_CREATED CHECKLIST_ITEM_RESOLVED
  ATTACHMENT_ADDED SUBTASK_ADDED SUBTASK_COMPLETED COMMENT_ADDED
}

enum OutboxEventStatus { PENDING PROCESSING COMPLETED FAILED DEAD }
```

### 5.2 Extensoes em `WorkItem`
```prisma
model WorkItem {
  // ... campos existentes preservados ...
  // RENAME: assigneeId -> primaryAssigneeCache (ADR-001)
  /// CACHE DERIVADO: nao escrever direto. Atualizado pela Prisma extension
  /// em eventos de insert/delete de WorkItemAssignee. Lint rule bloqueia set.
  primaryAssigneeCache String? @map("primary_assignee_cache")

  markdownContent    String?  @map("markdown_content") @db.Text
  points             Decimal? @db.Decimal(10, 2)
  archived           Boolean  @default(false)
  archivedAt         DateTime? @map("archived_at")
  customTypeId       String?  @map("custom_type_id")
  mergedIntoId       String?  @map("merged_into_id")
  // CTO note #7: Int em segundos (64k dias cabem em Int32); evita BigInt no JSON
  timeSpentSeconds   Int      @default(0) @map("time_spent_seconds")

  customType       CustomTaskType?         @relation(fields: [customTypeId], references: [id])
  mergedInto       WorkItem?               @relation("MergeTarget", fields: [mergedIntoId], references: [id])
  merges           WorkItem[]              @relation("MergeTarget")
  assignees        WorkItemAssignee[]
  watchers         WorkItemWatcher[]
  tags             WorkItemTagLink[]
  checklists       WorkItemChecklist[]
  attachments      WorkItemAttachment[]
  comments         WorkItemComment[]
  statusHistory    WorkItemStatusHistory[]
  dependenciesOut  WorkItemDependency[]    @relation("DependencyFrom")
  dependenciesIn   WorkItemDependency[]    @relation("DependencyTo")
  linksFrom        WorkItemLink[]          @relation("LinkFrom")
  linksTo          WorkItemLink[]          @relation("LinkTo")
  activities       WorkItemActivity[]

  // Indices para queries dominantes (hot path)
  @@index([primaryAssigneeCache, dueDate], name: "idx_work_items_assignee_due")
  @@index([archived, processId, deletedAt], name: "idx_work_items_archived_process")
  @@index([customTypeId], name: "idx_work_items_custom_type")
  @@index([mergedIntoId], name: "idx_work_items_merged_into")
}
```

### 5.3 Novos models
```prisma
// CustomTaskType — builtin (workspaceId NULL) + custom por workspace
model CustomTaskType {
  id          String    @id @default(cuid())
  workspaceId String?   @map("workspace_id") // NULL = builtin global
  name        String
  namePlural  String?   @map("name_plural")
  description String?
  icon        String?   // Lucide icon name
  color       String?
  avatarUrl   String?   @map("avatar_url")
  isBuiltin   Boolean   @default(false) @map("is_builtin")
  sortOrder   Int       @default(0) @map("sort_order")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  workspace Workspace? @relation(fields: [workspaceId], references: [id])
  workItems WorkItem[]

  @@index([workspaceId, deletedAt], name: "idx_custom_task_types_ws_deleted")
  @@map("custom_task_types")
}

// Multi-assignees (fonte unica; WorkItem.primaryAssigneeCache e derivado)
model WorkItemAssignee {
  workItemId String   @map("work_item_id")
  userId     String   @map("user_id")
  isPrimary  Boolean  @default(false) @map("is_primary")
  assignedAt DateTime @default(now()) @map("assigned_at")
  assignedBy String?  @map("assigned_by")

  workItem WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  user     User     @relation("WorkItemAssigneeUser", fields: [userId], references: [id])

  @@id([workItemId, userId])
  @@index([userId, workItemId], name: "idx_wi_assignees_user")
  @@index([workItemId, isPrimary], name: "idx_wi_assignees_primary")
  @@map("work_item_assignees")
}

model WorkItemWatcher {
  workItemId String   @map("work_item_id")
  userId     String   @map("user_id")
  addedAt    DateTime @default(now()) @map("added_at")

  workItem WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  user     User     @relation("WorkItemWatcherUser", fields: [userId], references: [id])

  @@id([workItemId, userId])
  @@index([userId], name: "idx_wi_watchers_user")
  @@map("work_item_watchers")
}

model WorkItemTag {
  id          String    @id @default(cuid())
  workspaceId String    @map("workspace_id")
  name        String
  nameLower   String    @map("name_lower") // case-insensitive unique
  color       String?
  bgColor     String?   @map("bg_color")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  workspace Workspace         @relation(fields: [workspaceId], references: [id])
  links     WorkItemTagLink[]

  @@unique([workspaceId, nameLower])
  @@index([workspaceId, deletedAt], name: "idx_wi_tags_ws_deleted")
  @@map("work_item_tags")
}

model WorkItemTagLink {
  workItemId String @map("work_item_id")
  tagId      String @map("tag_id")

  workItem WorkItem    @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  tag      WorkItemTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([workItemId, tagId])
  @@index([tagId], name: "idx_wi_tag_links_tag")
  @@map("work_item_tag_links")
}

model WorkItemChecklist {
  id         String    @id @default(cuid())
  workItemId String    @map("work_item_id")
  name       String
  position   Int       @default(0)
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")

  workItem WorkItem                @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  items    WorkItemChecklistItem[]

  @@index([workItemId, position], name: "idx_checklists_wi_pos")
  @@map("work_item_checklists")
}

model WorkItemChecklistItem {
  id           String              @id @default(cuid())
  checklistId  String              @map("checklist_id")
  parentId     String?             @map("parent_id")
  name         String
  assigneeId   String?             @map("assignee_id")
  resolved     Boolean             @default(false)
  resolvedAt   DateTime?           @map("resolved_at")
  resolvedBy   String?             @map("resolved_by")
  position     Int                 @default(0)
  source       ChecklistItemSource @default(MANUAL)
  createdAt    DateTime            @default(now()) @map("created_at")
  updatedAt    DateTime            @updatedAt @map("updated_at")
  deletedAt    DateTime?           @map("deleted_at")

  checklist WorkItemChecklist       @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  parent    WorkItemChecklistItem?  @relation("ChecklistItemNesting", fields: [parentId], references: [id])
  children  WorkItemChecklistItem[] @relation("ChecklistItemNesting")
  assignee  User?                   @relation("ChecklistItemAssignee", fields: [assigneeId], references: [id])

  @@index([checklistId, position], name: "idx_checklist_items_list_pos")
  @@index([parentId], name: "idx_checklist_items_parent")
  @@map("work_item_checklist_items")
}

model WorkItemDependency {
  id         String   @id @default(cuid())
  fromTaskId String   @map("from_task_id") // bloqueia (depends_on)
  toTaskId   String   @map("to_task_id")   // espera
  createdAt  DateTime @default(now()) @map("created_at")
  createdBy  String?  @map("created_by")

  fromTask WorkItem @relation("DependencyFrom", fields: [fromTaskId], references: [id], onDelete: Cascade)
  toTask   WorkItem @relation("DependencyTo",   fields: [toTaskId],   references: [id], onDelete: Cascade)

  @@unique([fromTaskId, toTaskId])
  @@index([toTaskId], name: "idx_wi_deps_to")
  @@map("work_item_dependencies")
}

model WorkItemLink {
  id         String   @id @default(cuid())
  fromTaskId String   @map("from_task_id")
  toTaskId   String   @map("to_task_id")
  createdAt  DateTime @default(now()) @map("created_at")
  createdBy  String?  @map("created_by")

  fromTask WorkItem @relation("LinkFrom", fields: [fromTaskId], references: [id], onDelete: Cascade)
  toTask   WorkItem @relation("LinkTo",   fields: [toTaskId],   references: [id], onDelete: Cascade)

  @@unique([fromTaskId, toTaskId])
  @@index([toTaskId], name: "idx_wi_links_to")
  @@map("work_item_links")
}

// Time in Status — 1 linha por transicao; particionar por mes se > 10M rows
model WorkItemStatusHistory {
  id              String    @id @default(cuid())
  workItemId      String    @map("work_item_id")
  statusId        String    @map("status_id")
  enteredAt       DateTime  @default(now()) @map("entered_at")
  leftAt          DateTime? @map("left_at")
  durationSeconds Int?      @map("duration_seconds") // CTO note #7
  byUserId        String?   @map("by_user_id")

  workItem WorkItem       @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  status   WorkflowStatus @relation("StatusHistoryStatus", fields: [statusId], references: [id])

  @@index([workItemId, enteredAt(sort: Desc)], name: "idx_status_history_task_entered")
  @@map("work_item_status_history")
}

model WorkItemTemplate {
  id             String            @id @default(cuid())
  workspaceId    String            @map("workspace_id")
  name           String
  scope          TaskTemplateScope @default(WORKSPACE)
  departmentId   String?           @map("department_id")
  processId      String?           @map("process_id")
  payload        Json              // snapshot: title, desc, markdown, priority, estimate, tags[], checklists[], subtasks (max 200 nodes, depth 3)
  subtaskCount   Int               @default(0) @map("subtask_count")   // denormalizado para UI
  checklistCount Int               @default(0) @map("checklist_count") // denormalizado para UI
  createdBy      String?           @map("created_by")
  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt @map("updated_at")
  deletedAt      DateTime?         @map("deleted_at")

  workspace  Workspace   @relation(fields: [workspaceId], references: [id])
  department Department? @relation("TemplateDepartment", fields: [departmentId], references: [id])
  process    Process?    @relation("TemplateProcess", fields: [processId], references: [id])

  @@index([workspaceId, scope, deletedAt], name: "idx_wi_templates_ws_scope_del")
  @@map("work_item_templates")
}

model WorkItemAttachment {
  id          String    @id @default(cuid())
  workItemId  String    @map("work_item_id")
  filename    String
  mimeType    String    @map("mime_type")
  sizeBytes   Int       @map("size_bytes")
  storageKey  String    @map("storage_key") // S3/MinIO key (UUID renomeado)
  scanStatus  String    @default("PENDING") @map("scan_status") // PENDING | CLEAN | INFECTED
  uploadedBy  String    @map("uploaded_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")

  workItem WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  uploader User     @relation("AttachmentUploader", fields: [uploadedBy], references: [id])

  @@index([workItemId, deletedAt], name: "idx_wi_attachments_task")
  @@map("work_item_attachments")
}

// Comments — dedicado, nao reusa ChatChannel (ADR implicito: cada modulo uma razao)
model WorkItemComment {
  id              String    @id @default(cuid())
  workItemId      String    @map("work_item_id")
  authorId        String    @map("author_id")
  body            String    @db.Text          // texto puro com marcadores de mencao
  bodyBlocks      Json?     @map("body_blocks") // BlockNote JSON AST
  editedAt        DateTime? @map("edited_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  workItem WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  author   User     @relation("CommentAuthor", fields: [authorId], references: [id])

  @@index([workItemId, createdAt(sort: Desc)], name: "idx_wi_comments_task_created")
  @@map("work_item_comments")
}

// Activity Feed — projecao assincrona (ADR-002 + ADR-003)
model WorkItemActivity {
  id         String           @id @default(cuid())
  workItemId String           @map("work_item_id")
  type       TaskActivityType
  actorId    String?          @map("actor_id")
  payload    Json             // pre-enriquecido pelo worker (actor.name, before/after, linked entity names)
  createdAt  DateTime         @default(now()) @map("created_at")

  workItem WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  actor    User?    @relation("TaskActivityActor", fields: [actorId], references: [id])

  @@index([workItemId, createdAt(sort: Desc)], name: "idx_wi_activities_task_created")
  @@map("work_item_activities")
}

// Outbox para side-effects garantidos (ADR-003)
model TaskOutboxEvent {
  id          String            @id @default(cuid())
  aggregateId String            @map("aggregate_id") // workItemId
  eventType   String            @map("event_type")
  payload     Json
  status      OutboxEventStatus @default(PENDING)
  attempts    Int               @default(0)
  lastError   String?           @map("last_error")
  createdAt   DateTime          @default(now()) @map("created_at")
  processedAt DateTime?         @map("processed_at")

  @@index([status, createdAt], name: "idx_outbox_status_created")
  @@index([aggregateId], name: "idx_outbox_aggregate")
  @@map("task_outbox_events")
}
```

### 5.4 Prisma extension (ADR-001)
Arquivo `src/database/extensions/primary-assignee-cache.extension.ts`:
- Intercepta `workItemAssignee.create | update | delete`.
- Apos cada operacao, recalcula o primary: primeiro em `assignedAt ASC` com `isPrimary=true`; se nao houver, o mais antigo; se vazio, NULL.
- Atualiza `WorkItem.primaryAssigneeCache` na mesma transaction.
- Lint rule custom `no-direct-primary-assignee-cache-write` proibe SET direto fora do extension.

### 5.5 Seeds e backfill
- `seed-reference-data.ts`: 2 `CustomTaskType` builtin (Task, Milestone) com `workspaceId=NULL`, `isBuiltin=true`.
- `backfill-tasks-feature.ts` (idempotente):
  - Para cada `WorkItem` com `primaryAssigneeCache != NULL`: insert em `WorkItemAssignee(isPrimary=true)` com `ON CONFLICT DO NOTHING`.
  - 1 linha `WorkItemStatusHistory` por task com `enteredAt = createdAt`, `leftAt = NULL`.
  - Popular `WorkItemTag.nameLower = LOWER(name)` (retrocompat — na prox migration fica auto).

---

## 6. Estrutura de modulos backend

```
src/modules/
├── tasks/                           # fachada semantica sobre WorkItem
│   ├── tasks.module.ts
│   ├── tasks.controller.ts
│   ├── tasks.service.ts             # delega a work-items, orquestra multi-assignee/tags/watchers
│   ├── tasks.repository.ts
│   ├── dtos/                        # task-filters, update-task, merge-tasks, task-response, time-in-status
│   └── pipes/parse-task-include.pipe.ts  # whitelist de includes (CTO note #4)
├── task-outbox/
│   ├── task-outbox.module.ts
│   ├── task-outbox.service.ts       # enqueue dentro da $transaction
│   ├── task-outbox.worker.ts        # BullMQ processor com DLQ
│   └── task-outbox.repository.ts
├── task-checklists/                 # templates padrao: module/controller/service/repository/dtos
├── task-dependencies/               # + CycleDetectorService
├── task-links/
├── task-tags/
├── task-watchers/
├── task-templates/                  # CRUD + snapshot-from-task + instantiate recursivo
├── task-attachments/                # signed-url 5 min TTL + ClamAV scan async
├── task-comments/                   # dedicado (ADR implicito)
├── task-activities/                 # GET feed (read-only; worker popula)
├── custom-task-types/               # GET-only
└── work-items/                      # EXISTENTE — extensoes mininas; enqueues outbox
```

### 6.1 Artefatos compartilhados
- `src/common/dtos/add-remove.dto.ts` — `{ add: string[]; rem: string[] }`.
- `src/common/dtos/cursor-pagination.dto.ts` — `cursor?, limit≤100` (CTO note #13).
- `src/common/pipes/parse-include.pipe.ts` — whitelist por endpoint.
- `src/common/exceptions/cycle-dependency.exception.ts` — 409.
- `src/common/exceptions/merge-cycle.exception.ts` — 409 (target descendente de source).

### 6.2 Registro em `app.module.ts` (apos `WorkItemsModule`)
```ts
TasksModule, TaskOutboxModule, TaskChecklistsModule, TaskDependenciesModule,
TaskLinksModule, TaskTagsModule, TaskWatchersModule, TaskTemplatesModule,
TaskAttachmentsModule, TaskCommentsModule, TaskActivitiesModule, CustomTaskTypesModule,
```

---

## 7. Contrato de endpoints

> `@ApiBearerAuth`, `WorkspaceGuard` + `JwtAuthGuard` + `RolesGuard` globais. Viewer: GET. Operator+: mutacoes. Manager/Admin: destrutivas (merge, delete-tag). Envelope `{data, meta}` global. Prisma **`select`** obrigatorio em listagens (CTO note #4).

### 7.1 Tasks workspace-wide
| Metodo | Rota | Detalhes |
|---|---|---|
| GET | `/api/v1/tasks` | Query: `page, limit≤100, cursor?, processIds[], areaIds[], departmentIds[], statuses[], assigneeIds[], tagIds[], customTypeIds[], priority[], archived, search, dueDateGt, dueDateLt, createdGt, createdLt, updatedGt, updatedLt, parentId, orderBy(id\|createdAt\|updatedAt\|dueDate\|priority\|sortOrder\|points), direction, includeClosed`. **Sem** `include=*`. Payload: apenas campos sumarizados via Prisma `select` |
| GET | `/api/v1/tasks/:taskId` | Query: `include=subtasks,checklists,dependencies,links,tags,watchers,attachments,markdown`. Whitelist pipe valida |
| PATCH | `/api/v1/tasks/:taskId` | Body partial: `title?, description?, markdownContent?, statusId?, priority?, dueDate?, startDate?, estimatedMinutes?, points?, archived?, customTypeId?, parentId?, processId?, assignees:{add,rem}?, watchers:{add,rem}?, tagIds:{add,rem}?` |
| DELETE | `/api/v1/tasks/:taskId` | 204; idempotente (delete de ja deletada = 204) |
| POST | `/api/v1/tasks/:taskId/merge` | Body `{ sourceTaskIds: string[] }` (1–50). `@Throttle({ limit: 3, ttl: 60000 })`. Header `Idempotency-Key` opcional |
| POST | `/api/v1/tasks/:taskId/archive` · `unarchive` | — |
| GET | `/api/v1/tasks/:taskId/time-in-status` | — |
| POST | `/api/v1/tasks/time-in-status:bulk` | Body `{ taskIds: string[] }` (1–100). **CTO note #9** |
| GET | `/api/v1/tasks/:taskId/activities` | `page, limit` |

### 7.2 Tasks dentro de Process
| Metodo | Rota |
|---|---|
| GET | `/api/v1/processes/:processId/tasks` |
| POST | `/api/v1/processes/:processId/tasks` (body pode incluir `templateId?`) |
| POST | `/api/v1/processes/:processId/task-templates/:templateId/instances` |

### 7.3 Checklists, Dependencies, Links, Tags, Watchers, Templates, Attachments, Comments, Custom Types
| Grupo | Rotas |
|---|---|
| Checklists | `GET/POST /tasks/:id/checklists` · `PATCH/DELETE /task-checklists/:id` · `POST /task-checklists/:id/items` · `PATCH/DELETE /task-checklists/:id/items/:itemId` · `POST /task-checklists/:id/reorder` body `[{id,position}]` |
| Dependencies | `GET /tasks/:id/dependencies` retorna `{blocking, waitingOn}` · `POST /tasks/:id/dependencies` body `{dependsOn?,dependencyOf?}` (exatamente 1) · `DELETE /tasks/:id/dependencies?dependsOn=&dependencyOf=` |
| Links | `GET/POST /tasks/:id/links[/:linksToId]` · `DELETE /tasks/:id/links/:linksToId` |
| Tags | `GET/POST /task-tags` · `PATCH/DELETE /task-tags/:id` · `POST/DELETE /tasks/:id/tags/:tagId` |
| Watchers | `GET /tasks/:id/watchers` · `POST/DELETE /tasks/:id/watchers/:userId` |
| Templates | `GET /task-templates` · `POST` · `PATCH/DELETE /:id` · `POST /task-templates/:id/snapshot?fromTaskId=` |
| Attachments | `POST /tasks/:id/attachments/signed-url` (TTL 5 min, escopo PUT) · `POST /tasks/:id/attachments` (registrar pos-upload) · `GET` · `DELETE /:attachmentId` |
| Comments | `GET /tasks/:id/comments` · `POST /tasks/:id/comments` body `{body, bodyBlocks?}` · `PATCH/DELETE /task-comments/:id` |
| Custom Types | `GET /custom-task-types` · `GET /:id` (cache Redis 5 min) |

---

## 8. Regras de negocio

### 8.1 Multi-tenancy (defesa em profundidade)
- `WorkspaceGuard` injeta `workspaceId` em todo request.
- Todo repositorio filtra por `workspaceId` derivado de `WorkItem.process.department.workspaceId`.
- Tags, Templates, CustomTaskTypes tem `workspaceId` direto.
- `CustomTaskType` com `workspaceId = NULL` (builtin) visivel a **todos** os workspaces; nunca vaza tipo privado. Teste: ws-A cria tipo privado → ws-B nao ve.
- Cross-tenant → 404 (nunca 403, nao vaza existencia).

### 8.2 Status e historico
- Validar `WorkflowStatus` pertence ao `Department` do `Process` (logica ja existe).
- `changeStatus` escreve status + enqueue `TaskOutboxEvent(type=STATUS_CHANGED)` na mesma `$transaction`.
- Worker consome, fecha linha anterior em `WorkItemStatusHistory` (`leftAt`, `durationSeconds`), insere nova, gera `WorkItemActivity`.

### 8.3 Dependencies — detector de ciclo
- Antes do insert: BFS a partir de `to` seguindo `dependenciesOut.toTaskId`. Se alcancar `from`, → 409 `CycleDependencyException`.
- Limite: 1000 nodes visitados + timeout 2s (defesa DoS).
- Proibido: dependencia entre task e sua subtree de subtasks → 400.

### 8.4 Merge
- `$transaction`:
  1. Validar: sources 1–50, mesmo workspace, sem `mergedIntoId`, diferentes do target.
  2. **Target nao e descendente de nenhum source** (BFS em subtasks) → 409 `MergeCycleException`.
  3. Mover checklists, dependencies, links, comments, attachments das sources → target (UPDATE taskId).
  4. Unir tags (sem duplicar).
  5. Somar `timeSpentSeconds`, `trackedMinutes`.
  6. Sources: `mergedIntoId=target.id`, `archived=true`, `deletedAt=now()`.
  7. Enqueue outbox `MERGED_INTO` (activity + notifications).
- Rate limit `@Throttle({ limit: 3, ttl: 60000 })`.
- `Idempotency-Key` header: Redis `SETNX` TTL 24h; repeticao retorna resultado cacheado.

### 8.5 Archive vs Delete
- `archive`: `archived=true`. Reversivel.
- `DELETE`: soft delete. Idempotente (`deletedAt` ja setado → 204, nao 404).
- Hard delete: fora da API.

### 8.6 Multi-assignees
- Fonte unica: `WorkItemAssignee[]`.
- `primaryAssigneeCache` atualizado pela Prisma extension (ADR-001).
- `PATCH /tasks/:id` body `{ assignees: { add, rem } }` aplica em 1 transaction; extension recalcula primary.

### 8.7 Paginacao, ordenacao, limites
- Default offset (`page/limit`), max 100.
- Cursor opcional (`?cursor=<taskId>`) para navegacao sem salto.
- `orderBy` whitelist estrita. `direction` validado.

### 8.8 Rate limiting
- Global 100/min (ja existente).
- `merge`: 3/min user.
- `archive`, `attachments/signed-url`: 30/min user.
- `POST /tasks/time-in-status:bulk`: 30/min user.

### 8.9 Validacoes DTO
- Datas ISO. `dueDate ≥ startDate` se ambos.
- `points` ≥ 0, ≤ 999.99.
- `checklistItem.parentId` pertence a mesma checklist (service-level).
- `templatePayload`: max 200 nodes cumulativos, depth ≤ 3 (custom validator).
- `tag.name` normalizado `lower()` em `nameLower`; unique `(workspaceId, nameLower)`.

### 8.10 Segurança (paranoia produtiva)
- `ValidationPipe` `whitelist: true, forbidNonWhitelisted: true` (ja global).
- `customTypeId` validado: pertence ao workspace **ou** `isBuiltin=true` com `workspaceId=NULL`.
- Attachments: MIME whitelist (`image/*, application/pdf, text/*, video/mp4`), max 25 MB, UUID rename, scan ClamAV assincrono, bloqueio de download se `scanStatus ≠ CLEAN`.
- Signed URL: TTL 300 s, escopo PUT, bucket dedicado com ACL private.
- Markdown: sanitizado via `DOMPurify` na leitura (nao gravar HTML bruto).
- Logs: nunca logar `body` de comentarios/markdown; truncar a 200 chars no interceptor.

### 8.11 Outbox e side-effects (ADR-003)
- Worker BullMQ:
  - Concurrency 5.
  - Retry: 3 tentativas com backoff exponencial (1s → 2s → 4s) + jitter.
  - DLQ → alerta Grafana.
  - Metrica: `task_outbox_lag_seconds` (p95 < 5s).

### 8.12 Notificacoes
- Listener de outbox cria `Notification` em casos: `assignee-added`, `watcher-added`, `mentioned-in-comment`, `due-date-approaching`, `dependency-unblocked`.
- Novos valores de enum: `TASK_ASSIGNED`, `TASK_MENTIONED`, `DEPENDENCY_UNBLOCKED`.

---

## 9. Observabilidade e SLIs

### 9.1 Metricas (Prometheus/Datadog)
- RED por endpoint: rate, errors, p50/p95/p99.
- `task_outbox_pending_total`, `task_outbox_processing_seconds`, `task_outbox_dlq_total`.
- `task_list_query_count` (alerta se > 10).
- `task_attachment_scan_pending_total`.

### 9.2 SLIs + alertas (dashboard Grafana `tasks-feature`)
| SLI | Alvo | Alerta |
|---|---|---|
| `GET /tasks` p95 | < 500 ms | > 800 ms 5 min |
| `GET /tasks/:id` p95 | < 300 ms | > 500 ms 5 min |
| Error rate Tasks | < 0.1% | > 1% 5 min |
| Outbox lag p95 | < 5 s | > 30 s 5 min |
| Fila anexos virus-scan | < 100 | > 500 |

### 9.3 Logs estruturados
- Request duration, `userId`, `workspaceId`, `requestId` (ja existem via `RequestIdInterceptor`).
- Operacoes criticas (merge, archive, template-instantiate): `Logger.log({ operation, durationMs, taskId, workspaceId })`.

---

## 10. UI / Design System — Task View integral

**Fonte:** `tasks.md` secao UI (linhas 378–775). Replicar fielmente.

### 10.1 Stack UI
- **Tailwind CSS v4** (tokens via CSS variables).
- **shadcn/ui** (tokens semanticos).
- **BlockNote / ProseMirror** para descricao e composer (lazy-load obrigatorio — CTO note #4/11).
- **Lucide Icons** (stroke 1.5–1.75).
- OKLCH.
- Fonte: stack nativa.

### 10.2 Design tokens
Adicionar em `src/app/globals.css` `:root` (namespaceados em `--task-*` quando divergirem do Align UI):
```css
:root {
  --background: oklch(100% 0 0);
  --foreground: oklch(14.5% 0 0);
  --card: oklch(100% 0 0);
  --card-foreground: oklch(14.5% 0 0);
  --primary: oklch(20.5% 0 0);
  --primary-foreground: oklch(98.5% 0 0);
  --muted: oklch(97% 0 0);
  --muted-foreground: oklch(55.6% 0 0);
  --border: oklch(92.2% 0 0);
  --ring: oklch(70.8% 0 0);
  --radius: 0.625rem;
  --radius-card: 14px;
  --radius-badge: 4px;
  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem; --text-2xl: 1.5rem;
  --fw-normal: 400; --fw-medium: 500; --fw-semibold: 600; --fw-bold: 700;
  --transition: 150ms cubic-bezier(.4,0,.2,1);
}
```

### 10.3 Paleta de status
| Status | Cor |
|---|---|
| Para fazer | `oklch(55% 0.01 60)` |
| Em andamento | `oklch(var(--color-blue-500))` |
| Em revisao | `oklch(var(--color-amber-500))` |
| Concluido | `oklch(var(--color-emerald-500))` |
| Cancelado | `oklch(var(--color-red-500))` |

### 10.4 Layout macro
`/tasks/[taskId]`: `<div class="flex gap-4 p-4 h-full bg-background">`
- `<section>` **Main Card** (flex-1, rounded-[14px], shadow-sm, bg-card)
- `<aside>` **Activities Panel** (w-[400px], rounded-[14px], shadow-sm, bg-card, colapsavel via `»`)

Gap 16px. Botao colapsar: w-24 h-40 rounded-xl bg-card shadow-sm.

### 10.5 Main Card — blocos
Padding 24, flex-col gap 24, scroll interno.

| # | Bloco | Especificacao |
|---|---|---|
| 1 | Linha de tipo | Pill (h-6 px-2 rounded-lg border-border/60 bg-muted/40 text-sm) com `<CircleDot w-3.5 h-3.5>` + label. Opcional IntegrationBadge |
| 2 | Titulo | `<textarea>` transparente 24px bold leading-1.25 auto-expand. Placeholder "Titulo da tarefa" |
| 3 | Grade de propriedades | `grid grid-cols-2 gap-x-8 gap-y-2` linhas h-8. PropertyRows: Status, Responsaveis, Datas, Prioridade, Tempo est., Tags. Botao "Mais" expande Points, Custom Fields |
| 4 | StatusBadge | Pipeline chevron: retangulo h-[22] px-2.5 text-[11] uppercase font-medium text-white rounded-l-[4] + seta CSS (border-y-11 transparent, border-l-8 colorido) + check button w-5 h-5 border border-border rounded |
| 5 | Descricao | `BlockNoteEditor` (lazy) com slash menu. Botao `Maximize2` top-right |
| 6 | Secoes colapsaveis | Header: chevron rotate -90 quando fechada 150ms, icone muted, titulo font-semibold text-[13], counter, actions |
| 7 | CTA vazio | Card pontilhado border-dashed border-border/60 + `Plus` + label (w-full, rounded-lg, px-4 py-3) |
| 8 | Custom Fields | CollapsibleSection + list + CTA "Criar campo personalizado" |
| 9 | Tarefas Vinculadas | CollapsibleSection (Link2) + lista com tipo de relacao |
| 10 | Tempo Rastreado | CollapsibleSection (Timer) + action "Iniciar" (bg-primary/10 text-primary h-6 px-2.5) + log |
| 11 | Subtarefas | CollapsibleSection + ProgressBar (h-1 bg-muted, fill bg-primary) + SubtaskRow list + CTA |
| 12 | Checklists | CollapsibleSection (ListChecks) + list + CTA "Criar checklist" |
| 13 | Anexos | CollapsibleSection (Paperclip) + dropzone border-dashed py-6. drag-over: border-primary + bg primary/5 |

### 10.6 Activities Panel
| Bloco | Especificacao |
|---|---|
| Header | h-12 border-b px-4 flex justify-between. Titulo "Atividades" + IconButtons (Search, Filter, MoreHorizontal, X) |
| Feed | `<ul role="log" aria-live="polite">` scroll interno. Item: dot w-1.5 h-1.5 + `<strong>actor</strong> action` text-[11] + `<time>` text-[10] |
| Composer | border-t p-3 space-y-2. `BlockNoteEditor` min-h-44 + IconButtons (Smile, Paperclip, Mic, AtSign, UserPlus, Code2, Sparkles) + botao "Comentar" h-9 px-2.5 rounded-[10] bg-primary text-primary-foreground |

### 10.7 Iconografia (Lucide)
`CircleDot, Calendar, Hourglass, User, Flag, Tag, Link2, Timer, Play, ListChecks, Paperclip, Maximize2, ChevronDown, Check, Plus, Search, Filter, MoreHorizontal, X, ChevronsRight (»), Send, Settings2`.

### 10.8 Estados
- Hover: transition 150ms, bg `--muted`, border `--border`.
- Active: `scale(0.97)` em pills.
- Focus: `ring-2 ring-ring/50`.
- Popover: bg-popover border rounded-[10] shadow lg padding-8.
- Colapso: chevron rotate 150ms.
- Drag arquivos: dropzone destaca; overlay sutil na pagina.
- Drag subtarefas (dnd-kit): cursor grab, placeholder opacity-60.
- Realtime: fade + translateY(-4px) 150ms.
- Atalhos: `/`, `@`, `Enter`, `Shift+Enter`, `Esc`.

### 10.9 Acessibilidade (obrigatoria)
- `aria-label` em todos icon buttons.
- `role="log"` + `aria-live="polite"` no feed.
- `role="progressbar"` + `aria-valuenow/max`.
- `<h1>` no titulo da rota.
- Focus trap em popovers.
- WCAG AA.

### 10.10 Responsividade
| BP | Comportamento |
|---|---|
| ≥ 1280 | Main + Activities lado a lado |
| 1024–1280 | Activities colapsavel por default |
| 768–1024 | Activities vira Sheet drawer |
| < 768 | Coluna unica; FAB; grid 1 col |

### 10.11 Esqueleto JSX
```tsx
// page.tsx — excecao App Router: 'export default' obrigatorio (regra #13 /99-referencia documentada)
export default function TaskPage({ params }: { params: { taskId: string } }) {
  return <TaskView taskId={params.taskId} />;
}
```
Componente `TaskView` (`export function TaskView(...)` named) contem o layout Main+Activities.

---

## 11. Estrutura frontend

```
mundial-erp-web/src/features/tasks/
├── components/
│   ├── task-view/                      # rota /tasks/[id]
│   │   ├── task-view.tsx
│   │   ├── task-type-row.tsx
│   │   ├── task-title.tsx
│   │   ├── task-property-grid.tsx + property-row.tsx
│   │   ├── status-badge.tsx
│   │   ├── priority-picker.tsx
│   │   ├── assignee-multi-picker.tsx
│   │   ├── date-range-picker.tsx
│   │   ├── time-estimate-input.tsx
│   │   ├── tag-picker.tsx
│   │   ├── task-description.tsx        # dynamic import BlockNote
│   │   ├── collapsible-section.tsx
│   │   ├── empty-card-cta.tsx
│   │   ├── custom-fields-section.tsx
│   │   ├── linked-tasks-section.tsx
│   │   ├── time-tracking-section.tsx
│   │   ├── subtasks-section.tsx + subtask-row.tsx + progress-bar.tsx
│   │   ├── checklists-section.tsx + checklist-panel.tsx
│   │   ├── attachments-section.tsx + attachments-grid.tsx
│   │   └── activities-panel/
│   │       ├── activities-panel.tsx + activities-header.tsx
│   │       ├── activity-feed.tsx + activity-item.tsx
│   │       └── comment-composer.tsx    # dynamic import BlockNote
│   ├── task-board.tsx                  # Kanban (dnd-kit)
│   ├── task-list.tsx                   # data-table shadcn + virtualizacao
│   ├── task-calendar.tsx               # fase G
│   ├── task-gantt.tsx                  # fase G
│   └── task-card.tsx
├── hooks/                              # use-tasks, use-task, use-create, use-update, use-delete, use-merge, use-archive, use-checklist, use-dependency, use-links, use-tags, use-watchers, use-attachments, use-activities, use-custom-task-types, use-comments, use-block-note-editor
├── services/                           # tasks, checklists, dependencies, links, tags, watchers, templates, attachments, activities, custom-types, comments
├── schemas/                            # task, checklist, dependency, tag, template (Zod)
└── types/
    └── task.types.ts
```

> `features/work-items/` vira re-exports apontando para `features/tasks/services` — paginas `/work-items`, `/my-tasks` atuais continuam funcionais.

### 11.1 Libs a adicionar
| Pacote | Motivo | Peso | Mitigacao |
|---|---|---|---|
| `@blocknote/core` + `@blocknote/react` | Editor | ~180kb gzip | `dynamic()` import + SSR fallback card texto |
| `@dnd-kit/core` + `sortable` | Drag subtasks/checklists/board | ~35kb | Lazy por view |
| `react-virtual` | Virtualizacao lista | ~8kb | Sempre na listagem |

### 11.2 Otimizacoes obrigatorias
- Debounce 300ms em buscas/filtros.
- Optimistic updates em toggles (resolve checklist, archive, drag status).
- Prefetch `useTask(nextTaskId)` ao hover em link no board.
- Server Components em `/tasks` (dashboard) + `/tasks/all` (listagem).
- Client Component apenas em `TaskView` e forms.

---

## 12. Telas e rotas

| Rota | Descricao |
|---|---|
| `/tasks` | Minhas tarefas (reusa `my-tasks` atual, visual novo) |
| `/tasks/all` | Listagem workspace-wide com filtros salvaveis (Zustand + `ProcessView.config`) |
| `/tasks/[taskId]` | Task View completa |
| `/processes/[processId]` | Existente — tabs de View |
| `/processes/[processId]/board\|calendar\|gantt` | Views adicionais |
| `/settings/task-tags` | CRUD tags |
| `/settings/task-templates` | CRUD templates |
| `/settings/custom-task-types` | Listagem read-only |

---

## 13. Backlog por Sprints (Scrum Master)

> **Cadencia:** 2 semanas. Squad: 1 BE + 1 FE + 1 QA (ajustar apos Sprint 0 de calibragem). Pontos Fibonacci. Teto 40 pts/sprint (confirmar apos velocity). Ceremonies: Planning seg, Daily 15 min, Review + Retro ult dia.
> **DoD global:** 1 approve, lint+test verde, migration reversivel, Swagger atualizado, Lighthouse budget respeitado, deploy staging, QA assinou, Conventional Commits.

**Sprint 0 — Calibragem** (1 semana, fora da contagem de pontos)
- Ambiente pronto, ADRs aprovadas, Prisma extension prototipada, BlockNote lazy-load prototipado com Lighthouse budget, capacity planning.

### Sprint 1 — Foundations (~32 pts)
**Goal:** Migration 1/3 aplicada, `CustomTaskType` builtin disponivel, outbox + worker rodando.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-101 | Migration `tasks_foundations` | prisma migrate deploy verde; rollback SQL pronto | 3 |
| TSK-102 | Extender `WorkItem` + rename `assigneeId -> primaryAssigneeCache` | endpoints atuais funcionam; lint rule `no-direct-primary-assignee-write` ativa | 5 |
| TSK-103 | Seed CustomTaskType builtin | idempotente; 2 linhas globais | 2 |
| TSK-104 | `GET /custom-task-types` | Redis cache TTL 5 min; cross-tenant test passa | 3 |
| TSK-105 | `TaskOutbox` (model + service + worker BullMQ) | concurrency 5, retry 3x jitter, DLQ + alerta | 8 |
| TSK-106 | Prisma extension `primary-assignee-cache` | cobertura 100% unit | 5 |
| TSK-107 | `GET /tasks/:id/time-in-status` + `POST /tasks/time-in-status:bulk` | bulk max 100; p95 < 300ms | 3 |
| TSK-108 | Backfill idempotente | dry-run; executa 2x sem duplicar | 3 |

**Demo:** curl nos novos endpoints, Prisma Studio mostra tabelas, Grafana mostra fila BullMQ.

### Sprint 2 — Collaboration (~34 pts)
**Goal:** Migration 2/3, multi-assignees, watchers e tags funcionais.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-201 | Migration `tasks_collaboration` | verde em staging | 2 |
| TSK-202 | CRUD `WorkItemTag` | unique `(workspaceId, nameLower)`; normalizacao | 5 |
| TSK-203 | Attach/detach tag em task | 404 cross-tenant; outbox `TAG_ADDED` | 3 |
| TSK-204 | Multi-assignees (`PATCH /tasks/:id` `assignees:{add,rem}`) | extension atualiza primary; E2E promocao automatica | 5 |
| TSK-205 | Watchers CRUD | notification na insercao | 3 |
| TSK-206 | Filtros `tagIds[] assigneeIds[] watcherIds[]` em `GET /tasks` com `select` | EXPLAIN ANALYZE aprovado 50k tasks; p95 < 500ms; max 10 queries | 5 |
| TSK-207 | FE: types/services/hooks tags/watchers/assignees | gerados | 3 |
| TSK-208 | FE: `AssigneeMultiPicker` (Command shadcn, a11y) | Storybook; teclado | 3 |
| TSK-209 | FE: `TagPicker` inline create | debounce 300ms | 3 |
| TSK-210 | FE: `WatchersPopover` | — | 2 |

### Sprint 3 — Relationships (~29 pts)
**Goal:** Migration 3/3 parcial (deps + links), cycle detectors, UI linked tasks.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-301 | Migration `tasks_advanced` parte 1 (deps + links + status_history) | verde | 2 |
| TSK-302 | `CycleDetectorService` | limite 1000 nodes, timeout 2s | 5 |
| TSK-303 | Deps API (POST/GET/DELETE) | 409 em ciclo; E2E A->B->C->A | 5 |
| TSK-304 | Links API | simetria garantida via query | 3 |
| TSK-305 | FE: `LinkedTasksSection` | icone Link2, tipo de relacao | 5 |
| TSK-306 | FE: badge "Bloqueada por X" no StatusBadge | tooltip lista; UI fallback ≥5 | 3 |
| TSK-307 | Notifications: dependency-unblocked via outbox | delivery < 10s | 3 |
| TSK-308 | QA: perf test deps com 100 deps por task | p95 < 300ms | 3 |

### Sprint 4 — Checklists + Attachments + Comments (~36 pts)
**Goal:** Secoes Checklists/Anexos/Atividades funcionais end-to-end.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-401 | Migration parte 2 (checklists + templates + attachments + comments + activities) | verde | 3 |
| TSK-402 | Checklists CRUD + reorder | transaction; E2E | 5 |
| TSK-403 | Checklist items + nesting | parentId valida; resolved + resolvedBy | 5 |
| TSK-404 | FE `ChecklistPanel` dnd-kit + progresso | teclado (setas move, space resolve) | 5 |
| TSK-405 | Attachments: signed URL, registro pos-upload, ClamAV worker | TTL 5 min; whitelist MIME; scanStatus bloqueia download | 8 |
| TSK-406 | FE `AttachmentsSection` dropzone + grid | preview img/pdf; delete confirm | 3 |
| TSK-407 | `WorkItemComment` CRUD dedicado | soft delete; editedAt; mencoes extraidas do body | 5 |
| TSK-408 | FE `CommentComposer` BlockNote lazy + icon buttons + Enter=enviar | slash menu, @ mencao popover | 8 |
| TSK-409 | Worker outbox -> `WorkItemActivity` (projecao) | lag p95 < 5s; activities test cobre 10 tipos | 5 |
| TSK-410 | FE `ActivityFeed` com SSE (`Last-Event-ID`, reconnect backoff) | fade+translateY; max 3 conn/user | 5 |

### Sprint 5 — Task View Visual (~34 pts)
**Goal:** Task View fiel ao spec tasks.md.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-501 | Tokens OKLCH em `globals.css` namespaceados | smoke visual regression 10 paginas | 3 |
| TSK-502 | Rota `/tasks/[taskId]` com layout Main+Activities + colapso `»` | responsivo 4 BPs; Lighthouse ≥ 85 | 5 |
| TSK-503 | `TaskTypeRow` + `TaskTitle` (debounced save 500ms) | "Saving..." sutil | 3 |
| TSK-504 | `TaskPropertyGrid` + popovers Command para cada prop | 6 props editaveis; focus trap | 8 |
| TSK-505 | `StatusBadge` pipeline chevron + popover troca | check button toggle done | 5 |
| TSK-506 | `TaskDescription` BlockNote lazy + slash menu + Maximize2 fullscreen | salvamento debounced 1s | 5 |
| TSK-507 | `CollapsibleSection` + integrar Custom Fields/Linked/Time/Subtasks/Checklists/Attachments | estado persistido localStorage | 5 |

**Demo:** navegacao lado-a-lado com spec tasks.md.

### Sprint 6 — Templates, Merge, Archive, Points (~30 pts)
**Goal:** Operacoes avancadas com confirmacao UI.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-601 | CRUD `WorkItemTemplate` | Zod valida payload (200 nodes/depth 3); denormalizados `subtaskCount/checklistCount` | 5 |
| TSK-602 | `POST /task-templates/:id/snapshot?fromTaskId=` | copia subtree | 5 |
| TSK-603 | `POST /processes/:pid/task-templates/:tid/instances` recursivo | ids regerados; `ChecklistItemSource=TEMPLATE` | 5 |
| TSK-604 | `POST /tasks/:id/merge` | transaction; MergeCycle check; Idempotency-Key; rate limit 3/min | 8 |
| TSK-605 | archive/unarchive + filtro | MoreHorizontal menu | 3 |
| TSK-606 | Campo `points` em form + colunas list/board | mask numerico 0–999.99 | 2 |
| TSK-607 | `ConfirmDialog` destrutivo (typing "CONFIRMAR" em merge) | a11y | 2 |

### Sprint 7 — Workspace-wide + Board (~31 pts)
**Goal:** `/tasks/all` + Board Kanban.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-701 | `/tasks/all` data-table com todos filtros | salvar como `ProcessView.config` scope=user | 8 |
| TSK-702 | Bulk actions | throttler; sticky bar | 5 |
| TSK-703 | `TaskBoard` dnd-kit por status | optimistic + rollback | 8 |
| TSK-704 | Filtros compartilhados Board/List (URL) | deeplink | 3 |
| TSK-705 | `/tasks` (my-tasks) com visual novo | mantem contrato | 3 |
| TSK-706 | Virtualizacao lista ≥ 500 itens | 60 fps | 3 |
| TSK-707 | Cursor pagination `GET /tasks?cursor=` | offset continua | 1 |

### Sprint 8 — Polish (~28 pts)
**Goal:** Calendar, Gantt, A11y audit, realtime estavel, docs.

| ID | Story | AC | Pts |
|---|---|---|---|
| TSK-801 | `TaskCalendar` | drag altera datas; confirm | 5 |
| TSK-802 | `TaskGantt` simples (deps visuais read-only) | CSS grid ou lib leve | 8 |
| TSK-803 | SSE `workspace:<id>:task:<tid>` com `Last-Event-ID` | backoff + jitter; 3 conn/user | 5 |
| TSK-804 | Auditoria a11y (axe + manual) | 0 criticos; AA | 3 |
| TSK-805 | Atalhos globais + help panel | / focus, n nova task | 2 |
| TSK-806 | Docs (Swagger, `features/tasks/README.md`, Storybook) | links no menu | 3 |
| TSK-807 | Load test k6 (50k tasks, 10 rps) | p95 < 500ms | 2 |

### Sumario
| Sprint | Tema | Valor |
|---|---|---|
| 0 | Calibragem | Prototipos + ADRs |
| 1 | Foundations | Migration 1 + Outbox + CustomTypes |
| 2 | Collaboration | Multi-assignees + tags + watchers |
| 3 | Relationships | Deps + Links + UI |
| 4 | Checklists/Attachments/Comments | Secoes funcionais |
| 5 | Task View Visual | Spec replicada |
| 6 | Templates/Merge/Archive | Ops avancadas |
| 7 | Views workspace-wide + Board | |
| 8 | Polish | Calendar/Gantt/A11y/Realtime |

**Total:** ~16 semanas (4 meses) + Sprint 0.
**GA (feature Tasks disponivel em prod):** apos Sprint 5.

---

## 14. Estrategia de testes

### 14.1 Backend
- **Unit (Jest):** services mockados, ≥ 80% (alvo 90% em services novos).
- **E2E (supertest):** 1 suite/modulo novo + integracao:
  - criar task com checklists + tags + watchers + subtasks em 1 request via template.
  - merge 3 sources move deps/links/comments, tags unem, `timeSpentSeconds` soma, sources archived.
  - ciclo A->B->C->A retorna 409.
  - merge com target descendente de source retorna 409.
  - cross-tenant 404 para todos GET/PATCH/DELETE.
  - CustomTaskType privado ws-A nao vaza para ws-B.
  - Prisma extension: CRUD em `WorkItemAssignee` mantem `primaryAssigneeCache` consistente.
  - Outbox: evento enfileirado e processado ate 5s; DLQ em 3 falhas.
- **Performance (k6):** 50k tasks fixture; `GET /tasks` p95 < 500ms; `GET /tasks/:id` p95 < 300ms; budget ≤ 10 queries por endpoint.

### 14.2 Frontend
- **Vitest + Testing Library:** hooks criticos.
- **Storybook + Chromatic:** `StatusBadge`, `PropertyRow`, `CollapsibleSection`, `ChecklistPanel`, `CommentComposer`.
- **Playwright:** jornada `criar -> assign -> checklist -> comment -> status change -> archive`.

### 14.3 Regressao
Suites de `orders`, `production-orders`, `financial-summary`, `invoices`, `bpm`, `work-items` rodam em toda sprint. Zero quebra.

### 14.4 Acessibilidade
- `eslint-plugin-jsx-a11y` bloqueante.
- `axe-core` no Playwright Task View.
- Checklist manual AA.

---

## 15. Plano de migracao e rollback (3 migrations)

### 15.1 Ordem de deploy
1. **Migration 1/3** `tasks_foundations`: tabelas `custom_task_types`, `task_outbox_events`, extensoes nullable em `work_items`, rename `assignee_id -> primary_assignee_cache`. App antigo le a coluna renomeada via alias no Prisma — compativel.
2. **API v1.1:** modulos foundations + worker outbox. Feature flag `TASKS_V2_ENABLED=false`.
3. **Backfill:** `npm run backfill:tasks-feature` (offline).
4. **Migration 2/3** `tasks_collaboration`: assignees/watchers/tags.
5. **API v1.2:** modulos collab + listeners.
6. **Migration 3/3** `tasks_advanced`: checklists/deps/links/templates/attachments/comments/activities/status history.
7. **API v1.3:** modulos advanced.
8. **Web deploy:** `features/tasks`. Flag rolling per workspace.

### 15.2 Rollback
| Situacao | Acao |
|---|---|
| Bug FE | `git revert` + rebuild web |
| Bug API nao invasivo | `git revert` API |
| Bug migration | SQL down script em `prisma/rollbacks/tasks_*.down.sql`. Colunas nullable nao precisam drop |
| Outbox worker travado | drenar fila manualmente; reprocessar DLQ |
| Backfill incorreto | PITR snapshot + re-run idempotente |
| Extension primary-assignee divergiu | script de reconciliation (`fix-primary-assignee-cache.ts`) |

---

## 16. Riscos e mitigacoes

| # | Risco | Impacto | Prob | Mitigacao |
|---|---|---|---|---|
| R1 | Prisma extension adiciona latencia em write de assignee | M | M | Benchmark; overhead esperado < 10ms; se ≥ 50ms, mover para job outbox |
| R2 | Outbox worker atrasa feed | M | B | Alerta Grafana; concurrency elastica |
| R3 | Ciclo em deps / merge | A | B | Detectores com limites + testes E2E |
| R4 | BlockNote pesa no bundle | M | A | Lazy + SSR fallback; Lighthouse budget bloqueante em CI |
| R5 | S3 nao pronto em prod | A | M | MinIO em staging; feature flag `ATTACHMENTS_ENABLED` |
| R6 | ClamAV lento | M | M | Worker paralelo; usuario ve scanning banner; bloqueio download so se INFECTED |
| R7 | Merge corrompe dados | Critico | B | Transaction + testes cobrindo 100% das relacoes |
| R8 | Template payload gigante | B | M | Validator custom; 200 nodes/depth 3 |
| R9 | Regressao Orders/Production | Critico | B | Colunas nullable; CI roda regressao toda PR |
| R10 | A11y violada | M | A | axe no CI; checklist manual |
| R11 | SSE saturar | M | B | Rate limit 3 conn/user; fallback polling 15s |
| R12 | `CustomTaskType.workspaceId NULL` vazar dados privados | A | B | Teste E2E cross-tenant obrigatorio |
| R13 | Confusao BPM Task vs WorkItem | M | A | `features/tasks/README.md` explica; documentar em onboarding |
| R14 | Outbox cresce sem limite | M | B | Job de limpeza semanal (COMPLETED > 30 dias) |
| R15 | StatusHistory cresce linear | M | M | Monitor; plano particionamento por mes acima de 10M rows |
| R16 | Prisma schema grande quebra generate | A | M | CI ja roda `prisma generate` pre-lint |
| R17 | Squad velocity desconhecida | M | A | Sprint 0 de calibragem obrigatoria |
| R18 | `export default` em page.tsx violando regra #13 | B | Certo | Documentar como excecao App Router em `features/tasks/README.md` e `99-referencia-completa` (addendum) |

---

## 17. Checklist de aprovacao

Antes de Sprint 1, PO/Tech Lead confirmam:

- [ ] ADR-001 (primary-assignee-cache) — CTO recomenda; aprovar.
- [ ] ADR-002 (activity feed via outbox) — aprovar escolha B (projecao assincrona).
- [ ] ADR-003 (outbox pattern) — aprovar; confirmar capacidade BullMQ/Redis atual.
- [ ] `WorkItemComment` dedicado (nao reusar ChatChannel) — aprovar.
- [ ] `POST /tasks/time-in-status:bulk` — aprovar (rompe idempotencia GET, aceitavel).
- [ ] 3 migrations em vez de 1 gigante — aprovar.
- [ ] BlockNote + lazy load (~180kb) — aprovar; validar budget Lighthouse em Sprint 0.
- [ ] S3/MinIO provisionado ate Sprint 4 — confirmar infra.
- [ ] ClamAV ou alternativa de scan — confirmar.
- [ ] Squad proposta (1 BE + 1 FE + 1 QA) e capacidade alvo 30–36 pts/sprint — confirmar apos Sprint 0.
- [ ] Feature flag `TASKS_V2_ENABLED` para rollout per workspace — aprovar.
- [ ] Tokens OKLCH namespaceados `--task-*` — aprovar com time de design.
- [ ] Documentar `export default` em `page.tsx` como excecao de framework em `99-referencia-completa.md` (addendum).

---

> **Proximo passo:** aprovar checklist (secao 17), abrir ADRs em `.claude/adr/001-003`, abrir epico `EP-TASKS` no tracker, rodar Sprint 0. Criar branch `feat/tasks-foundations` para Sprint 1.
