# PLANO-KOMMO-DASHBOARD

> Plano formal para implementação da integração Kommo + Dashboard "Analytics Comercial" no Mundial ERP.

---

## Contexto

**Por que:** o cliente do Mundial ERP gerencia operação comercial no **Kommo** (CRM externo) e precisa de um painel dentro do ERP com métricas comerciais em tempo-quase-real (≤10s de latência entre evento no Kommo e número atualizado no dashboard) — reproduzindo as 17 visualizações de referência (KPIs de conversas/mensagens/leads, distribuições por status/departamento/agente, horários de pico, performance por atendente).

**O que prompta a mudança:** os dados que alimentam o dashboard estão fora do ERP. Sem pipeline de replicação Kommo→banco local, não há como alimentar o query engine já especificado em [squad-dashboards.mdc](../skills/squad-dashboards.mdc) nem atingir a latência pedida (cron-only daria delay incompatível; webhook-only perderia eventos em falhas de entrega).

**Resultado esperado:** pipeline webhook-primary + cron-secondary de reconciliação, 11 models Prisma replicando entidades Kommo, 4 adapters no query engine, dashboard "Analytics Comercial" seedado, rollout per-workspace via feature flag, SLIs Grafana, zero regressão em features existentes.

**Squads envolvidos:**
- `squad-kommo` (recém-criado em [squad-kommo.mdc](../skills/squad-kommo.mdc)) — dono do pipeline e dos adapters
- `squad-dashboards` — consome os adapters (coordenação com Thales Rocha)
- `squad-fe-dashboards` — renderiza os cards
- `squad-infra` / `squad-auth` / `squad-workspace` — dependências transversais

---

## 0. Índice

1. Objetivo, escopo, conformidade com standards e não-objetivos
   - 1.1 Objetivo
   - 1.2 Escopo Fase MVP
   - 1.3 Escopo Fase 2
   - 1.4 **Conformidade com 99-referencia-completa.md** (regras invioláveis, stack, nomenclatura)
   - 1.5 Não-objetivos
2. ADRs fundadores (6 ADRs: 004-009)
3. Análise do estado atual (greenfield + infra reusável)
4. Mapeamento de domínio (Kommo → entidades próprias)
5. Modelo de dados Prisma
   - 5.0 **Padrão de campos base** (id/createdAt/updatedAt/deletedAt)
   - 5.1 Enums
   - 5.2 Tabelas (11)
6. Estrutura de módulos backend (padrão controller/service/repository/dto)
7. Contrato de endpoints (envelope `{data, meta}` padrão)
8. Regras de negócio (sync, idempotência, reconciliação, auth dual, Logger/ConfigService/Throttler)
9. Observabilidade e SLIs
10. UI — 17 cards de referência
11. Estrutura frontend (features/kommo/ + dashboards/kommo-dashboard/)
12. Telas e rotas
13. Backlog ordenado por Sprints (respeitando ordem-de-14-passos do standard)
14. Estratégia de testes (`*.spec.ts` unit + `*.e2e-spec.ts` E2E)
15. Plano de migração e rollback
16. Riscos e mitigações
17. Checklist de aprovação
18. Critical files to modify (referência operacional)
19. Verification (end-to-end)

---

## 1. Objetivo, escopo e não-objetivos

### 1.1 Objetivo
Entregar dashboard **"Analytics Comercial"** dentro do Mundial ERP, alimentado por dados replicados do Kommo em tempo-quase-real (latência webhook→banco p95 ≤ 10s; latência banco→card p95 ≤ 400ms cache hit).

### 1.2 Escopo — Fase MVP (Sprints 1-4)
- Autenticação dual Kommo: **OAuth2** (produção) + **long-lived integration token** (dev/fallback).
- 1 conta Kommo por workspace, **N pipelines** replicados por conta.
- Webhook receiver `POST /webhooks/kommo/:workspaceId` com HMAC + idempotência, response ≤100ms.
- Worker BullMQ processando 10+ tipos de evento (chat, mensagens, leads, responsáveis).
- 3 crons de reconciliação (5min / hourly / daily) idempotentes.
- Backfill histórico de 90 dias, idempotente, retomável.
- 11 models Prisma (replica + auxiliares).
- 4 adapters no query engine do squad-dashboards: `kommoConversations`, `kommoMessages`, `kommoLeads`, `kommoAgents` — com `pipelineId` na whitelist de field.
- **8 cards MVP** no dashboard: Conversas em Aberto, Sem Responsável, Resolvidas Hoje, Tempo Médio de Resposta, Taxa de Resolução, Mensagens Hoje, Leads Hoje, Total Resolvidas.
- Feature flag `KOMMO_SYNC_ENABLED` por workspace + `KOMMO_DASHBOARD_ENABLED` por workspace.
- Rollout canary → 10% → 50% → 100%.

### 1.3 Escopo — Fase 2 (Sprints 5-6)
- 9 cards restantes: Iniciadas Hoje, Tempo de Resolução, Resposta Rápida, Leads na Semana, Conversas - Últimos 7 Dias (LINE_CHART), Mensagens - Últimos 7 Dias (LINE_CHART), Conversas por Status (DONUT), Por Departamento (BAR_CHART horizontal), Performance (2 ring-gauges), Performance por Atendente (BAR_CHART), Horários de Pico (BAR_CHART), Conversas por Responsável (BAR_CHART horizontal ranking).
- Novo CardType **`GAUGE`** (ring-progress) — RFC coordenado com squad-dashboards + squad-fe-dashboards.
- Filtro global por `pipelineId` no dashboard (DashboardFilter).
- `KommoMetricSnapshot` pré-agregado para KPIs caros (evitar `COUNT(*)` em 1M+ rows).

### 1.4 Conformidade com `99-referencia-completa.md`

Este plano segue integralmente os padrões Bravy em `.claude/standards/99-referencia-completa.md`.

**Regras invioláveis aplicadas (1-14):**
1. Padronização > velocidade — todos os módulos `kommo-*` seguem o template `controller + service + repository + dto/`
2. Cada camada no seu quadrado — Controller delega; Service orquestra; Repository persiste via Prisma
3. Zero `any` — DTOs Kommo tipados; payload de webhook validado via class-validator com `@IsIn` em enums
4. Zero `console.log` — **exclusivamente `Logger` do NestJS** em `KommoApiClient`, workers, crons, handlers
5. Zero lógica no Controller — `kommo-webhooks.controller.ts` só valida HMAC + enqueue; `kommo-accounts.controller.ts` só delega
6. Zero Prisma direto no Service — todas as queries via `*.repository.ts`
7. Zero query sem paginação — `GET /kommo/accounts` e `GET /kommo/pipelines` usam `PaginationDto` (`page/limit≤100`, default 20)
8. N/A senhas em plaintext — `accessToken`/`refreshToken`/`hmacSecret` usam **envelope encryption** (ADR-006)
9. Zero `process.env` direto — segredos acessados via `ConfigService` + validação Zod na inicialização
10. Soft delete por padrão — **todos os models de domínio** carregam `deletedAt DateTime? @map("deleted_at")`. Models operacionais (`KommoWebhookEvent`, `KommoSyncCheckpoint`, `KommoMetricSnapshot`) usam hard delete via purge cron
11. Envelope obrigatório — responses `/kommo/*` retornam `{ data, meta }` via `TransformInterceptor` global. Webhook `/webhooks/kommo/*` é **exceção documentada**
12. Validação obrigatória — `class-validator` (back) + `Zod` (front)
13. Named exports — zero `export default` em componentes
14. Server Components por padrão — interativos usam `'use client'`

**Stack aderente:**
- Backend: NestJS, Prisma, `class-validator`, `@nestjs/throttler`, `@nestjs/schedule`, BullMQ, Redis, `ConfigService`, `Logger`
- Frontend: Next.js App Router, React Query, Zustand, Axios, Zod + React Hook Form, shadcn/ui, Tailwind

**Nomenclatura (cheat-sheet aplicado):**
- Arquivos TS: `kebab-case.sufixo.ts` (ex: `kommo-api-client.service.ts`, `kommo-event-processor.worker.ts`)
- Models Prisma: PascalCase singular; `@@map` snake_case plural; `@map` snake_case em colunas
- Enums: `PascalCase` com valores `UPPER_SNAKE_CASE`
- Endpoints: `/api/v1/kommo/*` + kebab-case; query params `camelCase`
- Testes: `*.spec.ts` (unit) + `*.e2e-spec.ts` (E2E)
- Branches: `feat/kommo-001-foundations`, `hotfix/kommo-hmac-bypass`
- Commits: Conventional Commits (`feat(kommo): add webhook receiver`)

**Arquitetura de request (fluxo completo):**
- Webhook: `Kommo → POST /webhooks/kommo/:workspaceId → Throttler → HMAC validator → IdempotencyGate → KommoWebhookEvent INSERT → BullMQ enqueue → 200 (resposta ≤ 100ms)`
- Processamento: `Worker → Handler dedicado → Service → Repository (Prisma $transaction) → KommoMetricSnapshot update + outbox KOMMO_ENTITY_CHANGED`
- Dashboard leitura: `Frontend → React Query → GET /dashboards/:id/cards/:cardId/data → QueryEngine → KommoAdapter → Prisma → TransformInterceptor ({data, meta}) → cache Redis`

**Ordem para criar feature (aplicada às Sprints):**
Cada entidade Kommo segue os 14 passos do standard (Model Prisma → Migration → Repository → Service → DTOs → Controller → Module → Test endpoints → Types FE → Service HTTP → Hooks → Schema Zod → Componentes → Páginas).

**Segurança (checklist aplicado):**
Helmet, CORS whitelist, `@nestjs/throttler` global + restritivo em `/webhooks/kommo` e `/kommo/connect`, `ValidationPipe` com `whitelist:true` e `forbidNonWhitelisted:true`, secrets nunca no git, zero `$queryRawUnsafe`, logs sem tokens/PII.

### 1.5 Não-objetivos (explícitos)
- **Escrita para o Kommo** (ex: criar lead do ERP no Kommo). Apenas leitura.
- **Replicação de Files/Attachments** do Kommo. Só metadados de mensagem.
- **Multi-account por workspace**. RFC futuro se demanda surgir.
- **Custom fields dinâmicos**. Apenas campos estáveis da API.
- **Integração bidirecional** com BPM. RFC futuro.
- **Export PDF do dashboard**. Atualização pós-GA.
- **Dashboard compartilhável por link externo**. RFC futuro em squad-dashboards.
- **Retenção PII configurável por workspace**. Default: 6 meses. Configuração por-workspace vira RFC pós-GA.

---

## 2. ADRs fundadores

Antes de qualquer código, registrar 6 decisões irreversíveis em `.claude/adr/`:

| ID | Título | Decisão | Motivo |
|---|---|---|---|
| ADR-004 | `kommo-dual-auth` | Suportar OAuth2 + long-lived token via enum `authType` em `KommoAccount` | Flexibilidade dev sem fragilizar prod |
| ADR-005 | `kommo-webhook-hmac` | HMAC-SHA256 obrigatório; secret per-account; janela 5min; replay protection via `eventId` unique | Webhook é vetor de tenant leak + DoS se mal assinado |
| ADR-006 | `kommo-envelope-encryption` | `accessToken`/`refreshToken`/`hmacSecret` com envelope encryption (KMS-backed); nunca plaintext, nunca em log | Compliance LGPD + segurança base |
| ADR-007 | `kommo-outbox-invalidation` | Worker emite `KOMMO_ENTITY_CHANGED` no outbox ao gravar entidade; squad-dashboards consome e invalida cache | Aproveita infra outbox existente em [task-outbox/](../../mundial-erp-api/src/modules/task-outbox/) |
| ADR-008 | `kommo-reconciliation-strategy` | Webhook-primary + 3 crons idempotentes (5min/hourly/daily); drift > 1% alerta P1 | "Sem delay" exige webhook; eventos perdidos são inevitáveis — cron cobre o gap |
| ADR-009 | `kommo-metric-snapshot` | Pré-agregados por evento em `KommoMetricSnapshot` para KPIs com `COUNT(*)` sobre tabelas grandes | Evita estouro de budget (p95 < 400ms) em 1M+ rows |

---

## 3. Análise do estado atual

### 3.1 Greenfield confirmado
`grep -ri "kommo"` em `mundial-erp-api/src/` e `mundial-erp-web/src/` retorna **zero matches**.

### 3.2 Scaffolding externo existente
Pasta `C:\Users\USER\Documents\agents\kommo` (working directory adicional): MCP server, scripts, n8n flows, CLAUDE.md. **Inventariar antes de começar** (Rafael Quintella na Etapa 1) — pode haver helpers reaproveitáveis; código canônico vive em `mundial-erp-api/`.

### 3.3 Infra backend reusável (NÃO reimplementar)

| Recurso | Localização | Uso no plano |
|---|---|---|
| **Outbox pattern** | [task-outbox/](../../mundial-erp-api/src/modules/task-outbox/) (`TaskOutboxService` + `TaskOutboxWorker` + `TaskOutboxRepository`) | Template para `KommoOutboxEvent` + worker `KOMMO_ENTITY_CHANGED` |
| **BullMQ queues** | [queue.module.ts](../../mundial-erp-api/src/modules/queue/queue.module.ts) — já tem `QUEUE_SYNC`, `QUEUE_REPORTS`, `QUEUE_SEARCH_REINDEX` | Adicionar `QUEUE_KOMMO_WEBHOOKS`, `QUEUE_KOMMO_BACKFILL` |
| **@nestjs/schedule** | `TaskOutboxCleanupService` usa `@Cron('0 3 * * 0')` | Template para os 3 crons de reconciliação |
| **PrismaService** | [prisma.service.ts](../../mundial-erp-api/src/database/prisma.service.ts) com extension `primaryAssigneeCacheExtension` | Usar `$transaction` para write+outbox atômico |
| **@WorkspaceId() decorator** | [workspace-id.decorator.ts](../../mundial-erp-api/src/modules/workspaces/decorators/workspace-id.decorator.ts) | Obrigatório em controllers `kommo-*` (exceto webhook) |
| **Feature flags** | [feature-flags/](../../mundial-erp-api/src/common/feature-flags/) — `skip-tasks-v2-flag.decorator.ts`, `tasks-feature-flag.guard.ts` | Criar `kommo-feature-flag.guard.ts` análogo |
| **Workspace model** | [schema.prisma](../../mundial-erp-api/prisma/schema.prisma) | FK target de `KommoAccount.workspaceId` |

### 3.4 Padrão de módulo NestJS a replicar
Referência: [areas/](../../mundial-erp-api/src/modules/bpm/definitions/areas/) — estrutura `controller + service + repository + dto/`.

### 3.5 Convenções Prisma
- DB: **snake_case** via `@map`/`@@map`
- Código TS: **camelCase**
- `workspaceId` sempre indexado composto (ex: `@@index([workspaceId, status])`)
- FK `workspaceId` → `Workspace.id` com `onDelete: Cascade` ou `Restrict` conforme semântica

---

## 4. Mapeamento de domínio (Kommo → entidades próprias)

Fonte canônica: <https://developers.kommo.com/docs>. **Não inventar semântica.**

| Conceito Kommo | Entidade própria | Relacionamento | Observação |
|---|---|---|---|
| Account (subdomain) | `KommoAccount` | 1:1 com `Workspace` (unique) | Contém token + hmacSecret encriptados |
| Pipeline | `KommoPipeline` | N:1 com `KommoAccount` | Conta pode ter vários pipelines — expostos como filtro |
| Status (within Pipeline) | `KommoStatus` | N:1 com `KommoPipeline` | Enum-like de etapas |
| User (agente) | `KommoAgent` | N:1 com `KommoAccount` | `kommoUserId` é ID interno Kommo |
| Department/Group | `KommoDepartment` | N:1 com `KommoAccount` | Card "Por Departamento" |
| Lead | `KommoLead` | N:1 com `KommoPipeline` + N:1 com `KommoAgent` | "Leads Hoje", "Leads na Semana" |
| Chat (conversa) | `KommoConversation` | N:1 com `KommoLead` (opcional) + N:1 com `KommoAgent` | "Conversas em Aberto", "Resolvidas Hoje" |
| Message (mensagem) | `KommoMessage` | N:1 com `KommoConversation` | "Mensagens Hoje", "Horários de Pico" |
| Webhook event | `KommoWebhookEvent` | Idempotency ledger | Unique `(workspaceId, eventId)` |
| Sync cursor | `KommoSyncCheckpoint` | Estado dos crons | Progresso de backfill + reconciliação |
| Pre-aggregate | `KommoMetricSnapshot` | Cache pré-calculado | Atualizado atomic por evento |

### 4.1 Eventos Kommo cobertos na Fase MVP (10)
1. `incoming_chat_message`
2. `outgoing_chat_message`
3. `chat_created`
4. `chat_resolved`
5. `chat_responsible_changed`
6. `lead_created`
7. `lead_updated`
8. `lead_status_changed`
9. `lead_responsible_changed`
10. `note_added` (opcional MVP)

### 4.2 Eventos Fase 2
11. `chat_department_changed`
12. `agent_status_changed`
13. `task_created` / `task_completed` (se dashboard de tarefas comerciais surgir)

---

## 5. Modelo de dados Prisma

**Migration inicial:** `kommo_foundations` (11 tabelas + 5 enums).

### 5.0 Padrão de campos base (aplicado a TODOS os models)

Todo model de domínio carrega o quarteto padrão do `99-referencia-completa.md`:

```prisma
id        String    @id @default(cuid())
createdAt DateTime  @default(now()) @map("created_at")
updatedAt DateTime  @updatedAt @map("updated_at")
deletedAt DateTime? @map("deleted_at")
```

**Models operacionais com hard delete documentado:**
- `KommoWebhookEvent` — purge cron diário (> 30 dias)
- `KommoSyncCheckpoint` — update-in-place, unique por `(workspaceId, entity)`
- `KommoMetricSnapshot` — hard delete em disconnect+purge; reconstruível via backfill

**Todos os queries de listagem filtram `where: { deletedAt: null, workspaceId }`.**

### 5.1 Enums

```prisma
enum KommoAuthType         { OAUTH2  LONG_LIVED_TOKEN }
enum KommoAccountStatus    { ACTIVE  TOKEN_EXPIRED  REVOKED  SUSPENDED }
enum KommoMessageDirection { IN  OUT }
enum KommoConversationStatus { OPEN  WAITING_RESPONSE  WAITING_CLIENT  RESOLVED  ARCHIVED }
enum KommoWebhookEventStatus { RECEIVED  PROCESSED  DEDUPLICATED  DLQ }
```

### 5.2 Tabelas (11)

```prisma
model KommoAccount {
  id                 String              @id @default(cuid())
  workspaceId        String              @unique @map("workspace_id")
  subdomain          String
  authType           KommoAuthType
  accessToken        String                                    // ENCRYPTED (envelope)
  refreshToken       String?                                   // ENCRYPTED, nullable p/ long-lived token
  expiresAt          DateTime?           @map("expires_at")
  hmacSecret         String              @map("hmac_secret")   // ENCRYPTED
  status             KommoAccountStatus  @default(ACTIVE)
  lastSyncAt         DateTime?           @map("last_sync_at")
  connectedByUserId  String?             @map("connected_by_user_id")
  createdAt          DateTime            @default(now()) @map("created_at")
  updatedAt          DateTime            @updatedAt      @map("updated_at")
  deletedAt          DateTime?           @map("deleted_at")

  workspace          Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  pipelines          KommoPipeline[]
  agents             KommoAgent[]
  departments        KommoDepartment[]
  leads              KommoLead[]
  conversations      KommoConversation[]
  messages           KommoMessage[]

  @@map("kommo_accounts")
}

model KommoPipeline {
  id              String        @id @default(cuid())
  workspaceId     String        @map("workspace_id")
  accountId       String        @map("account_id")
  kommoPipelineId BigInt        @map("kommo_pipeline_id")
  name            String
  sortOrder       Int           @default(0) @map("sort_order")
  isArchived      Boolean       @default(false) @map("is_archived")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt      @map("updated_at")
  deletedAt       DateTime?     @map("deleted_at")

  account         KommoAccount  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  statuses        KommoStatus[]
  leads           KommoLead[]

  @@unique([workspaceId, kommoPipelineId])
  @@index([workspaceId, isArchived])
  @@map("kommo_pipelines")
}

model KommoStatus {
  id            String         @id @default(cuid())
  workspaceId   String         @map("workspace_id")
  pipelineId    String         @map("pipeline_id")
  kommoStatusId BigInt         @map("kommo_status_id")
  name          String
  color         String?
  sortOrder     Int            @default(0) @map("sort_order")
  isTerminal    Boolean        @default(false) @map("is_terminal")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt      @map("updated_at")
  deletedAt     DateTime?      @map("deleted_at")

  pipeline      KommoPipeline  @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  leads         KommoLead[]

  @@unique([workspaceId, pipelineId, kommoStatusId])
  @@index([workspaceId, pipelineId])
  @@map("kommo_statuses")
}

model KommoDepartment {
  id                String        @id @default(cuid())
  workspaceId       String        @map("workspace_id")
  accountId         String        @map("account_id")
  kommoDepartmentId BigInt        @map("kommo_department_id")
  name              String
  isArchived        Boolean       @default(false) @map("is_archived")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt      @map("updated_at")
  deletedAt         DateTime?     @map("deleted_at")

  account           KommoAccount  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  agents            KommoAgent[]

  @@unique([workspaceId, kommoDepartmentId])
  @@map("kommo_departments")
}

model KommoAgent {
  id             String            @id @default(cuid())
  workspaceId    String            @map("workspace_id")
  accountId      String            @map("account_id")
  kommoUserId    BigInt            @map("kommo_user_id")
  name           String
  email          String?
  departmentId   String?           @map("department_id")
  mappedUserId   String?           @map("mapped_user_id")
  isActive       Boolean           @default(true) @map("is_active")
  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt      @map("updated_at")
  deletedAt      DateTime?         @map("deleted_at")

  account        KommoAccount      @relation(fields: [accountId], references: [id], onDelete: Cascade)
  department     KommoDepartment?  @relation(fields: [departmentId], references: [id])
  leadsResponsible         KommoLead[]         @relation("LeadResponsible")
  conversationsResponsible KommoConversation[] @relation("ConversationResponsible")
  messagesAuthored         KommoMessage[]      @relation("MessageAuthor")

  @@unique([workspaceId, kommoUserId])
  @@index([workspaceId, isActive])
  @@index([workspaceId, departmentId])
  @@map("kommo_agents")
}

model KommoLead {
  id                 String              @id @default(cuid())
  workspaceId        String              @map("workspace_id")
  accountId          String              @map("account_id")
  kommoLeadId        BigInt              @map("kommo_lead_id")
  pipelineId         String              @map("pipeline_id")
  statusId           String              @map("status_id")
  responsibleAgentId String?             @map("responsible_agent_id")
  name               String?
  valueCents         BigInt?             @map("value_cents")
  closedAt           DateTime?           @map("closed_at")
  isClosed           Boolean             @default(false) @map("is_closed")
  isWon              Boolean?            @map("is_won")
  createdAt          DateTime            @default(now()) @map("created_at")
  updatedAt          DateTime            @updatedAt      @map("updated_at")
  deletedAt          DateTime?           @map("deleted_at")

  account            KommoAccount        @relation(fields: [accountId], references: [id], onDelete: Cascade)
  pipeline           KommoPipeline       @relation(fields: [pipelineId], references: [id])
  status             KommoStatus         @relation(fields: [statusId], references: [id])
  responsibleAgent   KommoAgent?         @relation("LeadResponsible", fields: [responsibleAgentId], references: [id])
  conversations      KommoConversation[]

  @@unique([workspaceId, kommoLeadId])
  @@index([workspaceId, pipelineId, statusId])
  @@index([workspaceId, createdAt])
  @@index([workspaceId, responsibleAgentId])
  @@map("kommo_leads")
}

model KommoConversation {
  id                 String                  @id @default(cuid())
  workspaceId        String                  @map("workspace_id")
  accountId          String                  @map("account_id")
  kommoChatId        BigInt                  @map("kommo_chat_id")
  leadId             String?                 @map("lead_id")
  responsibleAgentId String?                 @map("responsible_agent_id")
  departmentId       String?                 @map("department_id")
  status             KommoConversationStatus @default(OPEN)
  firstMessageAt     DateTime?               @map("first_message_at")
  firstResponseAt    DateTime?               @map("first_response_at")
  resolvedAt         DateTime?               @map("resolved_at")
  lastMessageAt      DateTime?               @map("last_message_at")
  createdAt          DateTime                @default(now()) @map("created_at")
  updatedAt          DateTime                @updatedAt      @map("updated_at")
  deletedAt          DateTime?               @map("deleted_at")

  account            KommoAccount            @relation(fields: [accountId], references: [id], onDelete: Cascade)
  lead               KommoLead?              @relation(fields: [leadId], references: [id])
  responsibleAgent   KommoAgent?             @relation("ConversationResponsible", fields: [responsibleAgentId], references: [id])
  messages           KommoMessage[]

  @@unique([workspaceId, kommoChatId])
  @@index([workspaceId, status])
  @@index([workspaceId, responsibleAgentId])
  @@index([workspaceId, resolvedAt])
  @@index([workspaceId, createdAt])
  @@map("kommo_conversations")
}

model KommoMessage {
  id             String                 @id @default(cuid())
  workspaceId    String                 @map("workspace_id")
  accountId      String                 @map("account_id")
  conversationId String                 @map("conversation_id")
  kommoMessageId String                 @map("kommo_message_id")
  direction      KommoMessageDirection
  authorAgentId  String?                @map("author_agent_id")
  contentPreview String                 @map("content_preview")       // truncado a 200 chars
  contentHash    String                 @map("content_hash")          // SHA-256 do conteúdo full
  createdAt      DateTime               @default(now()) @map("created_at")
  updatedAt      DateTime               @updatedAt      @map("updated_at")
  deletedAt      DateTime?              @map("deleted_at")

  account        KommoAccount           @relation(fields: [accountId], references: [id], onDelete: Cascade)
  conversation   KommoConversation      @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  authorAgent    KommoAgent?            @relation("MessageAuthor", fields: [authorAgentId], references: [id])

  @@unique([workspaceId, kommoMessageId])
  @@index([workspaceId, createdAt(sort: Desc)])
  @@index([conversationId, createdAt])
  @@index([workspaceId, direction, createdAt])                  // "Horários de Pico"
  @@index([workspaceId, authorAgentId, createdAt])              // "Performance por Atendente"
  @@map("kommo_messages")
}

// Models operacionais (hard delete via purge cron)

model KommoWebhookEvent {
  id           String                   @id @default(cuid())
  workspaceId  String                   @map("workspace_id")
  eventId      String                   @map("event_id")
  eventType    String                   @map("event_type")
  payloadHash  String                   @map("payload_hash")        // SHA-256
  signature    String
  status       KommoWebhookEventStatus  @default(RECEIVED)
  receivedAt   DateTime                 @default(now()) @map("received_at")
  processedAt  DateTime?                @map("processed_at")
  errorMessage String?                  @map("error_message")
  retryCount   Int                      @default(0) @map("retry_count")

  @@unique([workspaceId, eventId])
  @@index([workspaceId, status, receivedAt])
  @@index([workspaceId, eventType, receivedAt])
  @@map("kommo_webhook_events")
}

model KommoSyncCheckpoint {
  id          String    @id @default(cuid())
  workspaceId String    @map("workspace_id")
  entity      String
  lastCursor  String?   @map("last_cursor")
  lastSyncAt  DateTime  @default(now()) @map("last_sync_at")
  entityCount Int       @default(0) @map("entity_count")
  lastError   String?   @map("last_error")

  @@unique([workspaceId, entity])
  @@index([workspaceId, lastSyncAt])
  @@map("kommo_sync_checkpoints")
}

model KommoMetricSnapshot {
  id          String    @id @default(cuid())
  workspaceId String    @map("workspace_id")
  pipelineId  String?   @map("pipeline_id")       // null = agregado todos pipelines
  metricKey   String    @map("metric_key")        // "open_conversations", "total_resolved", ...
  windowStart DateTime? @map("window_start")
  windowEnd   DateTime? @map("window_end")
  value       BigInt
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@unique([workspaceId, pipelineId, metricKey, windowStart, windowEnd])
  @@index([workspaceId, metricKey, updatedAt])
  @@map("kommo_metric_snapshots")
}
```

### 5.3 Extensão ao model `Workspace`
```prisma
model Workspace {
  // ... existente
  kommoAccount  KommoAccount?
}
```

### 5.4 Extensão ao model `User` (opcional na MVP)
```prisma
model User {
  // ... existente
  kommoAgentMappedId  String?   @map("kommo_agent_mapped_id")
}
```

### 5.5 Indices e particionamento
- Indices compostos sempre começam com `workspaceId` (Postgres planner otimiza prefix).
- `KommoMessage` candidato a particionamento por mês acima de 50M rows (Fase 2+, ADR futuro).

---

## 6. Estrutura de módulos backend

**Padrão Bravy aplicado:** cada módulo segue `controller + service + repository + dto/` conforme `99-referencia-completa.md`. Controller só delega; Service orquestra; Repository encapsula Prisma; DTOs validam com `class-validator`.

```
mundial-erp-api/src/modules/
├── kommo-accounts/
│   ├── kommo-accounts.controller.ts          # /kommo/connect, /kommo/callback, /kommo/accounts, DELETE
│   ├── kommo-accounts.service.ts             # fluxo OAuth + long-lived token
│   ├── kommo-accounts.repository.ts
│   ├── kommo-accounts.module.ts
│   ├── dto/
│   │   ├── connect-kommo.dto.ts
│   │   ├── kommo-account-response.dto.ts
│   │   └── kommo-oauth-callback.dto.ts
│   └── services/
│       ├── kommo-token-rotation.service.ts   # @Cron diário
│       └── kommo-encryption.service.ts       # envelope encryption via KMS
│
├── kommo-webhooks/
│   ├── kommo-webhooks.controller.ts          # POST /webhooks/kommo/:workspaceId (público, Throttled)
│   ├── kommo-webhooks.service.ts             # HMAC + idempotency + enqueue
│   ├── kommo-webhooks.repository.ts          # KommoWebhookEvent write
│   └── kommo-webhooks.module.ts
│
├── kommo-workers/
│   ├── kommo-event-processor.worker.ts       # @Processor(QUEUE_KOMMO_WEBHOOKS)
│   ├── kommo-backfill.worker.ts              # @Processor(QUEUE_KOMMO_BACKFILL)
│   ├── handlers/                             # 1 arquivo por tipo de evento
│   │   ├── incoming-chat-message.handler.ts
│   │   ├── outgoing-chat-message.handler.ts
│   │   ├── chat-created.handler.ts
│   │   ├── chat-resolved.handler.ts
│   │   ├── chat-responsible-changed.handler.ts
│   │   ├── lead-created.handler.ts
│   │   ├── lead-status-changed.handler.ts
│   │   ├── lead-responsible-changed.handler.ts
│   │   └── note-added.handler.ts
│   └── kommo-workers.module.ts
│
├── kommo-reconciliation/
│   ├── kommo-reconciliation.service.ts       # 3 @Cron jobs idempotentes
│   ├── kommo-drift-detector.service.ts
│   └── kommo-reconciliation.module.ts
│
├── kommo-api-client/
│   ├── kommo-api-client.service.ts           # OAuth + rate-limit + retry + circuit breaker
│   ├── kommo-rate-limiter.service.ts
│   ├── kommo-circuit-breaker.service.ts
│   ├── dto/                                  # DTOs da API Kommo
│   └── kommo-api-client.module.ts
│
├── kommo-snapshots/
│   ├── kommo-snapshots.service.ts            # refresh-on-event de KommoMetricSnapshot
│   └── kommo-snapshots.module.ts
│
└── kommo-adapters/                           # para query engine do squad-dashboards
    ├── kommo-conversations.adapter.ts
    ├── kommo-messages.adapter.ts
    ├── kommo-leads.adapter.ts
    ├── kommo-agents.adapter.ts
    ├── whitelist/
    │   ├── conversations.whitelist.ts
    │   ├── messages.whitelist.ts
    │   ├── leads.whitelist.ts
    │   └── agents.whitelist.ts
    └── kommo-adapters.module.ts
```

**Registro em [queue.module.ts](../../mundial-erp-api/src/modules/queue/queue.module.ts):**
```ts
export const QUEUE_KOMMO_WEBHOOKS = 'kommo-webhooks';
export const QUEUE_KOMMO_BACKFILL = 'kommo-backfill';
```

---

## 7. Contrato de endpoints

**Envelope padrão:** responses `/kommo/*` retornam `{ data, meta }` via `TransformInterceptor` global. Paginação via `PaginationDto` (`page` default 1, `limit` default 20, max 100).

**Status codes:** GET=200, POST=201, PATCH=200, DELETE=204.

**Exceção:** `POST /webhooks/kommo/:workspaceId` retorna body simples (`{ accepted | deduplicated }`) — protocolo de ack do Kommo exige.

### 7.1 Autenticação Kommo (management)
| Método | Rota | Ação | Auth | Rate limit |
|---|---|---|---|---|
| GET | `/kommo/connect` | Inicia fluxo OAuth2 | JWT + Admin/Manager | 10/min/user |
| GET | `/kommo/callback` | Callback OAuth2 | State signature | 30/min/IP |
| POST | `/kommo/accounts/token` | Registra long-lived token (dev) | JWT + Admin | 5/min/user |
| GET | `/kommo/accounts` | Lista conta do workspace | JWT | 60/min/user |
| GET | `/kommo/accounts/:id/status` | Status sync, DLQ count | JWT | 60/min/user |
| DELETE | `/kommo/accounts/:id` | Disconnect (soft delete + revoga + purge opcional) | JWT + Admin | 5/min/user |
| POST | `/kommo/accounts/:id/backfill` | Backfill manual 90d | JWT + Admin | 1/hora/account |
| POST | `/kommo/accounts/:id/reconnect` | Retoma refresh de token expirado | JWT + Admin | 5/min/user |

### 7.2 Webhook público
| Método | Rota | Ação | Auth | Rate limit |
|---|---|---|---|---|
| POST | `/webhooks/kommo/:workspaceId` | Recebe evento Kommo | HMAC-SHA256 + signature header | 300/min/workspaceId |

**Contrato de resposta:**
- HMAC inválido → **401**
- `workspaceId` sem `KommoAccount` → **404**
- HMAC válido mas workspaceId da URL ≠ account do evento → **403** + alerta segurança
- Idempotency hit → **200** `{ deduplicated: true, eventId }`
- OK → **200** em ≤ 100ms `{ accepted: true, eventId }`

### 7.3 Pipelines, agentes, departamentos (metadata)
| Método | Rota | Ação |
|---|---|---|
| GET | `/kommo/pipelines` | Lista pipelines (para filtro global) |
| GET | `/kommo/agents` | Lista agentes |
| GET | `/kommo/departments` | Lista departamentos |

### 7.4 Adapters do query engine
Não são endpoints REST — consumidos internamente pelo `DashboardCardQueryService`:
- `dataSource.entity = "kommoConversations" | "kommoMessages" | "kommoLeads" | "kommoAgents"`
- Whitelist de `field` em `kommo-adapters/whitelist/*.ts`

---

## 8. Regras de negócio

**Conformidade transversal:**
- `Logger` do NestJS (nunca `console.log`) com contexto (`new Logger(KommoEventProcessor.name)`)
- `ConfigService` para segredos (nunca `process.env` direto)
- `@nestjs/throttler` global + `@Throttle()` específico nos endpoints
- `ValidationPipe` global com `whitelist: true, forbidNonWhitelisted: true`

### 8.1 Autenticação dual (ADR-004)

**OAuth2 (produção):**
1. `GET /kommo/connect` → gera `state = HMAC(csrfSecret, randomUUID)`, salva em Redis TTL 10min, redireciona p/ Kommo OAuth
2. Callback → valida state (deleta após uso) → troca code por `{ accessToken, refreshToken, expiresIn }` → cria/atualiza `KommoAccount` com tokens encriptados
3. Cron diário `kommo-token-rotation` refresh 24h antes de expirar

**Long-lived token (dev):**
1. Usuário cola token em `POST /kommo/accounts/token` (`{ subdomain, token, hmacSecret }`)
2. Cria `KommoAccount` com `authType = LONG_LIVED_TOKEN`, `expiresAt = null`

**Reconexão:** API Kommo retornando 401/403 em 2+ calls → `status = TOKEN_EXPIRED` + evento `KOMMO_RECONNECT_NEEDED` (squad-notifications email admin).

### 8.2 Webhook handler (response ≤ 100ms)

```
1. Extrair workspaceId da URL
2. Buscar KommoAccount (cache Redis 60s)
3. Validar HMAC-SHA256 (rejeita se clock skew > 5min)
4. Extrair eventId do payload
5. INSERT em KommoWebhookEvent com unique(workspaceId, eventId) — conflito → 200 { deduplicated }
6. Enqueue em QUEUE_KOMMO_WEBHOOKS
7. Return 200 { accepted, eventId }
```

**Meta perf:** p95 < 80ms (só ack, sem processamento).

### 8.3 Worker handler (processamento assíncrono)

```
1. Consumir job { webhookEventId, workspaceId }
2. Buscar KommoWebhookEvent + payload
3. Rotear por eventType → handler dedicado
4. Handler aplica evento ao model (service idempotente)
5. Service emite outbox KOMMO_ENTITY_CHANGED em $transaction
6. Atualizar KommoMetricSnapshot relevantes
7. KommoWebhookEvent.status = PROCESSED
8. Retry 3x exponencial + jitter; 4ª → DLQ + alerta Grafana
```

### 8.4 Reconciliação (3 crons idempotentes)

| Cron | Schedule | O que faz |
|---|---|---|
| `kommo-recon-5min` | `*/5 * * * *` | Lista eventos últimos 15min via API → reaplica missing |
| `kommo-recon-hourly` | `0 * * * *` | Lista leads/conversations/messages modificados última hora → reaplica + checksum |
| `kommo-recon-daily` | `0 3 * * *` | Full-sync do dia anterior → drift > 1% = P1 + purge webhook events > 30d + purge messages conforme retenção |

### 8.5 Backfill (90 dias na instalação)

```
1. kommo-backfill worker dispara via API ou auto pós-connect
2. Paraleliza por entidade respeitando rate-limit (max 3 simultâneas)
3. Pagina 250 items/request via cursor Kommo
4. Aplica cada item via handler do worker (idempotent)
5. Atualiza KommoSyncCheckpoint.lastCursor incrementalmente
6. Crash recovery: retoma de lastCursor
7. Emite progresso via SSE/outbox para UI
8. Fim: account "completed" + metric snapshot inicial
```

### 8.6 Invalidação de cache (ADR-007)

Escrita de entidade Kommo + update de `KommoMetricSnapshot` emite em `$transaction`:
```json
{
  "event": "KOMMO_ENTITY_CHANGED",
  "entity": "conversation" | "message" | "lead" | "agent" | "metric_snapshot",
  "entityId": "cuid",
  "workspaceId": "cuid",
  "pipelineId": "cuid | null"
}
```
squad-dashboards invalida cache do `/cards/:cardId/data` conforme `dataSource.entity`.

### 8.7 Adapter contract

```ts
interface QueryEngineAdapter<T> {
  entity: string;                                                       // "kommoConversations"
  fieldWhitelist: Record<string, FieldSpec>;
  translate(filters: FilterNode[], workspaceId: string): Prisma.WhereInput;
  shapeFor(cardType: CardType): (rows: T[]) => CardResponseShape;
}
```

**Whitelist mínima MVP (`kommoConversations`):**
- `status`, `responsibleAgentId`, `pipelineId`, `departmentId`, `createdAt`, `resolvedAt`, `lastMessageAt`

### 8.8 PII e LGPD
- `KommoMessage.contentPreview`: truncado a **200 chars** + `contentHash` SHA-256
- Log: `phone`/`email` mascarados (ex: `5511****1234`, `jo**@gmail.com`)
- Purge cron diário: `KommoMessage` > `retention_policy` (default 180d)
- Disconnect com `?purge=true` apaga todos os dados

### 8.9 Rate-limit awareness (`KommoApiClient`)
- Sliding window Redis por workspace: 7 req/s + 30 req/min
- Pre-flight check: se >80% budget → aguarda janela
- 429 do Kommo → `Retry-After` + exponential backoff + jitter
- Circuit breaker: 5 falhas consecutivas → abre 60s, fallback silencioso p/ cron (NUNCA descarta evento)

---

## 9. Observabilidade e SLIs

### 9.1 Dashboards Grafana (`kommo-sync`)
- Latência webhook→banco p50/p95/p99
- Eventos recebidos/min por workspace
- DLQ depth
- Drift detectado em reconciliação diária
- Rate-limit budget consumido
- OAuth refresh success rate
- Kommo API status distribution
- Circuit breaker state

### 9.2 SLIs
| SLI | Alvo | Alerta P1 |
|---|---|---|
| Webhook response p95 | < 80ms | > 200ms sustentado 5min |
| Webhook→banco p95 | ≤ 10s | > 30s sustentado 5min |
| Eventos perdidos | < 0.1% | > 1% |
| DLQ depth | < 50 | > 500 |
| OAuth refresh success | > 99% | < 95% em 1h |
| Kommo API error rate (exc. 429) | < 1% | > 5% |
| Rate-limit budget | < 60% | > 90% sustentado 5min |

### 9.3 Logs estruturados (obrigatórios)
`requestId`, `workspaceId`, `kommoAccountId`, `eventId`, `eventType`, `duration_ms`, `cache_hit`, `outbox_enqueued`.

**Proibido logar:** `accessToken`, `refreshToken`, `hmacSecret`, `contentPreview` integral, `phone`/`email` clear.

---

## 10. UI — 17 cards de referência

### 10.1 Fase MVP (8 cards)

| # | Card | CardType | dataSource | Filtros | Config |
|---|---|---|---|---|---|
| 1 | Conversas em Aberto | `KPI_NUMBER` | `kommoConversations` | `status IN [OPEN, WAITING_RESPONSE, WAITING_CLIENT]` | trend vs. semana |
| 2 | Sem Responsável | `KPI_NUMBER` | `kommoConversations` | `status != RESOLVED AND responsibleAgentId IS NULL` | — |
| 3 | Resolvidas Hoje | `KPI_NUMBER` | `kommoConversations` | `status = RESOLVED AND resolvedAt >= startOfDay` | — |
| 4 | Tempo Médio de Resposta | `KPI_NUMBER` | `kommoConversations` | snapshot custom | unit: "min" |
| 5 | Taxa de Resolução | `KPI_NUMBER` | `kommoConversations` | `COUNT(RESOLVED)/COUNT(*)` 7d | unit: "%" + trend |
| 6 | Mensagens Hoje | `KPI_NUMBER` | `kommoMessages` | `createdAt >= startOfDay` | breakdown IN/OUT |
| 7 | Leads Hoje | `KPI_NUMBER` | `kommoLeads` | `createdAt >= startOfDay` | — |
| 8 | Total Resolvidas | `KPI_NUMBER` | `kommoConversations` | `status = RESOLVED` all-time (via snapshot) | "Desde o início" |

### 10.2 Fase 2 (9 cards)

| # | Card | CardType | dataSource | Filtros | Config |
|---|---|---|---|---|---|
| 9 | Iniciadas Hoje | `KPI_NUMBER` | `kommoConversations` | `createdAt >= startOfDay` | — |
| 10 | Tempo de Resolução | `KPI_NUMBER` | `kommoConversations` | média `resolvedAt - createdAt` 7d | unit: "h" |
| 11 | Resposta Rápida | `KPI_NUMBER` | `kommoConversations` | `% firstResponseAt < 5min` 7d | unit: "%" |
| 12 | Leads na Semana | `KPI_NUMBER` | `kommoLeads` | `createdAt >= startOfWeek` | — |
| 13 | Conversas - 7 Dias | `LINE_CHART` | `kommoConversations` | iniciadas + resolvidas por dia | 2 series |
| 14 | Mensagens - 7 Dias | `LINE_CHART` area | `kommoMessages` | enviadas + recebidas por dia | 2 series area |
| 15 | Conversas por Status | `DONUT` | `kommoConversations` | groupBy `status` | — |
| 16 | Por Departamento | `BAR_CHART` h | `kommoConversations` | groupBy `departmentId` | — |
| 17 | Performance (2 gauges) | **`GAUGE`** (RFC) | custom | % Resolução + % Resposta Rápida | ring colorido |
| 18 | Performance por Atendente | `BAR_CHART` | `kommoConversations` | groupBy `responsibleAgentId`, 2 series | — |
| 19 | Horários de Pico | `BAR_CHART` | `kommoMessages` | groupBy `HOUR(createdAt)` | 24 bars |
| 20 | Conversas por Responsável | `BAR_CHART` h | `kommoConversations` | groupBy `responsibleAgentId`, sort desc | top N |

### 10.3 Novo CardType `GAUGE` (RFC)
RFC `.claude/rfc/dashboards-002-gauge-cardtype.md` — Iago Silveira (squad-dashboards) + Larissa Bezerra (adapter) + Hugo Monteiro (QA). Shape:
```ts
{ value: number, min: number, max: number, target?: number, color?: string, label: string }
```

### 10.4 Filtros globais
- **Pipeline** (DashboardFilter `field=pipelineId, operator=IN`)
- **Período** (`field=dateRange`)
- **Departamento** (Fase 2 — `field=departmentId`)

---

## 11. Estrutura frontend

Padrão `features/{feature}/` do `99-referencia-completa.md`:

```
mundial-erp-web/src/features/kommo/
├── components/
│   ├── kommo-connect-card.tsx                # KommoConnectCard (named)
│   ├── kommo-backfill-progress.tsx           # SSE progress bar
│   ├── kommo-account-status.tsx
│   ├── kommo-oauth-button.tsx
│   └── kommo-token-form.tsx
├── hooks/
│   ├── use-kommo-account.ts                  # React Query
│   ├── use-kommo-connect-oauth.ts
│   ├── use-kommo-connect-token.ts
│   ├── use-kommo-disconnect.ts
│   ├── use-kommo-backfill.ts
│   └── use-kommo-backfill-progress.ts        # SSE
├── services/
│   └── kommo.service.ts                      # Axios
├── schemas/
│   ├── kommo-oauth.schema.ts                 # Zod
│   └── kommo-token.schema.ts                 # Zod
├── types/
│   ├── kommo-account.types.ts
│   ├── kommo-pipeline.types.ts
│   └── kommo-sync-status.types.ts
└── index.ts                                  # barrel named exports

mundial-erp-web/src/features/dashboards/kommo-dashboard/
├── components/
│   ├── gauge-card.tsx                        # GaugeCard (named, Fase 2)
│   └── kommo-global-filters.tsx              # client
├── hooks/
│   └── use-kommo-dashboard-auto-refresh.ts
├── seeds/
│   └── analytics-comercial.seed.ts           # 17 cards + layout grid
└── types/
    └── kommo-card-shape.types.ts
```

**Convenções:**
- `kebab-case.tsx` / `kebab-case.ts`
- Named exports PascalCase (regra #13)
- Hooks `use-*` + React Query para server state
- Zod obrigatório em formulários (regra #12)
- Server Components default (regra #14); `'use client'` só em componentes interativos

**Fluxo UI:**
1. Server Component `/settings/integrations/kommo/page.tsx` → consulta `/kommo/accounts` → se vazio, `<KommoConnectCard />`
2. `<KommoConnectCard />` (client) → 2 opções: OAuth (prod) ou Token (dev)
3. OAuth popup → callback → invalidate React Query → `<KommoAccountStatus />` + `<KommoBackfillProgress />`
4. Token → Zod form → `POST /kommo/accounts/token`
5. Dashboard `/paineis/analytics-comercial` aparece no menu quando `KOMMO_DASHBOARD_ENABLED=true` + `status === ACTIVE`

---

## 12. Telas e rotas

### 12.1 Frontend
| Rota | Descrição |
|---|---|
| `/settings/integrations/kommo` | Management da conta Kommo |
| `/paineis/analytics-comercial` | Dashboard "Analytics Comercial" |
| `/paineis/analytics-comercial?pipeline=:id` | Com filtro global de pipeline |

### 12.2 Backend
- `/kommo/*` — management
- `/webhooks/kommo/:workspaceId` — webhook público
- `/dashboards/:id/cards/:cardId/data` — consome adapters novos (squad-dashboards)

---

## 13. Backlog ordenado por Sprints

### Fase MVP (4 sprints — ~8 semanas)

**Cada entidade Kommo segue os 14 passos do standard** (Model → Migration → Repository → Service → DTOs → Controller → Module → Test → Types FE → Service HTTP → Hooks → Schema Zod → Componentes → Páginas).

#### Sprint 1 — Foundations (Rafael solo + Carolina em paralelo)
**Bloqueia Sprint 2.**
- `K1-1` Inventariar `C:\Users\USER\Documents\agents\kommo` (Rafael) — 2pt
- `K1-2` ADRs 004-009 escritos (Rafael) — 5pt
- `K1-3` Schema inicial: `KommoAccount`, `KommoWebhookEvent`, `KommoMessage`, `KommoConversation` + migration `kommo_foundations_1` (Larissa) — 5pt
- `K1-4` `KommoApiClient` MVP (OAuth2 + long-lived + rate-limit + 1 endpoint) (Rafael) — 8pt
- `K1-5` `/kommo/connect` + `/kommo/callback` + `POST /kommo/accounts/token` (Rafael) — 5pt
- `K1-6` `POST /webhooks/kommo/:workspaceId` com HMAC + idempotency + enqueue (Rafael) — 5pt
- `K1-7` Handler `incoming_chat_message` ponta-a-ponta + outbox emit (Rafael) — 5pt
- `K1-8` Feature flags `KOMMO_SYNC_ENABLED` + `KOMMO_DASHBOARD_ENABLED` (Rafael) — 2pt
- `K1-9` Fuzz HMAC + E2E cross-tenant + idempotency (Carolina) — 5pt
- `K1-10` Seed 2 `KommoAccount` + fixtures (Carolina) — 2pt

**AC Sprint 1:** webhook real Kommo (staging) valida HMAC, grava `KommoMessage`, emite outbox; 2 workspaces isolados.

#### Sprint 2 — Expansão Paralela (Mateus + Larissa + Carolina + Rafael)
- `K2-1` 7 models restantes + migration `kommo_foundations_2` + indices (Larissa) — 8pt
- `K2-2` Services de escrita idempotentes (Larissa) — 8pt
- `K2-3` Worker com 9 handlers (Mateus) — 13pt
- `K2-4` Retry + jitter + DLQ + alerta (Mateus) — 3pt
- `K2-5` Cron `kommo-recon-5min` idempotente (Mateus) — 5pt
- `K2-6` Grafana `kommo-sync` SLIs + alertas (Rafael) — 5pt
- `K2-7` E2E completo: cross-tenant, HMAC, idempotency, rate-limit 429, 9 eventos (Carolina) — 8pt
- `K2-8` Unit ≥ 85% em `KommoApiClient` + worker (Carolina + Rafael) — 5pt

**AC Sprint 2:** 9 eventos processados; cron 5min reaplica missing; SLIs em Grafana.

#### Sprint 3 — Adapters + Backfill + Snapshots
- `K3-1` 4 adapters com whitelist coord. Thales Rocha (Larissa) — 13pt
- `K3-2` Unit ≥ 90% por adapter + fixture por CardType (Carolina) — 5pt
- `K3-3` `KommoMetricSnapshot` refresh-on-event p/ 8 KPIs MVP (Larissa) — 8pt
- `K3-4` `backfill-kommo.ts` idempotente 90d retomável (Mateus) — 8pt
- `K3-5` Crons `kommo-recon-hourly` + `kommo-recon-daily` + drift (Mateus) — 8pt
- `K3-6` Cron `kommo-token-rotation` (Rafael) — 3pt
- `K3-7` Envelope encryption de token/hmacSecret (Rafael) — 5pt
- `K3-8` Regression: squad-orders + squad-financial + squad-tasks + dashboard existente (Carolina) — 3pt

**AC Sprint 3:** adapters consumidos em 1 card experimental; backfill 90d OK; drift daily < 1%.

#### Sprint 4 — MVP Dashboard + Rollout Canary
- `K4-1` Seed "Analytics Comercial" 8 cards (Debora Lima — squad-dashboards) — 5pt
- `K4-2` UI `/settings/integrations/kommo` (squad-fe-dashboards + Rafael coord) — 8pt
- `K4-3` `KommoBackfillProgress` SSE (squad-fe-dashboards) — 5pt
- `K4-4` Auto-refresh dashboard (`autoRefreshSeconds=30`) (squad-fe-dashboards) — 3pt
- `K4-5` Threat model + pentest interno (HMAC, OAuth state, IDOR, replay, DoS) (Carolina) — 5pt
- `K4-6` Audit LGPD (Carolina) — 3pt
- `K4-7` Rollout canary 1 → 10% → 50% → 100% (Rafael) — 5pt (multi-semana)
- `K4-8` Runbook de incidentes + on-call rotation (Rafael) — 3pt

**AC MVP (GA):** 8 cards em produção 100% workspaces elegíveis; SLIs OK; zero P0 em 7 dias pós-100%.

### Fase 2 (2 sprints — ~4 semanas)

#### Sprint 5 — LINE_CHART/DONUT/BAR_CHART + Novos eventos
- `K5-1` 5 cards: Iniciadas Hoje, Tempo de Resolução, Resposta Rápida, Leads na Semana, Conversas/Mensagens 7d (Larissa + squad-dashboards) — 13pt
- `K5-2` 2 cards: Conversas por Status (DONUT), Por Departamento (BAR) — 5pt
- `K5-3` Eventos novos: `chat_department_changed`, `agent_status_changed` (Mateus) — 5pt
- `K5-4` Filtro global `pipelineId` (Renata Pires — squad-dashboards) — 5pt
- `K5-5` Fixtures + E2E novos cards (Carolina + Hugo) — 5pt

#### Sprint 6 — CardType GAUGE + Rankings
- `K6-1` RFC `dashboards-002-gauge-cardtype` + impl backend (Iago Silveira) — 8pt
- `K6-2` `GaugeCard` frontend (squad-fe-dashboards) — 5pt
- `K6-3` 4 cards: Performance (GAUGE duplo), Performance por Atendente, Horários de Pico, Conversas por Responsável — 8pt
- `K6-4` `KommoMetricSnapshot` p/ Performance + Horários (Larissa) — 5pt
- `K6-5` Final regression + Lighthouse budget (Carolina + Hugo) — 3pt

**AC Fase 2 (GA):** 17 cards; GAUGE no catálogo; filtro pipeline global; Lighthouse Perf ≥ 85.

---

## 14. Estratégia de testes

**Convenção de naming:**
- Unit: `*.spec.ts` (`kommo-api-client.service.spec.ts`, `incoming-chat-message.handler.spec.ts`)
- E2E: `*.e2e-spec.ts` (`kommo-webhooks.e2e-spec.ts`, `kommo-accounts.e2e-spec.ts`)
- Pastas `__tests__/` ao lado do módulo ou `test/` (E2E)

### 14.1 Unit (obrigatório)
- `KommoApiClient` ≥ 85%: mocks, OAuth refresh, rate-limit state machine, circuit breaker
- Worker processor ≥ 85%: cada handler, idempotency, retry
- Adapters ≥ 90%: whitelist, operators, shape por CardType
- Services de escrita ≥ 85%: idempotency via FK unique

### 14.2 E2E (obrigatório — `supertest`)
- **HMAC:** valid / invalid / algorithm downgrade / timestamp fora janela / missing header
- **Idempotency:** mesmo `eventId` → 200 `deduplicated`, sem duplicar
- **Cross-tenant:** token W1 em URL W2 → 403; `GET /kommo/accounts` isolado por workspace
- **Rate-limit:** 429 do Kommo → retry `Retry-After`; circuit breaker state
- **Reconciliação:** injetar gap → cron 5min reaplica
- **Backfill:** kill worker no meio → retoma idempotente
- **Adapter shape:** fixture 100 rows → shape esperado por CardType
- **OAuth flow:** state valid/invalid, CSRF replay → 400

### 14.3 Performance (`k6`)
- Webhook handler: 1000 req/min por 10min, p95 < 200ms
- Worker: 100 eventos/s
- Cron 5min < 2min para 100k eventos
- `/cards/:cardId/data` dos 8 cards MVP p95 < 400ms (cache hit) em 500k `KommoMessage`

### 14.4 Security
- Fuzz contínuo HMAC em pipeline (Carolina)
- Pentest interno Sprint 4 + anual
- Audit LGPD trimestral
- Audit Kommo API changelog trimestral

---

## 15. Plano de migração e rollback

### 15.1 Migrations escalonadas
- `kommo_foundations_1` (Sprint 1) — 4 tabelas mínimas
- `kommo_foundations_2` (Sprint 2) — 7 tabelas restantes + indices
- `kommo_snapshot_and_adapter_support` (Sprint 3) — extensões

**Regra pós-GA:** aditiva only. Nullable → backfill idempotente → NOT NULL em release seguinte.

### 15.2 Rollback
- **Rollback SQL** em `prisma/rollbacks/kommo_foundations_*.down.sql` obrigatório
- `KOMMO_SYNC_ENABLED=false` per-workspace → webhook 503, cron pula
- `KOMMO_DASHBOARD_ENABLED=false` per-workspace → esconde dashboard
- Disconnect `?purge=true` → apaga dados
- Reversão Coolify: revert commit + redeploy

### 15.3 Comunicação
- RFC em `.claude/rfc/kommo-001-foundations.md` antes de Sprint 1
- Addendum em `PLANO.md` principal pós-GA
- Runbook em `.claude/runbooks/kommo-incidents.md`

---

## 16. Riscos e mitigações

| ID | Risco | Prob | Impacto | Mitigação |
|---|---|---|---|---|
| R-K1 | HMAC bypass via algorithm downgrade ou clock skew | Baixa | Crítico | HMAC-SHA256 fixo + janela 5min + fuzz contínuo |
| R-K2 | Kommo API rate-limit saturado | Média | Alto | Sliding window Redis + backoff + circuit breaker + fallback cron |
| R-K3 | Breaking change não anunciado Kommo API | Média | Alto | Audit trimestral + contract test + `whitelist:true` descarta campos novos |
| R-K4 | Crescimento `KommoMessage` > 50M rows | Alta | Médio | Particionamento por mês (RFC futuro), purge retenção |
| R-K5 | `KommoMetricSnapshot` dessincroniza | Média | Alto | `$transaction` snapshot + write; recon daily valida; test de drift |
| R-K6 | Token Kommo vaza em log | Baixa | Crítico | Lint rule custom + envelope encryption + audit semestral |
| R-K7 | OAuth refresh falha em massa | Baixa | Alto | Alerta P1 + cron proativo 24h antes + reconnect manual |
| R-K8 | Cliente tem Kommo tier free (sem webhooks) | Média | Alto | Detectar no connect + fallback 100% cron (delay aceito) |
| R-K9 | Custom pipelines com fields não-padrão | Alta | Médio | Whitelist conservadora + RFC por field solicitado |
| R-K10 | LGPD finding em audit externa | Baixa | Crítico | Audit trimestral + disconnect-with-purge + política configurável (RFC futuro) |
| R-K11 | Webhook endpoint alvo de DoS | Baixa | Alto | Rate-limit 300/min/workspaceId + WAF + HMAC rejeita em <1ms |
| R-K12 | Regressão em squad-dashboards ao adicionar adapters | Média | Médio | Regression suite squad-dashboards + contract test + aprovação Thales Rocha |
| R-K13 | CardType GAUGE atrasa Fase 2 | Média | Médio | RFC em paralelo com Sprint 4; fallback DONUT |

---

## 17. Checklist de aprovação

Antes de Sprint 1:

- [ ] **Conformidade com `.claude/standards/99-referencia-completa.md` validada** — regras invioláveis 1-14 (seção 1.4)
- [ ] RFC `.claude/rfc/kommo-001-foundations.md` criada e revisada por squad-dashboards + squad-workspace
- [ ] ADRs 004-009 escritos
- [ ] App OAuth2 registrado no Kommo (client_id + secret em secret manager)
- [ ] Tier da conta Kommo do cliente validado (webhooks disponíveis)
- [ ] Redis + BullMQ provisionados em staging (capacidade 1000 webhooks/min)
- [ ] KMS / envelope encryption definido (Coolify secret ou equivalente)
- [ ] Pasta externa `C:\Users\USER\Documents\agents\kommo` inventariada (Rafael)
- [ ] Thales Rocha ciente do contrato de adapter + whitelist
- [ ] Debora Lima ciente do seed "Analytics Comercial" (Sprint 4)
- [ ] Iago Silveira ciente da RFC GAUGE (Fase 2)
- [ ] Squad-fe-dashboards ciente de `KommoConnectCard` + `KommoBackfillProgress`
- [ ] Approval PO para 8 semanas × 4 pessoas + handshakes com 2 squads

---

## 18. Critical files to modify

### Novos arquivos (criar)
- `mundial-erp-api/prisma/migrations/*_kommo_foundations_1/migration.sql`
- `mundial-erp-api/prisma/migrations/*_kommo_foundations_2/migration.sql`
- `mundial-erp-api/prisma/rollbacks/kommo_foundations_*.down.sql`
- `mundial-erp-api/src/modules/kommo-accounts/**`
- `mundial-erp-api/src/modules/kommo-webhooks/**`
- `mundial-erp-api/src/modules/kommo-workers/**`
- `mundial-erp-api/src/modules/kommo-reconciliation/**`
- `mundial-erp-api/src/modules/kommo-api-client/**`
- `mundial-erp-api/src/modules/kommo-snapshots/**`
- `mundial-erp-api/src/modules/kommo-adapters/**`
- `mundial-erp-web/src/features/kommo/**`
- `mundial-erp-web/src/features/dashboards/kommo-dashboard/**`
- `mundial-erp-web/src/app/(dashboard)/settings/integrations/kommo/page.tsx`
- `.claude/adr/004-kommo-dual-auth.md`
- `.claude/adr/005-kommo-webhook-hmac.md`
- `.claude/adr/006-kommo-envelope-encryption.md`
- `.claude/adr/007-kommo-outbox-invalidation.md`
- `.claude/adr/008-kommo-reconciliation-strategy.md`
- `.claude/adr/009-kommo-metric-snapshot.md`
- `.claude/rfc/kommo-001-foundations.md`
- `.claude/rfc/dashboards-002-gauge-cardtype.md` (Fase 2)
- `.claude/runbooks/kommo-incidents.md`

### Arquivos existentes (editar — aditivo)
- [schema.prisma](../../mundial-erp-api/prisma/schema.prisma) — 11 models + 5 enums + relação inversa em `Workspace` e opcional em `User`
- [queue.module.ts](../../mundial-erp-api/src/modules/queue/queue.module.ts) — `QUEUE_KOMMO_WEBHOOKS`, `QUEUE_KOMMO_BACKFILL`
- [app.module.ts](../../mundial-erp-api/src/app.module.ts) — importar os módulos `Kommo*`
- [feature-flags/](../../mundial-erp-api/src/common/feature-flags/) — `kommo-feature-flag.guard.ts`
- [env.validation.ts](../../mundial-erp-api/src/config/env.validation.ts) — `KOMMO_CLIENT_ID`, `KOMMO_CLIENT_SECRET`, `KOMMO_OAUTH_REDIRECT_URI`, `KOMMO_CSRF_SECRET`, `KOMMO_ENCRYPTION_KEY_ID`
- `.claude/skills/squads-map.mdc` — registrar `squad-kommo` como peer de `squad-sync`
- `.claude/plan/PLANO.md` — addendum pós-GA MVP

### Arquivos de referência (ler, NÃO modificar)
- [task-outbox/](../../mundial-erp-api/src/modules/task-outbox/) — template outbox + worker
- [areas/](../../mundial-erp-api/src/modules/bpm/definitions/areas/) — template módulo NestJS
- [squad-dashboards.mdc](../skills/squad-dashboards.mdc) — contrato query engine
- [squad-kommo.mdc](../skills/squad-kommo.mdc) — ownership do squad

---

## 19. Verification (end-to-end)

### Sprint 1
1. `pnpm --filter mundial-erp-api prisma migrate dev` — `kommo_foundations_1` aplica sem erro
2. `/kommo/connect` (OAuth) ou `POST /kommo/accounts/token` em staging
3. Webhook simulado via `curl` com HMAC válido → 200 em <100ms + `KommoMessage` gravado
4. Re-enviar mesmo webhook → 200 `deduplicated: true`
5. HMAC inválido → 401; workspaceId errado → 403
6. `pnpm --filter mundial-erp-api test:e2e -- kommo`

### Sprint 2
1. 9 tipos de evento sequenciais → todos processados
2. Deletar `KommoWebhookEvent` após gravar entidade → cron 5min reaplica
3. Grafana `kommo-sync` visível
4. `pnpm --filter mundial-erp-api test:e2e` sem falha nova

### Sprint 3
1. Backfill 90d em 1 workspace com 10k conversations → <2h, retomável
2. Card experimental `kommoConversations` → `/cards/:cardId/data` retorna shape
3. Evento `chat_resolved` → snapshot `total_resolved` incrementa em <1s
4. Drift daily < 1%

### Sprint 4 (GA MVP)
1. `/paineis/analytics-comercial` → 8 cards em <2s
2. Mutação no Kommo → card atualiza em ≤10s
3. Threat model + pentest interno sem findings críticos
4. Rollout canary 1 → 48h → 10% → 100%

### Fase 2 (Sprints 5-6)
1. 17 cards renderizando; filtro pipeline aplica globalmente
2. GAUGE renderiza com anel + %
3. Lighthouse `/paineis/analytics-comercial`: Perf ≥ 85, A11y ≥ 95
