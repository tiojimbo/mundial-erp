# Refator API: BPMN para Hoppe + módulo Automation

## Contexto

Hoje a API expõe domínio BPMN com hierarquia
`workspace > department > area > process > workitem (task)` mais um motor de
execução BPMN paralelo (`Activity`, `ProcessInstance`, `ActivityInstance`,
`TaskInstance`, `HandoffInstance`) que escuta `order.status.changed` e
automatiza o fluxo de pedidos.

O alvo é a hierarquia ClickUp/Hoppe documentada no arquivo `endpoits` da raiz:
`workspace > space > folder > list > task`, com sub-recursos `visibility`,
`members`, `resources`, `task-types` por nível, mais `comments` (com
reactions), `custom-fields` (com escopo), `views` e `notifications`.

**O motor BPMN é substituído pela feature Automation do Hoppe**
(`/api/v1/ai/automation`). Triggers escutam eventos de tasks (TASK_CREATED,
TASK_STATUS_CHANGED, etc) e disparam ações (change_status, move_to_list,
create_subtask, send_notification, call_webhook). Os cenários atuais do motor
BPMN são reescritos como Automations.

> **Fora do escopo deste plano**: o trabalho de Task Type Templates
> (builtins `order`, `stock-request` e os 11 do roadmap) continua nos sprints
> dedicados (TTT-*). Esse refator não inventa TaskType novo nem cria Mirror
> Service novo. Apenas garante que a refatoração de hierarquia e a Automation
> são compatíveis com o trabalho TTT em curso.

### Decisões já fechadas com o Samuel

1. Renomear de verdade no banco e código (Department→Space, Area→Folder,
   Process→List). Frontend mantém labels "Departamento", "Área", "Processo".
2. Motor BPMN é substituído pela Automation, não adaptado. Quando todos os
   cenários atuais estiverem cobertos por Automations equivalentes, o motor
   é removido.
3. Order, ProductionOrder, SeparationOrder, AccountReceivable etc continuam
   como entidades comerciais. **Não** viram TaskType neste refator (o que já
   está virando — `order`, `stock-request` — segue pelo trabalho TTT
   independente).
4. Sector fica como está. Decidimos depois.
5. Quebra dura no frontend: endpoints antigos saem no mesmo PR que os novos.
6. Sem `naturalLanguageRule` no `/ai/automation` (sem dependência de LLM).
   Só modo `trigger + actions`.

---

## Conflitos com o padrão Bravy (`.claude/standards/99-referencia-completa.md`)

Adotar o estilo Hoppe entra em colisão direta com o padrão Bravy em 4 pontos. Decisões propostas:

| # | Padrão Bravy | Padrão Hoppe (alvo) | Decisão |
|---|---|---|---|
| 1 | `@Patch(':id')` para update parcial → 200 | `@Put(':id')` para update parcial. PATCH retorna 404 | **Adotar Hoppe** nos endpoints refatorados. PUT aceitando partial body. Documentar exceção no padrão. |
| 2 | `@Delete(':id')` retorna 204 No Content sem corpo | `DELETE /:id` retorna 200 com `{ message }` ou objeto deletado | **Adotar Hoppe** nos endpoints refatorados. |
| 3 | Envelope obrigatório `{ data, meta }` aplicado pelo `TransformInterceptor` global | Resposta direta sem envelope (objeto cru ou `{ items, meta }` em listas paginadas como notifications) | **Adotar Hoppe** nos endpoints `/api/v1/spaces|folders|lists|tasks|comments|views|custom-fields|notifications|ai/automation`. Para isso: desabilitar o `TransformInterceptor` para esses controllers via `@SkipResponseTransform()` decorator novo + check no interceptor. Endpoints legados (orders, clients, etc) mantêm envelope até serem migrados em sprint futuro. |
| 4 | Soft delete por padrão (campo `deletedAt`) | Custom Fields no Hoppe: hard delete documentado | **Manter soft delete** (padrão Bravy vence aqui). Resposta da API ainda pode retornar o objeto deletado seguindo Hoppe, mas o registro fica no banco com `deletedAt`. UX igual, integridade preservada. |

Outros pontos checados que **não** conflitam: nomenclatura de arquivos, estrutura de pastas (controller/service/repository/dto), nomenclatura de DTOs, tipagem TypeScript, ConfigService, Logger, ValidationPipe global com `whitelist: true`, named exports, JWT 15min/7d, bcrypt 12 rounds, `setGlobalPrefix('api/v1')`, helmet, rate limiting via Throttler, paginação com limite máximo 100.

---

## Padrões alvo (do arquivo `endpoits`)

| Tema | Hoje | Alvo Hoppe |
|---|---|---|
| Update | `@Patch()` | `@Put()` (PATCH retorna 404) |
| Delete response | 204 No Content | `200 { message }` ou objeto deletado |
| Header tenant | `workspace-id` (já vem via JWT) | mantém |
| Permissão por nível | só `WorkspaceMemberRole` | enum `Permission { FULL_EDIT, EDIT, COMMENT, VIEW }` por space/folder/list |
| Visibilidade por nível | não existe | `Visibility { PUBLIC, PRIVATE }` em space/folder/list/task |
| Status inheritance | sem conceito | `StatusInheritance { SPACE, FOLDER, OWN }` em folder/list |
| Reactions em comments | não existe | toggle `POST /comments/{id}/reactions` |
| Auto-criações | nada | criar space → 1 folder + 1 list + 4 statuses + creator owner; criar folder → 1 list padrão |
| Real-time | sem WebSocket | Socket.IO em `/notifications` (evento `notification`) e `/chat` (evento `chat:message:new`) |

---

## Arquivos críticos a alterar

### Schema e migrations
- `mundial-erp-api/prisma/schema.prisma` — rename de tabelas, novos enums, novos models (members, reactions, automation), ajustes em `WorkItemComment`
- `mundial-erp-api/prisma/migrations/` — migration de rename + novas colunas + novas tabelas + backfill de membership
- `prisma/seed-bpm.ts`, `seed-workspace.ts`, `seed-tasks-perf.ts`, `seed-reference-data.ts`

### Módulos NestJS — rename
- `src/modules/bpm/definitions/departments/` → `src/modules/spaces/`
- `src/modules/bpm/definitions/areas/` → `src/modules/folders/`
- `src/modules/bpm/definitions/processes/` → `src/modules/lists/`
- `src/modules/task-comments/` → `src/modules/comments/` (path `/api/v1/comments`)
- `src/modules/process-views/` → `src/modules/views/` (path `/api/v1/views`)
- `src/modules/custom-task-types/` — passa a ser nested em `/api/v1/spaces/:spaceId/task-types` (controller atual `/custom-task-types` removido). Lógica de builtins mantida.
- `src/modules/custom-fields/` — controller move pra path `/api/v1/custom-fields` com escopo via query (hoje é `/custom-field-definitions`)

### Módulos novos
- `src/modules/spaces/members/`, `folders/members/`, `lists/members/`
- `src/modules/spaces/resources/`, `folders/resources/`, `lists/resources/` (read-only, retornam metadata estática de filtros)
- `src/modules/comments/reactions/`
- `src/modules/automations/` — `/api/v1/ai/automation`
- `src/modules/realtime/` — gateway Socket.IO

### Módulos a deletar ao final
- `src/modules/bpm/engine/` (lógica de listeners e processActivities/Handoffs)
- `src/modules/bpm/runtime/process-instances/`
- `src/modules/bpm/runtime/activity-instances/`
- `src/modules/bpm/runtime/task-instances/`
- `src/modules/bpm/runtime/handoff-instances/`
- `src/modules/bpm/definitions/activities/` e `handoffs/` (avaliar; provavelmente vão junto)

### Configuração global (sem mudança)
- `src/main.ts:99` — ValidationPipe global
- `src/app.module.ts:311` — WorkspaceGuard global
- Confirmar `app.setGlobalPrefix('api/v1')`

### Frontend
- `mundial-erp-web/` — troca clientes HTTP. Labels "Departamento/Área/Processo" mantidos na UI.

---

## Plano em sprints de execução

> Cada sprint entrega um PR. Tarefas prefixadas `HPP-` (Hoppe Migration). Estimativa em pontos de complexidade (1=trivial, 2=médio, 3=complexo, 5=alto risco). Total estimado: 9 sprints, ~120 pontos.

### SPRINT 0 — Fundação Schema (PR1)

**Objetivo:** preparar o banco. Sem mexer em endpoint nenhum.
**Branch:** `feat/hpp-sprint-0-schema-foundation`
**Dependencies:** nenhuma
**Pontos:** 21

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-001 | Adicionar enums novos (`Visibility`, `Permission`, `StatusInheritance`, `AutomationTrigger`, `AutomationScopeType`, `LinkType`) no schema | 1 | `npx prisma generate` gera os enums |
| HPP-002 | Renomear model `Department` → `Space` + ajustar `@@map("spaces")` | 2 | model novo com mesmo shape, sem perda de dados |
| HPP-003 | Renomear model `Area` → `Folder` + ajustar `@@map("folders")` | 2 | idem |
| HPP-004 | Renomear model `Process` → `List` + ajustar `@@map("lists")` | 2 | idem |
| HPP-005 | Atualizar todas as FKs nos models que referenciam (`departmentId`→`spaceId`, `areaId`→`folderId`, `processId`→`listId`) | 3 | grep não retorna mais os nomes antigos no schema.prisma |
| HPP-006 | Adicionar campos novos em Space/Folder/List (`visibility, icon, position, creatorId, statusInheritance, defaultTaskTypeId`) | 1 | campos visíveis no Prisma Studio |
| HPP-007 | Criar models `SpaceMember`, `FolderMember`, `ListMember` com PK composta | 1 | tabelas criadas com índices |
| HPP-008 | Criar model `CommentReaction` com PK composta `(commentId, userId, emoji)` | 1 | idem |
| HPP-009 | Criar model `Automation` com todos os campos | 1 | idem |
| HPP-010 | Criar model `WorkItemTimeEntry` com índice `(taskId, userId, startTime)` | 1 | idem |
| HPP-011 | Ajustar `WorkItemTag` (adicionar `spaceId`) e `WorkItemLink` (adicionar `type LinkType`) | 1 | campos novos com defaults seguros |
| HPP-012 | Ajustar `WorkItemComment` (`parentId`, `mentions Json`, `assigneeId`, `assignedById`, `resolvedAt`, `resolvedById`, `source`) | 1 | campos novos |
| HPP-013 | Ajustar `CustomFieldDefinition` (4 escopos opcionais: `spaceId, folderId, listId, customTaskTypeId`) | 1 | constraint check garantindo no máx 1 escopo preenchido |
| HPP-014 | Ajustar `CustomTaskType` (adicionar `spaceId?`) preservando builtins workspace-wide | 1 | builtins seguem com `spaceId=null` |
| HPP-015 | Migration SQL com `RENAME TABLE` + `ADD COLUMN` + criação de tabelas novas | 2 | `npx prisma migrate dev` aplica em < 30s em dev |
| HPP-016 | Backfill SQL: cada Space tem ≥ 1 SpaceMember owner; tags antigas associadas ao primeiro space do workspace | 2 | `SELECT COUNT(*) FROM spaces s LEFT JOIN space_members sm ... WHERE sm.user_id IS NULL` retorna 0 |
| HPP-017 | Atualizar seeds (`seed-bpm.ts`, `seed-workspace.ts`, `seed-tasks-perf.ts`, `seed-reference-data.ts`) | 2 | `npm run seed` roda sem erro |
| HPP-018 | Smoke test: rodar a suite Vitest existente, ajustar repositories que quebram | 3 | suite verde |

---

### SPRINT 1 — Refator interno (PR2)

**Objetivo:** ajustar código pra usar os nomes novos sem mudar paths de endpoint.
**Branch:** `feat/hpp-sprint-1-internal-refactor`
**Dependencies:** SPRINT 0
**Pontos:** 11

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-020 | Renomear pastas: `bpm/definitions/departments/` → `spaces/`; `areas/` → `folders/`; `processes/` → `lists/` | 1 | grep não retorna `departments.service` ou `processes.repository` |
| HPP-021 | Atualizar imports no projeto inteiro (services, controllers, modules, tests) | 2 | build passa |
| HPP-022 | Adaptar `task-comments.service.ts` (não controller ainda) pra suportar `parentId, mentions, assigneeId, assignedById` | 2 | unit tests do service verdes |
| HPP-023 | Adaptar repositories que tocam `Order, Activity, ProcessInstance` pra usar nomes novos | 2 | `bpm-engine.service.ts` continua compilando e funcional |
| HPP-024 | Renomear `process-views/` → `views/` (sem mudar path do controller) | 1 | idem |
| HPP-025 | Smoke test: suite e2e existente verde, frontend funcional sem mudança | 3 | `npm run test:e2e` verde |

---

### SPRINT 2 — Spaces, Folders, Lists (PR3 parte 1)

**Objetivo:** publicar CRUD de Spaces, Folders, Lists com sub-recursos visibility/members/resources.
**Branch:** `feat/hpp-sprint-2-spaces-folders-lists`
**Dependencies:** SPRINT 1
**Pontos:** 18

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-030 | Criar `@SkipResponseTransform()` decorator + ajuste no `TransformInterceptor` global pra respeitar a metadata | 1 | endpoint marcado retorna sem envelope `{data, meta}` |
| HPP-031 | Mover controller `SpacesController` pra path `/api/v1/spaces`. CRUD: POST/GET/GET:id/PUT/DELETE | 2 | curl bate |
| HPP-032 | Side-effect ao criar space: 1 folder default + 1 list default + 4 statuses default + creator vira FULL_EDIT | 2 | response 201 traz `folders[].length=1, statuses[].length=4` |
| HPP-033 | `/spaces/:id/visibility` GET/PUT com side-effect PUBLIC→PRIVATE garantindo creator owner | 2 | switch funciona |
| HPP-034 | `/spaces/:id/members` LIST/POST/PUT:userId/DELETE:userId. PUBLIC mostra workspace users como `inherited:true` | 2 | curl bate |
| HPP-035 | `/spaces/:id/resources` GET retornando metadata estática `{ filters[], sortOptions[] }` | 1 | response com schema do doc |
| HPP-036 | `/folders` CRUD (`?spaceId=` query, body `{ name, spaceId }`, side-effect cria 1 list padrão) | 2 | curl bate |
| HPP-037 | `/folders/:id/visibility`, `/members`, `/resources` (mesmos sub-recursos) | 1 | herda de space pai como `inherited:true` |
| HPP-038 | `/lists` CRUD (`?folderId=` ou `?spaceId=` query, body `{ name, folderId }`) | 2 | curl bate |
| HPP-039 | `/lists/:id/visibility`, `/members`, `/resources` | 1 | idem |
| HPP-040 | Remover endpoints antigos `/departments`, `/areas`, `/processes`, `/process-views` | 1 | retornam 404 |
| HPP-041 | Smoke test e2e completo dos 3 níveis | 1 | suite e2e verde |

---

### SPRINT 3 — Tasks core (PR3 parte 2)

**Objetivo:** publicar `/tasks` no estilo Hoppe e remover features descontinuadas.
**Branch:** `feat/hpp-sprint-3-tasks-core`
**Dependencies:** SPRINT 2
**Pontos:** 16

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-050 | Refator `TasksController` para `@Put` no lugar de `@Patch`. DELETE retorna 200 com `{ message }` | 2 | curl bate |
| HPP-051 | Endpoint `GET /api/v1/tasks/space/:spaceId` agrupado por list | 1 | response shape ok |
| HPP-052 | Endpoint `GET /api/v1/tasks/list?viewId=&level=list|space|folder` agrupado por status | 2 | response shape ok |
| HPP-053 | Endpoint `GET /api/v1/tasks/my-tasks` agrupado por bucket temporal | 2 | response shape ok |
| HPP-054 | Endpoint `GET /api/v1/tasks/:id/subtasks` | 1 | response shape ok |
| HPP-055 | Endpoint `GET /api/v1/tasks/:id/assignees` | 1 | response shape ok |
| HPP-056 | Endpoint `PUT /api/v1/tasks/:id/assign` (substitui lista, re-adiciona creator se vazio) | 2 | testes cobrem casos: substituir, vazio, trocar |
| HPP-057 | Endpoint `DELETE /api/v1/tasks/:id/assignees/:userId` (path peculiar) | 1 | curl bate |
| HPP-058 | Endpoint `GET /api/v1/tasks-activities/:taskId` (path com hífen) | 1 | response shape ok |
| HPP-059 | Validar `PUT /tasks/:id` rejeita assigneeIds com 400 (alinha com Hoppe linha 2442) | 1 | teste cobre |
| HPP-060 | **Remover** endpoints descontinuados: `archive, unarchive, time-in-status (puro), merge, watchers, dependencies` | 1 | retornam 404 |
| HPP-061 | `POST /tasks` aceitando `assigneeIds` no body. Migrar lógica do `POST /processes/:processId/tasks` antigo | 1 | curl bate |

---

### SPRINT 4 — Comments, Views, Custom Fields, Notifications (PR3 parte 3)

**Objetivo:** publicar `/comments`, `/views`, `/custom-fields`, `/notifications`.
**Branch:** `feat/hpp-sprint-4-content-resources`
**Dependencies:** SPRINT 2
**Pontos:** 15

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-070 | Mover controller para path `/api/v1/comments`. `GET /comments/task/:taskId`, `GET /:id`, `POST` (com `parentId, mentions, assigneeId`), `PUT`, `DELETE` | 2 | curl bate |
| HPP-071 | `POST /api/v1/comments/:id/reactions` toggle. Body `{ emoji }`, response `{ action, ... }` | 2 | testes adicionar e remover (toggle) |
| HPP-072 | `select` explícito em todos os repositories de WorkItemComment **omitindo** `password` do user (não replicar bug do Hoppe) | 1 | response não tem campo `password` |
| HPP-073 | `/api/v1/views` GET (`?spaceId=` ou `?listId=` ou `?folderId=`), GET:id, POST, PUT, PATCH:pin, DELETE | 2 | curl bate |
| HPP-074 | `/api/v1/custom-fields` GET com escopo agrupado `{ list, folder, space, taskType }`, GET:id, POST, PUT, DELETE | 3 | response shape ok |
| HPP-075 | `/api/v1/tasks/:id/custom-fields` (values) com PUT (em vez de PATCH atual) | 1 | curl bate |
| HPP-076 | `/api/v1/notifications` alinhar ao Hoppe: GET com paginação + filtros, POST :id/read, POST /read-all, DELETE :id | 2 | curl bate |
| HPP-077 | Manter endpoints atuais úteis (clear/unclear/snooze/unsnooze) como POST extras | 1 | curl bate |
| HPP-078 | Smoke test e2e do bloco | 1 | suite verde |

---

### SPRINT 5 — Sub-recursos: Checklists, Links, Tags, Time-entries, Attachments (PR3 parte 4)

**Objetivo:** publicar os 5 sub-recursos no estilo Hoppe.
**Branch:** `feat/hpp-sprint-5-sub-resources`
**Dependencies:** SPRINT 3
**Pontos:** 17

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-080 | Mover `task-checklists` → `checklist` (path **singular**). Endpoints: `POST /checklist/task/:taskId`, `GET /checklist/task/:taskId`, `PUT /checklist/:id`, `DELETE /checklist/:id` | 2 | curl bate |
| HPP-081 | Items: `POST /checklist/item/:checklistId`, `PUT /checklist/:checklistId/item/:itemId`, `DELETE /checklist/item/:itemId` (path singular sem checklistId no DELETE) | 2 | curl bate |
| HPP-082 | Remover `POST /task-checklists/:id/reorder` (reorder via PUT item-a-item com position) | 1 | retorna 404 |
| HPP-083 | Refator `task-links` → `/api/v1/tasks/:taskId/links` com type `LinkType` (RELATES_TO, DUPLICATES, IS_DUPLICATED_BY). Body `{ taskToId, type }` | 2 | curl bate |
| HPP-084 | Migrar registros antigos de `task-dependencies` para `work_item_links` com `type=RELATES_TO`. Tabela `task_dependencies` vai pra backup `_legacy_YYYYMMDD` | 2 | dado preservado |
| HPP-085 | `/api/v1/tags` CRUD (com `spaceId` obrigatório no POST). `_count: { tasks }` no response | 2 | curl bate |
| HPP-086 | Anexar/desanexar tag em task: `POST /tags/task/:taskId` body `{ tagId }`, `DELETE /tags/task/:taskId/:tagId` | 1 | curl bate |
| HPP-087 | `/api/v1/tasks/:taskId/time-entries` CRUD: POST /start, PUT /:entryId/stop, POST (manual com startTime/endTime/duration), GET | 2 | curl bate |
| HPP-088 | Refator `task-attachments` → `/api/v1/attachments` com fluxo presigned 3-step. Mantém S3 + ClamAV interno | 2 | upload completo funciona em ambiente staging |
| HPP-089 | Smoke test e2e do bloco | 1 | suite verde |

---

### SPRINT 6 — Módulo Automation (PR4)

**Objetivo:** construir `/api/v1/ai/automation` completo.
**Branch:** `feat/hpp-sprint-6-automation`
**Dependencies:** SPRINT 5 (precisa de tasks/comments/lists já estáveis pra triggers funcionarem)
**Pontos:** 22

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-100 | Criar módulo `automations/` com Controller + Service + Repository. Path `/api/v1/ai/automation` | 1 | módulo bootedhost |
| HPP-101 | `GET /ai/automation/triggers` retornando os 18 triggers com `id, label, category` | 1 | response com 18 items |
| HPP-102 | `GET /ai/automation/actions` retornando as 21 actions com `id, params*` | 1 | response com 21 items |
| HPP-103 | `GET /ai/automation/statuses` agrupados por escopo do workspace | 1 | response com workflow statuses |
| HPP-104 | CRUD completo: GET, GET:id, POST, PUT, DELETE | 2 | curl bate |
| HPP-105 | `POST /ai/automation/:id/toggle` com body `{}` invertendo `isActive` | 1 | curl bate |
| HPP-106 | Listener global de eventos de tasks (criação, status, assign, tag, comment, custom field, etc — 18 triggers) | 3 | unit tests cobrem cada um |
| HPP-107 | Engine de execução: avaliar `conditions[]` (AND), executar `compiledActions[]` em ordem via job BullMQ | 3 | execução assíncrona com retry |
| HPP-108 | Implementar 21 actions (change_status, move_to_list, change_priority, change_assignees, change_task_name, change_task_type, change_tags, set_custom_field, set_time_estimate, add_task_link, change_due_date, change_start_date, add_comment, send_notification, create_subtask, delete_task, duplicate_task, create_list, call_webhook). `send_channel_message` e `send_direct_message` retornam 501 se módulo chat não pronto | 5 | cada action tem unit test |
| HPP-109 | Cache em memória de Automations por workspace (TTL 30s) com invalidação no write | 2 | benchmark mostra < 5ms de overhead |
| HPP-110 | Worker BullMQ pra processar Cron triggers (lê `nextRunAt` periodicamente) | 1 | trigger CRON dispara no horário |
| HPP-111 | Guard de loop (max `automationDepth=5`). Acima disso, abortar com erro logado | 1 | teste cobre cascata infinita |
| HPP-112 | Smoke test ponta a ponta: criar Automation `TASK_CREATED → change_assignees`, criar task, validar atribuição em < 5s | 1 | e2e verde |

---

### SPRINT 7 — Migrar listeners e desligar motor BPMN (PR5)

**Objetivo:** substituir o motor BPMN por Automations equivalentes e remover o motor.
**Branch:** `feat/hpp-sprint-7-bpm-decommission`
**Dependencies:** SPRINT 6
**Pontos:** 14

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-120 | Inventário dos cenários atuais do motor (extrair de `bpm/engine/bpm-engine.service.ts`). Documentar em `runbook-bpm-decommission.md` | 1 | doc com lista de cenários |
| HPP-121 | Criar `seed-automations.ts` com Automations equivalentes a cada cenário do motor | 3 | seed cria N automations no workspace de teste |
| HPP-122 | Reescrever `order-cancelado.listener.ts` removendo refs a `processInstance` | 2 | listener para de tocar BPM runtime |
| HPP-123 | Reescrever `order-entregue.listener.ts` idem | 2 | idem |
| HPP-124 | Backup de tabelas: criar `process_instances_legacy_YYYYMMDD`, `activity_instances_legacy_YYYYMMDD`, `task_instances_legacy_YYYYMMDD`, `handoff_instances_legacy_YYYYMMDD` | 1 | dados copiados |
| HPP-125 | Remover código `bpm/engine/`, `bpm/runtime/process-instances/`, `activity-instances/`, `task-instances/`, `handoff-instances/` | 2 | grep retorna 0 |
| HPP-126 | Remover models Prisma `ProcessInstance, ActivityInstance, TaskInstance, HandoffInstance` + migration de DROP TABLE | 1 | `npx prisma migrate` aplica |
| HPP-127 | Smoke test: criar Order EM_ORCAMENTO → mudança de status dispara Automations equivalentes às atividades antigas | 2 | fluxo completo verde em staging |

---

### SPRINT 8 — Frontend (mundial-erp-web) + WebSocket (PR6)

**Objetivo:** frontend consome a nova API + ganha real-time via Socket.IO.
**Branch:** `feat/hpp-sprint-8-frontend-realtime`
**Dependencies:** SPRINTS 2-5
**Pontos:** 22

| Tarefa | Descrição | Pontos | Critério de aceite |
|---|---|---|---|
| HPP-130 | Trocar todos os clientes HTTP que apontam pra endpoints antigos (`/departments` → `/spaces`, etc) | 5 | grep não acha mais paths antigos no `mundial-erp-web/` |
| HPP-131 | UI mantém labels "Departamento", "Área", "Processo" (i18n + breadcrumbs + títulos) | 1 | conferência manual em sidebar/menus |
| HPP-132 | UI nova: visibility per nível, members hierárquicos, resources (filtros) | 3 | telas funcionais |
| HPP-133 | UI de reactions em comments | 2 | toggle funciona |
| HPP-134 | UI de Automations: CRUD com seletor de trigger, builder visual de actions, conditions, toggle ativo | 5 | telas funcionais |
| HPP-135 | Backend gateway Socket.IO em `src/modules/realtime/` com namespaces `/notifications` e `/chat`. Auth via JWT no payload | 3 | conexão estabelece |
| HPP-136 | Frontend: conectar Socket.IO + consumir evento `notification` em real-time | 2 | notification chega < 1s |
| HPP-137 | Smoke test e2e ponta a ponta: login, navegar Dep→Área→Processo→Tarefa, criar Automation, receber notification em real-time | 1 | suite e2e Playwright verde |

---

### Cronograma e dependencies

```
S0 (Schema) → S1 (Refator interno) → S2 (Spaces/Folders/Lists) ┐
                                                                ├→ S3 (Tasks core) ─┐
                                                                ├→ S4 (Comments/Views/CF/Notif) │
                                                                                                ├→ S5 (Sub-recursos) → S6 (Automation) → S7 (BPM out) → S8 (Frontend)
```

S2, S3, S4 podem rodar em paralelo se houver banda. S5 depende de S3. S6 depende de S5. S7 depende de S6. S8 depende de S2-5 (pode começar em paralelo a S6/S7).

---

## Plano antigo (mantido como referência) — 6 PRs sequenciais

### PR 1 — Schema + migration

**Objetivo:** preparar o banco. Sem mexer em endpoint.

1. Rename Prisma:
   - `Department` → `Space`, `Area` → `Folder`, `Process` → `List`
   - FKs: `departmentId`→`spaceId`, `areaId`→`folderId`, `processId`→`listId` em todas as tabelas que referenciam
2. Novos enums:
   - `Visibility { PUBLIC, PRIVATE }`
   - `Permission { FULL_EDIT, EDIT, COMMENT, VIEW }`
   - `StatusInheritance { SPACE, FOLDER, OWN }`
   - `AutomationTrigger` (18 valores)
   - `AutomationScopeType { LIST, FOLDER, SPACE, WORKSPACE }`
3. Campos novos em models existentes:
   - `Space`: `visibility`, `icon`, `position`, `creatorId`
   - `Folder`: `visibility`, `icon`, `position`, `creatorId`, `statusInheritance`
   - `List`: `visibility`, `icon`, `position`, `creatorId`, `statusInheritance`, `defaultTaskTypeId` (FK pra CustomTaskType)
   - `WorkItemComment`: `parentId` (auto-FK), `mentions Json`, `assigneeId`, `assignedById`, `resolvedAt`, `resolvedById`, `source`
   - `CustomFieldDefinition`: `spaceId?`, `folderId?`, `listId?`, `customTaskTypeId?` (mantém `workspaceId` pra escopo global)
   - `CustomTaskType`: `spaceId?` (escopo space)
4. Models novos:
   - `SpaceMember(spaceId, userId, permission, source, inherited, createdAt)` PK composta
   - `FolderMember(folderId, userId, permission, source, inherited, createdAt)`
   - `ListMember(listId, userId, permission, source, inherited, createdAt)`
   - `CommentReaction(commentId, userId, emoji, createdAt)` PK composta
   - `Automation(id, workspaceId, createdById, name, description?, trigger, compiledActions Json, conditions Json, isActive, executionCount, lastExecutedAt?, cronExpression?, nextRunAt?, timezone, scopeType, scopeId, sources Json?, createdAt, updatedAt, deletedAt?)`
   - `WorkItemTimeEntry(id, taskId, userId, startTime, endTime?, duration? Int /* minutos */, description?, createdAt, updatedAt)` com índice `(taskId, userId, startTime)`
4.1. Ajustes em models existentes (relacionados a Tags e Links):
   - `WorkItemTag`: adicionar `spaceId String` (FK obrigatória pra Space). Backfill: associar tags existentes ao primeiro space do workspace, ou marcar como nullable temporariamente até migração manual
   - `WorkItemLink`: adicionar `type` enum `LinkType { RELATES_TO, DUPLICATES, IS_DUPLICATED_BY }`. Migrar registros atuais para `RELATES_TO`. Tabela `work_item_dependencies` continua existindo em backup mas não é exposta via API
   - `WorkItemChecklist`: adicionar `hideCompleted Boolean @default(true)` e renomear (no nível de model não-tabela) pra alinhar com nomenclatura Hoppe
5. Migration SQL:
   - `ALTER TABLE departments RENAME TO spaces` (idem areas → folders, processes → lists)
   - Renomear colunas FK: `work_items.process_id` → `work_items.list_id`, etc
   - `ADD COLUMN visibility ... DEFAULT 'PUBLIC'`, `position`, `icon`, `creator_id`
   - Criar tabelas `space_members`, `folder_members`, `list_members`, `comment_reactions`, `automations`
   - Backfill: pra cada Space existente, popular SpaceMember com FULL_EDIT pro creator e pra cada user OWNER/ADMIN do workspace
6. Atualizar seeds

**Verificação:**
- `npx prisma migrate dev` aplica
- `npx prisma generate` gera types com nomes novos
- Build do projeto passa
- Suite atual (Vitest) verde — vai exigir refator simultâneo dos repositories (em paralelo neste PR)

### PR 2 — Refator interno (services e repositories)

**Objetivo:** ajustar código pra usar nomes novos, sem mudar paths de endpoint.

- Renomear arquivos: `departments.service.ts` → `spaces.service.ts`, etc
- Atualizar todos os imports
- Sem mexer em `@Controller(...)` (continuam `departments`, `areas`, `processes`, etc)
- Adaptar `task-comments.service.ts` pra suportar `parentId`, `mentions`, `assigneeId`
- Adaptar repositories que tocam Order/Activity/ProcessInstance pra usar nomes novos

**Verificação:** build + testes verdes, frontend funcional sem mudança.

### PR 3 — Endpoints novos estilo Hoppe + remover antigos

**Objetivo:** publicar `/api/v1/spaces|folders|lists|tasks|comments|views|custom-fields|notifications|spaces/:id/task-types` no novo formato. Endpoints antigos removidos no mesmo PR.

#### Spaces — `/api/v1/spaces` (substitui `/departments`)
Doc de referência: linhas 10-310 do `endpoits`.

CRUD principal:
- `POST /api/v1/spaces` — body `{ name, description? }`. Response 201 com `id, name, description, position, visibility, icon, creatorId, workspaceId, folders[], statuses[]`. Side-effect: cria 1 folder default + 1 list default + 4 statuses default (Para fazer `NOT_STARTED`, Em andamento `ACTIVE`, Concluído `DONE`, Finalizado `CLOSED`) + creator vira `SpaceMember(permission=FULL_EDIT, source=direct)`
- `GET /api/v1/spaces` — array com cada space e seus folders/statuses
- `GET /api/v1/spaces/:id` — detalhe inclui `workspace.users[]`
- `PUT /api/v1/spaces/:id` — partial via PUT. Aceita `name, description, icon`. Não usa PATCH
- `DELETE /api/v1/spaces/:id` — 200 `{ message: "Space deleted successfully" }` (cascade em folders, lists, tasks, members)

Sub-recursos:
- `GET /api/v1/spaces/:id/visibility` → `{ visibility }`
- `PUT /api/v1/spaces/:id/visibility` — body `{ visibility: "PUBLIC"|"PRIVATE" }`. Se PUBLIC→PRIVATE, garante creator como `SpaceMember(FULL_EDIT)`
- `GET /api/v1/spaces/:id/members` — array `{ spaceId, userId, permission, source, inherited, user{ id, name, email, avatar } }`. Em PUBLIC, marca todos os workspace users como `inherited: true`
- `POST /api/v1/spaces/:id/members` — body `{ userId, permission }`, 201
- `PUT /api/v1/spaces/:id/members/:userId` — body `{ permission }`, 200
- `DELETE /api/v1/spaces/:id/members/:userId` — 200 sem corpo
- `GET /api/v1/spaces/:id/resources` — read-only. Retorna `{ filters[], sortOptions[] }` com metadata estática de campos disponíveis (STATUS, ASSIGNEE, DUE_DATE, PRIORITY, TASK_TYPE, NAME, DESCRIPTION, CREATOR, CREATED_AT, LIST, ASSIGNED_COMMENTS, TAGS, STATUS_IS_CLOSED). Operadores: IS, IS_NOT, CONTAINS, NOT_CONTAINS, EQUALS, GREATER_THAN, LESS_THAN, BETWEEN, IS_SET, IS_NOT_SET

Permissões: validar via `SpaceMember`. Cross-tenant retorna 404 (nunca 403).

#### Folders — `/api/v1/folders` (substitui `/areas`)
Doc de referência: linhas 628-790 do `endpoits`.

CRUD principal:
- `GET /api/v1/folders?spaceId=` — `spaceId` obrigatório na query. Retorna folders do space ordenados por `position`
- `GET /api/v1/folders/:id` — detalhe com `lists[], statuses[], space{}`
- `POST /api/v1/folders` — body `{ name, spaceId }`. Side-effect: cria 1 list "Lista padrão" dentro
- `PUT /api/v1/folders/:id` — `name, description?, icon?, statusInheritance?`
- `DELETE /api/v1/folders/:id` — 200 retorna o objeto deletado

Sub-recursos:
- `GET /api/v1/folders/:id/visibility`, `PUT` — mesmo formato de spaces
- `GET /api/v1/folders/:id/members`, `POST`, `PUT/:userId`, `DELETE/:userId` — herda do space pai (`inherited: true`) + diretos
- `GET /api/v1/folders/:id/resources` — mesma metadata, sem `lists[]` (que vai no GET principal)

`status_inheritance` aceita `SPACE` (default, herda do space), `FOLDER` (estático), `OWN` (folder define seus próprios statuses).

#### Lists — `/api/v1/lists` (substitui `/processes`)
Doc de referência: linhas 799-1020 do `endpoits`.

CRUD principal:
- `GET /api/v1/lists?folderId=` — folderId obrigatório. Aceita também `?spaceId=` pra listar todas as lists de um space
- `GET /api/v1/lists/:id` — detalhe com `views[], statuses[], folder{}, space{}`
- `POST /api/v1/lists` — body `{ name, folderId }` (não permite criar direto em space, sempre dentro de folder)
- `PUT /api/v1/lists/:id` — `name, icon?, statusInheritance?, defaultTaskTypeId?`
- `DELETE /api/v1/lists/:id` — 200 com objeto deletado

Sub-recursos:
- `GET /api/v1/lists/:id/visibility`, `PUT`
- `GET /api/v1/lists/:id/members`, `POST`, `PUT/:userId`, `DELETE/:userId`
- `GET /api/v1/lists/:id/resources`

Endpoints **não implementar** (Hoppe explicita 404):
- `GET /lists/:id/lists`, `GET /lists/:id/tasks`, `POST /lists/:id/duplicate`, `POST /lists/:id/move`, `PATCH /lists/:id`

#### Tasks — `/api/v1/tasks`
Doc de referência: linhas 462-516 e 2258-2710 do `endpoits`.

Estrutura do recurso (da linha 2267):
- `name` (obrigatório), `listId` (obrigatório, toda task vive numa list), `description`, `statusId` (auto se não passar — pega primeiro `NOT_STARTED` da list/folder/space), `dueDate`, `startDate`, `dateDone`, `dateClosed` (auto quando muda pra DONE/CLOSED), `priority` (LOW/NORMAL/HIGH/URGENT/null), `visibility` (PUBLIC/PRIVATE), `taskTypeId`, `timeEstimate` (segundos), `parentTaskId` (subtask), `depth` (auto), `path` (auto), `subtaskCount`/`completedSubtasks` (cache), `customTaskId` (string user-defined opcional), `assigneeIds` (só no POST, no PUT é rejeitado)

CRUD principal:
- `GET /api/v1/tasks` — workspace-wide, filtros via query
- `GET /api/v1/tasks?listId=` — por list
- `GET /api/v1/tasks/space/:spaceId` — agrupado por list. Response `[{ list:{id,name,folder{id,name}}, tasks:[...] }]`
- `GET /api/v1/tasks/list?viewId=&level=list|space|folder` — agrupado por status. Response `[{ group:{id,name,label,type:STATUS,collapsed,field,position,viewId,color}, tasks:[...] }]`
- `GET /api/v1/tasks/my-tasks` — agrupado por bucket temporal: `{ overdue, today, upcoming, noDate, completed }`
- `GET /api/v1/tasks/:id` — detalhe completo com `list.folder.space`, `assignees[]`, `creator`, `status`, `parentTask`
- `GET /api/v1/tasks/:id/subtasks` — array de tasks filhas (linha 2464)
- `POST /api/v1/tasks` — body mínimo `{ name, listId }`. Aceita `parentTaskId` pra criar subtask. `assigneeIds` é aceito **só no POST**
- `PUT /api/v1/tasks/:id` — partial via PUT. **Não aceita** `assigneeIds, assignees, addAssigneeIds, assigneeId` no body (retorna 400 PrismaValidationError, linha 2442). Pra mudar assignee depois da criação, usar `PUT /assign` separado
- `DELETE /api/v1/tasks/:id` — 200 `{ message: "Task with ID ... deleted successfully" }`. Hard delete (no banco soft delete via `deletedAt` por padrão Bravy, mas response segue Hoppe)

Assignees (3 endpoints distintos, linhas 2470-2710):
- `GET /api/v1/tasks/:id/assignees` — array `{ id, user{}, permission, createdAt }`
- `PUT /api/v1/tasks/:id/assign` — substitui lista completa. Body `{ assignees: [{ userId }, ...] }`. Backend re-adiciona creator se mandar lista vazia
- `DELETE /api/v1/tasks/:id/assignees/:userId` — remove 1 individual. Path usa `userId`, não id do registro

Activities da task (path peculiar com hífen, linha 2665):
- `GET /api/v1/tasks-activities/:taskId` — log de atividades (criação, atribuição, mudança de status). **Path com hífen**, não `/tasks/:id/activities` (esse retorna 404)

#### Endpoints **descontinuados** (Hoppe declara explicitamente que não existem)

A Mundial vai aderir 100% ao Hoppe. Esses extras antigos do ERP **saem** do refator:

| Feature antiga | Status no Hoppe | Substituição |
|---|---|---|
| `POST /tasks/:id/archive`, `/unarchive` | 404 (linha 3097-3104) | Remover. Não há substituição. Frontend remove o item do menu |
| `GET /tasks/:id/watchers` e endpoints relacionados | 404 (linha 3107-3112) | Watchers = creator + assignees (notification segue para eles automaticamente) |
| `GET /tasks/:id/dependencies, POST, DELETE` | 404 (linha 3188-3193) | Usar Task Links com type (RELATES_TO, DUPLICATES, IS_DUPLICATED_BY) |
| `POST /tasks/:id/merge` | 404 (linha 3268-3273) | Remover. Caminho prático: copiar conteúdo manual + deletar uma das tasks |
| `GET /tasks/:id/time-in-status`, `POST /time-in-status:bulk` | 404 (linha 3300-3301) | Usar Time Tracking (start/stop/manual) — entrega resultado equivalente para SLA |
| `GET /tasks/:id/comments` | 404 (linha 2513) | Usar `/comments/task/:id` (já no plano) |
| `POST /tasks/:id/duplicate, /move, /restore, /complete` | 404 (linha 2516) | Remover (sem substituto direto) |

Migration de schema (PR1): manter as tabelas `work_item_watchers`, `work_item_dependencies`, `work_item_status_history`, e os campos `archivedAt` em `work_items`. Não ferir dados existentes; só parar de expor via API. Em sprint futuro, decidir se removemos as tabelas ou se viram dados internos do motor de Automation.

#### Checklists — `/api/v1/checklist/...` (substitui `/task-checklists`)
Doc de referência: linhas 3136-3186 do `endpoits`.

Path **singular** `checklist` (não `checklists`). Estrutura: `id, title, hideCompleted (default true), taskId, createdAt, updatedAt`. Items: `id, title, checked, checklistId, assignedToId?, position, dueDate?, taskId`.

CRUD checklist:
- `POST /api/v1/checklist/task/:taskId` — criar. Body `{}` (default `title: "Checklist"`) ou `{ title }`. 201
- `GET /api/v1/checklist/task/:taskId` — listar checklists da task
- `PUT /api/v1/checklist/:checklistId` — body `{ title?, hideCompleted? }`
- `DELETE /api/v1/checklist/:checklistId` — response `{ message, taskId }`

CRUD item:
- `POST /api/v1/checklist/item/:checklistId` — body `{ title }`
- `PUT /api/v1/checklist/:checklistId/item/:itemId` — body `{ checked? }` ou `{ title?, dueDate?, assignedToId? }`
- `DELETE /api/v1/checklist/item/:itemId` — **path singular sem checklistId**

Migração do módulo atual: renomear `task-checklists` → `checklist`. Re-mapear paths: `POST /tasks/:id/checklists` → `POST /checklist/task/:id`. Endpoint atual `POST /task-checklists/:id/reorder` (reorder em batch) **não existe no Hoppe** — descontinuar ou manter como extensão? Decisão padrão: **remover** seguindo Hoppe; reorder é feito mudando `position` item a item via PUT.

#### Task Links — `/api/v1/tasks/:taskId/links` (substitui `/task-links` E `/task-dependencies`)
Doc de referência: linhas 3196-3223 do `endpoits`.

Tipos: `RELATES_TO`, `DUPLICATES`, `IS_DUPLICATED_BY`. **Não há type "BLOCKS"** — dependencies não existem no Hoppe.

CRUD:
- `POST /api/v1/tasks/:taskId/links` — body `{ taskToId, type }`. 201 com `{ id, type, linkedTask{ id, name, status, taskType, list } }`
- `GET /api/v1/tasks/:taskId/links` — array
- `DELETE /api/v1/tasks/:taskId/links/:linkId`

Migração: módulo atual `task-dependencies` (com BFS de detecção de ciclo) é descontinuado. Quem precisa de "bloqueio" usa `RELATES_TO` ou `DUPLICATES` por convenção. Engine de automation pode ler tipo de link e tomar decisões.

#### Tags — `/api/v1/tags` (substitui `/task-tags`)
Doc de referência: linhas 3226-3265 do `endpoits`.

**Tag tem `spaceId` obrigatório** (não é mais workspace-wide como hoje). Estrutura: `id, name, color, spaceId, createdAt, updatedAt, _count: { tasks }`.

CRUD da tag:
- `GET /api/v1/tags` — listar do workspace
- `POST /api/v1/tags` — body `{ name, color, spaceId }`. `spaceId` obrigatório
- `PUT /api/v1/tags/:tagId` — body `{ name?, color? }`
- `DELETE /api/v1/tags/:tagId`

Anexar/desanexar em task:
- `POST /api/v1/tags/task/:taskId` — body `{ tagId }`
- `DELETE /api/v1/tags/task/:taskId/:tagId` — response `{ message: "Tag removed from task" }`

Migração schema: adicionar `spaceId` (FK não-null) em `work_item_tags`. Backfill: associar todas as tags existentes ao "primeiro space" do workspace (ou criar coluna nullable e popular depois).

#### Time Tracking — `/api/v1/tasks/:taskId/time-entries` (módulo novo, substitui `time-in-status`)
Doc de referência: linhas 3376-3499 do `endpoits`.

Estrutura: `id, taskId, startTime, endTime?, duration` (minutos), `description?, userId, createdAt`.

CRUD:
- `POST /api/v1/tasks/:taskId/time-entries/start` — sem body. Cria entry com `endTime: null`
- `PUT /api/v1/tasks/:taskId/time-entries/:entryId/stop` — sem body. Atualiza `endTime` e calcula `duration`
- `POST /api/v1/tasks/:taskId/time-entries` — lançamento manual. Body `{ startTime, endTime, duration, description? }`
- `GET /api/v1/tasks/:taskId/time-entries` — array

Schema novo no PR1:
- `WorkItemTimeEntry(id, taskId, userId, startTime, endTime?, duration?, description?, createdAt, updatedAt)` com índice em `(taskId, userId, startTime)`
- Migration de dados: preservar `WorkItemStatusHistory` existente em backup table. Não migrar pra time-entries automaticamente (semântica diferente).

#### Attachments — `/api/v1/attachments` (substitui `/task-attachments` com fluxo R2/S3 presigned)
Doc de referência: linhas 3417-3478 do `endpoits`.

Hoje a Mundial usa S3 + ClamAV scanning assíncrono. Hoppe usa Cloudflare R2 + presigned URL em 2 etapas + confirm. Decisão: **manter S3 + ClamAV** (estrutura interna preservada) **mas adotar os paths e o fluxo do Hoppe** na superfície da API. ScanStatus continua como campo (PENDING → CLEAN/INFECTED) mas response da API só retorna o registro depois do upload confirmado.

Fluxo (3 etapas):
1. `POST /api/v1/attachments/presigned-url` — body `{ taskId, fileName, fileType, fileSize }`. Response 201 `{ uploadUrl, fileKey, expiresIn: 900 }` (TTL 15min em vez dos 5min atuais)
2. `PUT {uploadUrl}` — direto pro S3/R2 com bytes do arquivo
3. `POST /api/v1/attachments/tasks/:taskId` — confirma. Body `{ fileKey, name, type, size }`. Response 201 com `{ id, url, name, type, size, taskId, commentId?, uploadedById, uploadedBy }`

Listagem e exclusão:
- `GET /api/v1/attachments/tasks/:taskId` — array
- `DELETE /api/v1/attachments/:attachmentId` — `{ success: true }`

Anexo em comment (mencionado linha 3477-3478, não validado): `POST /api/v1/attachments/comments/:commentId` — implementar pelo padrão.

ClamAV: continua rodando assíncrono. Se `scanStatus = INFECTED`, GET retorna URL inválida ou 423 Locked. Documentar no Swagger.

`GET /tasks/:id/documents` (linha 3122) é OUTRO recurso (documentos colaborativos vinculados à task) — NÃO é attachment. Por enquanto fora de escopo.

#### Task Types — `/api/v1/spaces/:spaceId/task-types` (substitui `/custom-task-types` workspace-level)
Doc de referência: linhas 353-460 do `endpoits`.

Estrutura: `id, spaceId, value` (nome singular obrigatório), `pluralName` (obrigatório), `icon` (Lucide: BugIcon, CircleDotIcon, DiamondIcon, AlertCircleIcon, FileTextIcon, etc), `description`, `creatorId`, `creator{}`, `createdAt`, `updatedAt`.

CRUD:
- `GET /api/v1/spaces/:spaceId/task-types` — array. Inclui builtins workspace-wide + space-specific. Default ao criar space: "Tarefa" (TaskIcon) e "Milestone" (DiamondIcon)
- `POST /api/v1/spaces/:spaceId/task-types` — body `{ value, pluralName, icon, description? }`. 201
- `PUT /api/v1/spaces/:spaceId/task-types/:taskTypeId` — partial via PUT
- `DELETE /api/v1/spaces/:spaceId/task-types/:taskTypeId` — 200 com `{ message, tasksAffected: N }` (quantas tasks usavam aquele tipo, viram default)

Validações:
- Cross-space: 404 se taskType não pertence ao space da rota
- Builtins (`isBuiltin: true`): retornam 403 em update/delete com mensagem estável
- Conflito de nome (mesmo `value` em mesmo space): 409

Compatibilidade com TTT: o trabalho de Task Type Templates já consome `CustomTaskType`. Após adicionar `spaceId` no model (PR1), os builtins atuais (`order`, `stock-request`) ficam workspace-wide (`spaceId=null`) e os customizados ficam space-scoped. Garante que `GET /spaces/:id/task-types` retorna ambos (builtins + space).

#### Views — `/api/v1/views` (substitui `/process-views`)
Doc de referência: linhas 516-555 do `endpoits`.

Estrutura: `id, name, type` (BOARD/LIST/TABLE/CALENDAR/MAP), `listId, spaceId, folderId, grouping` (objeto `{field: direction}`), `groupByList, isDefault, closedTasks, closedSubTasks, subtaskListMode` (COLLAPSED/EXPANDED/SEPARATED), `collapsedListIds[], showEmptyStatuses, creatorId, visibility` (SHARED/PRIVATE/PUBLIC), `isProtected, position, createdAt, updatedAt, creator{}`.

CRUD:
- `GET /api/v1/views?spaceId=` ou `?listId=` ou `?folderId=` — array
- `GET /api/v1/views/:id` — detalhe
- `POST /api/v1/views` — body `{ name, type, listId|spaceId|folderId, grouping?, ... }`
- `PUT /api/v1/views/:id` — partial
- `PATCH /api/v1/views/:id/pin` — fixar como default (despinar as outras do mesmo escopo)
- `DELETE /api/v1/views/:id`

#### Custom Fields — `/api/v1/custom-fields` (substitui `/custom-field-definitions`)
Doc de referência: linhas 555-1310 do `endpoits`.

Tipos suportados (mantém os 10+ atuais e adicionar o que falta): TEXT, NUMBER, SELECT, DATE, CHECKBOX, DROPDOWN, URL, EMAIL, PHONE, CURRENCY, PERCENTAGE, DURATION, RATING, USER, TEAM, PEOPLE, RELATIONSHIP, ROLLUP, LABEL, MULTI_SELECT, TEXTAREA, CPF, CNPJ.

Estrutura: `id, workspaceId, createdById, name, label, description, type, required, options[], defaultValue, validation{minLength,maxLength,pattern}, config, pinned, visibleToGuests, fillMethod (manual|automatic), position (auto), fixed, values[]`. Escopo opcional via 1 dos campos: `spaceId|folderId|listId|customTaskTypeId`.

CRUD:
- `GET /api/v1/custom-fields?spaceId=` (ou folder/list/taskType) — resposta agrupada `{ list:[], folder:[], space:[], taskType:[] }`
- `GET /api/v1/custom-fields/:id`
- `POST /api/v1/custom-fields` — obrigatórios `name, label, type` + 1 escopo opcional (sem escopo = workspace global)
- `PUT /api/v1/custom-fields/:id` — partial via PUT
- `DELETE /api/v1/custom-fields/:id` — hard delete, 200 retorna objeto

Validações:
- Builtins (`isBuiltin: true`) em update/delete: 403 com mensagem estável
- Conflict de `key` (case-insensitive, mesmo workspace+escopo): 409

Custom Field Values em tasks (mantém):
- `GET /api/v1/tasks/:taskId/custom-fields` — lista valores com definitions
- `PATCH /api/v1/tasks/:taskId/custom-fields/:definitionId` → trocar pra **PUT** seguindo padrão Hoppe? Ver pergunta abaixo.
  - **Decisão**: alinhar com Hoppe e usar `PUT`. Update parcial em PUT é aceitável.

#### Comments — `/api/v1/comments` (substitui `/task-comments`)
Doc de referência: linhas 1378-1614 do `endpoits`.

Estrutura: `id, taskId, content` (texto puro, sem rich text), `authorId`, `assigneeId, assignedById, parentId, mentions[], source, resolvedAt, resolvedById, createdAt, updatedAt`. Embeds: `author{}, assignee{}, assignedBy{}, resolvedBy{}, reactions[], attachments[], replies[]`.

CRUD:
- `GET /api/v1/comments/task/:taskId` — paginado (não usar query `?taskId=`, usar path nested)
- `GET /api/v1/comments/:id`
- `POST /api/v1/comments` — body `{ taskId, content, assigneeId?, parentId?, mentions? }`. `assignedById` auto = usuário logado. Reply via `parentId`
- `PUT /api/v1/comments/:id`
- `DELETE /api/v1/comments/:id`
- `POST /api/v1/comments/:id/reactions` — toggle. Body `{ emoji }`. Response `{ action: "added"|"removed", reaction|emoji }`

Endpoints **não implementar** (Hoppe explicita 404):
- `GET /comments` sem filtro
- `GET /comments?taskId=...` (usar path nested)
- `GET /tasks/:id/comments` (path inverso)
- `POST /comments/:id/resolve|unresolve|replies`
- `PATCH /comments/:id`
- `DELETE /comments/:id/reactions` (usar POST como toggle)

Importante: `select` explícito no repository. **Não vazar `password` do user em embeds** (bug que o Hoppe tem documentado).

#### Notifications — `/api/v1/notifications` (alinhar ao Hoppe)
Doc de referência: linhas 1615-1956 do `endpoits`.

Tipos: TASK_OVERDUE, TASK_ASSIGNED, MENTION, TASK_COMMENT, TASK_DUE_SOON, TASK_STATUS_CHANGED, TASK_COMPLETED, CHANNEL_MESSAGE, CHANNEL_MENTION.

Estrutura: `id, type, userId, taskId, workspaceId, read, createdAt, updatedAt, metadata` (varia por tipo, com `mergedCount, mergedTypes, coalescedCount, mergedMetadataByType, uniqueActorNames, actors[]` quando coalesced), `channels[], delivered, task` (embed completo no LIST), `workspace` (embed no LIST).

Coalescing: backend agrupa eventos relacionados num intervalo curto numa única notification (ex: 3 comments com mention na mesma task viram 1 TASK_COMMENT com MENTION em `metadata.mergedMetadataByType`). Self-action não notifica.

CRUD:
- `GET /api/v1/notifications` — paginado, filtros `page, limit, sortBy, sortOrder, type` (workspaceId vem do header)
- `POST /api/v1/notifications/:id/read` — body `{}`. Idempotente
- `POST /api/v1/notifications/read-all` — body `{}`. Response `{ count: N }`
- `DELETE /api/v1/notifications/:id` — 200 `{ success: true }`. Hard delete

**Não implementar** (Hoppe explicita 404):
- `GET /notifications/:id`, `POST /notifications`, `PATCH /notifications/:id`, `POST /notifications/:id/unread`, `DELETE /notifications` (em massa)

Migração dos endpoints atuais: `PATCH /notifications/:id/read|unread|clear|unclear|snooze|unsnooze` → ou todos viram POST seguindo Hoppe (read/unread/clear/...) ou alguns deixam de existir. Optar por **manter clear/unclear/snooze/unsnooze como POST** no namespace `/api/v1/notifications/:id/...` porque são funcionalidades extras úteis (Hoppe não tem mas não conflita). Manter `:id/read` em vez de `:id/read` PATCH.

#### Remover endpoints antigos (no mesmo PR)
Substituídos por endpoints novos do Hoppe:
- `/departments` → `/spaces`
- `/areas` → `/folders`
- `/processes` → `/lists`
- `/process-views` → `/views`
- `/task-comments` → `/comments`
- `/custom-field-definitions` → `/custom-fields`
- `/custom-task-types` (root) → `/spaces/:id/task-types`
- `/task-checklists` → `/checklist`
- `/task-links` → `/tasks/:id/links` (com type novo)
- `/task-tags` → `/tags`
- `/task-attachments` → `/attachments` (fluxo presigned 3-step)

Removidos sem substituto direto (Hoppe não tem):
- `/task-dependencies` (consolidado em `/tasks/:id/links` com type)
- `/task-watchers` (creator + assignees são watchers naturais)
- `POST /tasks/:id/archive`, `/unarchive`
- `POST /tasks/:id/merge`
- `GET /tasks/:id/time-in-status`, `POST /time-in-status:bulk` (substituído por `/time-entries`)

Mantidos intocados:
- `/sectors` (permanece como está)
- BPM runtime endpoints (`/bpm/process-instances`, `/bpm/activity-instances`, `/bpm/task-instances`, `/bpm/handoff-instances`) — saem no PR5 quando o motor é desligado

### PR 4 — Módulo Automation (`/api/v1/ai/automation`)

**Objetivo:** construir a infra que vai substituir o motor BPMN.

#### Endpoints (linhas 2711-3088 do doc)
- `GET /ai/automation/triggers` — catálogo dos 18 triggers
- `GET /ai/automation/actions` — catálogo das ~21 actions
- `GET /ai/automation/statuses` — statuses do workspace agrupados por escopo
- `GET /ai/automation` — listar
- `GET /ai/automation/:id`
- `POST /ai/automation` (`name, trigger, actions, scopeType, scopeId, isActive?, conditions?, cronExpression?, timezone?`). **Sem `naturalLanguageRule`**
- `PUT /ai/automation/:id`
- `POST /ai/automation/:id/toggle` (body `{}`)
- `DELETE /ai/automation/:id` (200, retorna objeto deletado)

#### Engine de execução
- Listener global escuta eventos: `task.created`, `task.status.changed`, `task.assignee.added`, `task.tag.added`, `comment.created`, `task.updated`, `task.priority.changed`, `task.due_date.changed`, `task.start_date.changed`, `task.name.changed`, `task.type.changed`, `task.moved`, `task.subtask.created`, `task.subtasks.all_resolved`, `customfield.changed`, `tag.removed`, `assignee.removed`
- Para cada evento, busca Automations ativas com `trigger` correspondente e `scopeType/scopeId` cobrindo a task
- Avalia `conditions[]` (AND simples)
- Executa `compiledActions[]` em ordem via job BullMQ com retry e DLQ
- Incrementa `executionCount`, atualiza `lastExecutedAt`
- Worker BullMQ separado pra processar Cron triggers (lê `nextRunAt` periodicamente)

#### Actions a implementar (21)
1. `change_status` (statusId)
2. `move_to_list` (listId)
3. `change_priority` (LOW/NORMAL/HIGH/URGENT)
4. `change_assignees` (userIds)
5. `change_task_name` (name)
6. `change_task_type` (taskTypeId)
7. `change_tags` (tagIds, action add|remove|replace)
8. `set_custom_field` (customFieldId, value)
9. `set_time_estimate` (timeEstimate em segundos)
10. `add_task_link` (targetTaskId, linkType)
11. `change_due_date` (offsetDays ou dueDate)
12. `change_start_date` (offsetDays ou startDate)
13. `add_comment` (content)
14. `send_notification` (message — gera Notification pro assignee/criador)
15. `send_channel_message` (channelId, message) — **TODO 501** se módulo chat não estiver pronto
16. `send_direct_message` (userId, message) — idem
17. `create_subtask` (name)
18. `delete_task`
19. `duplicate_task` (targetListId?, includeSubtasks?, includeCustomFields?)
20. `create_list` (name, folderId)
21. `call_webhook` (url, method?, headers?)

#### Guard de loop
- Cada execução de Automation marca contexto `automationDepth`. Limite máximo: 5. Acima disso, abortar com erro logado.

### PR 5 — Migrar listeners e desligar motor BPMN

**Objetivo:** substituir o que o motor BPMN fazia hoje por Automations equivalentes e remover o motor.

1. Inventário dos cenários atuais (extrair de `bpm/engine/bpm-engine.service.ts`):
   - "Quando Order vai pra status X, criar atividade Y no setor Z"
   - "Quando handoff A→B dispara, abrir process B"
   - "Quando atividade vence o SLA, notificar"
2. Pra cada cenário, criar Automation equivalente via seed (`seed-automations.ts`):
   - Trigger: `TASK_STATUS_CHANGED` ou `CUSTOM_FIELD_CHANGED` (campo status do TaskType "Pedido")
   - Conditions: comparação de valor de status/customField
   - Actions: `create_subtask`, `change_assignees`, `add_comment`, `send_notification`, `move_to_list`
3. Reescrever listeners:
   - `order-cancelado.listener.ts` e `order-entregue.listener.ts` deixam de tocar `prisma.processInstance`. Em vez disso, emitem evento que aciona Automations registradas
4. Remover código:
   - `bpm/engine/bpm-engine.service.ts`
   - `bpm/runtime/process-instances/`, `activity-instances/`, `task-instances/`, `handoff-instances/`
   - Models `ProcessInstance`, `ActivityInstance`, `TaskInstance`, `HandoffInstance`
   - Migration de remoção das tabelas correspondentes (após backup como `*_legacy_YYYYMMDD`)
5. ProcessViews → já refatorado em PR3 como `/views`

### PR 6 — Frontend (mundial-erp-web) + WebSocket

**Objetivo:** o frontend consome a nova API e ganha real-time.

- Trocar todos clientes HTTP que apontavam pra endpoints antigos
- UI mantém labels "Departamento", "Área", "Processo" (i18n, breadcrumbs, títulos)
- Adicionar UI de visibility, members hierárquicos, reactions em comments
- Adicionar UI de Automations (CRUD com seletor de trigger, builder visual de actions, toggle ativo, conditions simples)
- Adicionar Socket.IO no frontend (linhas 1958-2175 do doc)
  - Conectar nos namespaces `/notifications` e `/chat`
  - Atualizar lista de notifications em tempo real ao receber evento `notification`
  - Re-fetch via REST nos demais eventos (status change, comment edit, etc) seguindo o padrão Hoppe

#### Backend WebSocket
- Adicionar `@nestjs/websockets` + `@nestjs/platform-socket.io`
- Gateway em `src/modules/realtime/` com namespaces `/notifications` e `/chat`
- Auth via JWT no payload do connect
- Emitir evento `notification` no namespace `/notifications` quando uma Notification é criada/coalescida
- Emitir evento `chat:message:new` em `/chat` quando uma ChatMessage é criada (depende do módulo chat existir; senão, deixar como TODO)

---

## Pontos de atenção e riscos

1. **Ordem dos PRs importa.** PR1 antes de tudo (schema). PR2 logo depois pra build não quebrar. PR3 só publica os endpoints novos depois que tudo internamente está renomeado. PR4 e PR3 podem rodar em paralelo se houver capacidade. PR5 depende de PR4 pronto. PR6 fecha.

2. **Backfill de membership**: cada Space precisa de pelo menos 1 SpaceMember owner. Backfill SQL pega `creator_id` se houver, senão pega primeiro user OWNER/ADMIN do workspace.

3. **Loops de Automation**: action `change_status` pode disparar `TASK_STATUS_CHANGED` de novo. Guard de profundidade obrigatório.

4. **Ciclos de chat actions**: actions 15 e 16 (channel/DM) dependem de módulo chat. Se não existe, retornar 501 com mensagem clara em vez de quebrar.

5. **Sector intocado**: continua no schema com endpoint `/sectors`. Documentar no README do módulo.

6. **Vazamento de hash em comments** (linha 1567+ do doc): backend Hoppe vaza `password` do user nas respostas. **Não replicar.** `select` explícito em todos os repositories de WorkItemComment.

7. **Performance do listener global**: cada `task.updated` busca Automations no banco. Cache em memória por workspace com TTL 30s, invalidado no write da Automation.

8. **Real-time WebSocket** não existe hoje no projeto. Implementar com `@nestjs/platform-socket.io`. Sticky session/Redis adapter pra escalar horizontal.

9. **Trabalho TTT em paralelo**: Task Type Templates seguem em sprint próprio. Esse refator não toca neles, mas precisa garantir que a refatoração não quebra os builtins atuais (`order`, `stock-request`). Smoke test obrigatório no PR1.

10. **Quebra de integrações externas**: Kommo sync, ProFinanças. Auditar antes de PR3 quem bate em `/processes`, `/areas`, `/departments`. Notificar dono de integração.

11. **PATCH→PUT em todos os endpoints refatorados**: revisar consumidores externos. Frontend é controlado mas pode ter scripts internos com PATCH.

12. **Prefixo global `api/v1`**: confirmar `app.setGlobalPrefix('api/v1')`. Hoje pode estar sem prefixo em alguns módulos.

13. **TransformInterceptor (envelope `{ data, meta }`)**: hoje aplicado globalmente. Os endpoints novos estilo Hoppe não usam envelope. Solução: criar `@SkipResponseTransform()` decorator + ajustar `TransformInterceptor` para checar metadata do reflector. Aplicar nos controllers refatorados. Endpoints legados continuam com envelope. Documentar a exceção no `08-api.md` do standards.

14. **Conflito PATCH→PUT**: a tabela 728-736 do `99-referencia-completa.md` precisa receber uma anotação ou seção nova explicando a exceção dos endpoints Hoppe-style. Idealmente, adicionar nota no `08-api.md` e no `04-backend.md`.

---

## Verificação ponta a ponta

### Após PR 1
- `npx prisma migrate dev` sem erro
- Backfill: cada Space existente tem ≥ 1 SpaceMember owner via `SELECT COUNT(*) FROM space_members ... HAVING COUNT(*) = 0` retorna zero
- Build da API passa
- Os 2 builtins TTT atuais (`order`, `stock-request`) continuam visíveis em `GET /custom-task-types`

### Após PR 3
Smoke test seguindo exemplos do doc:
```
curl -X POST $API/api/v1/spaces -H "Authorization: Bearer $TOKEN" \
  -H "workspace-id: $WS" -H "Content-Type: application/json" \
  -d '{"name":"Demo"}'
```
Validar:
- 201 com `folders[]` (1 item) e `statuses[]` (4)
- `PUT /spaces/:id` atualiza, `DELETE` retorna `{ message }`
- `POST /spaces/:id/members` adiciona membro com permission válida
- `POST /comments` com `parentId` cria reply
- `POST /comments/:id/reactions` toggle adiciona e remove
- Endpoints antigos (`/departments`, `/areas`, etc) retornam 404

### Após PR 4
- `GET /ai/automation/triggers` retorna 18 itens
- `GET /ai/automation/actions` retorna 21 itens
- Criar Automation `TASK_CREATED → change_assignees` numa list, criar uma Task nessa list, validar que assignees são populados em < 5s
- Toggle ativo/inativo funciona

### Após PR 5
- Cenário: criar Order EM_ORCAMENTO → mudança de status no fluxo de pedido aciona Automations equivalentes às atividades antigas
- `SELECT COUNT(*) FROM process_instances` está zerado e tabela foi removida
- Listeners `order-cancelado` e `order-entregue` não tocam mais em ProcessInstance

### Após PR 6
- Login, navegar Departamento → Área → Processo → Tarefa
- Criar Automation via UI
- Receber notification em tempo real via WebSocket
- Trocar visibility, adicionar membro, reagir em comment, mencionar usuário

---

## Resumo executivo

6 PRs sequenciais, focados só em hierarquia + endpoints + Automation + WebSocket, sem inflar o escopo pra TaskTypeTemplates (que segue em sprint próprio).

- **PR1 — Schema**: rename Department→Space, Area→Folder, Process→List. Novos models: SpaceMember, FolderMember, ListMember, CommentReaction, Automation, WorkItemTimeEntry. Ajustes em WorkItemTag (spaceId), WorkItemLink (type), CustomFieldDefinition (4 escopos), CustomTaskType (spaceId), WorkItemComment (parentId, mentions).
- **PR2 — Refator interno**: services e repositories ajustados sem mudar paths de endpoint.
- **PR3 — Endpoints estilo Hoppe**: publica `/spaces, /folders, /lists, /tasks (+ /assignees, /assign, /subtasks, /tasks-activities), /comments (+ reactions), /views, /custom-fields, /spaces/:id/task-types, /checklist (singular), /tasks/:id/links (com type), /tags (+ /tags/task/:id), /attachments (R2 presigned 3-step), /tasks/:id/time-entries, /notifications`. Remove paths antigos.
- **PR4 — Automation**: módulo `/api/v1/ai/automation` completo (18 triggers, 21 actions, sem LLM).
- **PR5 — Migrar listeners e desligar motor BPMN**: substitui motor por Automations equivalentes via seed + remove `/bpm/runtime/*`.
- **PR6 — Frontend + WebSocket**: mundial-erp-web atualiza paths, mantém labels "Departamento/Área/Processo", adiciona UI de Automations e Socket.IO em `/notifications` e `/chat`.

Features descontinuadas no refator (Hoppe não tem): archive, watchers, dependencies (vira link com type), merge, time-in-status (substituído por time-entries). Order, ProductionOrder e demais entidades comerciais não são tocados aqui — o trabalho de TaskTypeTemplates evolui em paralelo (TTT-*).
