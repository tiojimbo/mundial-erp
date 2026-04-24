# Spec — Kommo Adapter Contract para o `DashboardCardQueryService`

> **Audiencia primaria:** Larissa Bezerra (Backend, squad-kommo) — quem vai implementar os 4 adapters.
> **Audiencia secundaria:** Rafael Quintella (Tech Lead squad-kommo), Mateus Albuquerque (workers), Carolina Duarte (QA), Thales Rocha (autor/owner do query engine), Debora Lima + Iago Silveira + Renata Pires + Hugo Monteiro (cross-ref squad-dashboards).
>
> **Objetivo:** fixar exatamente o que precisa ser entregue em Sprint 3 (PLANO-KOMMO-DASHBOARD.md story `K3-1`) para que os 4 adapters Kommo sejam aceitos no `DashboardCardQueryService` sem precisar de mudancas no servico em si.
>
> **Status:** Draft v1 — aguarda revisao Larissa + Rafael antes de entrar no backlog.
> **Autor:** Thales Rocha (squad-dashboards Tech Lead)
> **Data:** 2026-04-23
> **Related:** ADR-007 (`kommo-outbox-invalidation`), PLANO-KOMMO-DASHBOARD.md secoes 4, 5.2, 7.4, 8.7, 10.
> **Referencia de codigo:** `mundial-erp-api/src/modules/dashboards/dashboard-card-query.service.ts`

---

## 0. TL;DR

Voce (Larissa) vai criar 4 adapters em `mundial-erp-api/src/modules/kommo-adapters/`:

1. `kommoConversations.adapter.ts`
2. `kommoMessages.adapter.ts`
3. `kommoLeads.adapter.ts`
4. `kommoAgents.adapter.ts`

Mais whitelists em `kommo-adapters/whitelist/*.ts`. Cada adapter implementa a interface `QueryEngineAdapter<T>` desta spec, declara uma whitelist de `field` + `operator` permitidos, traduz `FilterNode[]` em `Prisma.WhereInput` **com `workspaceId` injetado ANTES de qualquer filtro do `dataSource`**, e fornece um `shapeFor(cardType)` que retorna a funcao de transformacao de rows para o shape correto por `CardType`.

**Sprint 3 entrega MVP** — eu (Thales) estendo `DashboardCardQueryService` em PR separado para consumir sua pasta `kommo-adapters`. Essa spec e o contrato entre os dois PRs.

**Nao altere `dashboard-card-query.service.ts` neste sprint.** Eu faco.

---

## 1. Contexto obrigatorio

Antes de codar, leia:

- `mundial-erp-api/src/modules/dashboards/dashboard-card-query.service.ts` — estado atual (498 linhas). Atente-se a `SUPPORTED_ENTITIES`, `ALLOWED_FIELDS`, `ALLOWED_VALUE_FIELDS`, `ALLOWED_GROUP_FIELDS`, padroes de `buildWhere`/`executeKpi`/`executeGrouped`/`executeTimeSeries`.
- `.claude/skills/squad-dashboards.mdc` principios #1 a #16. Principios mais criticos para voce:
    - **#1** multi-tenancy hermetico: `workspaceId` injetado como PRIMEIRA clausula do `where`.
    - **#2** query engine e whitelist-only para `entity`/`operator`/`field`.
    - **#3** zero SQL bruto a partir de JSON. Zero `$queryRaw` no adapter.
    - **#4** DTOs class-validator, zero `any`.
    - **#13** logs estruturados sem PII em clear.
- PLANO-KOMMO-DASHBOARD.md secoes 5.2 (schema Prisma das 11 tabelas — use como fonte de field/tipos), 8.7 (contrato de adapter resumido — este doc detalha), 10 (17 cards — use como fonte de truth dos shapes esperados).
- ADR-007 (mesma pasta) — para entender como cache e invalidado, nao e seu trabalho invalidar no adapter.

---

## 2. Extensao do `DashboardCardQueryService`

### 2.1 `SUPPORTED_ENTITIES` — novos membros

O servico atual usa **snake_case** para entidades internas (`'orders'`, `'accounts_receivable'`, `'production_orders'`). Decisao para Kommo: **usar camelCase pluralizado** (`'kommoConversations'`, `'kommoMessages'`, `'kommoLeads'`, `'kommoAgents'`).

#### Por que camelCase, quebrando o padrao snake_case do servico atual?

1. **Prefixo de namespace obrigatorio** — todas as 4 entidades comecam com `kommo*`, ja sinalizando origem externa. Nao reusariamos nome curto como `conversations` porque (a) colidiria com possiveis entidades internas futuras, (b) perderia a rastreabilidade.
2. **Consistencia com camelCase dos models Prisma** — os delegates sao `this.prisma.kommoConversation`, `this.prisma.kommoMessage`, etc. Usar `kommoConversations` como chave de entidade bate 1:1 com o nome do model pluralizado, o que reduz carga cognitiva no `getDelegate`.
3. **Front-end ja usa camelCase** — `dataSource.entity: "kommoConversations"` sera escrito literalmente no seed do dashboard (`.claude/plan/PLANO-KOMMO-DASHBOARD.md` secao 10 mostra os cards referenciando esse nome). Forcar `kommo_conversations` em BD mas `kommoConversations` no JSON do card gera friccao inutil.
4. **Retro-compat das entidades internas:** o mapa em `normalizeEntity` aceita **aliases**. Nao propomos renomear `orders`/`accounts_receivable`/etc. — apenas aceitar camelCase para as novas entidades Kommo. Atualmente o servico ja aceita sinonimos (`order` vira `orders`, `ar` vira `accounts_receivable`). Extensao para Kommo segue o mesmo principio de aceitar o nome canonico camelCase.

#### Acao concreta (eu que faco, em PR paralelo)

Vou expandir `SUPPORTED_ENTITIES`:

```ts
const SUPPORTED_ENTITIES = [
  'orders',
  'accounts_receivable',
  'accounts_payable',
  'products',
  'production_orders',
  'invoices',
  'clients',
  'kommoConversations',
  'kommoMessages',
  'kommoLeads',
  'kommoAgents',
] as const;
```

E estender `normalizeEntity` com as chaves literais e um alias singular `kommoConversation -> kommoConversations`, etc. **Larissa, voce nao precisa tocar nisso** — apenas exporte seus adapters declarando `entity` com o nome canonico em camelCase (ex: `entity: 'kommoConversations'`).

### 2.2 `ALLOWED_FIELDS` por entidade Kommo

**Fonte da verdade:** PLANO-KOMMO-DASHBOARD.md secao 5.2 (schema Prisma). Abaixo a whitelist **minima obrigatoria MVP** — derivada dos cards das secoes 10.1 e 10.2 do plano. NAO adicione `id`, `createdAt` como `updatedAt`, `name`, `email`, `contentPreview`, `contentHash` sem justificativa — esses ou sao sensiveis ou nao sao filtraveis de forma util.

#### `kommoConversations`

```ts
export const KOMMO_CONVERSATIONS_ALLOWED_FIELDS = new Set([
  'status',              // KommoConversationStatus enum — card "Conversas em Aberto", "Resolvidas Hoje"
  'responsibleAgentId',  // card "Sem Responsavel", "Conversas por Responsavel"
  'pipelineId',          // filtro global do dashboard (Fase 2)
  'departmentId',        // card "Por Departamento"
  'createdAt',           // card "Iniciadas Hoje", "Conversas - 7 Dias"
  'resolvedAt',          // card "Resolvidas Hoje", "Tempo de Resolucao"
  'lastMessageAt',       // ordenacao de listagem
  'firstResponseAt',     // card "Resposta Rapida", "Tempo Medio de Resposta"
  'firstMessageAt',      // consultas auxiliares de metrica
  'leadId',              // joins com leads
  'accountId',           // consistency — sempre filtrado alem de workspaceId
]);
```

**Observacoes:**

- `status` e enum `KommoConversationStatus` (`OPEN`, `WAITING_RESPONSE`, `WAITING_CLIENT`, `RESOLVED`, `ARCHIVED`). Operadores suportados: `EQUALS`, `NOT_EQUALS`, `IN`.
- `responsibleAgentId`, `leadId`, `departmentId`, `pipelineId`, `accountId` sao `String` cuid ou nullable. Operadores: `EQUALS`, `NOT_EQUALS`, `IN`. `NOT_EQUALS` com `null` traduz para `{ not: null }`.
- Campos datetime aceitam `EQUALS`, `GREATER`, `LESS`, `BETWEEN`.
- Campos nullable devem declarar `nullable: true` no `FieldSpec` (ver 2.2 abaixo) — o adapter deve tratar `responsibleAgentId = null` nos filtros.

#### `kommoMessages`

```ts
export const KOMMO_MESSAGES_ALLOWED_FIELDS = new Set([
  'direction',       // KommoMessageDirection IN|OUT — card "Mensagens Hoje" breakdown
  'authorAgentId',   // card "Performance por Atendente"
  'conversationId',  // joins
  'createdAt',       // "Mensagens Hoje", "Horarios de Pico", "Mensagens - 7 Dias"
  'accountId',
]);
```

**Observacoes:**

- `direction` enum `KommoMessageDirection` (`IN`, `OUT`). Operadores: `EQUALS`, `IN`.
- `authorAgentId` e nullable (mensagens sistema podem nao ter autor). Operadores: `EQUALS`, `NOT_EQUALS`, `IN`.
- **PROIBIDO** expor `contentPreview` e `contentHash` em filtros — risco de PII leak via query engine + nao ha caso de uso. Hugo deve barrar em code review.

#### `kommoLeads`

```ts
export const KOMMO_LEADS_ALLOWED_FIELDS = new Set([
  'pipelineId',           // filtro global + card "Leads por Pipeline"
  'statusId',             // cards de funnel
  'responsibleAgentId',   // performance por atendente
  'createdAt',            // cards "Leads Hoje", "Leads na Semana"
  'closedAt',             // leads fechados na semana/mes
  'isClosed',             // Boolean
  'isWon',                // Boolean nullable
  'valueCents',           // card com Sum(valueCents) — KPI de receita
  'accountId',
]);
```

**Observacoes:**

- `valueCents` e `BigInt` em Prisma mas para fins de `ALLOWED_VALUE_FIELDS` (valor agregado de KPI_NUMBER) e permitido (ver 2.4 abaixo).
- `isWon` e `Boolean?` nullable (so setado quando `isClosed = true`).

#### `kommoAgents`

```ts
export const KOMMO_AGENTS_ALLOWED_FIELDS = new Set([
  'departmentId',   // card "Agentes por Departamento"
  'isActive',       // Boolean — card "Agentes Ativos"
  'accountId',
]);
```

**Observacoes:**

- Entidade pequena (dezenas de rows por conta). Principalmente usada em joins declarativos via `include` no Prisma quando o adapter de `kommoConversations`/`kommoLeads` agrupa por `responsibleAgentId` e precisa do `name` do agente no shape.
- **PROIBIDO** expor `email`, `name`, `kommoUserId`, `mappedUserId` em filtros — tais campos podem aparecer no shape de retorno (label de card), mas nao em filtro dinamico. Filtrar por nome eh use case de texto livre que exige `CONTAINS` operator — nao permitido na MVP.

### 2.3 Regra inviolavel: `workspaceId` SEMPRE como primeira clausula

Cada adapter, ao traduzir filtros, deve produzir:

```ts
{
  workspaceId,                           // PRIMEIRA — NAO OPCIONAL
  deletedAt: null,                       // SEGUNDA (soft delete padrao)
  ...restrictionsFromDataSourceAndFilters,
}
```

**O `workspaceId` NAO e opcional.** O adapter recebe como parametro (`translate(filters, workspaceId)`) e **deve** falhar se vier undefined/null. Em TypeScript:

```ts
translate(filters: FilterNode[], workspaceId: string): Prisma.KommoConversationWhereInput {
  if (!workspaceId) {
    throw new BadRequestException('workspaceId is mandatory');
  }
  const where: Prisma.KommoConversationWhereInput = {
    workspaceId,                         // <-- primeira
    deletedAt: null,
  };
  // ... aplica filters validados ...
  return where;
}
```

Em tempo de `findMany`/`findFirst`, essa `where` e passada intacta. `workspaceId` e uma coluna indexada (todo model Kommo tem `@@index([workspaceId, ...])` composto — ver secao 5.2 do plano).

---

## 3. Interface do adapter (TypeScript)

Declare em `kommo-adapters/query-engine-adapter.interface.ts`:

```ts
import { Prisma } from '@prisma/client';
import type { CardType } from '@prisma/client';

/**
 * Tipo estrutural de cada campo permitido na whitelist de um adapter.
 * Usado pelo adapter para:
 *   1. Validar o operator do filtro contra os operators suportados pelo tipo.
 *   2. Coagir o `value` do filtro antes de passar para Prisma (ex: BigInt).
 *   3. Rejeitar o filtro com BadRequestException se tipo/operator/value nao batem.
 */
export interface FieldSpec {
  type: 'string' | 'int' | 'bigint' | 'datetime' | 'enum' | 'boolean';
  operators: ReadonlyArray<FilterOperator>;
  nullable: boolean;
  /** Valores permitidos quando `type === 'enum'`. Ignorado nos demais tipos. */
  enumValues?: ReadonlyArray<string>;
}

export type FilterOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER'
  | 'LESS'
  | 'BETWEEN'
  | 'IN';

export interface FilterNode {
  field: string;
  operator: FilterOperator;
  value: unknown;  // validado pelo adapter contra FieldSpec
}

/**
 * Shapes de retorno por CardType. Reflete o que o frontend espera em
 * /cards/:cardId/data. Nomes e formato sao CONTRATO — nao inventar variacoes.
 *
 * Fonte: dashboard-card-query.service.ts linhas 40-45.
 */
export type LabelValue = { label: string; value: number };
export type XYPoint = { x: string; y: number };
export type TableData = { columns: string[]; rows: Record<string, unknown>[] };
export type KpiData = { value: number; label: string };

/**
 * Fase 2: CardType 'GAUGE' entra via RFC `dashboards-002-gauge-cardtype`
 * (ownership Iago Silveira). NAO implemente shape para GAUGE na Sprint 3 —
 * aguarde aprovacao da RFC. Shape preliminar documentado abaixo para
 * coordenacao de planejamento:
 *   { value: number; min: number; max: number; target?: number; color?: string; label: string }
 * Larissa: quando GAUGE for aprovado, voce adiciona case no shapeFor.
 */
export type GaugeData = {
  value: number;
  min: number;
  max: number;
  target?: number;
  color?: string;
  label: string;
};

export type CardResponseShape =
  | LabelValue[]
  | XYPoint[]
  | TableData
  | KpiData
  | GaugeData; // reservado Fase 2

/**
 * Contrato que todo adapter Kommo (e futuro adapter no query engine) deve
 * implementar. Adapters sao registrados num registry resolvido pelo
 * DashboardCardQueryService (via module provider).
 */
export interface QueryEngineAdapter<T> {
  /** Nome canonico camelCase, ex: "kommoConversations". Deve constar em SUPPORTED_ENTITIES. */
  readonly entity: string;

  /** Whitelist de fields para o adapter. Chave = field name (camelCase), valor = FieldSpec. */
  readonly fieldWhitelist: Record<string, FieldSpec>;

  /**
   * Traduz os filtros em `Prisma.*WhereInput` tipado para o model especifico.
   * workspaceId e obrigatorio; vira como PRIMEIRA clausula do WhereInput.
   *
   * Deve:
   *   - rejeitar field fora do whitelist com BadRequestException.
   *   - rejeitar operator nao suportado para o tipo do field com BadRequestException.
   *   - coagir value conforme FieldSpec.type (ex: BigInt).
   *   - tratar IN com array vazio como 400 (nao silenciar).
   *   - tratar BETWEEN com array de tamanho != 2 como 400.
   */
  translate(filters: FilterNode[], workspaceId: string): Prisma.JsonObject;

  /**
   * Retorna a funcao que converte o resultado de uma query Prisma (rows[])
   * no shape esperado pelo cardType. O chamador (query engine) escolhe qual
   * funcao aplicar com base no CardType do DashboardCard.
   *
   * Deve mapear todos os 8 CardTypes atuais (BAR_CHART, LINE_CHART, PIE_CHART,
   * KPI_NUMBER, TABLE, DONUT, AREA_CHART, STACKED_BAR). GAUGE entra Fase 2.
   *
   * Em caso de CardType nao suportado pela entidade (ex: LINE_CHART em
   * kommoAgents nao faz sentido), retorna funcao que lanca BadRequestException
   * com mensagem explicita ("kommoAgents nao suporta LINE_CHART").
   */
  shapeFor(cardType: CardType): (rows: T[]) => CardResponseShape;
}
```

### 3.1 Onde registrar

Em `kommo-adapters/kommo-adapters.module.ts`, exporte os 4 adapters como providers. No modulo do dashboards (que eu cuido), havera um `KommoAdaptersRegistryService` que injeta o array e expõe `getAdapter(entity: string): QueryEngineAdapter<any>` usado pelo `DashboardCardQueryService`.

---

## 4. Whitelist de operators

**Operators permitidos MVP — mesmos da engine atual:**

- `EQUALS`
- `NOT_EQUALS`
- `GREATER`
- `LESS`
- `BETWEEN`
- `IN`

**Validacao por tipo** (tabela obrigatoria no `FieldSpec`):

| `FieldSpec.type` | Operators permitidos |
|---|---|
| `string` | `EQUALS`, `NOT_EQUALS`, `IN` |
| `int`, `bigint` | `EQUALS`, `NOT_EQUALS`, `GREATER`, `LESS`, `BETWEEN`, `IN` |
| `datetime` | `EQUALS`, `GREATER`, `LESS`, `BETWEEN` |
| `enum` | `EQUALS`, `NOT_EQUALS`, `IN` |
| `boolean` | `EQUALS`, `NOT_EQUALS` |

Adapter deve rejeitar combinacoes invalidas com `BadRequestException("Operator 'GREATER' nao suportado para field 'status' (enum).")`.

### 4.1 Operators futuros — **NAO antecipe**

Renata Pires (squad-dashboards, owner de filtros) vai propor em spec separada operators adicionais:

- `IN_LAST_DAYS`
- `RELATIVE_DATE`
- `NOT_IN`
- `CONTAINS`
- `STARTS_WITH`

**Nao implemente esses na Sprint 3.** Eles exigem RFC + modelagem de semantica + decisao de timezone (crucial para `IN_LAST_DAYS`). Cards Kommo MVP nao precisam — todas as consultas de "hoje", "7 dias", "semana" sao resolvidas por pre-calculo no backend (startOfDay calculado no service antes de passar para o adapter, aplicado via `GREATER`/`BETWEEN` em `createdAt`/`resolvedAt`).

### 4.2 Validacao de shape do `value`

| Operator | Forma valida de `value` |
|---|---|
| `EQUALS`, `NOT_EQUALS` | escalar do tipo do field, ou `null` (apenas em `NOT_EQUALS` com field nullable) |
| `GREATER`, `LESS` | escalar do tipo do field; datetime aceita `ISO 8601` string ou `Date` |
| `BETWEEN` | `[minInclusive, maxInclusive]` — array de tamanho 2; ambos do tipo do field; se um lado for `null`, rejeita com 400 (use `GREATER`/`LESS` para open range) |
| `IN` | array nao-vazio; cada item do tipo do field; tamanho maximo 100 (guard de DoS) |

---

## 5. Invariantes de seguranca (P0 se violadas)

### 5.1 Zero `$queryRaw` no adapter

Nenhum `prisma.$queryRaw`, nenhum `$executeRaw`, nenhuma string SQL construida a partir de JSON. **Apenas Prisma Client tipado** (`prisma.kommoConversation.findMany({ where: ... })`). Violacao e **P0 de seguranca** — Hugo rejeita em code review e abre CVE interno.

### 5.2 Whitelist enforcement

- `dataSource.entity` fora do array canonico → `BadRequestException('UnsupportedDataSource')` **ANTES** de tocar em Prisma. Quem valida isso sou eu (`normalizeEntity`), mas se voce criar um novo nome de entidade, avise-me.
- `field` fora do whitelist da entidade → `BadRequestException('Field "X" nao permitido para kommoConversations')`.
- `operator` fora da whitelist para o tipo do field → `BadRequestException('Operator "Y" nao permitido para field "X" (tipo Z)')`.

Cada uma dessas validacoes **deve** ter unit test (3 testes minimos por adapter).

### 5.3 `workspaceId` NUNCA omitido — unit test obrigatorio

Todo adapter deve ter test:

```ts
describe('kommoConversations adapter', () => {
  it('GIVEN valid filters WHEN translate called THEN where.workspaceId equals input workspaceId', () => {
    const where = adapter.translate([], 'ws-123');
    expect(where.workspaceId).toBe('ws-123');
  });

  it('GIVEN null workspaceId THEN throws BadRequestException', () => {
    expect(() => adapter.translate([], null as any)).toThrow(BadRequestException);
  });
});
```

E um **integration test** que mocka a extensao `primaryAssigneeCacheExtension` (existe no `PrismaService`) e valida que **toda chamada** `findMany`/`findFirst`/`count`/`aggregate`/`groupBy` passa por `where` com `workspaceId` preenchido. Carolina sabe o padrao do squad-tasks; replique.

### 5.4 Validacao class-validator no DTO do `dataSource.filters`

Na minha extensao do query engine, o JSON `dataSource.filters` chega apos validacao DTO global. **Voce nao valida o DTO** — mas tenha ciencia que o DTO esperado (existe no controller do `/dashboards/:id/cards` — dominio do Iago) usara:

```ts
class DataSourceDto {
  @IsIn(['kommoConversations', 'kommoMessages', 'kommoLeads', 'kommoAgents', ...])
  entity!: string;

  @IsOptional()
  @ValidateNested()
  @IsObject()  // + custom validator que enforca chaves da whitelist
  filters?: Record<string, unknown>;
}
```

Importante: `@IsObject()` puro **nao basta**. Iago implementa custom validator `@IsKommoFilterKey(entity)` que consulta sua whitelist para rejeitar chaves fora. Voce fornece a whitelist como constante exportada (vide 2.2 acima).

### 5.5 Shape de retorno consistente com CardType (contract test)

Hugo vai escrever contract tests — voce so precisa garantir que seu `shapeFor(cardType)` retorna EXATAMENTE:

- `KPI_NUMBER` → `KpiData = { value: number; label: string }`
- `BAR_CHART`, `STACKED_BAR`, `PIE_CHART`, `DONUT` → `LabelValue[] = [{ label, value }, ...]`
- `LINE_CHART`, `AREA_CHART` → `XYPoint[] = [{ x, y }, ...]`
- `TABLE` → `TableData = { columns, rows }`
- `GAUGE` (Fase 2) → `GaugeData = { value, min, max, target?, color?, label }`

Zero campos extras. Zero `undefined`. Zero `any`. Numeros finitos (NaN = falha).

---

## 6. Budget de performance

### 6.1 Queries por hot path

- `kommoConversations.findMany` com filtro `(workspaceId, status)`: **≤ 5 queries por request** (principio #7 do squad-dashboards). Indice composto `@@index([workspaceId, status])` ja existe em `kommo_conversations` (plano secao 5.2).
- `kommoMessages.findMany`: cuidado com time series — indice `@@index([workspaceId, createdAt(sort: Desc)])` e `@@index([workspaceId, direction, createdAt])` cobrem "Mensagens Hoje" e "Horarios de Pico".
- `kommoLeads.findMany`: indices `@@index([workspaceId, pipelineId, statusId])`, `@@index([workspaceId, createdAt])`, `@@index([workspaceId, responsibleAgentId])`.
- `kommoAgents.findMany`: entidade pequena, nao e gargalo.

### 6.2 KPIs `COUNT(*)` sobre tabela grande → **redirecione para `KommoMetricSnapshot`** (ADR-009)

Regra obrigatoria:

- "Total Resolvidas" all-time → **NUNCA** `prisma.kommoConversation.count({ where: { status: 'RESOLVED', workspaceId } })`. Isso e O(N) em 1M+ rows.
- Em vez disso: adapter detecta `dataSource.metricKey = 'total_resolved'` no JSON do card e le de `prisma.kommoMetricSnapshot.findUnique({ where: { workspaceId_pipelineId_metricKey_windowStart_windowEnd: { ... } } })`.

#### Convencao

Adicione uma chave opcional `metricKey?: string` no `DataSource` do card (nao quebra nada — campos novos sao aditivos, vide principio #5 schemaVersion). Seu adapter faz:

```ts
async executeKpi(where, axisConfig, metricKey?: string) {
  if (metricKey) {
    const snapshot = await this.prisma.kommoMetricSnapshot.findFirst({
      where: { workspaceId: where.workspaceId, metricKey },
      orderBy: { updatedAt: 'desc' },
    });
    return { value: Number(snapshot?.value ?? 0n), label: this.labelFor(metricKey) };
  }
  // fallback para COUNT / SUM em tabela-fonte para metricas sem snapshot
  return this.defaultKpiPath(where, axisConfig);
}
```

**Lista de metricKeys MVP** (derivada dos 8 cards da secao 10.1 do plano):

| Card | metricKey | Entidade-fonte do fallback |
|---|---|---|
| Conversas em Aberto | `open_conversations` | kommoConversations |
| Sem Responsavel | `unassigned_conversations` | kommoConversations |
| Resolvidas Hoje | `resolved_today` | kommoConversations |
| Tempo Medio de Resposta | `avg_first_response_minutes` | kommoConversations (snapshot obrigatorio — calculo e caro) |
| Taxa de Resolucao | `resolution_rate_7d_pct` | kommoConversations (snapshot obrigatorio) |
| Mensagens Hoje | `messages_today` | kommoMessages |
| Leads Hoje | `leads_today` | kommoLeads |
| Total Resolvidas | `total_resolved` | kommoConversations (snapshot OBRIGATORIO — sem fallback COUNT) |

**Decisao de negocio** (ratificada com Larissa em Sprint 3 planning): KPIs "all-time" e KPIs de "media/taxa" NAO tem fallback para COUNT — se snapshot nao existe, retorna `{ value: 0, label: '...' }` com warn log. Snapshot deve estar sempre disponivel apos backfill.

### 6.3 Pre-invocacao

O `DashboardCardQueryService` atual faz `delegate.count` diretamente. Eu vou refatorar para consultar o adapter via `adapter.shapeFor(cardType)(...)` — o adapter controla como a query e feita. Voce tem liberdade de chamar `findMany` ou `count` ou `aggregate` conforme o caso.

---

## 7. Cache TTL recomendado por entidade

Estes sao valores default — o frontend/card pode override via `DashboardCard.config.cacheTTL` (infra ja existe no squad-dashboards).

| Cenario de card | TTL recomendado | Justificativa |
|---|---|---|
| Conversas em aberto (alta rotatividade) | **30s** | KPI muda a cada incoming message |
| Mensagens hoje | **30s** | Idem |
| Leads hoje | **60s** | Mutacao media, menos frequente |
| Conversas por Departamento (Fase 2) | **60s** | BAR_CHART, aggregate relativamente estavel |
| Total Resolvidas all-time (via snapshot) | **120s** | Snapshot ja pre-agrega; mesmo valor em 2min seguidos |
| Performance historica 7 dias (LINE_CHART) | **300s** | Janela fixa; novos dias so entram em cada startOfDay |
| Horarios de Pico (BAR_CHART 24 bars) | **300s** | Agregado historico; mudanca incremental |

**Invalidacao sobrepoe o TTL** via ADR-007 — evento `KOMMO_ENTITY_CHANGED` derruba cache antes do TTL expirar. Entao o TTL e seguranca de ultima linha, nao fresheness garantee.

### 7.1 Voce define via campo no adapter?

**Nao.** TTL e responsabilidade do card (`config.cacheTTL`) e do service (fallback `DASHBOARD_CACHE_TTL_DEFAULT`). Seu adapter nao toca em Redis diretamente — ele le e retorna shape, o service cacheia acima.

---

## 8. Logs estruturados obrigatorios

Todo adapter deve emitir log estruturado **no minimo** no inicio e fim do `translate`/`shapeFor`:

```ts
this.logger.log({
  message: 'kommoConversations.translate',
  requestId,
  workspaceId,
  userId,
  dashboardId,
  cardId,
  entity: 'kommoConversations',
  filterCount: filters.length,
});

// ... executa translate ...

this.logger.log({
  message: 'kommoConversations.translate done',
  requestId,
  workspaceId,
  cardId,
  entity: 'kommoConversations',
  duration_ms,
  cache_hit: false,   // cache e no service, mas voce recebe como parametro
  row_count,          // sempre que possivel
});
```

**Campos obrigatorios em TODO log do adapter:**

- `requestId`
- `workspaceId`
- `userId`
- `dashboardId`
- `cardId`
- `entity`
- `duration_ms`
- `cache_hit`
- `row_count`

### 8.1 PROIBIDO logar

- `contentPreview` integral de `KommoMessage` — truncar a **80 chars** se for absolutamente necessario logar (prefira nao logar).
- Valores de `dataSource.filters` sem truncar — se o filtro tem array `IN` com 100 ids, log pode explodir. Truncar strings > **200 chars** (padrao ja existente em `task-outbox.constants.ts` `TASK_OUTBOX_LOG_PAYLOAD_MAX_CHARS = 500` — use o mesmo ou menor).
- `phone` / `email` / `kommoUserId` / `accessToken` / `refreshToken` / `hmacSecret` em clear. Se um valor assim aparecer no filtro (algum card custom), **mascare** ex: `55119****1234`, `jo**@gmail.com`.

Lint rule custom no squad-infra vai falhar o build se `this.logger.log` contiver `accessToken` ou `refreshToken` literalmente — ja existe para squad-auth.

---

## 9. Testes que Carolina (ou Hugo — cross-squad) vai escrever

Checklist que voce precisa destravar com fixtures + mocks. **Nao e voce quem escreve todos — mas voce garante que seu adapter e testavel.**

### 9.1 Cross-tenant 404

- Cenario: workspace W1 tem dashboard com card consumindo `kommoConversations`. Usuario de W2 faz `GET /dashboards/{id}/cards/{cardId}/data`. Esperado: **404**, nao 403. Hugo escreve.
- Dependencia: adapter nunca vaza rows de W2 mesmo que W2 tenha `workspaceId` no proprio JWT mas apontando para `dashboardId` de W1.
- Fixture: 2 workspaces com 10 conversations cada, dashboards distintos.

### 9.2 SQL injection fuzz

Payloads obrigatorios em cada field dos 4 adapters:

- `"'; DROP TABLE kommo_conversations; --"`
- `"' OR 1=1 --"`
- `"' UNION SELECT * FROM kommo_accounts --"`
- JSON nested injection: `{ "field": { "$contains": { "$ne": null } } }`
- Prototype pollution: `{ "__proto__": { "isAdmin": true } }`, `{ "constructor": { "prototype": ... } }`
- Unicode bypass: `"' OR 1=1 --"`

**Esperado:** 400 em todos os casos (whitelist bloqueia). Nenhuma query Prisma executada.

### 9.3 Whitelist enforcement

- `entity = "kommoConversations2"` → 400 `UnsupportedDataSource`
- `field = "contentPreview"` em `kommoMessages` → 400
- `operator = "CONTAINS"` em qualquer field → 400
- `operator = "GREATER"` em field `status` (enum) → 400
- `value = []` com operator `IN` → 400
- `value = [a, b, c]` com operator `BETWEEN` → 400

### 9.4 Shape por CardType

Para cada adapter, fixture de 100 rows + expectativa:

- `KPI_NUMBER` retorna `{ value: number, label: string }` com `value >= 0`.
- `BAR_CHART`/`DONUT` retorna `LabelValue[]` ordenado deterministicamente.
- `LINE_CHART` retorna `XYPoint[]` com `x` em formato `YYYY-MM-DD` ISO date-only.
- `TABLE` retorna `{ columns, rows }` — columns sao subset estavel, **nao expõe** `deletedAt`, `updatedAt`, `contentPreview`, `contentHash`.
- `GAUGE` (Fase 2) retorna `{ value, min, max, target?, color?, label }` — aguarda RFC.

### 9.5 Cache key carrega `workspaceId`

- Setup: 2 workspaces, mesmo card schema, mesmos filtros.
- Execucao: chamar `/cards/:cardId/data` de cada workspace via usuario respectivo.
- Verificar: Redis tem 2 chaves distintas `card:{cardId}:filtersHash:{h}:workspace:ws1` e `card:{cardId}:filtersHash:{h}:workspace:ws2`.
- Este teste e do squad-dashboards (eu mando), mas voce precisa nao interferir — seu adapter so fornece rows.

### 9.6 Invalidacao via outbox (ADR-007)

- Setup: cache quente para W1 (`card:c1:fh:h:workspace:ws1` com valor X).
- Acao: emitir evento `KOMMO_ENTITY_CHANGED` com `entity='conversation'`, `workspaceId='ws1'`.
- Verificar: chave Redis `card:c1:*:workspace:ws1` deletada apos <2s. Chaves `*:workspace:ws2` intactas.
- Escrito por mim, integrado com seu adapter atraves de seed de card.

---

## 10. Entregaveis de Larissa em Sprint 3

### 10.1 Codigo

```
mundial-erp-api/src/modules/kommo-adapters/
├── kommo-adapters.module.ts                       # registra 4 adapters
├── query-engine-adapter.interface.ts              # interface desta spec secao 3
├── kommo-conversations.adapter.ts
├── kommo-messages.adapter.ts
├── kommo-leads.adapter.ts
├── kommo-agents.adapter.ts
├── whitelist/
│   ├── conversations.whitelist.ts                 # exporta KOMMO_CONVERSATIONS_ALLOWED_FIELDS
│   ├── messages.whitelist.ts
│   ├── leads.whitelist.ts
│   └── agents.whitelist.ts
└── __tests__/
    ├── kommo-conversations.adapter.spec.ts        # unit ≥ 90%
    ├── kommo-messages.adapter.spec.ts             # unit ≥ 90%
    ├── kommo-leads.adapter.spec.ts                # unit ≥ 90%
    └── kommo-agents.adapter.spec.ts               # unit ≥ 90%
```

### 10.2 Coverage minima

- `≥ 90%` de statements/branches em cada adapter (principio #15 do squad-dashboards — cobertura unitaria do query engine = 90%).
- 1 teste por operator suportado por field.
- 1 teste por CardType suportado em `shapeFor`.
- 1 teste de rejeicao de cada invariante de seguranca (secao 5).

### 10.3 NAO entregue nesta sprint

- **Nao altere** `dashboard-card-query.service.ts` — eu faco em PR paralelo.
- **Nao crie** cards do seed "Analytics Comercial" — Debora Lima faz (Sprint 4).
- **Nao implemente** operator `IN_LAST_DAYS`/`RELATIVE_DATE` — Renata Pires faz via RFC separada.
- **Nao implemente** shape `GaugeData` ativo — Iago Silveira faz via RFC `dashboards-002-gauge-cardtype`. Deixe case `GAUGE` lancando `NotImplementedException('GAUGE aguarda RFC')` por enquanto.
- **Nao toque** em invalidacao de cache — consumer do outbox e dominio squad-dashboards (ADR-007).

### 10.4 Handshakes explicitos

- **Comigo (Thales) — bloqueante:**
    - Revisao de PR com os 4 adapters antes de merge. 1 round de feedback, max 24h.
    - Eu abro PR no mesmo sprint estendendo `SUPPORTED_ENTITIES` + `normalizeEntity` + provider registry. Seu PR nao quebra o build mesmo que o meu nao tenha mergeado — use test doubles.
- **Com Iago Silveira — Sprint 4/5:**
    - Assim que RFC GAUGE for aprovada, abra PR follow-up adicionando case GAUGE no `shapeFor` + teste.
- **Com Renata Pires — Sprint 5+:**
    - Operators novos (IN_LAST_DAYS etc.) — Renata propoe, voce atualiza os FieldSpecs dos 4 adapters para incluir novos operators nos campos datetime onde fizer sentido.
- **Com Hugo Monteiro — continuo:**
    - Hugo audita seu PR de seguranca. Forneca fixture para fuzz SQL injection.
- **Com Mateus Albuquerque — Sprint 2:**
    - Handlers de worker Kommo vao emitir `KOMMO_ENTITY_CHANGED` (ADR-007). Voce nao depende disso para seus adapters funcionarem — mas se quiser testar invalidacao localmente, combine com Mateus.

---

## 11. Checklist de aceite (Definition of Done Sprint 3, story K3-1)

- [ ] 4 adapters criados em `kommo-adapters/` com estrutura da secao 10.1
- [ ] Interface `QueryEngineAdapter<T>` implementada conforme secao 3
- [ ] Whitelists completas conforme secao 2.2 (minimo obrigatorio)
- [ ] Operators whitelist enforcement por tipo (secao 4) com unit test
- [ ] Invariantes P0 validadas com unit test (secao 5): workspaceId, zero $queryRaw, whitelist enforcement, shape per CardType
- [ ] Snapshot path implementado para KPIs caros (secao 6.2) com tabela de metricKeys
- [ ] Logs estruturados padrao (secao 8) — sem PII, sem tokens, com todos campos obrigatorios
- [ ] Coverage ≥ 90% por adapter
- [ ] PR reviewed por Thales Rocha antes de merge
- [ ] Fixture de SQL injection fuzz entregue a Carolina/Hugo
- [ ] RFC `kommo-001-foundations.md` aprovada (Sprint 1 delivery)
- [ ] ADR-007 aprovado (paralelo a esta spec)

---

## 12. Referencias

- PLANO-KOMMO-DASHBOARD.md — plano formal (secoes 4, 5.2, 7.4, 8.7, 10)
- `.claude/skills/squad-dashboards.mdc` — principios do owner (#1-#16)
- `.claude/skills/squad-kommo.mdc` — ownership da squad-kommo
- `.claude/agents/agent-cto.md` — principios invioláveis
- `.claude/standards/99-referencia-completa.md` — convencoes Bravy
- `.claude/adr/007-kommo-outbox-invalidation.md` — ADR companheira (invalidacao de cache)
- `mundial-erp-api/src/modules/dashboards/dashboard-card-query.service.ts` — servico a estender
- `mundial-erp-api/src/modules/task-outbox/` — template de outbox
- `mundial-erp-api/prisma/schema.prisma` — schema das 11 tabelas Kommo (apos migration `kommo_foundations_1` + `_2`)

---

**Larissa, duvida? Ping Thales direto no daily da squad-dashboards (seg/qua/sex 9h30 BRT) ou escreva comentario em draft PR. Qualquer alteracao desta spec vira via edit deste arquivo + aviso no canal #squad-dashboards-kommo.**
