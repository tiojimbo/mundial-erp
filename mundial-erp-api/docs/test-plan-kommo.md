# Test Plan — Kommo Dashboard Integration (Security + Quality)

> **Owner:** Hugo Monteiro (QA + Security + Seed Senior — Squad Dashboards)
> **Companion document:** `mundial-erp-api/docs/threat-model-kommo.md`
> **Fase:** Sprints 1-4 (MVP) + Sprint 5-6 (Fase 2 GAUGE + 9 cards restantes)
> **Convenções seguidas:** `.claude/plan/PLANO-KOMMO-DASHBOARD.md` §14 + padrão existente em `mundial-erp-api/test/` (E2E em `*.e2e-spec.ts`, unit em `__tests__/*.spec.ts` ao lado dos módulos) + PLANO §1.4 (jest + supertest + k6)
> **Princípios aplicados:** Squad Dashboards skill Princípios #2 (whitelist), #3 (zero SQL bruto), #4 (contratos tipados), #8 (budget p95), #9 (invalidação via outbox), #12 (cross-tenant 404), #13 (logs sem PII), #15 (performance budgets CI-bloqueantes).
> **Status:** **PLANO** — nenhum arquivo `*.spec.ts` criado neste momento; implementação nas Sprints 1-4 por Hugo + pair com Thales/Larissa/Debora.

---

## 0. Índice

1. Objetivo e escopo do test plan
2. Unit tests (`*.spec.ts`)
3. E2E tests (`*.e2e-spec.ts`)
4. Fixtures — `KommoFixtureBuilder`
5. Performance (k6)
6. Visual regression (Storybook)
7. Regression suite cross-squad (Kommo ↔ Dashboards)
8. Critérios de GA (gate Sprint 4)
9. Cadência e donos

---

## 1. Objetivo e Escopo

Garantir que os 4 adapters Kommo (`kommoConversations`, `kommoMessages`, `kommoLeads`, `kommoAgents`) integrem no `DashboardCardQueryService` **sem**:
- Abrir brechas de SQL injection / tampering (T-T1..T-T5)
- Permitir tenant-leak (T-I1, T-I2, T-I4) — nem via API, nem via cache Redis
- Regredir os 8 `CardType` existentes (7 entidades × 8 tipos = 56 combinações atuais, expandindo para 11 × 8 = 88 após Kommo)
- Vazar PII em logs (T-I3)
- Quebrar performance budget (p95 `/cards/:cardId/data` < 400ms cache hit; < 1.5s miss com 500k `KommoMessage`)

---

## 2. Unit Tests (`*.spec.ts`)

### 2.1 Adapters Kommo (Larissa implementa; Hugo revisa — cobertura ≥ 90%)

**Convention:** `mundial-erp-api/src/modules/dashboards/adapters/kommo/__tests__/kommo-{entity}.adapter.spec.ts`

#### 2.1.1 `kommo-conversations.adapter.spec.ts`

Objetivo: cobrir whitelist, todos os 6 operators, shape por `CardType`, injeção obrigatória de `workspaceId`.

Matriz esperada (gerada programaticamente):

| Teste | Combinações | Expectativa |
|---|---|---|
| `workspaceId` é primeira cláusula em **toda** chamada `findMany/aggregate/groupBy/count` | 1 × 6 operators × 7 fields | `expect(prismaMock.kommoConversation.findMany).toHaveBeenCalledWith(expect.objectContaining({where: expect.objectContaining({workspaceId})}))` em 100% dos casos |
| Whitelist aceita apenas `[status, responsibleAgentId, pipelineId, departmentId, createdAt, resolvedAt, lastMessageAt, firstResponseAt]` | 8 fields válidos + 10 inválidos | válidos passam; inválidos → `UnsupportedFieldException` |
| Operators válidos: EQUALS/NOT_EQUALS/GREATER/LESS/BETWEEN/IN | 6 operadores × 2 types (string/date) | Todos traduzem para Prisma input correto |
| Operators inválidos (RAW, CONTAINS, LIKE, REGEX, `$ne`, `$gt`) | 6+ exemplos | `InvalidOperatorException` |
| BETWEEN exige tupla de 2 | `[a,b]`, `[a]`, `[a,b,c]`, `[]`, `null` | primeiro passa; demais → BadRequestException |
| IN exige array não vazio, max 50 elementos | `[a]`, `[...50]`, `[...51]`, `[]` | primeiros dois passam; últimos dois → BadRequestException |
| Shape por `CardType` (KPI_NUMBER, TABLE, BAR/LINE/PIE/DONUT/AREA/STACKED_BAR) | 8 tipos | Cada retorna formato contratado (`{value, label}`, `{columns, rows}`, `{label, value}[]`, `{x, y}[]`) |
| Empty result | 1 teste por CardType | KPI → `{value:0, label:"Total"}`; TABLE → `{columns:[], rows:[]}`; Grouped → `[]`; TimeSeries → `[]` |
| Filtro `responsibleAgentId IS NULL` (card 2 do MVP) | 1 | `{responsibleAgentId: null}` em where |
| Filtro composto `status IN [OPEN, WAITING_RESPONSE] AND resolvedAt IS NULL` | 1 | where combinado correto |
| Soft delete: `deletedAt: null` default sempre aplicado | 1 | Verifica em todas as chamadas |

**Cobertura mínima:** 90% branches + 90% lines.

#### 2.1.2 `kommo-messages.adapter.spec.ts`

Whitelist `[direction, conversationId, authorAgentId, createdAt]`. Mesma matriz adaptada. Atenção especial:
- `direction ∈ {INBOUND, OUTBOUND}` enum — testar caso enum inválido → rejeita.
- `groupBy HOUR(createdAt)` (Fase 2) — validar que transformação hora é server-side e não por input do user.
- **T-I3:** test explícito que adapter NUNCA retorna `contentPreview` em shape `TABLE`.

#### 2.1.3 `kommo-leads.adapter.spec.ts`

Whitelist `[pipelineId, status, responsibleAgentId, createdAt, valueCents]`. Matriz padrão.

#### 2.1.4 `kommo-agents.adapter.spec.ts`

Whitelist `[departmentId, isActive, createdAt]`. Matriz padrão.
- **T-I4:** test que adapter NUNCA retorna `workspaceId`, `accountId`, `kommoAccountId` em shape `TABLE`.

### 2.2 Extensões ao `DashboardCardQueryService` (Thales implementa; Hugo revisa)

**Path:** `mundial-erp-api/src/modules/dashboards/__tests__/dashboard-card-query.service.spec.ts` (expandir existente — hoje só cobre 7 entidades).

Casos novos a adicionar:

| Caso | Expectativa |
|---|---|
| `SUPPORTED_ENTITIES` inclui `kommoConversations`, `kommoMessages`, `kommoLeads`, `kommoAgents` | 4 casos com dispatch correto para adapter Kommo |
| Entity fora do whitelist (ex: `"fake_entity"`, `"../orders"`, `"ORDERS"`, `"kommo_conversations"` com underscore, `"kommoConversations "` com whitespace) | `BadRequestException` com mensagem genérica em prod |
| **Gap atual** — `operatorToPrisma` default retorna valor bruto (linha 322) → corrigir para `throw BadRequestException` + teste que valida | Novo teste verde após fix |
| **Gap atual** — `executeTable` retorna todas as colunas sem `select` explícito (T-I4) → refactor + teste que valida resposta não contém `workspaceId`, `deletedAt`, `contentHash`, `rawMetadata` | Novo teste verde após fix |
| `normalizeEntity` aceita aliases para entidades legadas (`order → orders`), mas **NÃO aceita aliases para Kommo** (só camelCase exato) | Testar 10 variantes Kommo inválidas |
| `workspaceId` é sempre primeira cláusula em `where` final (para Kommo, pois adapters legados dependem de `deletedAt`) | Verificar via Prisma middleware spy |

### 2.3 Unit — Cache Service (Thales implementa; Hugo revisa)

**Path:** `mundial-erp-api/src/modules/dashboards/__tests__/dashboard-cache.service.spec.ts`

| Caso | Expectativa |
|---|---|
| `CacheService.buildKey(workspaceId, cardId, filters)` retorna string canônica | Snapshot test — chave determinística, ordem de filtros não muda hash |
| `filtersHash` é SHA-256 de payload canonicalizado (keys sorted) | Teste 2 filtros semanticamente iguais mas com ordem diferente → mesmo hash |
| `CacheService.get` rejeita chamadas sem `workspaceId` (TypeScript + runtime assert) | `@ts-expect-error` + runtime `throw` |
| `CacheService.invalidate(workspaceId, entity)` invalida chaves `dashboards:card:{workspaceId}:*` dessa entidade | Teste com 3 cards em W1, 2 em W2 → invalida só W1 |
| Single-flight por `(workspaceId, cardId, filtersHash)` — 100 chamadas concorrentes → 1 hit no service | Promise.all + spy contador |
| TTL jitter ±10% | Teste chamada com TTL 60s → valor entre 54s e 66s |

### 2.4 Unit — Outbox Consumer (`KOMMO_ENTITY_CHANGED`)

**Path:** `mundial-erp-api/src/modules/dashboards/__tests__/kommo-cache-invalidation.consumer.spec.ts`

| Caso | Expectativa |
|---|---|
| Recebe evento `entity=conversation, workspaceId=W1` → invalida cache de todos os cards de dashboards em W1 cujo `dataSource.entity=kommoConversations` | Assert lista de chaves invalidadas |
| Recebe evento com `workspaceId` inexistente | Log warning + no-op (não crasha) |
| Recebe evento malformado (sem `workspaceId`) | Dead letter; alerta P2 |
| Evento de `entity=message` invalida cards de `kommoMessages` **e** `kommoConversations` (pois lastMessageAt mudou) | Coordenar com Thales qual regra |
| Cross-workspace: evento de W1 NUNCA invalida cache de W2 | Assert explícito |

### 2.5 Unit — Lint Rules Custom (Sprint 2)

**Path:** `eslint-plugin-mundial/tests/`

| Rule | Caso positivo | Caso negativo |
|---|---|---|
| `require-workspace-id-in-kommo-adapters` | `this.prisma.kommoConversation.findMany({where: {status: 'X'}})` → erro | `this.prisma.kommoConversation.findMany({where: {workspaceId, status: 'X'}})` → ok |
| `no-log-kommo-content` | `logger.log(contentPreview)`, `logger.log(\`msg: ${msg.contentPreview}\`)` → erro | `logger.log({cardId, duration_ms})` → ok |
| `no-query-raw-in-dashboards` | `this.prisma.$queryRaw\`...\`` em `src/modules/dashboards/**` → erro | Uso em outros módulos → ok |

---

## 3. E2E Tests (`*.e2e-spec.ts`)

**Padrão do projeto:** supertest + `AppModule` carregado via `Test.createTestingModule`; `PrismaService` limpeza por `ts` timestamp no nome/email. Referência: `mundial-erp-api/test/workspace-isolation.e2e-spec.ts`.

**Política:** abaixo estão ESQUELETOS documentados (markdown) — **não implementar código agora**. Implementação nas Sprints 1-4.

---

### 3.1 `test/kommo-dashboard-cross-tenant.e2e-spec.ts`

**Objetivo:** validar que dados Kommo de um workspace NUNCA aparecem em outro workspace, mesmo via dashboard público, acesso direto a `cardId`, ou enumeração de IDs.

**Setup:**
- 2 workspaces (W1, W2), cada um com seu Admin.
- `KommoFixtureBuilder`: W1 com 3 pipelines, 5 agents, 100 conversations, 500 messages, 20 leads. W2 com 2 pipelines, 3 agents, 50 conversations, 200 messages, 10 leads.
- W1 Admin cria Dashboard "Analytics W1" com 8 cards MVP (todos os 8 tipos referenciados).
- W2 Admin cria Dashboard "Analytics W2" com 8 cards MVP.
- W1 marca seu dashboard como `isPublic=true` (intra-workspace only, por princípio #12).

**Cenários:**
- [ ] Cenário 1: W2-Admin faz `GET /dashboards/{W1-dashboard-id}` → **404**
- [ ] Cenário 2: W2-Admin faz `GET /dashboards/{W1-dashboard-id}/cards/{W1-card-id}/data` → **404**
- [ ] Cenário 3: W2-Operator com JWT válido de W2 tenta `POST /dashboards/{W1-dashboard-id}/cards` → **404**
- [ ] Cenário 4: W1-Operator faz `GET /dashboards/{W1-dashboard-id}` → **200** com 8 cards (intra-workspace público funciona)
- [ ] Cenário 5: W2-Operator faz `GET /dashboards` → retorna só dashboards de W2 (zero de W1, mesmo o público)
- [ ] Cenário 6: W2-Admin cria dashboard em W2 com `dataSource.entity=kommoConversations` → os 100 conversations de W1 não aparecem nos resultados (retorna 50 de W2)
- [ ] Cenário 7: W2-Admin cria card com filtro `pipelineId={pipeline-de-W1}` → retorna array vazio (cross-workspace filter ignorado ou resulta em zero rows — Thales + Hugo decidem comportamento: **404 por pipeline não existir em W2** ou **200 vazio**; proposta: 200 vazio por ser whitelist-legítimo mas zero data)
- [ ] Cenário 8: W1 cria 2º dashboard privado (`isPublic=false`); W1-Viewer (outro user do mesmo workspace) → `GET /dashboards/{privadoId}` retorna **404** (não é próprio nem público)
- [ ] Cenário 9: W2 tenta enumerar IDs de dashboards de W1 (brute force de 100 IDs cuid) → sempre 404, nunca 403 ou 200

**Asserts por cenário (4-5 cada):**
1. Status HTTP esperado (404/200/403)
2. Body não contém dados sensíveis cross-workspace
3. Log estruturado contém `requestId`, `workspaceId={W2}`, `action=denied_cross_tenant`
4. Nenhum 5xx em toda a suite
5. Tempo de resposta < 100ms (404 não deve fazer query desnecessária)

**Runbook se falhar:** P0 imediato — tenant leak. Thales é incident commander; Hugo rollback flag `KOMMO_DASHBOARD_ENABLED=false` em todos os workspaces; postmortem 48h.

---

### 3.2 `test/kommo-dashboard-sql-injection.e2e-spec.ts`

**Objetivo:** bloquear SQL injection e JSON injection via `dataSource.filters`, `axisConfig`, `cardFilters`, `globalFilters`.

**Setup:**
- 1 workspace W1 com Admin + 500 conversations + 1000 messages (fixture padrão).
- Payloads importados de `scripts/fuzz-kommo-query-engine.ts` (500+ payloads categorizados em §7 do threat model).
- Prisma middleware spy que conta queries executadas no Postgres.

**Cenários:**
- [ ] Cenário 1 — SQL injection clássica em `filters[i].value`: 80 payloads → cada um retorna **400** com mensagem genérica; zero queries Prisma disparadas (rejeição antes do service).
- [ ] Cenário 2 — JSON Mongo-style injection: `{"$ne": null}`, `{"$gt": ""}` → **400**.
- [ ] Cenário 3 — Prototype pollution: `{"__proto__": {...}}` → **400** + assert que `Object.prototype` não foi poluído (teste após teste, confirmar `({}).isAdmin === undefined`).
- [ ] Cenário 4 — Unicode tricks: `U+0027`, `U+201A`, `U+FF07`, null byte → **400**.
- [ ] Cenário 5 — Array IN gigante (100 elementos) → **400** com mensagem de limit (max 50).
- [ ] Cenário 6 — Type confusion: `value: {"toString": "fn"}`, functions → **400**.
- [ ] Cenário 7 — `dataSource.entity` variants maliciosas (50 payloads) → **400**.
- [ ] Cenário 8 — `field` variants (`workspaceId`, `password`, `__proto__`, 30 payloads) → **400**.
- [ ] Cenário 9 — payload válido de controle → **200** (confirmar que fuzz não quebra happy path).

**Asserts por cenário (3-5 cada):**
1. Status 400 (não 500)
2. Body não contém nome de tabela, coluna, Postgres error verbatim
3. Log contém `requestId`, `workspaceId`, `rejected_reason` — sem logar o payload integral (T-I3)
4. Prisma middleware spy: **zero** `$queryRaw` e zero queries para o payload malicioso
5. Tempo de rejeição < 50ms

**Runbook se falhar:** P0 crítico — SQL injection confirmada. Abrir flag `KOMMO_DASHBOARD_ENABLED=false` globalmente; fix + regression test + postmortem.

---

### 3.3 `test/kommo-dashboard-whitelist-enforcement.e2e-spec.ts`

**Objetivo:** validar whitelists de `entity` + `field` + `operator` em rotas que criam/atualizam cards e filtros.

**Setup:**
- 1 workspace, 1 dashboard existente.
- Fixtures mínimas de Kommo.

**Cenários:**
- [ ] Cenário 1 — `POST /dashboards/:id/cards` com `dataSource.entity="kommoConversations"` → **201**.
- [ ] Cenário 2 — Entity `"fakeEntity"`, `"kommo_conversations"`, `"KommoConversations"`, `"kommoConversations "` → **400**, 4 casos.
- [ ] Cenário 3 — Entity `"orders"` (legada) continua funcionando → **201** (regression safety).
- [ ] Cenário 4 — Field válido por entidade:
  - kommoConversations: `status` → 201; kommoConversations: `workspaceId` → 400.
  - kommoMessages: `direction` → 201; kommoMessages: `contentPreview` → 400.
  - kommoLeads: `pipelineId` → 201; kommoLeads: `accessToken` → 400.
  - kommoAgents: `isActive` → 201; kommoAgents: `hmacSecret` → 400.
- [ ] Cenário 5 — Operator válido (`EQUALS`, `IN`, `BETWEEN`) → 201.
- [ ] Cenário 6 — Operator inválido (`REGEX`, `LIKE`, `$ne`) → **400**.
- [ ] Cenário 7 — Operator `BETWEEN` com array != 2 elementos → **400**.
- [ ] Cenário 8 — Operator `IN` com array vazio ou > 50 elementos → **400**.
- [ ] Cenário 9 — `axisConfig.groupBy="workspaceId"` → **400** (fora da whitelist `ALLOWED_GROUP_FIELDS`).
- [ ] Cenário 10 — `axisConfig.yField="contentHash"` → **400** (fora do `ALLOWED_VALUE_FIELDS`).

**Asserts por cenário (3-4 cada):**
1. Status esperado (201/400)
2. Mensagem de erro em português, sem vazar lista inteira de whitelist em prod
3. Se 400, nenhum registro criado no banco (rollback)

---

### 3.4 `test/kommo-dashboard-cache-isolation.e2e-spec.ts`

**Objetivo:** garantir que cache Redis NÃO serve resultado de W1 para W2, nunca, em cenário algum.

**Setup:**
- 2 workspaces W1, W2 — ambos com dashboard de 8 cards Kommo.
- Redis real (docker-compose de teste) — não mock.
- Helper `redis.keys('dashboards:card:*')` para inspeção.

**Cenários:**
- [ ] Cenário 1 — W1 consulta card → cache miss → popula cache → segunda consulta = cache hit. Asserts: 2ª chamada é < 50ms; Redis tem 1 chave prefixada `dashboards:card:{W1-id}:*`.
- [ ] Cenário 2 — Após cache de W1 populado, W2 consulta o **mesmo cardId** (cross-workspace access, que já deve dar 404 por T-S3) → **404** e **sem hit no cache de W1**. Assert: o cache do W1 NUNCA é servido para W2.
- [ ] Cenário 3 — W1 e W2 criam dashboards equivalentes com `dataSource.entity=kommoConversations` e filtros idênticos. Consulta W1 → popula cache W1. Consulta W2 → cache **miss** obrigatório (chaves diferentes). Assert: Redis tem 2 chaves distintas `dashboards:card:{W1-id}:*` e `dashboards:card:{W2-id}:*`.
- [ ] Cenário 4 — Outbox `KOMMO_ENTITY_CHANGED` para `workspaceId=W1` invalida só cache W1. Assert via inspeção: chaves W1 some; chaves W2 permanecem.
- [ ] Cenário 5 — Single-flight: 50 requests concorrentes em card com cache vazio → 1 única query Postgres disparada. Assert via Prisma spy.
- [ ] Cenário 6 — Cache key não contém PII nem `value` de filtros em plaintext (hash apenas). Assert via `redis.keys('*')` e match contra regex que rejeita padrões como `email|phone|cpf|contentPreview`.

**Asserts:**
1. Redis inspection — chaves compostas corretas.
2. `cache_hit` header em dev/staging (ausente em prod).
3. Query count (Prisma spy) — 1 ou 0 por cenário.
4. TTL jitter dentro de ±10%.

---

### 3.5 `test/kommo-dashboard-shape-per-cardtype.e2e-spec.ts`

**Objetivo:** para cada `CardType`, validar shape de retorno com fixture controlada.

**Setup:**
- 1 workspace W1, 100 conversations, 500 messages, 50 leads, 10 agents.
- 1 dashboard com 1 card de cada um dos 8 tipos × 4 entidades Kommo (matriz 32 combinações). Nem todas fazem sentido — limitar à combinação documentada no PLANO §10.

**Cenários (16 cards MVP representativos):**
- [ ] KPI_NUMBER + kommoConversations (status=OPEN) → `{value: N, label: "Total"}` com N = count exato; shape JSON schema validado.
- [ ] KPI_NUMBER + kommoConversations (status=RESOLVED AND resolvedAt >= startOfDay) → value = count.
- [ ] KPI_NUMBER + kommoMessages (createdAt >= startOfDay) → value = count.
- [ ] KPI_NUMBER + kommoLeads (createdAt >= startOfDay) → value = count.
- [ ] KPI_NUMBER + kommoConversations (sum de conversão — via snapshot) — casos de borda: zero registros, um registro, 100 registros.
- [ ] TABLE + kommoConversations → `{columns, rows[]}` — rows.length = min(100, filtered). Assert: `columns` NÃO contém `workspaceId`, `deletedAt`, `contentHash`, `rawMetadata` (T-I4).
- [ ] BAR_CHART + kommoConversations groupBy responsibleAgentId → `{label, value}[]`.
- [ ] DONUT + kommoConversations groupBy status → `{label, value}[]` com 4-5 statuses.
- [ ] LINE_CHART + kommoConversations createdAt buckets daily 7 dias → `{x, y}[]` com 7 pontos.
- [ ] LINE_CHART + kommoMessages direction=INBOUND — Fase 2.
- [ ] BAR_CHART + kommoMessages groupBy HOUR(createdAt) — Fase 2, 24 buckets.
- [ ] PIE_CHART + kommoConversations groupBy departmentId — Fase 2.
- [ ] STACKED_BAR + kommoConversations groupBy pipelineId — Fase 2.
- [ ] AREA_CHART + kommoMessages — Fase 2.
- [ ] GAUGE + custom metric (Fase 2) — aguarda RFC `dashboards-002-gauge-cardtype.md`.
- [ ] Empty result: cada CardType retorna shape correto mesmo com zero rows.

**Asserts por cenário:**
1. JSON schema validation via Zod (compatível com contrato FE).
2. Nenhum campo proibido (T-I4 list) presente.
3. p95 < 1.5s (sem cache, fixture 500 rows).
4. Log inclui `duration_ms`, `cache_hit: false`, nenhum `value` de filtro em plaintext.

---

### 3.6 `test/kommo-dashboard-rbac.e2e-spec.ts` (alternativamente anexar ao whitelist spec)

**Objetivo:** validar que roles inferiores (Viewer) não podem mutar dashboards/cards/filters Kommo.

**Setup:** W1 com 4 usuários — Admin, Manager, Operator, Viewer.

**Cenários:**
- [ ] Viewer faz `POST /dashboards` → **403**.
- [ ] Viewer faz `POST /dashboards/:id/cards` → **403**.
- [ ] Viewer faz `PATCH /dashboards/:id/cards/:cardId` → **403**.
- [ ] Viewer faz `GET /dashboards/:id` → **200** (leitura OK).
- [ ] Viewer faz `GET /dashboards/:id/cards/:cardId/data` → **200** (leitura OK).
- [ ] Operator faz `POST /dashboards/:id/cards` → **201** (permitido).
- [ ] Admin faz tudo → **201/200**.

**Asserts:**
1. Status HTTP correto por role.
2. Log inclui `userId`, `role`, `action`, `allowed/denied`.

---

### 3.7 `test/kommo-dashboard-logs-pii.e2e-spec.ts`

**Objetivo:** validar que logs do query engine não vazam PII nem tokens.

**Setup:**
- Interceptador de logs (`winston` transport em memória) capturando todos os logs do namespace `DashboardCardQueryService`, `KommoConversationsAdapter`, etc.
- W1 com conversations contendo `contentPreview` com email/phone sintéticos.

**Cenários:**
- [ ] Cenário 1 — `GET /cards/:cardId/data` KPI_NUMBER kommoConversations → logs contêm `requestId`, `workspaceId`, `cardId`, `duration_ms`; logs NÃO contêm `email@test.com`, `+5511...`, `contentPreview` integral.
- [ ] Cenário 2 — Erro 400 (fuzz payload) → log inclui `rejected_reason` mas NÃO inclui `value` do filtro.
- [ ] Cenário 3 — Adapter kommoAgents TABLE → log NÃO inclui `accessToken`, `refreshToken`, `hmacSecret` (mesmo que por engano entrem na row).
- [ ] Cenário 4 — Log structure regex: todos os logs matcham `^\{"requestId":"[a-z0-9-]+",` (JSON estruturado).
- [ ] Cenário 5 — Greppar logs por regex `email`/`phone`/`cpf`/`cnpj` padrões — zero matches.

---

## 4. Fixtures — `KommoFixtureBuilder`

**Path previsto:** `mundial-erp-api/test/fixtures/kommo/kommo-fixture-builder.ts`

**Implementação:** Sprint 3 (Hugo cria; Carolina reusa em testes squad-kommo).

**API:**

```ts
class KommoFixtureBuilder {
  withWorkspace(opts: { name: string; slug?: string }): this;
  withKommoAccount(opts: { authType?: 'OAUTH' | 'LONG_LIVED_TOKEN' }): this;
  withPipeline(opts: { name: string; kommoPipelineId?: number }): this;
  withAgent(opts: { name: string; email?: string; departmentId?: string; isActive?: boolean }): this;
  withDepartment(opts: { name: string }): this;
  withConversation(opts: {
    status: 'OPEN' | 'WAITING_RESPONSE' | 'WAITING_CLIENT' | 'RESOLVED';
    createdAt?: Date;
    resolvedAt?: Date | null;
    responsibleAgentId?: string;
    pipelineId?: string;
    departmentId?: string;
  }): this;
  withMessage(opts: {
    conversationId: string;
    direction: 'INBOUND' | 'OUTBOUND';
    createdAt?: Date;
    authorAgentId?: string;
    contentPreview?: string;
  }): this;
  withLead(opts: {
    pipelineId: string;
    status: string;
    valueCents?: number;
    responsibleAgentId?: string;
  }): this;
  withUser(opts: { email: string; role: Role }): this;
  withDashboard(opts: { name: string; isPublic?: boolean; cards?: CardSpec[] }): this;
  build(): Promise<FixtureResult>; // $transaction — cria tudo atomicamente
  cleanup(): Promise<void>; // delete em cascade via prisma
}
```

**Cenário canônico padrão ("kommoStandardFixture"):** 2 workspaces, 5 agents, 3 departments, 10 pipelines, 100 conversations (mix de statuses), 500 messages (50/50 IN/OUT), 20 leads. Usado por todos os 5 E2E specs acima.

**Cenário stress ("kommoStressFixture"):** 1 workspace com 500k messages, 100k conversations, 10k leads (para perf k6).

---

## 5. Performance (k6)

**Path:** `mundial-erp-api/test/perf/kommo-dashboard.k6.js`

**Setup:** staging env com `kommoStressFixture`.

**Cenários:**
1. **Scenario A — card hot path** (VU=50 concurrent, duration=10min, `/cards/:cardId/data` de 8 cards MVP em round-robin):
   - Target p50 < 80ms, p95 < 400ms (cache hit).
   - Target p50 < 300ms, p95 < 1.5s (cache miss forçado a cada iteração — Cache-Bypass header).
   - Error rate < 0.1%.
2. **Scenario B — dashboard listing** (VU=20, `/dashboards/:id` com 8 cards):
   - Target p95 < 400ms.
3. **Scenario C — cache invalidation burst** (1 outbox event → 1000 chamadas concorrentes):
   - Single-flight efetivo: 1 query Postgres (valida via pg_stat_statements).

**Alertas Grafana (coordenar com Thales + agent-infra):**
- `dashboards_card_data_p95 > 400ms` por 5min → Slack P1
- `dashboards_cache_hit_rate < 40%` por 30min → Slack P1
- `dashboards_5xx_rate > 0.5%` por 5min → PagerDuty P0

---

## 6. Visual Regression (Storybook)

Coord com squad-fe-dashboards.

- Snapshots por CardType × data Kommo (8 cards MVP × 1 fixture "ideal" + 1 fixture "empty" + 1 fixture "extreme" — 24 snapshots).
- Diff tool: Chromatic ou Percy.
- Hugo é reviewer obrigatório de toda PR que altera snapshots — exige RFC/PR aprovado justificando.
- Fase 2: +9 cards = +27 snapshots.

---

## 7. Regression Suite Cross-Squad

**Regra:** toda PR mergeada em `squad-kommo` (Rafael/Larissa/Mateus/Carolina) ou em `squad-dashboards` (Thales/Debora/Iago/Renata/Hugo) que toque:
- `mundial-erp-api/src/modules/kommo/**`
- `mundial-erp-api/src/modules/dashboards/**`
- `mundial-erp-api/prisma/schema.prisma` (qualquer model Kommo)

DEVE rodar em CI (required check, bloqueante):

- [ ] `kommo-dashboard-cross-tenant.e2e-spec.ts` (3.1)
- [ ] `kommo-dashboard-sql-injection.e2e-spec.ts` (3.2)
- [ ] Smoke test: 8 cards MVP renderizam shape correto (subset de 3.5)

**Escopo reduzido (só squad-dashboards, não squad-kommo):**
- [ ] Full suite 3.1-3.7
- [ ] Unit tests 2.1-2.5

---

## 8. Critérios de GA (gate Sprint 4)

Bloqueantes para release:

- [ ] Cobertura unit ≥ 90% nos 4 adapters (`kommo-{entity}.adapter.spec.ts`)
- [ ] Cobertura unit `DashboardCardQueryService` permanece ≥ 90% após expansão Kommo
- [ ] 100% dos 9 cenários de `kommo-dashboard-cross-tenant.e2e-spec.ts` passando
- [ ] 100% dos 9 cenários de `kommo-dashboard-sql-injection.e2e-spec.ts` passando
- [ ] Zero finding crítico (CVSS ≥ 7) em threat model review
- [ ] Fuzz pipeline (500+ payloads) — zero alcança Postgres (validado via middleware spy)
- [ ] k6 Scenario A — p95 < 400ms (cache hit) em staging com 500k `KommoMessage`
- [ ] k6 Scenario A — p95 < 1.5s (cache miss) em staging
- [ ] Cache hit rate alvo ≥ 60% medido em staging durante 24h com tráfego sintético
- [ ] Lint rules custom ativas em CI (`require-workspace-id-in-kommo-adapters`, `no-log-kommo-content`, `no-query-raw-in-dashboards`) — zero violations
- [ ] LGPD checklist:
  - [ ] `KommoMessage.contentPreview` truncado a 200 chars (validado em 10 mensagens maiores que isso)
  - [ ] Log grep — zero PII em 24h de tráfego staging
  - [ ] `DELETE /kommo/accounts/:id?purge=true` → 100% das rows Kommo daquele workspace deletadas (E2E coordenado com Carolina)
  - [ ] Purge cron funcional: fixture com messages > retention_policy → deletadas após run
- [ ] Runbook `.claude/runbooks/kommo-incidents.md` escrito (coordenar com Rafael) com cenários P0-P3 + owner primário + comandos de rollback (flag `KOMMO_DASHBOARD_ENABLED=false`)
- [ ] Pentest interno Sprint 4 (Hugo + Thales + Carolina) — relatório com findings classificados; zero finding crítico não mitigado
- [ ] RFC `dashboards-002-gauge-cardtype.md` se Fase 2 incluir GAUGE (senão fallback DONUT documentado)
- [ ] Code review matrix — Hugo reviewed todas PRs de adapters + cache + consumer de outbox

---

## 9. Cadência e Donos

| Suite | Dono primário | Executa | Cadência |
|---|---|---|---|
| Unit adapters | Larissa (implementa) + Hugo (revisa) | CI por PR (squad-kommo + squad-dashboards) | Por PR |
| Unit query engine extensions | Thales (implementa) + Hugo (revisa) | CI por PR | Por PR |
| Unit cache service | Thales + Hugo | CI por PR | Por PR |
| Unit outbox consumer | Debora + Hugo | CI por PR | Por PR |
| Lint rules custom | Hugo | CI por PR | Por PR |
| E2E cross-tenant (3.1) | Hugo | CI por PR + nightly | Por PR |
| E2E SQL injection (3.2) | Hugo | CI por PR + nightly | Por PR |
| E2E whitelist (3.3) | Hugo | CI por PR | Por PR |
| E2E cache isolation (3.4) | Hugo + Thales | CI por PR (Sprint 3+) | Por PR |
| E2E shape (3.5) | Hugo | CI por PR | Por PR |
| E2E RBAC (3.6) | Hugo | CI por PR | Por PR |
| E2E logs/PII (3.7) | Hugo | Nightly (evita flakiness em CI curto) | Nightly |
| k6 perf | Hugo + Thales | Staging | Mensal + pre-release |
| Visual regression | squad-fe-dashboards + Hugo | CI por PR | Por PR |
| Fuzz pipeline completo | Hugo | Nightly + pre-commit (sample) | Nightly |
| Threat model review | Hugo + Thales + Carolina | Review meeting | Trimestral |
| Pentest interno | Hugo + Thales | Sprint 4 + anual | Trimestral |
| LGPD audit | Hugo + Carolina | Joint review | Trimestral |

---

## 10. Ligação com Threat Model

| Threat ID | Mitigado por (teste) |
|---|---|
| T-S1 (JWT spoofing workspaceId) | 3.1 cross-tenant |
| T-S2 (ownerId spoofing) | 2.2 + unit teste `dashboards.service` |
| T-S3 (cross-workspace cardId access) | 3.1 Cenário 2, 3, 5 |
| T-T1 (SQL injection filters) | 3.2 Cenários 1-6 + fuzz pipeline |
| T-T2 (entity fora whitelist) | 3.3 Cenário 2 + 2.2 |
| T-T3 (field fora whitelist) | 3.3 Cenário 4 + 2.1 |
| T-T4 (operator inválido) | 3.3 Cenário 6-8 + gap fix Sprint 1 + 2.2 |
| T-T5 (JSON extra keys) | 3.2 Cenário 7 + validação DTO |
| T-T6 (adapter omite workspaceId) | 2.1 (todos os adapters) + 3.1 Cenário 6 + lint rule |
| T-R1 (sem audit log de delete) | bloqueado por dep de squad-workspace (AuditLoggerInterceptor) |
| T-R2 (log sem requestId) | 3.7 Cenário 4 + code review |
| T-I1 (isPublic vaza cross-tenant) | 3.1 Cenário 4, 5, 8 |
| T-I2 (cache cross-tenant) | 3.4 todos os cenários |
| T-I3 (log vaza contentPreview) | 3.7 Cenários 1, 3, 5 + lint rule |
| T-I4 (response vaza campos sensíveis) | 3.5 (asserts de `columns` + `rows`) + 2.1.4 |
| T-I5 (erro vaza schema) | 3.2 Cenário 2 (assert mensagem genérica) |
| T-I6 (enumeração isPublic) | 3.1 Cenário 9 |
| T-D1 (array IN gigante) | 3.3 Cenário 8 + 3.2 Cenário 5 |
| T-D2 (100 cards autorefresh 5s) | DTO cap + unit test de validation |
| T-D3 (thundering herd) | 3.4 Cenário 5 (single-flight) + k6 Scenario C |
| T-D4 (groupBy HOUR sem dateRange) | 2.1.2 + E2E de perf |
| T-E1 (Viewer mutação) | 3.6 Cenários 1-3 |

---

## 11. Handshakes Pendentes (open items)

- [ ] **Carolina (squad-kommo):** confirmar divisão de escopo do outbox consumer (ela emite, eu consumo/valido invalidação) + fechar contrato do payload `KOMMO_ENTITY_CHANGED` em Sprint 2.
- [ ] **Thales:** fixar formato de chave de cache antes do Sprint 3 (ADR ou comentário no código) + fix dos 2 gaps identificados (`operatorToPrisma` default + `executeTable` sem `select`) no Sprint 1.
- [ ] **Larissa:** revisar whitelist de `ALLOWED_FIELDS` por adapter Kommo comigo antes de congelar no PR de Sprint 2.
- [ ] **Debora:** confirmar se `KommoFixtureBuilder` reusa helpers existentes de `test/workspace-isolation.e2e-spec.ts` (multi-workspace setup) — evitar duplicação.
- [ ] ~~**agent-CTO:** confirmar pasta `.claude/security/` como padrão oficial~~ — resolvido: consolidado em `mundial-erp-api/docs/` (padrão já estabelecido por `threat-model-tasks.md`).
- [ ] **Rafael (squad-kommo tech lead):** joint do runbook `.claude/runbooks/kommo-incidents.md` com cenários P0-P3 do dashboard.
- [ ] **squad-fe-dashboards:** alinhar fixture esperada em Storybook (Chromatic/Percy) para os 8 cards Kommo MVP.

---

## 12. Referências

- `.claude/plan/PLANO-KOMMO-DASHBOARD.md` §§ 14, 16
- `.claude/skills/squad-dashboards.mdc` — Princípios Inegociáveis
- `mundial-erp-api/docs/threat-model-kommo.md` — documento-irmão
- `mundial-erp-api/test/workspace-isolation.e2e-spec.ts` — template de E2E cross-tenant
- `mundial-erp-api/test/CI-REQUIREMENTS.md` — política de CI
- `mundial-erp-api/src/modules/dashboards/dashboard-card-query.service.ts` — alvo da expansão
