# Spec — Filtro Global `pipelineId` (Dashboard "Analytics Comercial" / Kommo)

**Story:** `K5-4` — Sprint 5, Fase 2 do `PLANO-KOMMO-DASHBOARD.md`.
**Owner desta spec:** Renata Pires (squad-dashboards — Backend Filtros Globais + Operators).
**Status:** Draft técnico, pronto para handshake com Thales (query engine), Larissa (adapters Kommo), Hugo (QA), squad-fe-dashboards (UI).
**Consome:** `DashboardFilter` (já existente, sem migration de schema). **NÃO** altera `schema.prisma` e **NÃO** altera `DashboardCardQueryService` nesta spec (só descreve o comportamento esperado).

---

## 1. Objetivo

Permitir que o usuário do dashboard "Analytics Comercial" filtre **simultaneamente todos os cards Kommo** por um ou mais `pipelineId` via componente global na toolbar do dashboard (`<KommoGlobalFilters>`), reaproveitando o model `DashboardFilter` com `field="pipelineId"` e `operator="IN"`.

### Escopo
- Aplica-se a adapters: `kommoConversations`, `kommoMessages`, `kommoLeads`.
- Ignorado silenciosamente para `kommoAgents` (justificado na §3).
- Inicialmente exclusivo para o dashboard "Analytics Comercial"; generalizável para outros dashboards Kommo no futuro.

### SLO
- **p95 ≤ 400ms** em cache hit no hot path `/cards/:cardId/data`.
- **p95 ≤ 1.5s** em cache miss em dataset de staging (alinhado com princípio #15 do skill).
- **Overhead de merge:** < 10ms por request agregado (§7).

### Fora de escopo (explícito)
- Novos operators (`IN_LAST_DAYS`, `RELATIVE_DATE`, `NOT_IN`, `CONTAINS`, `STARTS_WITH`, `BETWEEN_DATES`) — ver §12.
- Filtros globais de `departmentId` (Fase 2 também, mas story separada — §10.4 do plano).
- Filtros globais de `dateRange` (já existe via `dataSource.dateRange`).
- Presets de filtros reutilizáveis entre dashboards.

---

## 2. Modelo de dado (reutiliza `DashboardFilter` — **sem migration**)

Model existente em `prisma/schema.prisma` (linhas 1616–1629):

```prisma
model DashboardFilter {
  id          String   @id @default(cuid())
  dashboardId String   @map("dashboard_id")
  field       String
  operator    String   // EQUALS, NOT_EQUALS, GREATER, LESS, BETWEEN, IN
  value       Json
  label       String?
  ...
}
```

**Shape canônico para o filtro global `pipelineId`:**

```json
{
  "field": "pipelineId",
  "operator": "IN",
  "value": ["ckw0k1p2e0000xyz123abc", "ckw0k1p2e0001xyz456def"],
  "label": "Pipeline"
}
```

### Validação `class-validator` específica
Será encapsulada num `@ValidateBy` / transformer combinado ao `CreateFilterDto` já existente em `mundial-erp-api/src/modules/dashboards/dto/create-filter.dto.ts`. Como o `CreateFilterDto.value` atual é `unknown` com `@IsDefined`, a validação típica por `field` será delegada ao serviço (branching por `field`) ou a um `@ValidateIf`/custom decorator `@IsValidFilterValue(field, operator)`. Regras:

- `@IsArray({ message: "value deve ser array" })`
- `@ArrayMinSize(1)` / `@ArrayMaxSize(50)` (anti-DoS)
- `@IsString({ each: true })`
- Regex cuid `/^c[a-z0-9]{24,}$/i` em cada item (class-validator `@Matches` + `each: true`)
- Validação semântica cross-tenant: cada cuid tem que pertencer ao workspace do dashboard — validada no service (§6), não no DTO.

### Label
- Default aplicado pelo service quando ausente: `"Pipeline"` (ou chave i18n `dashboards.filters.pipeline.label` quando i18n entrar).

---

## 3. Whitelist de `field` por adapter Kommo

Cross-ref com Thales (principio #2 do skill: query engine é whitelist-only). `field="pipelineId"` deve ser aceito pelos seguintes adapters:

| Adapter | `pipelineId` direto? | Estratégia MVP (sem migration) | Recomendação Renata (Sprint 5+) |
|---|---|---|---|
| `kommoLeads` | ✅ Sim — coluna `pipeline_id` em `KommoLead` + índice `(workspaceId, pipelineId, statusId)` | `where: { workspaceId, pipelineId: { in: [...] } }` | **Manter** — adapter Prisma direto |
| `kommoConversations` | ❌ Não — via `leadId → lead.pipelineId` (e `leadId` é **nullable**) | `where: { workspaceId, lead: { pipelineId: { in: [...] } } }` (JOIN + `leadId IS NOT NULL` implícito) | **Denormalizar** `pipelineId` direto em `KommoConversation` (nullable → backfill → NOT NULL) |
| `kommoMessages` | ❌ Não — via `conversation → lead → pipelineId` (JOIN de 2 níveis) | `where: { workspaceId, conversation: { lead: { pipelineId: { in: [...] } } } }` | **Denormalizar** `pipelineId` direto em `KommoMessage` (mesma abordagem) |
| `kommoAgents` | ❌ Não aplicável — agente não pertence a um único pipeline | **Ignorar silenciosamente** — cards com `dataSource.entity === "kommoAgents"` recebem `globalFilters` sem `pipelineId` mergeado | Documentar como comportamento esperado (`IgnoredGlobalFilterException` suprimida com log `INFO`) |

### Recomendação primária: denormalização aditiva de `pipelineId` em `KommoConversation` e `KommoMessage`

**Motivação:**
1. **Perf** — hot path `/cards/:cardId/data` é budget p95 ≤ 400ms em cache hit. JOIN de 2 níveis (`KommoMessage → KommoConversation → KommoLead`) em cards de "Mensagens — 7 Dias" ou "Horários de Pico" com filtro `pipelineId IN [...]` em dataset de 500k+ rows explode acima do budget sem índice composto `(workspaceId, pipelineId, createdAt)`.
2. **Cardinalidade** — conversations/messages sem `leadId` (nullable) são **invisíveis** via JOIN. Denormalizar permite decidir semanticamente: conversation sem lead = `pipelineId IS NULL` → filtro global `IN [...]` descarta (comportamento esperado) **ou** inclui (opt-in via config do card). Sem denormalização, o comportamento é implicitamente "descarta", sem possibilidade de override.
3. **Invalidação de cache** — o outbox event `KOMMO_ENTITY_CHANGED` já carrega `pipelineId` (§8.6 do plano); denormalização fecha o ciclo sem depender de join-in-invalidation.
4. **Custo de storage** — `pipelineId` é cuid (≈ 25 bytes) × ~1M messages/workspace maduro = ~25 MB/workspace. Aceitável.

**Plano de migração aditiva (coord com Larissa):**
1. **Release N:** adicionar `pipelineId String? @map("pipeline_id")` em `KommoConversation` e `KommoMessage` (**nullable**). Services de escrita idempotente preenchem `pipelineId` a partir de `lead.pipelineId` (service já tem o lead em contexto ao processar evento). Fallback: NULL quando `leadId` é NULL.
2. **Release N:** backfill script `backfill-denormalize-pipeline-id.ts` idempotente retomável (checkpoint por batch) popula rows existentes.
3. **Release N+1:** `pipelineId` vira `NOT NULL` para `KommoMessage` (sempre tem conversation → lead tratado); continua nullable em `KommoConversation` (pode ter conversation pre-lead).
4. **Índices compostos** (adicionados já em N):
   - `KommoConversation`: `@@index([workspaceId, pipelineId, status])`, `@@index([workspaceId, pipelineId, resolvedAt])`, `@@index([workspaceId, pipelineId, createdAt])`
   - `KommoMessage`: `@@index([workspaceId, pipelineId, createdAt])`, `@@index([workspaceId, pipelineId, direction, createdAt])`

**Alternativa rejeitada (e por quê):** manter JOIN puro. Rejeitada porque força p95 acima do budget em cards LINE_CHART de 7d × dataset 500k rows, e perde linhas com `leadId=NULL` sem possibilidade de tuning semântico.

**Dependência de decisão:** §12 — handshake com Thales. Se Thales rejeitar denormalização, plano B é JOIN puro com índice em `KommoLead(pipelineId, workspaceId)` já existente + cache Redis agressivo (TTL 120s) para absorver miss — aceita-se p95 ≤ 1.5s degradado para 2.5s no miss dos 2 adapters afetados.

---

## 4. Regra de merge — **INTERSECAO (inviolável)**

**Invariante:** filtro global do dashboard é **INTERSECAO (AND lógico) com `DashboardCard.dataSource.filters` do card, NUNCA substitui.** Esta regra já é consumida implicitamente pelo `DashboardCardQueryService.buildWhere` atual (linhas 253–267) — filtros do card e filtros globais são aplicados em seguida no mesmo `where`. Esta spec **promove** o comportamento a invariante documentada (status para ADR — §13).

### Exemplo — compatibilidade

- Card: `filters = [{ field: "status", operator: "IN", value: ["OPEN"] }]`
- Global: `[{ field: "pipelineId", operator: "IN", value: ["p1", "p2"] }]`
- Resultado Prisma (pseudo, pós-denormalização):

  ```ts
  where: {
    workspaceId,               // SEMPRE primeiro (principio #1 do skill)
    deletedAt: null,
    status: { in: ['OPEN'] },
    pipelineId: { in: ['p1', 'p2'] },
  }
  ```

### Caso conflitante — mesmo `field` no card e no global

Política: **INTERSECAO continua valendo — cálculo em-memória do conjunto intersecionado antes de despachar ao Prisma.**

| # | Card (filters) | Global | Resultado |
|---|---|---|---|
| A | `pipelineId IN [p1]` | `pipelineId IN [p1, p2]` | `pipelineId IN [p1]` (interseção de conjuntos) |
| B | `pipelineId EQUALS p3` | `pipelineId IN [p1, p2]` | **Interseção vazia** → retorna **empty-result shape do CardType** (não é erro) |
| C | `pipelineId IN [p1, p2]` | `pipelineId IN [p3, p4]` | Interseção vazia → empty-result shape |
| D | card sem filtro em `pipelineId` | `pipelineId IN [p1, p2]` | `pipelineId IN [p1, p2]` (passa direto) |
| E | card tem `pipelineId IN [p1]`, global ausente | — | `pipelineId IN [p1]` (comportamento atual inalterado) |

**Empty-result shape por `CardType`** (normativo — Hugo testa):

| CardType | Shape retornado | Exemplo |
|---|---|---|
| `KPI_NUMBER` | `{ value: 0, label: "Total" }` | — |
| `BAR_CHART` / `STACKED_BAR` / `PIE_CHART` / `DONUT` | `[]` (array vazio de `LabelValue[]`) | — |
| `LINE_CHART` / `AREA_CHART` | `[]` (array vazio de `XYPoint[]`) | — |
| `TABLE` | `{ columns: [], rows: [] }` | — |

**Implementação da interseção em-memória** (pseudo — a ser implementado em helper util em `dashboards/utils/merge-filters.ts`, consumido por `DashboardCardQueryService.buildWhere`):

```ts
// Antes de chamar operatorToPrisma, para cada field presente tanto em cardFilters
// quanto em globalFilters: calcular interseção de conjunto e substituir no `where`.
// Se interseção vazia: lançar sentinel `EmptyResultIntersection` interceptado pelos
// executors (executeKpi/executeTable/etc.) que retornam shape vazio sem executar
// Prisma (economia de query).
```

**Red flag (bloqueia PR):** substituir filtro do card pelo global — viola §4 e quebra contrato. Code review obrigatório (skill red flag #392: "Merge de filtros global × card substituindo em vez de INTERSECAO").

---

## 5. Validação de operators (inalterada)

Whitelist vigente (arquivo `dto/create-filter.dto.ts` linhas 11–18): `EQUALS, NOT_EQUALS, GREATER, LESS, BETWEEN, IN`.

Para `field="pipelineId"`, o operator aceito é **apenas `IN`** (constraint semântica — pipeline é relação, não escalar ordenado). Validação adicional no service `dashboards.service.ts#createFilter`:

```ts
if (dto.field === 'pipelineId' && dto.operator !== 'IN') {
  throw new BadRequestException(
    'Filtro global por pipelineId requer operator=IN'
  );
}
```

**Fora de escopo** (RFC futuro, ver §12): `IN_LAST_DAYS`, `RELATIVE_DATE`, `NOT_IN`, `CONTAINS`, `STARTS_WITH`, `BETWEEN_DATES` — expansão da whitelist exige nova validação e novo mapeamento em `DashboardCardQueryService.operatorToPrisma`.

---

## 6. Endpoints afetados

**Nenhum endpoint novo** — reusa superfície existente do módulo `dashboards/`:

| Método | Rota | Mudança |
|---|---|---|
| `POST /dashboards/:id/filters` | Cria filtro global | Passa a aceitar `field="pipelineId"` + validação cross-tenant dos cuids (§6.1) |
| `DELETE /dashboards/:id/filters/:filterId` | Remove filtro | Sem mudança |
| `GET /dashboards/:id` | Retorna dashboard + cards + filtros | Sem mudança (filtros já inclusos via `DashboardResponseDto`) |
| `GET /dashboards/:id/cards/:cardId/data` | Hot path de dados do card | `globalFilters` pré-calculados no service, mergeados com `cardFilters` via nova lógica de interseção (§4). Perf budget §7. |

### 6.1 Validação cross-tenant de cuid (anti-tenant-leak)

Executada em `DashboardsService.createFilter` quando `field === 'pipelineId'`:

```ts
const pipelines = await this.prisma.kommoPipeline.findMany({
  where: { workspaceId, id: { in: value } },
  select: { id: true },
});
if (pipelines.length !== value.length) {
  throw new BadRequestException(
    `pipelineId inválido: ${value.length - pipelines.length} id(s) não pertencem ao workspace`,
  );
  // Nome formal: InvalidPipelineIdException (custom; estende BadRequestException)
}
```

**Nunca** retornar 403 cross-tenant — seguir principio #1 do skill (cross-tenant = 404 para não vazar existência). Aqui, como filtro é criado **para** o workspace do requester, o caso é 400 (valor inválido no payload do próprio usuário).

### 6.2 Deep-link URL → filtro efêmero (não persistido)

O componente `<KommoGlobalFilters>` persiste seleção via querystring `?pipeline=p1,p2` para deep-link. A UX (§8) NÃO grava automaticamente em `DashboardFilter` — apenas envia como override no payload do `GET /dashboards/:id/cards/:cardId/data`. Isso exige suporte a **filtro efêmero por request** no hot path:

- Atual: serviço lê `dashboard.filters` (`DashboardFilter[]` persistido).
- Novo: aceitar `?pipelineOverride=p1,p2` em `GET /dashboards/:id/cards/:cardId/data`, convertido em `GlobalFilter[]` **adicional** ao que está persistido em `DashboardFilter`.
- **Regra:** override de URL também é INTERSECAO com persistido. Se persistido e override divergem → interseção de conjuntos (§4, caso C).

**Assinatura proposta** (Thales valida):

```ts
GET /dashboards/:id/cards/:cardId/data?pipeline=p1,p2
```

Validação querystring em controller: `@IsOptional() @IsString() pipeline?: string` → split por vírgula → aplica mesma validação do §6.1 antes de mergeada.

---

## 7. Performance budget

| Métrica | Budget | Justificativa |
|---|---|---|
| Merge de filtros em-memória (card × global × override) | < 2ms por card | O(N_fields × M_globals) tipicamente 5 × 3 = 15 ops |
| Merge batch por request (dashboard com 12 cards) | < 10ms | 12 × 2ms + overhead de validação cross-tenant (1 query Prisma shared) |
| Cross-tenant pipeline validation | 1 query shared (`findMany in`) por request | `@@index([workspaceId, ...])` em `KommoPipeline` já previsto |
| Hot path `/cards/:cardId/data` p95 cache hit | ≤ 400ms | Principio #15 do skill |
| Hot path p95 cache miss (pós-denormalização) | ≤ 1.5s | Staging dataset 500k rows |
| Hot path p95 cache miss (sem denormalização, fallback JOIN) | ≤ 2.5s | Tolerância negociada com Thales se denormalização for rejeitada |

### Índices necessários

- `KommoLead`: `@@index([workspaceId, pipelineId, statusId])` ✅ **já existe** (schema.prisma linha 390)
- `KommoConversation` (pós-denormalização — Larissa aprova em `kommo_foundations_3`):
  - `@@index([workspaceId, pipelineId, status])`
  - `@@index([workspaceId, pipelineId, resolvedAt])`
  - `@@index([workspaceId, pipelineId, createdAt])`
- `KommoMessage` (pós-denormalização):
  - `@@index([workspaceId, pipelineId, createdAt])`
  - `@@index([workspaceId, pipelineId, direction, createdAt])` (Horários de Pico × pipeline)

### Cache Redis — chave inclui filtros

Principio #8 do skill já exige chave `(cardId, dashboardFiltersHash, workspaceId)`. A `dashboardFiltersHash` deve:
- Incluir filtros persistidos **+ override de URL** no hash.
- Ordenar array `value` de `pipelineId` lexicograficamente antes de hashear (idempotência: `[p2,p1]` gera mesma key que `[p1,p2]`).
- Invalidação via outbox `KOMMO_ENTITY_CHANGED` já carrega `pipelineId` (§8.6 do plano) — suficiente para invalidar cache seletivamente por pipeline afetado.

---

## 8. UX (coord com squad-fe-dashboards)

### 8.1 Componente `<KommoGlobalFilters>`
- Arquivo: `mundial-erp-web/src/features/dashboards/kommo-dashboard/components/kommo-global-filters.tsx` (já previsto no plano §11).
- Client component (`'use client'`).
- Dropdown multi-select de pipelines, alimentado por `GET /kommo/pipelines` (§7.3 do plano — **já previsto** como endpoint de Larissa; handshake confirmado).
- Render condicional: apenas quando `dashboardSlug === "analytics-comercial"` (ou meta do dashboard `config.globalFilters.pipelineEnabled === true`).

### 8.2 Comportamento
- **Default (nada selecionado):** todos os pipelines selecionados, equivalente a **ausência de filtro** (otimização: quando `value.length === totalPipelines`, **não envia** `pipelineOverride` na query — `where` sem `pipelineId`, permite usar índices "sem pipeline").
- **URL:** `?pipeline=p1,p2` para deep-link. Sincronização bidirecional via hook `useKommoGlobalFilters`.
- **Empty state:** quando `GET /kommo/pipelines` retorna `[]` (workspace sem pipelines configurados) → mostrar mensagem `"Nenhum pipeline configurado — configure em Settings → Kommo"` + CTA para `/settings/integrations/kommo`.
- **Persistência pessoal (fora de escopo Sprint 5):** salvar última seleção do usuário em `localStorage` por dashboard — pode virar RFC futura (preset pessoal).

### 8.3 Acessibilidade
- Labels com i18n key `dashboards.filters.pipeline.*`.
- Keyboard nav padrão (`ArrowDown`/`Space` no dropdown).

---

## 9. Segurança

1. **Valor validado** (§2): array de cuids com regex, `ArrayMaxSize(50)` anti-DoS, `ArrayMinSize(1)`.
2. **Cross-tenant** (§6.1): cada cuid validado contra `KommoPipeline.workspaceId` do requester. Nunca confiar em cuid cru do cliente.
3. **Logs estruturados** (principio #13 do skill):

   ```json
   {
     "msg": "Dashboard filter applied",
     "requestId": "...",
     "workspaceId": "ws_...",
     "userId": "u_...",
     "dashboardId": "dash_...",
     "cardId": "card_...",
     "filterId": "filt_...",
     "field": "pipelineId",
     "operator": "IN",
     "valueLength": 2
   }
   ```

   **NUNCA logar `value` em clear** (cuids são PII-leak soft — identifica pipelines da concorrência em multi-tenant com customers enterprise).

4. **Rate limit** herdado de `/cards/:cardId/data` (60/min/user — principio #11 do skill).
5. **Query injection:** zero risco — valor passa por `operatorToPrisma` que já emite `{ in: array }` tipado. Nenhuma concatenação de string em SQL.
6. **Cache key inclui `workspaceId`** (principio já existente) + hash dos filtros: **não há risco de poisoning cross-tenant** mesmo que dois workspaces compartilhem mesmo `cardId` (impossível semanticamente, mas defense-in-depth).

---

## 10. Plano de teste (Hugo escreve — coord em `K5-5`)

### 10.1 Unit (em `dashboard-card-query.service.spec.ts` + novo `merge-filters.spec.ts`)

- **Merge compatível** (card sem `pipelineId`, global com `pipelineId`) → where tem ambos, via AND.
- **Merge conflito não-vazio** (`pipelineId IN [p1, p2]` × `IN [p1]`) → `IN [p1]`.
- **Merge conflito vazio** (`EQUALS p3` × `IN [p1, p2]`) → cada CardType retorna empty-result shape correto (§4 tabela).
- **Empty-result shape por CardType:** `KPI_NUMBER → {value:0,label}`, `BAR_CHART → []`, `TABLE → {columns:[],rows:[]}`.
- **Field fora da whitelist** (`field="randomField"`) → 400, não propaga ao Prisma.
- **Operator inválido p/ pipelineId** (`field="pipelineId", operator="EQUALS"`) → 400 `"Filtro global por pipelineId requer operator=IN"`.
- **Cross-tenant cuid** (cuid de pipeline de W2 passado em filtro de dashboard de W1) → 400.
- **`kommoAgents` ignora filtro global `pipelineId`** → where não contém `pipelineId`, log `INFO` emitido.
- **Override de URL** (`?pipeline=p1`) adicional ao `DashboardFilter` persistido (`pipelineId IN [p1, p2]`) → interseção `IN [p1]`.

### 10.2 E2E (em `test/dashboards-kommo-global-filters.e2e-spec.ts`)

- Dashboard "Analytics Comercial" W1 com 8 cards Kommo + filtro global `pipelineId IN [p1, p2]` → todas as queries refletidas (intercept Prisma logger: contém `pipeline_id` em 3 adapters, ausente em `kommoAgents`).
- Remover filtro global → cards voltam ao baseline (query sem `pipelineId`).
- Cross-tenant: usuário de W2 tenta `POST /dashboards/:id/filters` com `value=[pipelineId_W1]` → 400.
- Cross-tenant GET: dropdown `<KommoGlobalFilters>` de usuário W2 consulta `GET /kommo/pipelines` → retorna **apenas** pipelines de W2 (princípio #12).
- Interseção vazia em card com filtro conflitante → retorna shape vazio + HTTP 200 (não 500/204).
- Deep-link `?pipeline=inexistente` → 400 (validação cross-tenant quebra antes de chegar ao query engine).

### 10.3 Performance (k6 — `perf/dashboards-kommo-pipeline-filter.js`)

- 100 dashboards × 12 cards × dataset 500k rows por adapter com filtro global `IN [1 pipeline]`, `IN [5 pipelines]`, `IN [50 pipelines]`.
- Asserção: p95 cache hit ≤ 400ms, p95 cache miss ≤ 1.5s (pós-denormalização).

### 10.4 Fuzz (continuous pipeline — Hugo)
- Injection em `value`: payloads `'; DROP TABLE--`, `{"$ne":null}`, `__proto__`, arrays > 50 → 400.

---

## 11. Rollout

### 11.1 Feature flag
- `DASHBOARDS_FEATURE_KOMMO_PIPELINE_FILTER_ENABLED` per-workspace (principio #16 do skill).
- Depende de `KOMMO_DASHBOARD_ENABLED=true` (flag pai).
- Dashboards em workspace sem flag: `<KommoGlobalFilters>` não é renderizado; backend ignora override de URL.

### 11.2 Etapas (controladas por Thales — principio de rollout do squad)
1. Canary: 1 workspace interno (Loja Mundial) — 7 dias.
2. 10% workspaces elegíveis — 7 dias.
3. 50% — 7 dias.
4. 100%.

### 11.3 Rollback
- Flag `DASHBOARDS_FEATURE_KOMMO_PIPELINE_FILTER_ENABLED=false` per-workspace desabilita backend e frontend simultaneamente.
- Denormalização **não é revertida** em rollback — colunas ficam (aditivo).

### 11.4 Migração de denormalização (se aprovada)
- **Release N (Sprint 5):** migration `kommo_foundations_3` aditiva — `ALTER TABLE kommo_conversations ADD COLUMN pipeline_id varchar;` (nullable). Services de escrita passam a popular. Backfill script assíncrono (BullMQ job `kommo-backfill-denorm-pipeline`).
- **Release N+1 (Sprint 6+):** quando backfill 100% concluído + drift daily < 0.1% → migration para `NOT NULL` em `kommo_messages` (coord Larissa).

---

## 12. Open questions / handshake

1. **Thales (query engine):** aprovar denormalização de `pipelineId` em `KommoConversation` + `KommoMessage`? Benchmark preliminar (500k messages × filtro `IN [3 pipelines]`): JOIN de 2 níveis estima ~2.2s cache miss vs. ~600ms com coluna denormalizada + índice composto. **Decisão bloqueia §3 primary path.**

2. **Larissa (squad-kommo):** assume denormalização → schema do plano (§5.2 `PLANO-KOMMO-DASHBOARD.md`) precisa bump adicional? Proposta: migration nova `kommo_foundations_3` (aditiva) escopo = `pipelineId` nullable + índices compostos + trigger de write-through via service existente. Alternativamente: incluir em `kommo_foundations_2` se ainda não mergeado.

3. **Larissa (endpoints metadata):** `GET /kommo/pipelines` previsto em §7.3 — confirmar shape de resposta (`{ id: string, name: string, isArchived: boolean }`), filtro `?includeArchived=false` default, paginação não-necessária (workspace típico < 50 pipelines).

4. **Hugo (QA):** absorve plano de teste §10 na regression suite da Sprint 5 (`K5-5`). Coord com Carolina para fixtures de pipeline em 2 workspaces.

5. **squad-fe-dashboards:** componente `<KommoGlobalFilters>` — quem constrói (Iago/Debora/Ana do squad-fe)? Esta spec define contrato de API (`GET /kommo/pipelines` + querystring `?pipeline=p1,p2`); shape UX segue §8.

6. **Operators futuros (fora de escopo):** RFC separada para `IN_LAST_DAYS`, `NOT_IN`, `BETWEEN_DATES` etc. — `field="pipelineId"` só precisa de `IN` hoje, mas padrão de validação branch-por-field abre caminho para cada novo field declarar seus operators permitidos.

7. **Generalização:** se dashboards futuros (Fase 2+) precisarem de `pipelineId` em contextos não-Kommo (improvável — pipeline é entidade Kommo), esta spec é reutilizável trocando apenas whitelist por entity. Não há ação hoje.

---

## 13. Status para ADR

Verificado em `.claude/adr/` (pasta vazia em 2026-04-23). A regra INTERSECAO ainda **NÃO** está registrada em ADR formal, embora seja princípio documentado no skill (`squad-dashboards.mdc` linha 392: red flag "Merge de filtros global × card substituindo em vez de INTERSECAO") e citada em 3 lugares do skill.

**Proposta (não executada nesta spec):** criar ADR `010-dashboards-filter-merge-intersection.md` (próximo número — pasta ADR vazia, partir de `010` deixa 001-009 reservados para ADRs anteriores mencionados no skill/plano: ADR-003 outbox cache invalidation, ADR-004 Kommo auth dual, ADR-007 Kommo cache invalidation).

**Conteúdo sugerido (quando for criado):**
- Contexto: dashboards com filtros por card + filtros globais por dashboard.
- Decisão: merge é **sempre INTERSECAO** (AND lógico em conjuntos). Conflito no mesmo field → interseção de conjuntos; interseção vazia → empty-result shape do CardType.
- Consequências: consistência cognitiva para usuário (global "restringe" dashboard, nunca "sobrescreve"); backend tem invariante auditável via red flag de code review.
- Alternativas rejeitadas: (a) global substitui card — quebra caso de card pré-configurado com filtro fixo (ex: "Conversas Abertas" com `status IN [OPEN]` — não pode virar "Todas" só porque dashboard tem filtro global de pipeline). (b) global opcional por card via flag — adiciona complexidade sem caso de uso real identificado.

**Ação de quem criar o ADR:** Thales (Tech Lead) como owner da query engine. Esta spec **sinaliza** a necessidade; **não cria** o ADR.

---

## Resumo (< 150 palavras)

Spec do filtro global `pipelineId` (operator `IN`, array de cuids) para dashboard "Analytics Comercial" na Sprint 5 (`K5-4`). Reusa `DashboardFilter` existente — zero migration de schema dashboards. **Recomendação principal:** denormalizar `pipelineId` em `KommoConversation` e `KommoMessage` via migration aditiva `kommo_foundations_3` (nullable → backfill → NOT NULL) + índices compostos; evita JOIN de 2 níveis no hot path e mantém p95 ≤ 400ms. **Três handshakes críticos:** (1) Thales aprova denormalização vs. JOIN puro; (2) Larissa inclui colunas + índices em `kommo_foundations_3`; (3) squad-fe-dashboards constrói `<KommoGlobalFilters>` consumindo `GET /kommo/pipelines` já previsto. **INTERSECAO é invariante inviolável** (nunca substitui filtros do card — principio #4 do skill, proposto para ADR). **Edge case normativo:** interseção vazia de `field` conflitante retorna empty-result shape específico por `CardType` (`KPI_NUMBER → {value:0}`, `BAR_CHART → []`, `TABLE → {columns:[],rows:[]}`), não erro HTTP. `kommoAgents` ignora filtro silenciosamente (não aplicável semanticamente).
