# Threat Model — Kommo Query Engine (Dashboards)

> **Owner:** Hugo Monteiro (Squad Dashboards — QA + Security + Seed Senior)
> **Co-owner:** Thales Rocha (Query Engine Owner)
> **Handshake:** Carolina (Squad Kommo — QA do pipeline webhook/worker/cron)
> **Fase:** Sprints 1-4 (Fase MVP) + quarterly review pos-GA
> **Metodologia:** STRIDE + CVSS 3.1 (quando aplicável) + handshake explícito de escopo com squad-kommo
> **Fonte:** `.claude/plan/PLANO-KOMMO-DASHBOARD.md` §§ 8.6, 8.7, 9, 14, 16 + `.claude/skills/squad-dashboards.mdc` (Princípios Inegociáveis #2, #3, #4, #9, #12, #13) + `.claude/agents/agent-cto.md`

> **Observação sobre pasta:** a pasta `.claude/security/` foi proposta por este documento — não existia padrão prévio no repositório (verificado em 2026-04-24). Caso o CTO decida mover para `.claude/threat-models/` ou `.claude/adr/security/`, renomear ambos os artefatos (`threat-model-kommo-query-engine.md` + `test-plan-kommo-dashboard.md`) preservando links cruzados. Registrado como open question em §6.

---

## 1. Escopo e Fronteira

### 1.1 O que este threat model COBRE

Tudo a partir do momento em que um dado Kommo **já está persistido** em uma tabela local (`KommoConversation`, `KommoMessage`, `KommoLead`, `KommoAgent`) e é **consumido** pelo `DashboardCardQueryService` via um dos 4 novos adapters (`kommoConversations`, `kommoMessages`, `kommoLeads`, `kommoAgents`) — até o momento em que a resposta JSON é entregue ao frontend.

Inclui:
- Entradas HTTP em rotas de dashboards que referenciam entidades Kommo
- Validação/sanitização de `dataSource`, `axisConfig`, `cardFilters`, `globalFilters`
- Whitelists de `entity`/`field`/`operator` por adapter Kommo
- Tradução de filtros em Prisma tipado (zero `$queryRaw`)
- Cache Redis por `(cardId, filtersHash, workspaceId)`
- Invalidação de cache via outbox `KOMMO_ENTITY_CHANGED`
- Shape de resposta por `CardType` (KPI_NUMBER, TABLE, BAR/LINE/PIE/DONUT/AREA/STACKED_BAR) + `GAUGE` em Fase 2
- Logs estruturados do query engine
- RBAC + rate limit + envelope `{data, meta}` nas rotas afetadas

### 1.2 O que este threat model NÃO COBRE (delega explicitamente a Carolina — squad-kommo)

| Superfície | Dona | Documento |
|---|---|---|
| HMAC do webhook `POST /webhooks/kommo/:workspaceId` (algorithm downgrade, clock skew, replay) | Carolina | Threat model squad-kommo (R-K1) |
| Rate-limit do webhook (300/min/workspaceId) e do API Kommo outbound (7 req/s + 30 req/min) | Carolina | R-K2 + R-K11 |
| OAuth2 state/CSRF, refresh token rotation, envelope encryption dos tokens | Carolina | ADR-004 + ADR-006 + R-K7 |
| Worker BullMQ idempotência, DLQ, circuit breaker, retry, `$transaction` de escrita + outbox emission | Carolina | R-K5 + R-K8 |
| Crons `kommo-recon-5min/hourly/daily`, backfill 90d retomável | Carolina | §8.4 + §8.5 |
| Purge por retenção (`KommoMessage` > retention_policy), disconnect com `?purge=true` | Carolina | §8.8 + R-K10 (conjuntamente com Hugo em LGPD audit) |

### 1.3 Zona cinza (co-ownership Carolina + Hugo)

- **Outbox event `KOMMO_ENTITY_CHANGED` consumido pelo cache invalidation:** Carolina emite o evento dentro de `$transaction` de escrita; Hugo valida que o consumer do cache invalida corretamente a chave `(cardId, filtersHash, workspaceId)` de **todos os workspaces** que dependem da entidade — nunca apenas do workspace de origem, pois não é possível vazar cross-tenant, mas é possível deixar cache stale em workspace com dashboard compartilhando entidade (improvável no modelo atual, mas documentar).
- **Schema de payload entre worker e query engine:** Carolina congela o contrato do `KommoEntityChangedEvent`; Hugo valida que mudanças no payload não quebram adapters.
- **Fixture de seed Kommo (2 workspaces, 5 agents, 10 pipelines, etc.):** Carolina expõe `KommoFixtureBuilder` em `test/fixtures/kommo/`; Hugo usa em E2E de dashboards.

---

## 2. Superfície de Ataque (Entry Points)

| # | Entry Point | Auth | Rate limit | Entradas críticas | Saída sensível |
|---|---|---|---|---|---|
| EP-1 | `POST /dashboards/:id/cards` | JWT + WorkspaceGuard + `@Roles(Admin\|Manager\|Operator)` | 30/min/user | body: `{type: CardType, dataSource: JSON, axisConfig?: JSON, config?: JSON}` | `{data: DashboardCard}` |
| EP-2 | `PATCH /dashboards/:id/cards/:cardId` | idem EP-1 | 60/min/user | idem + `schemaVersion` | idem |
| EP-3 | `POST /dashboards/:id/filters` | JWT + WorkspaceGuard + `@Roles(Admin\|Manager\|Operator)` | 30/min/user | body: `{field, operator, value, label}` | `{data: DashboardFilter}` |
| EP-4 | `GET /dashboards/:id/cards/:cardId/data` | JWT + WorkspaceGuard | 60/min/user | query: `dashboardFiltersHash` (opcional) | `{data: CardDataResult}` — **HOT PATH** |
| EP-5 | `GET /dashboards/:id` (com cards + filtros) | JWT + WorkspaceGuard | 120/min/user | path params | lista de cards com `dataSource` + `axisConfig` (contém potencialmente valores informados pelo usuário) |
| EP-6 | `POST /dashboards` | JWT + WorkspaceGuard + `@Roles(Admin\|Manager\|Operator)` | 10/min/user | body inclui array de cards opcional | `{data: Dashboard}` |
| EP-7 | Outbox consumer `KOMMO_ENTITY_CHANGED` | Interno (não exposto) | N/A | `{entity, entityId, workspaceId, pipelineId?}` | Invalida cache Redis |
| EP-8 | Cache Redis `dashboards:card:{cardId}:{workspaceId}:{filtersHash}` | Interno (não exposto) | N/A | chave composta | resultado JSON do card |

**Para adapters Kommo, só rotas que recebem `dataSource.entity ∈ {kommoConversations, kommoMessages, kommoLeads, kommoAgents}` são consideradas.**

---

## 3. Assets

Ordenados por criticidade:

1. **Dados comerciais Kommo (PII + sigilo comercial)** — leads, conversations, `contentPreview` de mensagens, `responsibleAgentId`, `departmentId`, `pipelineId`. Vazamento cross-tenant = **P0 crítico** (LGPD + confidencialidade comercial).
2. **Tokens Kommo** (accessToken/refreshToken/hmacSecret) — encriptados via envelope encryption (ADR-006). Este threat model só trata de **logs vazando token**; criptografia é escopo de Carolina.
3. **Cache Redis de resultados de cards** — contém o mesmo dado sensível das tabelas, agora expandido em shape agregado. Chave mal-formada = vazamento cross-tenant silencioso.
4. **`KommoMetricSnapshot`** (pré-agregações) — contém contadores por (workspaceId, metricKey, pipelineId, date). Vazamento cross-tenant = P0.
5. **Logs estruturados** do query engine — `requestId`, `workspaceId`, `userId`, `dashboardId`, `cardId`, `duration_ms`, `cache_hit`, `entity`, `operator`, `field`. **NUNCA logar `value` do filtro integral** (pode conter nome de cliente, email, phone — PII).
6. **Outbox events `KOMMO_ENTITY_CHANGED`** — se vazarem para logger público, permitem enumeração de volume de atividade por workspace.
7. **Schema Postgres** — mensagens de erro não podem vazar nomes de colunas/tabelas.

---

## 4. Threats (STRIDE)

### 4.1 Spoofing

#### T-S1 — Forjar `workspaceId` via JWT manipulado
- **Entry:** EP-1..EP-6
- **Attack:** atacante edita claim `workspaceId` no JWT ou usa JWT roubado de outro workspace.
- **Mitigação existente:** `JwtAuthGuard` valida assinatura; `WorkspaceGuard` extrai `workspaceId` **sempre do JWT do usuário autenticado**, jamais do body/path.
- **Gap:** zero. Teste E2E obrigatório: `kommo-dashboard-cross-tenant.e2e-spec.ts` deve cobrir tentativa de `POST /dashboards/:id/cards` com JWT de W2 apontando para dashboard de W1 → 404.
- **CVSS:** 9.8 Crítico (se burlado).
- **Status:** MITIGADO (testar com regressão contínua).

#### T-S2 — Forjar `ownerId` no body do `POST /dashboards`
- **Entry:** EP-6
- **Attack:** body inclui `ownerId: "uuid-de-outro-user"` tentando criar dashboard em nome de vítima.
- **Mitigação:** server-side ignora `ownerId` do body — sempre aplica `@CurrentUser().id`. DTO não declara `ownerId` como campo público.
- **Teste:** unit test em `dashboards.service.spec.ts` + E2E que envia `ownerId` malicioso e valida que o dashboard criado tem `ownerId === currentUser.id`.
- **Status:** MITIGADO.

#### T-S3 — Forjar `cardId` ou `dashboardId` de outro workspace em `GET /cards/:cardId/data`
- **Entry:** EP-4
- **Attack:** usuário de W2 chama `GET /dashboards/{W1-dashboard-id}/cards/{W1-card-id}/data`.
- **Mitigação:** `DashboardsService.findCardById` filtra por `workspaceId` via `ownerId → User.workspaceId` (ou via `isPublic=true AND owner.workspaceId === currentUser.workspaceId`). Cross-tenant → **404, não 403** (princípio #1 e #12).
- **Teste obrigatório:** cenário em `kommo-dashboard-cross-tenant.e2e-spec.ts`.
- **Status:** MITIGADO.

### 4.2 Tampering

#### T-T1 — SQL injection via `dataSource.filters[i].value` / `cardFilters` / `globalFilters[i].value`
- **Entry:** EP-1, EP-2, EP-3, EP-4 (via filtro aplicado no query engine)
- **Attack payloads (fuzz list obrigatório):**
  - SQL: `'; DROP TABLE kommo_conversations --`, `1' OR '1'='1`, `UNION SELECT * FROM users --`, `"; SELECT pg_sleep(10); --`
  - JSON injection: `{"$ne": null}`, `{"$where": "1==1"}`, `{"$gt": ""}`, `{"constructor": {"prototype": {...}}}`, `{"__proto__": {"isAdmin": true}}`
  - Unicode tricks: `'` (U+0027), `‚` (U+201A), `＇` (U+FF07), ` `, null byte `\x00`, `%00`
  - Array abuse: `["a", "b", {"$ne": null}]` em `operator=IN`
  - Type confusion: `value: {"toString": {...}}`, `value: [Function]`
- **Mitigação existente (query engine atual):**
  - Zero `$queryRaw` em `DashboardCardQueryService` (verificado em 2026-04-24; greppar por `\$queryRaw` em `src/modules/dashboards/**` antes de cada release).
  - `ValidationPipe` global com `whitelist: true, forbidNonWhitelisted: true`.
  - Whitelist de `operator` (EQUALS/NOT_EQUALS/GREATER/LESS/BETWEEN/IN).
  - Whitelist de `field` por entidade — para Kommo, as 4 whitelists abaixo.
- **Mitigação ADICIONAL obrigatória para Kommo (Thales + Larissa):**
  - `class-validator` por **operator** no DTO — cada operator tem seu próprio schema (ex: `BETWEEN` exige `@IsArray() @ArrayMinSize(2) @ArrayMaxSize(2)`; `IN` exige `@IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)`; `EQUALS/NOT_EQUALS` valida `@IsString() | @IsUUID() | @IsNumber() | @IsBoolean() | @IsDate()` conforme `field`).
  - Transformador Zod no boundary: `KommoConversationsFilterSchema.safeParse(value)` antes do adapter processar.
  - Rejeição de qualquer chave de objeto começando com `$`, `_`, ou nome que começa com uppercase — bloqueia JSON Mongo operators e prototype pollution.
- **CVSS:** 9.8 Crítico (SQL injection em entidade com PII + sigilo comercial).
- **Status:** MITIGADO no query engine genérico; **pendente validação específica por adapter Kommo** (entregar com Thales + Larissa no Sprint 2).

#### T-T2 — Injetar `dataSource.entity` fora do whitelist
- **Entry:** EP-1, EP-2
- **Attack payloads:**
  - `"orders;--"`, `"../orders"`, `"ORDERS"` (case mismatch), `"kommo_conversations"` (underscore vs camel), `"kommoConversations\x00"`, `"kommoConversations "` (trailing whitespace), `"kommoConversations; DROP TABLE"`, `"kommoConversations' OR 1=1"`, `"[kommoConversations]"`, `"{kommoConversations}"`.
- **Mitigação existente:**
  - `SUPPORTED_ENTITIES` enum check em `DashboardCardQueryService.normalizeEntity()` — qualquer valor fora do whitelist → `BadRequestException` com mensagem **genérica** (não vazar lista inteira em prod; em dev/staging OK).
  - Adicionar em Sprint 1: `SUPPORTED_ENTITIES` inclui `'kommoConversations', 'kommoMessages', 'kommoLeads', 'kommoAgents'` — e **apenas eles** (além dos 7 existentes).
- **Mitigação adicional:** `@IsIn([...SUPPORTED_ENTITIES])` no DTO `DataSourceDto` antes mesmo de chegar no service (defense in depth).
- **Gap:** `normalizeEntity` hoje aceita alias `order/orders` via `.toLowerCase()`. Para entidades Kommo **não aceitar aliases** — só o exato camelCase (`kommoConversations`), para evitar ambiguidade com `kommo_conversations` (tabela) e reduzir superfície.
- **CVSS:** 8.1 Alto (eleva para 9.x se combinado com T-T1).
- **Status:** PARCIAL — depende de Thales atualizar whitelist + Hugo fuzzar payloads.

#### T-T3 — Injetar `field` fora do ALLOWED_FIELDS por entidade
- **Entry:** EP-1, EP-2, EP-3 (via `axisConfig.xField/yField/groupBy` e via `filters[i].field`)
- **Attack payloads:**
  - `"workspaceId"` (tenta filtrar por tenant diferente), `"deletedAt"` (tenta ver registros deletados), `"password"`, `"hmacSecret"`, `"accessToken"`, `"refreshToken"` (em tabelas que não têm mas o fuzz testa alguém remoto), `"__proto__"`, `"constructor"`, `"prototype"`, `"id.workspaceId"`, `"responsibleAgentId)) --"`.
- **Mitigação:**
  - `ALLOWED_FIELDS[entity]`, `ALLOWED_VALUE_FIELDS[entity]`, `ALLOWED_GROUP_FIELDS[entity]` — todos Set lookup O(1).
- **Whitelists Kommo (congelar em Sprint 2, revisar por RFC a partir de Sprint 5):**

```ts
ALLOWED_FIELDS.kommoConversations = new Set([
  'status', 'responsibleAgentId', 'pipelineId', 'departmentId',
  'createdAt', 'resolvedAt', 'lastMessageAt', 'firstResponseAt',
]);
ALLOWED_FIELDS.kommoMessages = new Set([
  'direction', 'conversationId', 'authorAgentId', 'createdAt',
]);
ALLOWED_FIELDS.kommoLeads = new Set([
  'pipelineId', 'status', 'responsibleAgentId', 'createdAt', 'valueCents',
]);
ALLOWED_FIELDS.kommoAgents = new Set([
  'departmentId', 'isActive', 'createdAt',
]);
```

- **Proibidos explicitamente** (não entram em ALLOWED_FIELDS jamais, mesmo via RFC sem ADR):
  - `workspaceId`, `accountId`, `kommoAccountId` — nunca filtráveis (fora do contrato; workspaceId é injetado automaticamente).
  - `deletedAt` — excluída por soft delete default (`where.deletedAt = null`).
  - `*Hash`, `*Secret`, `*Token`, `contentPreview` (parcialmente sensível; agregações `GROUP BY contentPreview` são proibidas).
- **CVSS:** 7.5 Alto (eleva se combinado com cross-tenant).
- **Status:** PARCIAL — Thales implementa whitelist; Hugo fuzza.

#### T-T4 — Injetar `operator` fora do whitelist
- **Entry:** EP-3 (DashboardFilter) e via `GlobalFilter[]` no EP-4
- **Attack payloads:** `"RAW"`, `"CONTAINS"` (operator que ainda não existe), `"regex"`, `"LIKE"`, `"EXISTS"`, `"$ne"`, `"$gt"`, `"OR"`, `"NOT IN"`, `"IN; --"`.
- **Mitigação:** `OperatorEnum` em DTO + `operatorToPrisma()` tem `default: return value` — **alterar para `default: throw new BadRequestException('Operator inválido')`** (gap atual no código em `dashboard-card-query.service.ts:322` — retorna valor bruto, ignorando operator desconhecido).
- **CVSS:** 7.5 Alto.
- **Status:** GAP — abrir bug em `operatorToPrisma()`; Thales corrige no Sprint 1. Hugo adiciona teste unitário na mesma PR.

#### T-T5 — JSON `dataSource` / `axisConfig` / `config` com chaves extras
- **Entry:** EP-1, EP-2
- **Attack payload:** `{"entity": "kommoConversations", "$where": "sleep(10)", "rawSql": "SELECT pg_sleep(10)"}`.
- **Mitigação:** `ValidationPipe` global `forbidNonWhitelisted: true` rejeita; DTOs são classes com `@IsOptional()` apenas em chaves declaradas.
- **Nota:** `forbidNonWhitelisted` atua em nível raiz; objetos aninhados (como `dataSource`) precisam `@Type(() => DataSourceDto)` + `@ValidateNested()` — validar que está aplicado.
- **Status:** MITIGADO (validar aplicação em nested).

#### T-T6 — Adapter novo (Larissa) omite `workspaceId` por engano
- **Entry:** EP-4 (via adapter `kommoConversations/Messages/Leads/Agents`)
- **Attack:** bug em commit de adapter retira a cláusula `where.workspaceId = currentWorkspaceId` — dados vazam cross-tenant em produção silenciosamente.
- **Mitigação obrigatória:**
  1. **Unit test em cada adapter** (`kommo-{entity}.adapter.spec.ts`) que mocka Prisma e faz `expect(prismaMock.kommoConversation.findMany).toHaveBeenCalledWith(expect.objectContaining({where: expect.objectContaining({workspaceId: mockWsId})}))` — rodar para **todos os 6 operators × todos os 7 fields × todos os 8 CardTypes** (matriz dimensionada).
  2. **Lint rule custom** (`eslint-plugin-mundial/require-workspace-id-in-kommo-adapters`) — detecta chamadas a `this.prisma.kommoX.findMany/aggregate/groupBy/count` sem `workspaceId` em `where`.
  3. **E2E em `kommo-dashboard-cross-tenant.e2e-spec.ts`** — popula W1 com 100 conversations, zero em W2, usuário de W2 consulta card de W2 → retorno vazio (nunca dados de W1).
- **CVSS:** 9.8 Crítico (tenant leak silencioso em prod).
- **Status:** PREVISTO no plano de testes (§ 4 do test plan).

### 4.3 Repudiation

#### T-R1 — User deleta dashboard Kommo e reclama que ninguém deletou
- **Entry:** EP similar a `DELETE /dashboards/:id`
- **Mitigação:**
  - Soft delete (`deletedAt`) já implementado (princípio #10).
  - Audit log estruturado com `actorUserId`, `workspaceId`, `resourceId`, `action`, `timestamp`, `requestId` (reusar `AuditLoggerInterceptor` quando squad-workspace entregar).
- **Status:** DEPENDE de squad-workspace entregar AuditLoggerInterceptor — co-handshake com Clara (squad-workspace).

#### T-R2 — Logs do query engine sem `requestId`
- **Mitigação:** `RequestIdInterceptor` global (já existe); PR bloqueado se `Logger.log/warn/error` não inclui `requestId` + `workspaceId` + `dashboardId` + `cardId`.
- **Controle:** lint rule custom (futuro) ou code review manual no Sprint 1.
- **Status:** MITIGADO via review manual; automatizar em Sprint 4.

### 4.4 Information Disclosure (o pior cenário — tenant leak)

#### T-I1 — Dashboard de W1 marcado `isPublic=true` vaza para W2
- **Entry:** EP-5
- **Attack:** usuário de W2 enumera IDs de dashboards e tenta `GET /dashboards/:id`.
- **Mitigação:** `DashboardsService.findOne` verifica `dashboard.ownerUser.workspaceId === currentUser.workspaceId` ANTES de verificar `isPublic`. Cross-workspace → 404.
- **Teste permanente:** princípio #12 do skill exige E2E fixo.
- **CVSS:** 8.6 Alto.
- **Status:** MITIGADO (já implementado; adicionar Kommo fixtures ao teste).

#### T-I2 — Cache Redis serve resultado de W1 para W2 por chave mal-formada
- **Entry:** EP-4 + EP-8
- **Attack:** bug em cache key (ex: `dashboards:card:{cardId}:{filtersHash}` SEM `workspaceId`) ou ordem inconsistente. Card público de W1 (`cardId`) consultado por W2 com mesmo `filtersHash` → hit no cache de W1, vaza resultado.
- **Mitigação OBRIGATÓRIA (Thales + Hugo):**
  1. Chave **sempre** no formato: `dashboards:card:{workspaceId}:{cardId}:{filtersHash}` — `workspaceId` PRIMEIRO para permitir wildcard delete por workspace.
  2. `filtersHash` é SHA-256 determinístico de filtros canonicalizados (ordem de chaves fixada).
  3. `CacheService.get/set` rejeita chamadas sem `workspaceId` (TypeScript obrigatório + runtime assert).
  4. Teste E2E `kommo-dashboard-cache-isolation.e2e-spec.ts`: popula cache de W1, força query de W2 com mesmo cardId (cross-workspace access → já bloqueado antes do cache por T-S3, mas valida que se algum bypass existir, cache ainda isola).
  5. Teste específico: W1 e W2 criam cada um seu dashboard+card com `dataSource.entity=kommoConversations`. Forçam a ter filters hash idêntico. Consulta W1 → cache hit. Consulta W2 → **cache miss garantido** (chaves diferentes por workspaceId).
- **CVSS:** 9.8 Crítico.
- **Status:** PENDENTE — Thales + Hugo implementam em Sprint 3 (cache é Etapa 3).

#### T-I3 — Log vaza `contentPreview` de mensagem Kommo integral
- **Entry:** EP-4 + logs do query engine + logs do adapter
- **Attack:** adapter loga `console.log(JSON.stringify(row))` (proibido pelo standard 4, mas defense in depth) — payload inclui `contentPreview` (200 chars) + `phone`/`email` do lead.
- **Mitigação:**
  1. `Logger` do NestJS só (já regra do standard).
  2. `DashboardCardQueryService` **NUNCA** loga `rows` — só loga `rowCount`, `duration_ms`, `cache_hit`.
  3. Lint rule custom `no-log-kommo-content`: detecta `this.logger.(log|warn|debug).*contentPreview|phone|email`.
  4. Truncamento defensivo em Fase 2: se por emergência precisar logar payload para debug, `truncate(contentPreview, 50)` + `mask(phone)` + `mask(email)`.
- **Conformidade:** PLANO §9.3 proíbe logar `contentPreview` integral; princípio #13 do skill.
- **CVSS:** 7.1 Alto (LGPD + quebra de sigilo de conversa privada).
- **Status:** PENDENTE — lint rule em Sprint 2.

#### T-I4 — Adapter retorna `accountId`, `workspaceId`, `hmacSecret`, ou tokens no DTO de response
- **Entry:** EP-4 (shape da resposta)
- **Attack:** `TABLE` card com `dataSource.entity=kommoAgents` retorna todas as colunas da tabela — incluindo colunas que nunca deveriam sair do backend (ex: `workspaceId`, `kommoAccountId`, `rawMetadata` com tokens se por bug foi salvo lá).
- **Mitigação:**
  1. DTO de response explícito por entidade (`KommoAgentTableRowDto`) com apenas whitelist de campos visíveis.
  2. `TABLE` executor usa `select: {...}` explícito, **nunca `findMany({ where })` sem select** — corrigir gap atual em `executeTable()` (linha 416-420 de `dashboard-card-query.service.ts`) que faz `findMany` sem select e depois filtra chaves em memória (`excluded = new Set(['deletedAt', 'updatedAt'])`).
  3. Code review obrigatório: Hugo é reviewer obrigatório em toda PR de adapter Kommo.
- **Campos proibidos no shape de saída (hardcoded):**
  - `workspaceId`, `accountId`, `kommoAccountId` (ou qualquer FK de tenant)
  - `hmacSecret`, `accessToken`, `refreshToken`, `refreshTokenIv`, `accessTokenIv`, `encryptionKeyId`
  - `rawPayload`, `rawMetadata` (JSON bruto do Kommo pode conter tokens ou PII não sanitizada)
  - `contentHash` (não vaza dado, mas permite comparação cross-tenant — negar por default, liberar por RFC se necessário)
- **CVSS:** 9.1 Crítico.
- **Status:** GAP no query engine atual (`executeTable` não usa `select`); abrir bug P1 com Thales no Sprint 1.

#### T-I5 — Mensagens de erro vazam schema do banco
- **Entry:** EP-1..EP-6 (qualquer 400/500)
- **Attack:** payload malformado dispara erro Prisma com mensagem `column "kommo_messages.author_agent_id" does not exist` ou `invalid input syntax for type uuid: "...fuzz payload..."`.
- **Mitigação:**
  - `AllExceptionsFilter` global: em `NODE_ENV=production`, trocar mensagem por genérica (`"Bad request"`) + log interno com detalhe.
  - Em dev/staging, manter detalhe para debug.
- **Status:** DEPENDE de verificar filter global; adicionar teste E2E que gera erro e valida resposta é genérica.

#### T-I6 — Enumeração de dashboards via `isPublic=true`
- **Entry:** EP-5
- **Attack:** atacante tenta IDs sequenciais/randomizados. Mitigado por ID ser `cuid` (25 chars, ~128 bits entropia) + 404 uniforme independente de existência. Valida no cross-tenant spec.
- **Status:** MITIGADO (IDs são cuid; timing attacks não aplicáveis — Prisma responde em tempo uniforme para 404 vs permission-denied).

#### T-I7 — Enumeração de volume por workspace via latência de cache
- **Entry:** EP-4
- **Attack:** atacante observa tempo de resposta para inferir se outro workspace tem card popular (cache warm) ou não. Muito sofisticado; baixa probabilidade.
- **Mitigação:** jitter de TTL, resposta com `cache_hit` em header apenas em dev/staging (nunca em prod).
- **Status:** ACEITO (baixo risco).

### 4.5 Denial of Service

#### T-D1 — `filters[i].value` com array IN gigante (10k elementos)
- **Entry:** EP-3, EP-4
- **Attack:** `{operator: "IN", value: [10000 elementos]}` → Postgres plano cai para seq scan mesmo com índice.
- **Mitigação:** `@ArrayMaxSize(50)` no DTO de filter; teste unit rejeita.
- **Status:** PREVISTO; validar em DTO.

#### T-D2 — Dashboard com 100 cards + `autoRefreshSeconds=5` → load amplification
- **Entry:** EP-4 via frontend auto-refresh
- **Attack:** usuário cria dashboard "nuclear" que derruba próprio backend (legítimo ou não).
- **Mitigação:**
  - Limite max **20 cards** por dashboard (validar no DTO de create + batch layout).
  - `autoRefreshSeconds` minimum **30s** (já plano: configurável mas min 30).
  - Rate limit 60/min/user em `/cards/:cardId/data` efetivo (princípio #11).
- **Status:** PREVISTO; validar caps em DTO.

#### T-D3 — Cache miss burst → Postgres saturado
- **Entry:** EP-4 após deploy (cache frio) ou após invalidação em massa via outbox
- **Attack:** thundering herd — 1000 clientes pedem mesmo `cardId` no mesmo segundo.
- **Mitigação (Thales, Sprint 3):**
  - Single-flight por `(workspaceId, cardId, filtersHash)` no nível do service — só 1 query Postgres; demais aguardam.
  - TTL jitter ±10% para evitar invalidação simultânea.
- **Status:** PLANEJADO para Sprint 3 (etapa hardening).

#### T-D4 — Query groupBy em `kommoMessages` com 500k+ rows sem filtro de data
- **Entry:** EP-4
- **Attack:** `BAR_CHART` com `kommoMessages.groupBy=HOUR(createdAt)` sem `dateRange` filter → full scan.
- **Mitigação:**
  - Obrigar `dateRange` filtro default (ex: `last_30d`) se entidade `kommoMessages` e nenhum `dateRange` fornecido.
  - Logger warning + SLI alarm se query > 1.5s.
- **Status:** DEFINIR em Sprint 2 com Thales + Larissa.

### 4.6 Elevation of Privilege

#### T-E1 — Viewer cria card via bypass de UI
- **Entry:** EP-1, EP-2, EP-3, EP-6
- **Attack:** role `Viewer` (só leitura por design) chama rota de mutação via curl/postman.
- **Mitigação:** `@Roles(Admin|Manager|Operator)` no controller — Viewer barrado no guard.
- **Teste E2E obrigatório:** cenário em `kommo-dashboard-rbac.e2e-spec.ts` (ou anexado ao whitelist spec).
- **Status:** MITIGADO (decorator já existe no padrão do projeto).

#### T-E2 — Operator de W1 edita dashboard publicado por Admin da W1
- Caso legítimo (intra-workspace); permitido se `isPublic=true` e role permite mutação no próprio workspace. **NÃO é Elevation.**
- Cross-workspace: W2-Operator tenta editar dashboard-público de W1 → 404 (T-S3 já cobre).

---

## 5. Riscos Priorizados (Top 5)

| # | ID | Likelihood | Impact | CVSS | Owner | Sprint |
|---|---|---|---|---|---|---|
| 1 | T-I2 — Cache cross-tenant | Media | Crítico | 9.8 | Thales + Hugo | Sprint 3 |
| 2 | T-T1 — SQL injection via filters | Media | Crítico | 9.8 | Thales + Larissa + Hugo | Sprint 1-2 |
| 3 | T-T6 — Adapter omite workspaceId | Alta | Crítico | 9.8 | Larissa + Hugo (lint + unit test) | Sprint 2 |
| 4 | T-I4 — Adapter retorna campos sensíveis no shape | Alta | Crítico | 9.1 | Thales + Hugo | Sprint 1 (bug em `executeTable`) |
| 5 | T-I1 — isPublic vaza cross-workspace | Baixa | Alto | 8.6 | Debora + Hugo (E2E permanente) | Sprint 1 |

Riscos secundários (Alto/Médio):
6. T-T3 — field fora de whitelist (7.5) — Thales + Hugo
7. T-T4 — operator desconhecido cai no default `return value` (GAP ATUAL, 7.5) — fix no Sprint 1
8. T-I3 — log vaza contentPreview (7.1, LGPD) — lint rule Sprint 2
9. T-D3 — thundering herd cache miss — Sprint 3

---

## 6. Open Questions (bloqueios a resolver com CTO/Thales antes de GA)

1. **Pasta de security docs:** `.claude/security/` é a convenção adotada por este documento. Confirmar com CTO ou migrar se houver padrão diferente (verificado em 2026-04-24: pasta não existia).
2. **`SUPPORTED_ENTITIES` aceita aliases hoje** (`order → orders`). Para Kommo, **proibir aliases** (apenas camelCase exato). Confirmar com Thales antes de alterar `normalizeEntity()`.
3. **`executeTable` não usa `select` explícito** (dashboard-card-query.service.ts:416-420) — gap T-I4. Registrar bug P1 no repo backlog em Sprint 1. Fix: DTO `select` por entidade (adapter expõe).
4. **`operatorToPrisma` tem `default: return value`** (linha 322) — gap T-T4. Alterar para `throw new BadRequestException`. Bug P1 Sprint 1.
5. **Cache key format** — `{workspaceId}:{cardId}:{filtersHash}` vs `{cardId}:{workspaceId}:{filtersHash}` — Thales decide e documenta em ADR antes de Sprint 3.
6. **Lint rule custom** (`no-log-kommo-content`, `require-workspace-id-in-kommo-adapters`) — Hugo propõe; Thales aprova; criar plugin `eslint-plugin-mundial` ou usar `eslint-plugin-custom-rules`. Decisão em Sprint 2.
7. **Runbook de incidentes** — `.claude/runbooks/kommo-incidents.md` (coordenar com Rafael — squad-kommo) antes de GA.
8. **Handshake explícito com Carolina** sobre quem testa a integridade do payload `KOMMO_ENTITY_CHANGED` no consumer — proposta: Carolina valida emissão, Hugo valida consumo. Fechar contrato em Sprint 2.

---

## 7. Fuzz Continuo em CI (especificação)

**Script proposto (descrição, implementação em Sprint 2):** `scripts/fuzz-kommo-query-engine.ts`

### 7.1 Payloads em `dataSource.filters[i].value` (500 payloads)

| Categoria | Quantidade | Exemplos |
|---|---|---|
| SQL injection clássica | 80 | `'; DROP TABLE--`, `' OR '1'='1`, `UNION SELECT pg_sleep(10)--`, `1'; SELECT version()--` |
| JSON Mongo-style injection | 60 | `{"$ne": null}`, `{"$gt": ""}`, `{"$where": "1==1"}`, `{"$regex": ".*"}` |
| Prototype pollution | 40 | `{"__proto__": {"isAdmin": true}}`, `{"constructor": {"prototype": {...}}}` |
| Unicode / encoding tricks | 50 | `'` (U+0027), `‚`, `＇`, ` `, `\x00`, `%27`, `%00` |
| Array abuse | 40 | arrays 10k+ elementos (T-D1), arrays com objetos mistos, nested arrays |
| Type confusion | 50 | `{"toString": "..."}`, functions serializadas, Symbols, BigInt |
| UUID malformado | 30 | `"not-a-uuid"`, `"00000000-0000-0000-0000-000000000000"`, UUID v4 mas de outro workspace |
| Long strings | 30 | strings com 10k+ chars, repeat patterns |
| Special chars | 50 | null byte, CR/LF, `\t`, `\r\n`, `\\`, `'`, `"`, `<script>`, `<?php`, `${...}` |
| Empty / nullish | 20 | `""`, `null`, `undefined`, `[]`, `{}`, `0`, `false`, `NaN`, `Infinity` |
| Date edge cases | 30 | `"1970-01-01"`, `"9999-12-31"`, `"abc"`, timestamp -1, timezone mismatches |
| Valid passing payloads | 20 | garantir que fuzz não quebra casos felizes |

### 7.2 Payloads em `dataSource.entity` (50 payloads)

- `"../../orders"` (path traversal)
- `"ORDERS"`, `"Orders"`, `" kommoConversations"`, `"kommoConversations "`, `"kommoConversations\n"`, `"kommoConversations\x00"`
- `"kommo_conversations"`, `"kommo-conversations"`, `"kommoconversations"`, `"KommoConversations"`
- `"kommoConversations; DROP TABLE"`, `"kommoConversations' OR 1=1"`, `"kommoConversations\""`
- `"null"`, `"undefined"`, `""`, `null` (raw)
- `"['kommoConversations']"`, `"{kommoConversations}"`
- variantes Unicode, null bytes, UTF-16 surrogates
- alguns valores válidos (assertiva que continuam válidos)

### 7.3 Payloads em `field` / `axisConfig.xField/yField/groupBy` (30 payloads)

- `"password"`, `"hmacSecret"`, `"accessToken"`, `"refreshToken"`, `"deletedAt"`, `"workspaceId"`, `"accountId"`
- `"__proto__"`, `"constructor"`, `"prototype"`, `"toString"`
- `"status)); DROP TABLE--"`, `"status' OR 1=1 --"`
- `"status.workspaceId"`, `"status/../password"`
- `""`, `null`, `"   "`, `"status\n"`, `"status\x00"`
- Alguns valores válidos (assert pass-through)

### 7.4 Asserts do fuzz

- **Todo payload malicioso → 400** com mensagem genérica (em prod); 400 com detalhe (em dev/staging).
- **Nenhum 500** em toda a suite de fuzz.
- **Zero payloads alcançam Postgres** — validar via query log interceptor (pg_stat_statements em staging ou Prisma middleware logging).
- **Nenhum payload gera entrada no outbox** (não deve disparar invalidação).
- **Tempo de rejeição < 50ms** (early validation, não chega no service).

### 7.5 Cadência

- **Pre-commit hook (husky):** roda suite curta (100 payloads sample).
- **CI em toda PR do squad-dashboards OU squad-kommo:** suite completa (500+50+30 payloads).
- **Nightly:** suite completa + 1000 payloads extras gerados por mutational fuzzing (lib `jsfuzz` ou custom).

---

## 8. Coordenação com Carolina (squad-kommo) — Divisão de Escopo QA

| Aspecto | Dona | Validação esperada |
|---|---|---|
| HMAC webhook, rate limit, OAuth state | Carolina | Passes em fuzz da assinatura + clock skew |
| Idempotência BullMQ, DLQ, retry, `$transaction` escrita + outbox | Carolina | Evento duplicado → 1 escrita; falha → DLQ; outbox emitido só em commit |
| Crons recon, backfill, purge | Carolina | Idempotentes; drift < 1%; purge respeita retenção |
| Token encryption (envelope encryption ADR-006) | Carolina | Unit test envelope encrypt/decrypt; audit log de chave rotation |
| Outbox `KOMMO_ENTITY_CHANGED` — **emissão** | Carolina | Emitido em `$transaction` de toda escrita relevante |
| Outbox `KOMMO_ENTITY_CHANGED` — **consumo pelo cache invalidation** | **Hugo** | Consumer invalida cache corretamente; dead letter tratada |
| Query engine adapter (translate + where + shape) | **Hugo + Thales + Larissa** | Whitelist; tenant-safety; shape por CardType |
| Cache Redis key format + isolation | **Hugo + Thales** | `workspaceId` na chave; cache miss garantido cross-workspace |
| DTO response shape sem campos sensíveis | **Hugo + Thales** | `select` explícito por DTO |
| Logs sem PII | Ambos (cada um na sua superfície) | Carolina valida logs de webhook/worker; Hugo valida logs do query engine |
| LGPD — purge + disconnect + retention | Ambos (audit trimestral conjunto) | Disconnect `?purge=true` apaga tudo; retention funcional |

**Rito de integração:** Hugo e Carolina fazem **syncs semanais de 30min** durante Sprints 1-4 para alinhar fixtures compartilhadas (`KommoFixtureBuilder`), regressão cruzada (cada PR de pipeline roda smoke do query engine; cada PR de query engine roda smoke de webhook idempotency), e reportes de vulnerabilidade descobertas.

---

## 9. Controles Preventivos Transversais

1. **`$queryRaw` grep bloqueante em CI:** pipeline falha se `$queryRaw` aparece em `src/modules/dashboards/**` ou em qualquer `kommo-*.adapter.ts`.
2. **Code review obrigatório — Hugo em toda PR que toca:**
   - `DashboardCardQueryService`
   - `kommo-*.adapter.ts`
   - `*whitelist*.ts`
   - `cache.service.ts` ou consumer de `KOMMO_ENTITY_CHANGED`
   - DTOs de dashboards/cards/filters
3. **Threat model review trimestral** — Hugo + Thales + Carolina + agent-CTO. Atualizar este documento + gerar release notes de segurança.
4. **Pentest interno Sprint 4** (antes de GA) + anual após GA.
5. **Audit LGPD trimestral** — joint Hugo + Carolina.
6. **Dependabot + Snyk em deps de gráficos e libs de query** (Recharts, Prisma, class-validator) — CVE-monitoring.
7. **Feature flag `KOMMO_DASHBOARD_ENABLED` per-workspace** — rollback instantâneo em caso de incidente.

---

## 10. Referências

- `.claude/plan/PLANO-KOMMO-DASHBOARD.md` §§ 8.6, 8.7, 9.2, 9.3, 14, 16
- `.claude/skills/squad-dashboards.mdc` — Princípios Inegociáveis #1-18
- `.claude/skills/squad-kommo.mdc` — ownership de Carolina
- `.claude/agents/agent-cto.md` — princípios CTO
- `.claude/standards/99-referencia-completa.md` — regras invioláveis
- `mundial-erp-api/src/modules/dashboards/dashboard-card-query.service.ts` — implementação atual
- `mundial-erp-api/test/workspace-isolation.e2e-spec.ts` — padrão de E2E cross-tenant
- `.claude/security/test-plan-kommo-dashboard.md` — plano operacional (documento-irmão)
