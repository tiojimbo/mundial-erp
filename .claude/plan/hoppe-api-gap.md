# Gap API: Hoppe x mundial-erp-api

Data: 2026-05-11
Origem: varredura via Playwright em https://hoppe.bravy.com.br + brute-force autenticado contra https://hoppe-api.bravy.com.br/api/v1 + leitura dos controllers em `mundial-erp-api/src/modules`.

Workspace de teste: `628d4237-4128-4ddd-8c82-cb2af20530de` (Hub), space `b9b7f96c-d5d0-4c4a-bd9b-a94fc41443c8` (Comercial), task `667f8fb3-...`, lista `c9fe82c7-...`, view `4a7abe6e-...`, channel `a10c5751-...`.

Conta: `fonog58917@bezill.com` (Logan, permission EDITOR).

---

## 1. Resumo executivo

A API do Hoppe e a do mundial-erp **convergem em ~70% da superfície de colaboração** (workspaces, spaces, folders, lists, tasks, views, comments, attachments, notifications, chat, automations, favorites, search). As divergências mais importantes não são "API faltando" — são **shape de resposta** e **contrato de multitenancy**:

1. **Multitenancy por header HTTP**. Hoppe exige `workspace-id: <uuid>` em quase tudo (sem header → 400 "Workspace ID not found in request"). ERP injeta `workspaceId` no JWT via `POST /workspaces/:id/select` e usa `WorkspaceGuard` (`src/modules/workspaces/guards/workspace.guard.ts:24`). Quem migrar do Hoppe vai esbarrar nisso.
2. **Shape de payloads diverge** em campos sutis: Hoppe `value`/`pluralName` em task-types (ERP já alinhado no response DTO `custom-task-types/dtos/custom-task-type-response.dto.ts:37,40`, mas a entidade Prisma ainda usa `name`/`namePlural`); `permission` direto no member (`EDITOR`/`FULL_EDIT`/`EDIT`); favorites agrupado por posição (`{TOP, SIDEBAR, BOTTOM}`); custom-fields já vem agrupado por escopo (`{list, folder, space, taskType}` — ERP idem).
3. **Falta no ERP**: `documents` (módulo inteiro), `gamification`, `calls/active`, `notifications/preferences`, `chat/channels/entity?type=&entityId=`, `workspaces/:id/channel-organization`, `workspaces/:id/my-permission`, `auth/google`, `/spaces/:id/resources` (no shape rico do Hoppe — descritor de filtros/colunas pra views), `tasks/:id/documents`, paginação envelope `{data, meta}` em vários endpoints.
4. **Falta no Hoppe (parece)**: tudo de ERP (orders, production-orders, separation-orders, accounts-receivable/payable, financial-categories, financial-summary, cash-registers, invoices, products, brands, suppliers, clients, sync, kommo, dashboards, reports, work-items, bpm/definitions). Hoppe é uma camada de colaboração só.

A direção correta NÃO é replicar Hoppe inteiro no ERP — é **alinhar o subconjunto de colaboração** pra que um front compatível com Hoppe consiga falar com o ERP, mantendo as features ERP-only intactas.

---

## 2. Inventário de endpoints — Hoppe

Tudo descoberto durante a sessão (HTTP 200 com `Authorization: Bearer` + header `workspace-id`).

### 2.1 Auth / Users

| Método | Path | Status | Observação |
|---|---|---|---|
| POST | `/api/v1/auth/login` | 200 | body `{email, password}`; resposta seta cookies `crm_token`, `crm_refresh_token`, `crm_workspace` |
| GET | `/api/v1/auth/google` | 200 | inicia OAuth Google |
| GET | `/api/v1/users/me` | 200 | `{id, email, name, avatar, role, sidebarWidth, createdAt, updatedAt}` |
| GET | `/api/v1/users` | 403 | só admin |

### 2.2 Workspaces

| Método | Path | Status | Observação |
|---|---|---|---|
| GET | `/api/v1/workspaces` | 200 | array de workspaces do usuário |
| GET | `/api/v1/workspaces/:id` | 200 | `{id, name, description, avatar, timezone, timeFormat, createdAt, updatedAt, creatorId, ...}` |
| GET | `/api/v1/workspaces/:id/users` | 200 | `{users: [{id, name, email, avatar, accepted, permission, canCreateViews, canManageTags, joinedAt}], meta?}` |
| GET | `/api/v1/workspaces/:id/my-permission` | 200 | `{permission, canCreateViews, canManageTags}` |
| GET | `/api/v1/workspaces/:id/sidebar-order` | 200 | retorna `null` se não setado |
| GET | `/api/v1/workspaces/:id/channel-organization` | 200 | retorna `null` se não setado |
| GET | `/api/v1/workspaces/:id/task-types` | 200 | task-types globais do workspace, shape `{id, value, pluralName, description, icon, spaceId, creatorId, createdAt, updatedAt, creator: {...}}` |

### 2.3 Spaces / Folders / Lists

| Método | Path | Status | Observação |
|---|---|---|---|
| GET | `/api/v1/spaces` | 200 | array |
| GET | `/api/v1/spaces/:id` | 200 | inclui folders inline |
| GET | `/api/v1/spaces/:id/members` | 200 | `[{id, spaceId, userId, permission: "FULL_EDIT"\|"EDIT", user: {...}}]` |
| GET | `/api/v1/spaces/:id/task-types` | 200 | task-types do space |
| GET | `/api/v1/spaces/:id/resources` | 200 | **27kb de descritor**: filtros disponíveis com operators, applicableTypes, columns visíveis, sort options — alimenta a UI de view builder |
| GET | `/api/v1/spaces/shared-with-me` | 200 | `{folders: [], lists: []}` |
| GET | `/api/v1/folders?spaceId=:id` | 200 | array |
| GET | `/api/v1/folders/:id` | 200 | objeto |
| GET | `/api/v1/lists?spaceId=:id` | 200 | array |
| GET | `/api/v1/lists?folderId=:id` | 200 | array |
| GET | `/api/v1/lists/:id` | 200 | com `folder.space` embed |

### 2.4 Tasks

| Método | Path | Status | Observação |
|---|---|---|---|
| GET | `/api/v1/tasks/:id` | 200 | rich task object |
| GET | `/api/v1/tasks/my-tasks` | 200 | `{overdue, dueToday, dueTomorrow, dueByDay: [{id, date, label, tasks}], noDueDate}` |
| GET | `/api/v1/tasks/space/:spaceId` | 200 | `[{list: {id, name, folder}, tasks: [...]}]` |
| GET | `/api/v1/tasks/list?viewId=:vid&level=space` | 200 | `[{list: {..., statuses: [...]}, tasks: [...]}]` |
| GET | `/api/v1/tasks/templates?listId=:id` | 200 | array |
| GET | `/api/v1/tasks/:id/links` | 200 | array |
| GET | `/api/v1/tasks/:id/time-entries` | 200 | array |
| GET | `/api/v1/tasks/:id/documents` | 200 | docs vinculados |
| GET | `/api/v1/tasks/:id/subtasks` | 200 | array |
| GET | `/api/v1/tasks/:id/assignees` | 200 | `[{id, user: {...}, permission, createdAt}]` |
| GET | `/api/v1/tasks-activities/:taskId` | 200 | activity feed: `[{data: {id, taskId, userId, action: "CREATED", metadata}, ...}]` |
| GET | `/api/v1/checklist/task/:taskId` | 200 | array |
| GET | `/api/v1/comments/task/:taskId` | 200 | array |

### 2.5 Views / Tags / Custom Fields

| Método | Path | Status | Observação |
|---|---|---|---|
| GET | `/api/v1/views?spaceId=:id` | 200 | array |
| GET | `/api/v1/views/:id` | 200 | rich: `{name, type: "LIST"\|"BOARD"\|..., listId, spaceId, folderId, grouping, groupByList, isDefault, closedTasks, closedSubTasks, subtaskListMode, collapsedListIds, showEmpty, columnConfig, sort, filters}` |
| GET | `/api/v1/tags?spaceId=:id` | 200 | array |
| GET | `/api/v1/custom-fields?spaceId=:id` | 200 | `{list, folder, space, taskType}` agrupado por escopo |
| GET | `/api/v1/custom-fields?listId=:id&taskTypeId=:id` | 200 | mesmo formato, filtrado pra contexto da task |

### 2.6 Chat

| Método | Path | Status | Observação |
|---|---|---|---|
| GET | `/api/v1/chat/channels` | 200 | `[{id, name, description, type: "PUBLIC"\|"PRIVATE"\|"DIRECT", workspaceId, spaceId, folderId, listId, taskId, createdById, ...}]` |
| GET | `/api/v1/chat/channels/:id` | 200 | objeto |
| GET | `/api/v1/chat/channels/:id/messages?limit=50` | 200 | `{messages: [{id, content, channelId, authorId, parentId, taskId, type: "TEXT", metadata, isEdited, ...}]}` |
| POST | `/api/v1/chat/channels/:id/read` | 201 | marca como lido |
| GET | `/api/v1/chat/channels/entity?type=space&entityId=:id` | 200 | resolve canal vinculado a uma entidade (space/list/folder/task) |

### 2.7 Notifications / Favorites / Search / Documents

| Método | Path | Status | Observação |
|---|---|---|---|
| GET | `/api/v1/notifications?page=1&limit=10` | 200 | `{notifications: [], meta: {total, page, limit, totalPages, hasNextPage, hasPreviousPage, filters: {workspaceId, sortBy, sortOrder}}}` |
| GET | `/api/v1/notifications/preferences` | 200 | `[{id, userId, type: "TASK_ASSIGNED"\|..., channels: ["IN_APP","EMAIL","PUSH"], enabled}]` |
| GET | `/api/v1/favorites` | 200 | `{TOP: [], SIDEBAR: [], BOTTOM: []}` agrupado por posição |
| GET | `/api/v1/search?q=:q` | 200 | `{results: [{id, entityType: "TASK"\|..., title, highlight, url, metadata, score}]}` |
| GET | `/api/v1/documents` | 200 | `{data: [...], meta: {...}}` (envelope paginado) |
| GET | `/api/v1/documents?limit=10&page=1` | 200 | idem |
| GET | `/api/v1/documents/:id` | 200 | objeto |

### 2.8 Outros

| Método | Path | Status | Observação |
|---|---|---|---|
| GET | `/api/v1/ai/automation?scopeType=SPACE&scopeId=:id` | 200 | array |
| GET | `/api/v1/calls/active?workspaceId=:id` | 200 | array de chamadas ativas no workspace |
| GET | `/api/v1/gamification/leaderboard` | 200 | `{data: [{rank, user, badgeCount, lastAwardedAt}]}` |
| GET | `/api/v1/gamification/users/:userId/badges` | 200 | array |
| GET | `/api/v1/api-keys` | 403 | só admin |
| GET | `/api/v1/health` | 200 | público |

### 2.9 Multitenancy — observação crítica

Todas as rotas retornam `400 BadRequestException: "Workspace ID not found in request"` se o header `workspace-id: <uuid>` não for enviado, exceto:
- `/api/v1/auth/*`, `/api/v1/users/me`, `/api/v1/workspaces`, `/api/v1/workspaces/:id`, `/api/v1/workspaces/:id/users`, `/api/v1/chat/channels`, `/api/v1/chat/channels/:id`, `/api/v1/chat/channels/:id/messages`, `/api/v1/gamification/*`, `/api/v1/calls/active?workspaceId=`, `/api/v1/health`.

Conclusão: o **header `workspace-id`** é o vetor canônico de contexto multitenant no Hoppe. JWT carrega só o usuário.

---

## 3. Inventário de endpoints — mundial-erp-api (subconjunto colaboração)

Lista as rotas relevantes pra comparação (ignora ERP-only: orders, production, financeiro, products, etc).

### 3.1 Auth (`src/modules/auth/auth.controller.ts`)
| Método | Path | Linha |
|---|---|---|
| POST | `/api/v1/auth/register` | 30 |
| POST | `/api/v1/auth/login` | 40 |
| POST | `/api/v1/auth/refresh` | 51 |
| POST | `/api/v1/auth/logout` | 65 |
| GET | `/api/v1/auth/me` | 77 |

Falta: `GET /auth/google` (OAuth Google).

### 3.2 Users (`src/modules/users/users.controller.ts`)
POST, GET, PUT/PATCH `me`, GET `:id`, PUT/PATCH `:id`, DELETE `:id`. Faltam endpoints adicionais (`/users/me/preferences`, `/users/me/avatar`) — Hoppe não expõe rotas dedicadas pra isso, então sem ação.

### 3.3 Workspaces (`src/modules/workspaces/workspaces.controller.ts`)
| Método | Path | Linha |
|---|---|---|
| POST | `/api/v1/workspaces` | 46 |
| GET | `/api/v1/workspaces` | 57 |
| GET | `/api/v1/workspaces/:id` | 70 |
| PUT/PATCH | `/api/v1/workspaces/:id` | 79-80 |
| DELETE | `/api/v1/workspaces/:id` | 92 |
| POST | `/api/v1/workspaces/:id/select` | 101 |
| GET | `/api/v1/workspaces/:id/seats` | 118 |
| GET/PUT | `/api/v1/workspaces/:id/sidebar-order` | 127, 138 |

Faltam: `GET /workspaces/:id/my-permission`, `GET /workspaces/:id/channel-organization`, `GET /workspaces/:id/task-types` (a Hoppe expõe direto no workspace; ERP tem só via `/custom-task-types` ou `/spaces/:id/task-types`).

Members em `src/modules/workspaces/members/members.controller.ts`: GET/POST/PATCH/DELETE. OK.
Invites em `src/modules/workspaces/invites/invites.controller.ts`: GET/POST + `/join/:token` + DELETE. OK.

### 3.4 Spaces / Folders / Lists (`src/modules/bpm/definitions/`)
Spaces em `src/modules/bpm/definitions/spaces/spaces.controller.ts:33`:
- POST `/spaces`, GET `/spaces`, GET `/spaces/shared-with-me`, GET `/spaces/sidebar`, GET `/spaces/by-slug/:slug`, GET `:id/process-summaries`, GET `:id/resources`, GET/POST `:id/members`, PUT/DELETE `:id/members/:userId`, GET/PUT `:id/visibility`, GET/PUT/DELETE `:id`

Folders em `src/modules/bpm/definitions/folders/folders.controller.ts:32`: estrutura similar a spaces.

Lists em `src/modules/bpm/definitions/lists/lists.controller.ts:32`: POST, GET (com query), `:id/resources`, `:id/visibility`, `:id/members`, GET/PUT/DELETE `:id`.

Faltam: `GET /folders?spaceId=`, `GET /lists?spaceId=&folderId=` (filtros via query — Hoppe usa). Verificar se `@Get()` desses controllers já aceita os queries.

### 3.5 Tasks (`src/modules/tasks/tasks.controller.ts`)
| Método | Path | Linha |
|---|---|---|
| GET | `/api/v1/tasks` | 56 |
| GET | `/api/v1/tasks/space/:spaceId` | 63 |
| DELETE | `/api/v1/tasks/:taskId/assignees/:userId` | 78 |
| PUT | `/api/v1/tasks/:taskId/assign` | 97 |
| GET | `/api/v1/tasks/:taskId/assignees` | 114 |
| GET | `/api/v1/tasks/:taskId/subtasks` | 129 |
| GET | `/api/v1/tasks/my-tasks` | 141 |
| GET | `/api/v1/tasks/list` | 161 |
| POST | `/api/v1/tasks` | 191 |
| GET | `/api/v1/tasks/:taskId` | 209 |
| PUT | `/api/v1/tasks/:taskId` | 228 |
| DELETE | `/api/v1/tasks/:taskId` | 242 |

Tem `tasks/sse/tasks-events.controller.ts` (SSE realtime).

Faltam: `GET /tasks/templates?listId=`, `GET /tasks/:id/documents`. Hoppe expõe — ERP usa `/task-templates` + `/attachments` em rotas diferentes.

### 3.6 Task complements
| Módulo | Path | Arquivo:linha |
|---|---|---|
| Checklists | `/checklist/task/:taskId` (GET/POST), `/checklist/:id` (PUT/DELETE), `/checklist/:id/item/:itemId`... | `src/modules/task-checklists/task-checklists.controller.ts:42-121` |
| Links | `/tasks/:taskId/links` (CRUD) | `src/modules/task-links/task-links.controller.ts:35-63` |
| Tags | `/tags` (CRUD), `/tags/task/:taskId/:tagId` | `src/modules/task-tags/task-tags.controller.ts:42-101` |
| Comments | `/comments/task/:taskId`, `/comments/:id`, `/comments/:id/reactions` | `src/modules/task-comments/task-comments.controller.ts:41-108` |
| Attachments | `/attachments/presigned-url`, `/attachments/signed-url`, `/attachments/tasks/:id`, `/attachments/task/:id`, `/attachments/:id/download-url` | `src/modules/task-attachments/task-attachments.controller.ts:41-148` |
| Time-entries | `/tasks/:taskId/time-entries`, `/start`, `/:entryId/stop` | `src/modules/time-entries/time-entries.controller.ts:33-73` |
| Templates | `/task-templates` (CRUD), `/task-templates/:id/snapshot`, `/processes/:processId/task-templates/:templateId/instances` | `src/modules/task-templates/task-templates.controller.ts:50-130` |
| TT-templates | `/task-type-templates`, `/:customTaskTypeId` | `src/modules/task-type-templates/task-type-templates.controller.ts:37-54` |
| Activities | `/tasks-activities/:taskId` | `src/modules/task-activities/task-activities.controller.ts:22` |

### 3.7 Custom Task Types
- Global: `src/modules/custom-task-types/custom-task-types.controller.ts:40` — `/custom-task-types` (CRUD)
- Scoped: `src/modules/custom-task-types/space-task-types.controller.ts:29` — `/spaces/:spaceId/task-types` (CRUD)
- DTO de response já usa `value`/`pluralName` (`custom-task-type-response.dto.ts:37,40`).

Faltam: `GET /workspaces/:id/task-types` (lista global no scope do workspace — Hoppe expõe).

### 3.8 Custom Fields
- `src/modules/custom-fields/custom-field-definitions.controller.ts:30` — `/custom-fields` (CRUD); **GET retorna agrupado `{list, folder, space, taskType}` igual Hoppe**.
- Values: `src/modules/custom-fields/custom-field-values.controller.ts:25` — `/tasks/:taskId/custom-fields`, PUT `:definitionId`.

Problema: `GET /custom-fields` no ERP NÃO aceita `?spaceId=` nem `?listId=&taskTypeId=` — retorna agrupado mas com TODOS os fields do workspace. Hoppe filtra por scope na query.

### 3.9 Views (`src/modules/views/views.controller.ts:31`)
POST, GET (com query), GET `:id`, PUT `:id`, PUT/PATCH `:id/pin`, DELETE `:id`.

Verificar shape do view (filters, grouping, columns) — Hoppe tem JSON rico, ERP precisa ter o mesmo.

### 3.10 Chat (`src/modules/chat/`)
- Channels: `src/modules/chat/channels/channels.controller.ts:36` — `/chat/channels` (CRUD), `/location`, `/direct-message`, `:id/followers`, `:id/members`, `:id/follow`, `:id/close`, `:id/open`, `:id/read`
- Messages: `src/modules/chat/messages/messages.controller.ts:31` — `/chat/channels/:channelId/messages` (POST/GET), `/chat/messages/:id` (CRUD, replies, tagged-users)
- Reactions: `src/modules/chat/reactions/reactions.controller.ts:26` — `/chat/messages/:messageId/reactions`
- Gateway WS: `src/modules/chat/gateway/chat.gateway.ts:23` — namespace `/chat`

Falta: **`GET /chat/channels/entity?type=&entityId=`** — Hoppe usa pra resolver canal vinculado a space/list/folder/task. ERP tem `POST /chat/channels/location` mas com semântica diferente (cria canal vinculado).

### 3.11 Notifications (`src/modules/notifications/notifications.controller.ts:27`)
GET, POST `read-all`, `clear-all`, `delete-all-cleared`, POST `:id/read`, `:id/unread`, `:id/clear`, `:id/unclear`, `:id/snooze`, `:id/unsnooze`, DELETE `:id`.

Gateway WS: `src/modules/realtime/notifications.gateway.ts:17` — namespace `/notifications`.

Falta: **`GET /notifications/preferences`** (Hoppe expõe; permite ligar/desligar canais por tipo de evento — TASK_ASSIGNED, COMMENT_MENTION etc.).

### 3.12 Favorites (`src/modules/favorites/favorites.controller.ts:30`)
GET `/favorites`, `/favorites/spaces`, `/favorites/check/:type/:id`, POST, DELETE.

Shape ERP: provavelmente lista flat. Hoppe agrupa por `{TOP, SIDEBAR, BOTTOM}` (posição). Refatorar response.

### 3.13 Search (`src/modules/search/search.controller.ts:20`)
GET, POST `reindex`, GET `health`. Compatível com Hoppe na surface — verificar shape de response (`{results: [{id, entityType, title, highlight, url, metadata, score}]}`).

### 3.14 Automations (`src/modules/automations/automations.controller.ts:33`)
Prefixo `ai/automation`. GET `triggers`, `actions`, `statuses`, GET (lista), GET `:id`, POST, PUT `:id`, DELETE `:id`, POST `:id/toggle`.

Hoppe usa `GET /ai/automation?scopeType=SPACE&scopeId=:id` (filtro por scope). Verificar se ERP suporta esses queries em `GET ()` linha 61.

### 3.15 Audit-Logs (`src/modules/audit-log/audit-log.controller.ts:11`)
GET `/audit-logs`, GET `/audit-logs/entity/:entity/:entityId`. Hoppe não expõe equivalente público.

### 3.16 Work-Items (`src/modules/work-items/work-items.controller.ts:36`)
Módulo ERP-só (vinculado a fluxos BPM). Hoppe não tem.

### 3.17 Faltam módulos inteiros vs Hoppe
- `documents` (módulo): Hoppe `/api/v1/documents` (CRUD + envelope paginado). **Não existe controller `documents` no ERP**.
- `gamification`: badges + leaderboard. Não existe no ERP.
- `calls`: `/calls/active?workspaceId=` (videoconferência ativa). Não existe.
- `api-keys`: Hoppe expõe (admin). Não existe controller no ERP.

---

## 4. Tabela de paridade — Hoppe vs ERP

Legenda: 🟢 igual / compatível · 🟡 existe nos dois mas shape diverge · 🔴 ERP não tem · ⚫ ERP-only / fora do Hoppe.

### Colaboração (foco do alinhamento)

| Hoppe endpoint | ERP equivalente | Status | Ação |
|---|---|---|---|
| POST `/auth/login` | POST `/auth/login` | 🟢 | nenhuma |
| GET `/auth/google` | (nada) | 🔴 | **Implementar OAuth Google** |
| GET `/users/me` | GET `/auth/me` + GET `/users/me`? | 🟡 | conferir paridade |
| GET `/workspaces` | GET `/workspaces` | 🟢 | nenhuma |
| GET `/workspaces/:id` | GET `/workspaces/:id` | 🟢 | nenhuma |
| GET `/workspaces/:id/users` envelope `{users}` | GET `/workspaces/:id/members` | 🟡 | **Renomear ou criar alias `/users` retornando `{users: [...]}` com `permission`/`canCreateViews`/`canManageTags`** |
| GET `/workspaces/:id/my-permission` | (nada) | 🔴 | **Implementar** — retorna permissão do user logado naquele ws |
| GET `/workspaces/:id/sidebar-order` | GET `/workspaces/:id/sidebar-order` | 🟢 | nenhuma |
| GET `/workspaces/:id/channel-organization` | (nada) | 🔴 | **Implementar** — estrutura de organização do sidebar de canais |
| GET `/workspaces/:id/task-types` | GET `/custom-task-types` | 🟡 | **Adicionar rota `/workspaces/:id/task-types` ou aceitar `?workspaceId` no `/custom-task-types`** |
| GET `/spaces` | GET `/spaces` | 🟢 | nenhuma |
| GET `/spaces/:id` | GET `/spaces/:id` | 🟢 | nenhuma |
| GET `/spaces/:id/members` | GET `/spaces/:id/members` | 🟢 | nenhuma (verificar permission enum `FULL_EDIT`/`EDIT`) |
| GET `/spaces/:id/task-types` | GET `/spaces/:id/task-types` | 🟢 | já existe (`space-task-types.controller.ts:33`) |
| GET `/spaces/:id/resources` (descritor de filtros + columns) | GET `/spaces/:id/resources` (BPM) | 🟡 | **Verificar shape — Hoppe retorna 27kb de metadata de filtros, operators, applicableTypes, columns disponíveis pra view builder. Provavelmente ERP retorna outra coisa.** |
| GET `/spaces/shared-with-me` | GET `/spaces/shared-with-me` | 🟢 | nenhuma |
| GET `/folders?spaceId=` | GET `/folders` (com filtros?) | 🟡 | **Garantir que `@Get()` aceita `?spaceId=`** |
| GET `/folders/:id` | GET `/folders/:id` | 🟢 | nenhuma |
| GET `/lists?spaceId=` ou `?folderId=` | GET `/lists` (com filtros?) | 🟡 | **Garantir queries** |
| GET `/lists/:id` | GET `/lists/:id` | 🟢 | nenhuma |
| GET `/tasks/:id` | GET `/tasks/:taskId` | 🟢 | nenhuma |
| GET `/tasks/my-tasks` | GET `/tasks/my-tasks` | 🟢 | verificar shape `{overdue, dueToday, ...}` |
| GET `/tasks/space/:spaceId` | GET `/tasks/space/:spaceId` | 🟢 | nenhuma |
| GET `/tasks/list?viewId=&level=` | GET `/tasks/list` | 🟢 | verificar query params |
| GET `/tasks/templates?listId=` | GET `/task-templates` | 🟡 | **Alias ou aceitar `?listId=`** |
| GET `/tasks/:id/links` | GET `/tasks/:taskId/links` | 🟢 | nenhuma |
| GET `/tasks/:id/time-entries` | GET `/tasks/:taskId/time-entries` | 🟢 | nenhuma |
| GET `/tasks/:id/documents` | (nada — só attachments) | 🔴 | **Implementar — link de documents à task** |
| GET `/tasks/:id/subtasks` | GET `/tasks/:taskId/subtasks` | 🟢 | nenhuma |
| GET `/tasks/:id/assignees` | GET `/tasks/:taskId/assignees` | 🟢 | nenhuma |
| GET `/tasks-activities/:id` | GET `/tasks-activities/:taskId` | 🟢 | nenhuma |
| GET `/checklist/task/:id` | GET `/checklist/task/:taskId` | 🟢 | nenhuma |
| GET `/comments/task/:id` | GET `/comments/task/:taskId` | 🟢 | nenhuma |
| GET `/views?spaceId=` | GET `/views` | 🟡 | conferir query |
| GET `/views/:id` | GET `/views/:id` | 🟢 | **conferir shape JSON rico (grouping, columns, filters, sort)** |
| GET `/tags?spaceId=` | GET `/tags` | 🟡 | conferir query |
| GET `/custom-fields?spaceId=` | GET `/custom-fields` (workspace flat) | 🟡 | **Aceitar `?spaceId=`, `?listId=&taskTypeId=`** (`custom-field-definitions.controller.ts:34-42`) |
| GET `/chat/channels` | GET `/chat/channels` | 🟢 | nenhuma |
| GET `/chat/channels/:id` | GET `/chat/channels/:channelId` | 🟢 | nenhuma |
| GET `/chat/channels/:id/messages` | GET `/chat/channels/:channelId/messages` | 🟢 | nenhuma |
| POST `/chat/channels/:id/read` | POST `/chat/channels/:channelId/read` | 🟢 | nenhuma |
| GET `/chat/channels/entity?type=&entityId=` | (`POST /chat/channels/location`) | 🔴 | **Implementar GET pra resolver canal por entidade** |
| GET `/notifications` envelope `{notifications, meta}` | GET `/notifications` | 🟡 | **Conferir envelope** |
| GET `/notifications/preferences` | (nada) | 🔴 | **Implementar** |
| GET `/favorites` `{TOP, SIDEBAR, BOTTOM}` | GET `/favorites` | 🟡 | **Refatorar shape pra agrupar por posição** |
| GET `/search?q=` | GET `/search` | 🟡 | conferir shape `{results: [{entityType, highlight, url, score}]}` |
| GET `/documents` | (nada) | 🔴 | **Implementar módulo documents** |
| GET `/ai/automation?scopeType=&scopeId=` | GET `/ai/automation` | 🟡 | **Adicionar filtros de scope** |
| GET `/calls/active?workspaceId=` | (nada) | 🔴 | implementar (baixa prioridade) |
| GET `/gamification/leaderboard` | (nada) | 🔴 | implementar (baixa prioridade) |
| GET `/gamification/users/:id/badges` | (nada) | 🔴 | implementar (baixa prioridade) |

### Multitenancy

| Hoppe | ERP | Ação |
|---|---|---|
| Header `workspace-id: <uuid>` obrigatório | JWT.workspaceId via `POST /workspaces/:id/select` + `WorkspaceGuard` | **Decisão**: aceitar header `workspace-id` como override do JWT no `WorkspaceGuard`. Mantém retrocompatibilidade do JWT-only e libera o front a trocar workspace sem reauth. Tocar em `workspace.guard.ts:73-81` pra ler `request.headers['workspace-id']` primeiro. |

### ERP-only (não tem no Hoppe)
Todos esses ficam intactos — Hoppe não tem nada equivalente: orders, production-orders, separation-orders, accounts-receivable, accounts-payable, financial-categories, financial-summary, cash-registers, invoices, products, brands, suppliers, clients, sync, kommo, dashboards, reports, work-items, bpm/definitions (activities, handoffs, sectors, workflow-statuses, tasks BPM).

---

## 5. Plano priorizado — implementar / refatorar

Ordem por impacto em compatibilidade de front e dependências técnicas.

### Sprint A — Multitenancy e shape de respostas críticas

| # | Tarefa | Arquivo:linha | Tipo |
|---|---|---|---|
| A.1 | Aceitar header `workspace-id` no `WorkspaceGuard` (override do JWT). Validar membership igual ao JWT path. | `src/modules/workspaces/guards/workspace.guard.ts:73-81` | refatorar |
| A.2 | Idem no `WorkspaceId` decorator (preferência: header → JWT → throw). | `src/modules/workspaces/decorators/workspace-id.decorator.ts:12-22` | refatorar |
| A.3 | Adicionar `GET /workspaces/:id/my-permission` retornando `{permission, canCreateViews, canManageTags}` do user logado naquele ws. | `src/modules/workspaces/workspaces.controller.ts` (novo método) | implementar |
| A.4 | Renomear / adicionar alias `GET /workspaces/:id/users` retornando envelope `{users: [...]}` com `permission, canCreateViews, canManageTags`. | `src/modules/workspaces/members/members.controller.ts:34` | refatorar |
| A.5 | Aceitar `?spaceId=`, `?listId=&taskTypeId=` em `GET /custom-fields` (filtragem antes de agrupar). | `src/modules/custom-fields/custom-field-definitions.controller.ts:34-42`, `custom-field-definitions.service.ts:44` | refatorar |
| A.6 | Confirmar/garantir que `GET /folders`, `GET /lists`, `GET /views`, `GET /tags` aceitam `?spaceId=` e `?folderId=`. | `src/modules/bpm/definitions/folders/folders.controller.ts:50`, `lists/lists.controller.ts:50`, `src/modules/views/views.controller.ts:43`, `src/modules/task-tags/task-tags.controller.ts:42` | conferir |
| A.7 | `GET /favorites` agrupar resposta em `{TOP, SIDEBAR, BOTTOM}` por campo `position` (ou similar). | `src/modules/favorites/favorites.controller.ts:35`, service correspondente | refatorar |
| A.8 | `GET /notifications` envelopar como `{notifications: [], meta: {total, page, limit, totalPages, hasNextPage, hasPreviousPage, filters}}`. | `src/modules/notifications/notifications.controller.ts:31` | refatorar |

### Sprint B — Módulos novos e endpoints faltantes

| # | Tarefa | Arquivo a criar | Tipo |
|---|---|---|---|
| B.1 | Implementar `GET /workspaces/:id/channel-organization` (e PUT pra persistir). Persistência: campo `channelOrganization` JSON em `Workspace` ou tabela própria. | `src/modules/workspaces/workspaces.controller.ts` + service + Prisma migration | implementar |
| B.2 | Implementar `GET /notifications/preferences` (lista por user) e `PUT /notifications/preferences/:id` (toggle por type+channel). Schema novo: `NotificationPreference {userId, type, channels[], enabled}`. | `src/modules/notifications/preferences.controller.ts` (novo) + Prisma | implementar |
| B.3 | Implementar `GET /chat/channels/entity?type=space&entityId=` (resolve canal vinculado a entidade). Reusa lógica de `/chat/channels/location`. | `src/modules/chat/channels/channels.controller.ts` (novo método) | implementar |
| B.4 | Implementar `GET /workspaces/:id/task-types` (alias agregador dos TT do workspace + spaces). | `src/modules/custom-task-types/custom-task-types.controller.ts` + nova rota workspace-scoped | implementar |
| B.5 | Implementar `GET /tasks/:id/documents` (relação Task ↔ Document). Requer módulo Documents (B.6). | `src/modules/tasks/tasks.controller.ts` (novo método) | implementar |
| B.6 | **Novo módulo Documents**: `/documents` (GET lista paginada `{data, meta}`, GET `:id`, POST, PUT `:id`, DELETE `:id`). Tabela `Document {id, name, workspaceId, spaceId?, folderId?, listId?, isGlobal, visibility, creatorId, content?, ...}`. | `src/modules/documents/*` (novo) + Prisma migration | implementar |
| B.7 | `GET /tasks/templates?listId=` — alias ou rota nova consumindo `task-templates` service. | `src/modules/task-templates/task-templates.controller.ts` (novo método) | implementar |
| B.8 | `GET /ai/automation` aceitar `?scopeType=SPACE&scopeId=:id` e filtrar. | `src/modules/automations/automations.controller.ts:61` | refatorar |
| B.9 | Garantir shape rico de `GET /views/:id`: `{grouping, groupByList, isDefault, closedTasks, closedSubTasks, subtaskListMode, collapsedListIds, showEmpty, columnConfig, sort, filters}`. Comparar com DTO atual. | `src/modules/views/dtos/...` | refatorar |
| B.10 | Shape de `GET /spaces/:id/resources` no padrão Hoppe (descritor de filtros, operators, applicableTypes, columns disponíveis pra view builder). | `src/modules/bpm/definitions/spaces/spaces.controller.ts:115` + service | refatorar (grande) |

### Sprint C — Auth e OAuth

| # | Tarefa | Arquivo | Tipo |
|---|---|---|---|
| C.1 | OAuth Google (`GET /auth/google`, `GET /auth/google/callback`). Usar `@nestjs/passport` + `passport-google-oauth20`. | `src/modules/auth/auth.controller.ts` + estratégia nova | implementar |
| C.2 | 2FA (TOTP + SMS) — Hoppe expõe na UI. Verificar se /api/v1/auth/2fa/* deveria existir. | `src/modules/auth/2fa/*` (novo) | implementar (opcional) |

### Sprint D — Endpoints secundários

| # | Tarefa | Tipo |
|---|---|---|
| D.1 | `GET /calls/active?workspaceId=` — stub retornando `[]` se não houver feature de chamadas. | implementar (stub) |
| D.2 | `GET /gamification/leaderboard`, `GET /gamification/users/:userId/badges` — módulo novo. | implementar |
| D.3 | `GET /api-keys` — admin only. Já tem suporte parcial? Verificar. | implementar |

### Sprint E — Validação e contrato

| # | Tarefa | Tipo |
|---|---|---|
| E.1 | OpenAPI/Swagger expor publicamente em `/api/v1/docs-json` (Hoppe não expõe; mas é boa prática pro front sincronizar tipagem). | refatorar |
| E.2 | Validar membership do space no service de custom-task-types antes de criar/listar TT scoped (conforme decisão prévia). | refatorar |
| E.3 | Padronizar `permission` enum entre member/assignee: `FULL_EDIT`/`EDIT` em members vs `EDIT` em assignees vs `EDITOR` em workspace users. Definir taxonomia única. | refatorar |

---

## 6. Riscos / pontos de atenção

1. **Header `workspace-id` x JWT.workspaceId**: aceitar ambos pode introduzir bug se o front mandar header inconsistente com JWT (ataque ou erro). O guard precisa validar membership do user no workspace do header. Cache de membership já existe (`workspace.guard.ts:114-148`).
2. **Migração de shape de `favorites` e `notifications`**: vai quebrar clientes atuais do ERP — coordenar com o front antes do release.
3. **Módulo Documents**: precisa decisão sobre persistência do conteúdo (rich text? markdown? Lexical/Slate JSON?). Hoppe parece usar HTML/Lexical. Verificar antes de criar schema.
4. **Spaces/:id/resources rico**: implementar como descritor estático no service (lista de filtros + operators) ou dinâmico (baseado em custom-fields/views existentes)? Hoppe parece estático.
5. **Compat com Hoppe não é objetivo final** — só vale alinhar onde houver intenção de reusar front ou onboarding de usuários ex-Hoppe.

---

## 7. Próximos passos sugeridos

1. Aprovar este gap analysis.
2. Confirmar prioridade: Sprint A primeiro (multitenancy + shapes críticos) ou Sprint B (módulos novos)?
3. Decidir se quer manter `workspace-id` header **e** `POST /workspaces/:id/select`, ou só header (mais simples, quebra usuários atuais).
4. Decidir escopo do módulo Documents: rich text storage vs link externo (Google Docs etc.).
