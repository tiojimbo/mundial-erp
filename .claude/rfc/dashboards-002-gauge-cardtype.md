# RFC dashboards-002 — Novo `CardType` `GAUGE` (ring-progress)

## 1. Metadata

| Campo | Valor |
|---|---|
| **RFC ID** | `dashboards-002-gauge-cardtype` |
| **Status** | Proposed |
| **Author** | Iago Silveira (squad-dashboards, Backend Cards + 8 tipos + Layout Grid) |
| **Reviewers** | Thales Rocha (query engine shape + adapter), Hugo Monteiro (QA/security), squad-fe-dashboards (renderer + Storybook), Larissa Bezerra (squad-kommo — consumidor Fase 2), Debora Lima (seed "Analytics Comercial" Fase 2) |
| **Target release** | Fase 2 Kommo Dashboard — **Sprint 6** (ver `PLANO-KOMMO-DASHBOARD.md` §13) |
| **Created** | 2026-04-23 |
| **Modo de operação** | ATUALIZACAO (RFC → ADR? → Story → PR), conforme `squad-dashboards.mdc` §"Modo 3 — ATUALIZACAO" |
| **Story bloqueadora** | `K6-1` (plano Kommo) — "RFC `dashboards-002-gauge-cardtype` + impl backend (Iago Silveira) — 8pt" |
| **Precedentes** | Primeira RFC formal de `CardType` novo; estabelece padrão a ser seguido por RFCs futuras (HEATMAP, FUNNEL, TREEMAP, etc.) |

---

## 2. Contexto e Motivação

A **Fase 2 do dashboard "Analytics Comercial"** (PLANO-KOMMO-DASHBOARD §10.2, card #17) exige um card **Performance** com **2 anéis concêntricos/lado-a-lado (ring-progress)** coloridos:

- **Anel 1:** `% Resolução` (taxa de resolução 7d) contra meta (ex.: 80%).
- **Anel 2:** `% Resposta Rápida` (conversas com 1ª resposta < 5min) contra meta (ex.: 70%).

A semântica que o card precisa transmitir é **"progresso em relação a um alvo, com código de cor por threshold"** — algo que os 8 `CardType`s atuais (`BAR_CHART`, `LINE_CHART`, `PIE_CHART`, `KPI_NUMBER`, `TABLE`, `DONUT`, `AREA_CHART`, `STACKED_BAR`) não cobrem corretamente.

Além do caso Kommo, o próximo trimestre já traz demandas análogas confirmadas informalmente por outros squads:

- **squad-production:** OEE (Overall Equipment Effectiveness) como gauge único, meta 85%.
- **squad-financial:** SLA de vencimento de títulos (AR) com meta 95%.
- **squad-orders:** budget atingido / cotado no mês, gauge com meta dinâmica.

Ou seja, `GAUGE` é **reutilizável fora do contexto Kommo** — esta RFC estabelece o tipo como cidadão permanente do catálogo, não como patch para um único card.

### Risco registrado no plano Kommo

- Linha `R-K13` da matriz de riscos (§16 do plano): _"CardType GAUGE atrasa Fase 2"_ — mitigação oficial: RFC em paralelo com Sprint 4, fallback DONUT. Esta RFC é a **execução dessa mitigação**. Se não aprovada a tempo do Sprint 6, fallback DONUT continua válido, mas viola contrato semântico (ver §4).

---

## 3. Problema

### 3.1 Gap semântico

- `KPI_NUMBER` devolve **um valor escalar rotulado** (`{ value, label }`). Não há conceito de `min/max/target`. Forçar gauge dentro de KPI é misturar dois contratos no mesmo tipo.
- `DONUT` devolve **categorias `LabelValue[]`**. Um gauge degenera em 2 slices: `{ label: 'atingido', value: X }` + `{ label: 'restante', value: max - X }`. Semanticamente errado: não há duas categorias comparáveis, há **progresso contra alvo**.
- Nenhum tipo atual expressa **código de cor por threshold** (`< 60% vermelho`, `60-80% âmbar`, `> 80% verde`) como parte do contrato de dados; isso hoje viveria inteiramente no FE, duplicado card a card.

### 3.2 Gap de renderer

Um gauge é **visualmente distinto** de um DONUT: anel aberto na base (270°), ponteiro/indicador central, cor dinâmica por threshold, espaço central para valor + unidade. O `<DonutCard>` do FE não tem esse layout; forçar configura-lo via `config.displayMode: "gauge"` dentro de DONUT ou KPI é anti-pattern direto (viola princípio #5 do `squad-dashboards.mdc`: "cada `CardType` tem shape dedicado e renderer dedicado").

### 3.3 Gap de validação

DTO atual (`create-card.dto.ts`) aceita `dataSource: Record<string, any>` genérico e `config: Record<string, any>` genérico — sem validação por-tipo. Adicionar `GAUGE` é uma oportunidade para **começar a evolução do DTO** na direção de "sub-DTO por `CardType`" (ver §6.2), sem forçar refatoração de cards existentes no mesmo PR.

---

## 4. Opções Avaliadas

### Opção A — `GAUGE` como novo valor do enum `CardType` (RECOMENDADA)

Adicionar `GAUGE` ao enum Prisma `CardType`, criar shape `GaugeData`, DTO `GaugeConfigDto`, ramo dedicado no `DashboardCardQueryService`, componente `<GaugeCard>` no FE.

**Prós:**
- Consistente com padrão atual (8 tipos = 8 shapes = 8 renderers).
- Migration **aditiva** (`ALTER TYPE CardType ADD VALUE 'GAUGE'`) — zero breaking para cards existentes.
- Reusa a infra atual do query engine (whitelist de entidade/operador/field) — GAUGE não introduz nova entidade-fonte, só nova forma de apresentar dados existentes.
- Contrato público explícito: squad-fe-dashboards sabe o que renderizar; tipagem forte.
- Segue princípio #5 do `agent-cto.md`/squad-dashboards (shape tipado por tipo).
- Segue princípio #16 (RFC obrigatória para atualizações pós-GA).

**Contras:**
- Exige migration (aditiva, baixo risco).
- Exige DTO dedicado no back.
- Exige `<GaugeCard>` no FE (trabalho extra de 1 componente + Storybook).
- Exige escolha de lib de render (ver Open Question, §10).
- ~~`schemaVersion` do `config` dos cards precisa ser introduzido se ainda não existir (hoje não existe — ver §6.1).~~ **RESOLVIDO 2026-04-24** — coluna nativa adicionada via migration `20260424_000008_dashboard_card_schema_version` (ver §6.1).

### Opção B — Usar `KPI_NUMBER` + `config.displayMode: "gauge"`

Manter o tipo `KPI_NUMBER`, anexar `{ displayMode: "gauge", min, max, target, color }` no `config`. Renderer de KPI detecta `displayMode` e escolhe entre número ou gauge.

**Prós:**
- Zero migration.
- Zero mudança de enum.

**Contras:**
- **Quebra princípio "1 tipo = 1 shape"** — `/cards/:cardId/data` de `KPI_NUMBER` passaria a retornar `{ value, label }` (modo número) OU `{ value, label, min, max, target }` (modo gauge), union type condicional no contrato público. Cliente nunca sabe que shape esperar sem inspecionar `config`.
- **Quebra princípio "1 tipo = 1 renderer"** — `<KpiCard>` vira switch interno. squad-fe-dashboards vetou informalmente.
- Não escala: quando vier HEATMAP, FUNNEL, TREEMAP, cada um vai virar um `displayMode`? Enum `CardType` fica obsoleto como contrato.
- Red flag direta de `squad-dashboards.mdc`: _"Card retornando shape diferente do esperado para o `CardType` (contrato com squad FE Dashboards)"_.

**Rejeitada.**

### Opção C — Introduzir `CUSTOM` genérico no `CardType`

Adicionar um `CardType` `CUSTOM` com shape `Record<string, unknown>` e deixar cada card declarar seu próprio schema JSON no `config`. Renderer do FE faz dispatch por `config.componentKey`.

**Prós:**
- Máxima flexibilidade — qualquer tipo novo vive atrás de `CUSTOM`, zero migration por tipo.

**Contras:**
- **Anti-pattern flagrante**: abre porta para cada FE inventar shape/renderer sem revisão arquitetural. Whitelist do enum CardType perde efeito.
- Quebra contratos com squad-fe-dashboards (hoje pluggável por CardType, viraria pluggável por `componentKey` string — superfície imprevisível).
- `CardType` deixa de ser whitelist útil — auditoria de segurança/regressão fica sem âncora.
- Contraria princípio #2 do `agent-cto.md` ("whitelist explícita > flexibilidade irrestrita") e princípio #16 deste squad.

**Rejeitada.**

### Recomendação

**Opção A — GAUGE como 9º valor do enum `CardType`.**

---

## 5. Decisão Proposta

### 5.1 Enum Prisma

```prisma
enum CardType {
  BAR_CHART
  LINE_CHART
  PIE_CHART
  KPI_NUMBER
  TABLE
  DONUT
  AREA_CHART
  STACKED_BAR
  GAUGE   // NOVO — ring-progress contra alvo; RFC dashboards-002
}
```

### 5.2 Shape de retorno (`CardDataResult` union)

Adicionar `GaugeData` à union `CardDataResult` em `dashboard-card-query.service.ts`:

```ts
type GaugeData = {
  value: number;           // valor atual observado
  min: number;             // limite inferior do range (geralmente 0)
  max: number;             // limite superior do range (geralmente 100 para %)
  target?: number;         // meta opcional (ex.: 80). Se ausente, gauge sem linha de alvo.
  color?: GaugeColor;      // calculado por threshold no back OU fixado pelo seed/config
  label: string;           // rótulo principal ("Resolução", "Resposta Rápida")
  unit?: string;           // "%", "min", "h", "R$", etc. Default: vazio.
};

type GaugeColor = 'red' | 'amber' | 'green';  // ou regex hex #RRGGBB se precisar mais cores

// union atual:
// export type CardDataResult = LabelValue[] | XYPoint[] | TableData | KpiData;
// passa a ser:
export type CardDataResult =
  | LabelValue[]
  | XYPoint[]
  | TableData
  | KpiData
  | GaugeData
  | GaugeData[];   // suporta 1 OU N gauges no mesmo card (caso Performance duplo)
```

**Nota sobre "gauge duplo"**: o card #17 do plano Kommo precisa de 2 anéis (`% Resolução` + `% Resposta Rápida`) no mesmo `DashboardCard`. Duas opções arquiteturais:

1. **`GaugeData` único + `config.gauges: GaugeData[]` ignorando `data` quando duplo** — inconsistente.
2. **`CardDataResult` aceita `GaugeData | GaugeData[]`** (recomendado) — quando `config.variant === 'dual'`, o query engine retorna `GaugeData[]` de tamanho 2. Quando `variant === 'single'` (default), retorna um único `GaugeData`.

**Recomendação:** variante 2, **com teto de 2 gauges por card** na Fase 2 (validação no DTO). Abrir para N gauges só em RFC futura se surgir caso de uso real (YAGNI).

### 5.3 Cálculo de `color` (quem decide?)

Três sub-opções:

1. **Cor calculada no back** a partir de `target` + `value` + thresholds configuráveis no `config` do card. Consistente entre FE/export PDF/export PNG.
2. **Cor fixa no seed** (`config.color = 'green'`) — simples, mas não reage a variação de performance.
3. **Cor calculada no FE** — duplica lógica, quebra export.

**Recomendação:** **híbrida** — se `config.colorStrategy === 'threshold'` (default), back calcula a cor segundo `config.thresholds` (formato `{ red: 0, amber: 60, green: 80 }`). Se `config.colorStrategy === 'fixed'`, back usa `config.color`. Se ausente, cor não é retornada e FE assume neutra.

### 5.4 DTO de validação

Criar `GaugeConfigDto` em `dto/card-configs/gauge-config.dto.ts` (primeiro sub-DTO por CardType — abre padrão para os demais tipos em RFC futura de refatoração):

```ts
export class GaugeThresholdsDto {
  @IsNumber() @Min(0) red: number;
  @IsNumber() @Min(0) amber: number;
  @IsNumber() @Min(0) green: number;
}

export class GaugeDataPointDto {
  @IsNumber() value: number;
  @IsNumber() min: number;
  @IsNumber() max: number;
  @IsOptional() @IsNumber() target?: number;
  @IsString() @IsNotEmpty() @MaxLength(120) label: string;
  @IsOptional() @IsString() @MaxLength(16) unit?: string;
  @IsOptional() @IsIn(['red', 'amber', 'green']) color?: GaugeColor;
}

export class GaugeConfigDto {
  @IsIn(['single', 'dual']) variant: 'single' | 'dual';
  @IsIn(['threshold', 'fixed']) colorStrategy: 'threshold' | 'fixed';
  @IsOptional() @ValidateNested() @Type(() => GaugeThresholdsDto) thresholds?: GaugeThresholdsDto;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2)
    @ValidateNested({ each: true }) @Type(() => GaugeDataPointDto)
    gauges: GaugeDataPointDto[];
  @IsInt() @Min(1) schemaVersion: number;  // ver §6.1
}
```

**Validação cruzada (custom validator):**
- `max > min`
- `min <= value <= max`
- `target` (se presente): `min <= target <= max`
- `variant === 'dual'` ⇔ `gauges.length === 2`
- `colorStrategy === 'threshold'` ⇒ `thresholds` obrigatório
- `colorStrategy === 'fixed'` ⇒ cada `GaugeDataPointDto.color` obrigatório

Migração do DTO atual: o atual `CreateCardDto.config: Record<string, any>` **não é refatorado nesta RFC**. Em vez disso, adicionamos um **runtime dispatcher** dentro do service que detecta `type === 'GAUGE'` e valida `config` contra `GaugeConfigDto` via `plainToInstance` + `validateSync`. Cards de outros tipos continuam com `config: Record<string, any>` como antes. Refatoração ampla (sub-DTO por CardType para os 9 tipos) fica para RFC dashboards-003 futura.

---

## 6. Impacto (análise obrigatória conforme `squad-dashboards.mdc` §"Modo 3")

### 6.1 Schema / Migration

- **Prisma:** `enum CardType` recebe valor `GAUGE` — migration aditiva via `ALTER TYPE "CardType" ADD VALUE 'GAUGE'`. Nome sugerido: `20260515000000_dashboards_cardtype_gauge`.
- **Sem backfill de cards existentes.** Nenhum card em produção muda.
- **`schemaVersion`:** ~~o plano e o `squad-dashboards.mdc` §"Princípios" (#5) falam em versionamento de schema JSON dos cards, **mas hoje o schema Prisma não tem campo `schemaVersion`** em `DashboardCard`~~. **RESOLVIDO (2026-04-24, Iago Silveira)** — coluna nativa `schemaVersion Int @default(1)` adicionada ao model `DashboardCard` via migration aditiva `20260424_000008_dashboard_card_schema_version` (`prisma/migrations/20260424_000008_dashboard_card_schema_version/migration.sql`). Aditivo simples, coberto pelo princípio #5 do squad-dashboards.mdc, sem necessidade de RFC separada. O seed "Analytics Comercial" (`prisma/seeds/kommo-analytics-comercial.seed.ts`) foi migrado para usar o campo nativo (removido `schemaVersion` duplicado do JSON `config`/`dataSource`). `CreateCardDto` não exige `schemaVersion` top-level: default do DB (=1) cobre cards legados e clients backward-compat que ainda enviem `schemaVersion` dentro de `config` JSON. Consequências para esta RFC:
  1. `GaugeConfigDto.schemaVersion` (§5.4) passa a ser **redundante** com o campo nativo — decisão: manter no DTO por 1 ciclo (transição), depois remover em RFC dashboards-003 quando todos os tipos forem migrados para sub-DTO.
  2. Handshake com Thales Rocha aberto: `DashboardCardQueryService` pode passar a ler o campo nativo no dispatch do transformador de leitura (substitui extração do JSON).
  3. RFC dashboards-003 continua recomendada (lead: Thales) para normalizar sub-DTO por `CardType` e remover a chave `schemaVersion` duplicada do JSON `config` em bumps futuros.
- **Indices:** nenhum novo índice requerido — GAUGE reusa entidades e fields já existentes.

### 6.2 Backend

- **`DashboardCardQueryService`:** novo ramo no `switch(cardType)` → `executeGauge(entity, where, axisConfig, config)`.
  - Para cards de gauge baseados em **KPI simples** (single gauge = KPI rebatido contra target): reusa `executeKpi` internamente e empacota no shape `GaugeData`.
  - Para cards de gauge **custom** (caso Kommo card #17 — "% Resolução" vem de `COUNT(status=RESOLVED)/COUNT(*)` + "% Resposta Rápida" vem de `COUNT(firstResponseAt<5min)/COUNT(*)`): dataSource.entity é `kommoConversations`; adapter do squad-kommo (Larissa) retorna os 2 agregados; query engine compõe o `GaugeData[]`.
- **DTO:** `CreateCardDto` e `UpdateCardDto` ganham validação condicional por `type` — quando `type === 'GAUGE'`, aplicar `GaugeConfigDto` em `config`. Sem tocar nos demais tipos.
- **Whitelist de entidade/operador/field:** **inalterada**. GAUGE é visualização; whitelist protege dados-fonte, não forma de apresentação.
- **Endpoint:** `/cards/:cardId/data` ganha capacidade de retornar `GaugeData | GaugeData[]`. Swagger `@ApiResponse` atualizado.
- **schemaVersion interno do config GAUGE:** `1` inicialmente. Documentado.

### 6.3 Frontend (coord. squad-fe-dashboards)

- **Componente:** `features/dashboards/kommo-dashboard/components/gauge-card.tsx` (já previsto em PLANO-KOMMO-DASHBOARD §11). Named export, `'use client'` (interativo por animação de enchimento do anel).
- **Lib de render:** **Open Question** (§10) — `recharts` `RadialBarChart` vs. `react-circular-progressbar` vs. SVG custom.
- **Suporte `variant: 'single' | 'dual'`**: renderer adapta layout.
- **Storybook:** 4 estados mínimos (normal / below target / above target / dual com 2 estados distintos) + estado erro.
- **Contract test:** `gauge-card.contract.spec.ts` garante que shape `GaugeData` recebido do back casa com props do componente.

### 6.4 Regressão

- **Zero impacto em cards existentes**: GAUGE é aditivo.
- **Teste E2E novo** (Hugo):
  - `gauge.e2e-spec.ts` — criar card GAUGE, validar shape, validar cor por threshold, validar que DTO rejeita `config` inválido.
  - `cardtype-fallback.e2e-spec.ts` — enviar `type: 'SOMETHING_NEW'` → 400 (já coberto, mas re-valida).
- **Smoke regressivo dos 8 tipos atuais**: bateria existente deve continuar verde sem mudança.

### 6.5 Performance

- **Query subjacente ≡ KPI_NUMBER** em complexidade. Para gauge duplo (2 gauges no mesmo card), são **2 agregações em paralelo** no adapter — ainda dentro do budget p95 < 400ms cache hit / < 1.5s cache miss do `squad-dashboards.mdc`.
- **Render FE**: SVG nativo ou lib leve, <100ms para pintar. Lighthouse Perf ≥ 85 (AC §13 Sprint 6 do plano Kommo).
- **Cache:** chave `(cardId, filtersHash, workspaceId)` inalterada. TTL default 60s herdado.

### 6.6 Segurança

- **Nenhuma superfície nova**: whitelist de `entity`/`operator`/`field` inalterada.
- **XSS via `color` no renderer SVG**: `color` validado via `@IsIn(['red','amber','green'])` no DTO. Se futuramente aceitar hex, regex `^#[0-9A-Fa-f]{6}$` estrita.
- **XSS via `label`/`unit`**: validado como string sanitizada (`@MaxLength`, sem HTML). FE renderiza como texto, nunca como `dangerouslySetInnerHTML`.
- **Injection via `thresholds`**: numbers validados com `@IsNumber` + `@Min(0)`, sem branch lógico que vire query SQL.
- **Cross-tenant**: `workspaceId` injetado antes de qualquer filtro no adapter — padrão inalterado.
- **DoS**: teto de 2 gauges por card evita explosão de agregações simultâneas.

### 6.7 Observabilidade

- **Métrica nova em Grafana** (`dashboards-feature`): contador de cards GAUGE criados, latência p95 de `/cards/:cardId/data` filtrada por `type=GAUGE`, erro rate por DTO inválido.
- **Log estruturado**: incluir `cardType: 'GAUGE'` em todos os logs do hot path (já padrão).
- **Alerta:** se p95 GAUGE > 1s sustentado 5min, page on-call.

---

## 7. Rollout Plan

1. **Aprovação da RFC** (3-5 dias async, conforme `squad-dashboards.mdc` §"Fluxo de atualizacao"). Reviewers assinam.
2. **ADR se necessário:** se surgir decisão irreversível (ex.: escolha da lib de render + padrão para outros CardTypes futuros), **abrir ADR `NNN-gauge-renderer.md`**. Caso contrário, RFC é suficiente.
3. **Migration Prisma em PR isolado** (`feat/dashboards-002-gauge-migration`): apenas `ALTER TYPE CardType ADD VALUE 'GAUGE'`. Revisada por Thales + Hugo.
4. **Backend — PR 2** (`feat/dashboards-002-gauge-backend`, owner Iago, coord Thales para o ramo do query engine):
   - `GaugeConfigDto` + validadores cruzados.
   - Novo ramo no `DashboardCardQueryService`.
   - Unit tests ≥ 90% no ramo GAUGE.
   - E2E test do ciclo completo.
5. **Frontend — PR 3** (`feat/dashboards-002-gauge-frontend`, squad-fe-dashboards):
   - `<GaugeCard>` + Storybook + visual regression Chromatic.
   - Contract test back↔front.
6. **Feature flag `DASHBOARDS_FEATURE_GAUGE_ENABLED` per-workspace** (segue padrão `DASHBOARDS_FEATURE_NNN_ENABLED` do princípio #16).
7. **Canary:** 1 workspace interno → **10%** (7 dias) → **50%** (7 dias) → **100%**. Monitorar: erro rate DTO, p95 `/cards/data?type=GAUGE`, user-reported bugs.
8. **Deprecation da Opção B** (se alguém estiver abusando de `KPI_NUMBER` + `config.displayMode: 'gauge'`): `Deprecation` header ≥ 90 dias, comunicação formal ao squad-fe-dashboards, runbook de migração. Auditoria via `rg` em `seed/` + dashboards existentes em prod (Hugo).

---

## 8. Plano de Teste (Hugo)

### 8.1 Unit (back, cobertura ≥ 90% no ramo GAUGE)

- `dashboard-card-query.service.spec.ts`:
  - GAUGE single, `target` presente, `color` calculada por threshold.
  - GAUGE single, `target` ausente → `target: undefined`, sem linha de alvo.
  - GAUGE dual, 2 valores distintos, 2 cores distintas.
  - GAUGE com `colorStrategy: 'fixed'` — não calcula cor, usa config.
- `gauge-config.dto.spec.ts`:
  - Rejeita `value > max`.
  - Rejeita `min >= max`.
  - Rejeita `target` fora do range.
  - Rejeita `color` não-whitelistada.
  - Rejeita `variant: 'dual'` com `gauges.length !== 2`.
  - Rejeita `colorStrategy: 'threshold'` sem `thresholds`.

### 8.2 E2E (supertest + Prisma real)

- `POST /dashboards/:id/cards` com `type: 'GAUGE'` válido → 201 + card persistido.
- `GET /cards/:cardId/data` do card GAUGE → 200 + shape `GaugeData | GaugeData[]` correto.
- Cross-tenant: W2 acessando card GAUGE de W1 → 404.
- Feature flag OFF para workspace → `/cards/data` retorna 400 `GaugeDisabled` (ou card é rejeitado no criar, decidir no PR).
- Fallback `UnsupportedCardType` ainda funciona para tipos futuros (regressão).

### 8.3 Visual (Storybook + Chromatic)

- 4 states do `<GaugeCard>`: below target / at target / above target / dual.
- Estado de erro (dados faltantes).
- Dark mode + light mode.
- Mobile + desktop breakpoints.

### 8.4 Performance (k6)

- 100 cards GAUGE simultâneos no mesmo dashboard (stress test irreal mas válido): p95 < 1.5s.
- 1 card GAUGE dual em dataset de 500k rows `kommoConversations`: p95 < 400ms cache hit, < 1.5s cache miss.

### 8.5 Security fuzz (Hugo)

- `config.gauges[0].color` = `'"><script>alert(1)</script>'` → 400.
- `config.thresholds.red` = `'DROP TABLE'` → 400.
- `config.variant` = `'triple'` → 400.

---

## 9. Alternativas Rejeitadas (reiteração resumida)

- **Opção B (`KPI_NUMBER + displayMode`)**: quebra contrato "1 tipo = 1 shape = 1 renderer"; não escala para HEATMAP/FUNNEL/etc.
- **Opção C (`CUSTOM` genérico)**: erode whitelist do enum `CardType`, abre brecha para cada FE inventar shape sem revisão; contraria princípios #2 e #16.

---

## 10. Open Questions (handshakes pendentes antes de merge da RFC)

1. **Thales Rocha:** aprovar a adição de `GaugeData` e `GaugeData[]` à union `CardDataResult`? Ou você prefere union `GaugeData | { gauges: GaugeData[] }` para deixar o array explícito?
2. **squad-fe-dashboards (Renato? confirmar proprietário atual do catálogo FE):** preferência de lib de render — `recharts.RadialBarChart`, `react-circular-progressbar`, ou SVG custom? Critério: bundle-size < 15kB gzip, suporte a `target` line, animação < 100ms. Se decisão for irreversível (lock-in), **abrir ADR complementar**.
3. **Debora Lima:** o seed "Analytics Comercial" Fase 2 vai usar GAUGE — você precisa que o plano do card armazene `target` no `DashboardCard.config` ou espera do adapter? (Ver Q4.)
4. **Larissa Bezerra (squad-kommo):** `KommoMetricSnapshot` vai precisar de um campo `targetValue` (ou `targetByMetricKey`) para alimentar `GaugeData.target` dinamicamente? Ou o `target` vai **sempre** vir hardcoded no `config` do card (seeded por workspace)? Impacto: opção A (dinâmico) exige migration no model `KommoMetricSnapshot`; opção B (estático) é zero-migration mas menos flexível para clientes quererem ajustar meta via UI.
5. **Hugo Monteiro:** ok com o plano de teste §8, ou você quer adicionar fuzz específico para o custom validator cruzado (`value > max`, etc.)?
6. **Thales (segunda pergunta):** você quer aproveitar esta RFC para **também** abrir RFC dashboards-003 normalizando `schemaVersion` no model `DashboardCard` (hoje ausente, ver §6.1)? Eu abriria dashboards-003 como RFC separada, liderada por você, **não bloqueante** para dashboards-002.

---

## 11. Checklist de Pré-Aprovação

- [ ] Thales Rocha revisou shape `GaugeData` + ramo no query engine.
- [ ] Hugo Monteiro revisou plano de teste + security fuzz.
- [ ] squad-fe-dashboards respondeu Q2 (lib de render).
- [ ] Larissa Bezerra respondeu Q4 (`target` dinâmico vs. estático).
- [ ] Debora Lima respondeu Q3 (origem do `target` no seed).
- [ ] PO (Tio Jimbo) confirmou Sprint 6 na agenda.
- [ ] ADR de lib de render escrito (se Q2 for irreversível).
- [ ] Migration aditiva validada por Thales (dry-run em staging).
- [ ] RFC publicada em canal async do squad-dashboards (3-5 dias de review).
- [ ] Feature flag `DASHBOARDS_FEATURE_GAUGE_ENABLED` adicionada ao registry de flags antes do PR de código.

---

## 12. Convenções estabelecidas por esta RFC

Como é a **primeira RFC formal** de `CardType` novo no repositório `mundial-erp`, as seguintes convenções são estabelecidas (a serem seguidas por RFCs futuras de HEATMAP, FUNNEL, TREEMAP, etc.):

1. **Nomenclatura do arquivo**: `.claude/rfc/dashboards-NNN-<slug-kebab>.md`, numeração monotônica começando em `001`.
2. **Seções obrigatórias**: 1 Metadata, 2 Contexto e Motivação, 3 Problema, 4 Opções Avaliadas (≥ 2), 5 Decisão Proposta, 6 Impacto (6 sub-seções mínimo: schema, back, front, regressão, perf, segurança), 7 Rollout Plan, 8 Plano de Teste, 9 Alternativas Rejeitadas, 10 Open Questions, 11 Checklist.
3. **Opção recomendada** sempre marcada explicitamente em §4.
4. **Todo novo `CardType`** exige: (a) migration aditiva de enum, (b) shape na union `CardDataResult`, (c) sub-DTO de validação, (d) ramo dedicado no `DashboardCardQueryService`, (e) componente `<XxxCard>` no FE com Storybook, (f) feature flag de rollout per-workspace, (g) canary → 10 → 50 → 100.
5. **Linha de cuidado com `schemaVersion`**: toda RFC que toca `config`/`dataSource`/`axisConfig` JSON deve declarar se está ciente da lacuna atual do `schemaVersion` no model `DashboardCard` e como está mitigando (ver §6.1).

---

**Fim do RFC `dashboards-002-gauge-cardtype`.**
