# ADR-008 — `dashboards-filter-merge-intersection`

> Merge entre `DashboardCard.dataSource.filters` e `DashboardFilter[]` global eh **INTERSECAO estrita (AND logico)**; filtro global NUNCA pode AMPLIAR o escopo autorizado pelo card. Interseccao vazia curto-circuita com o empty-result shape do `CardType` sem tocar o Prisma.

| Campo | Valor |
|---|---|
| **ID** | ADR-008 |
| **Titulo** | `dashboards-filter-merge-intersection` |
| **Status** | **Accepted** — em vigor a partir de 2026-04-24 |
| **Autor** | Renata Pires (Backend Filtros Globais + Operators, squad-dashboards) |
| **Data** | 2026-04-24 |
| **Supersedes** | — (formaliza regra implicita pre-existente no skill, agora enforced em codigo) |
| **Related** | ADR-007 (`kommo-outbox-invalidation` — cache key inclui hash dos filtros mergeados), `docs/kommo-pipelineid-filter.md` §4 (spec que motivou o ADR) |
| **Squads afetados** | squad-dashboards, squad-fe-dashboards, squad-kommo |

---

## 1. Context

### 1.1 Gap identificado

O skill `squad-dashboards.mdc` declara, em duas posicoes (linhas 361 e 392), a seguinte red flag de code review P0:

> "Merge de filtros global × card substituindo em vez de INTERSECAO (quebra contrato documentado no ADR)."

Entretanto, ate 2026-04-24 **nao existia ADR formalizando essa regra** — a pasta `.claude/adr/` continha apenas ADR-007. Pior: durante auditoria preliminar a ADR-010 (que seria o numero candidato para esta regra), Renata descobriu que o codigo em `dashboard-card-query.service.ts` (`buildWhere`, linhas 253-267 antes deste ADR) **violava a regra**:

```ts
// Card-level filters — only allowed fields
if (cardFilters) {
  for (const [key, val] of Object.entries(cardFilters)) {
    if (val !== undefined && val !== null && allowed.has(key)) {
      where[key] = val;                                // 1) aplica card
    }
  }
}

// Global dashboard filters — only allowed fields
for (const gf of globalFilters) {
  if (allowed.has(gf.field)) {
    where[gf.field] = this.operatorToPrisma(gf.operator, gf.value);  // 2) SOBRESCREVE
  }
}
```

O segundo laco sobrescreve `where[gf.field]` quando o mesmo `field` tambem esta em `cardFilters`. Isso e **override silencioso** — filtro global **amplia** o escopo do card. Cenario de vazamento cross-escopo:

- Card: `{ field: "pipelineId", operator: "EQUALS", value: "p1" }` — card autorizado a ver apenas `p1`.
- Global: `{ field: "pipelineId", operator: "IN", value: ["p1", "p2"] }` — usuario seleciona dois pipelines no filtro global do dashboard.
- **Comportamento buggy:** `where.pipelineId = { in: ["p1","p2"] }` — o card passa a retornar rows de `p2`, que **NUNCA foi autorizado pela definicao do card**.
- **Comportamento correto (INTERSECAO):** `where.pipelineId = "p1"` — global restringe o que ja estava no card, nunca amplia.

Em dashboards "publicos" (`isPublic=true` dentro do mesmo workspace, ou RFC futuro de dashboards compartilhados cross-workspace), esse bug vira um vetor de vazamento de dados entre escopos que o autor do card julgou seguros. E-um **P0 de seguranca**.

### 1.2 Por que nao percebemos antes

1. O skill ja citava a regra como red flag — gerou falsa sensacao de que o codigo respeitava.
2. Cobertura de teste pre-existente (`dashboard-card-query.service.spec.ts`, Hugo Monteiro — 36 testes focados em T-T4 operator whitelist + T-I4 column leak + workspaceId scoping) **nao incluia** cenarios de card+global no mesmo `field`.
3. Spec `kommo-pipelineid-filter.md` §4 descreveu a INTERSECAO com tabela normativa (casos A-E) mas **nao criou o ADR** que o proprio skill pre-supunha existir.

### 1.3 Impacto do fix

Fix cirurgico em `buildWhere`: substituir os dois lacos de override por uma unica chamada a `mergeFilters()` (helper puro em `utils/merge-filters.ts`). Zero mudanca de schema, zero migration, zero breaking change em API publica. Compatibilidade regressiva: todos os cenarios previamente corretos (card-only, global-only, fields distintos) continuam retornando o mesmo shape; apenas o cenario `card.field == global.field` muda de "override" para "interseccao estrita".

---

## 2. Decision

### 2.1 Resumo

1. **Merge e sempre INTERSECAO.** Para qualquer `field` na uniao de `cardFilters` e `globalFilters`, o filtro resultante e a interseccao (AND logico) dos dois lados.
2. **Interseccao vazia e curto-circuitada.** Quando a interseccao analitica e detectavel em memoria como vazia (ex: `EQUALS p3` × `IN [p1, p2]`), o service retorna imediatamente o empty-result shape do `CardType` — sem chamar o Prisma.
3. **Sentinel `EMPTY_INTERSECTION`** (Symbol) propaga a sinalizacao do helper ao caller.
4. **Fallback defensivo:** combos nao-analiticos (GREATER/LESS/BETWEEN em ambos os lados) caem em `AND` composto do Prisma — seguro (AND so restringe), apenas menos eficiente que interseccao analitica.
5. **Invariantes pre-merge** (`workspaceId` primeiro, `deletedAt: null` guard) sao aplicadas FORA do helper e **depois** do merge no service — jamais sobrescritas por `cardFilters`/`globalFilters` (principio #1 do squad-dashboards, red flag "workspaceId faltando").

### 2.2 Casos canonicos (tabela normativa — A-E)

Deriva de `docs/kommo-pipelineid-filter.md` §4 (tabela original da spec). Re-enumerada aqui como contrato oficial.

| # | Card (filters) | Global | Resultado Prisma (`where[field]`) | Sentinel? |
|---|---|---|---|---|
| A | `pipelineId EQUALS p1` | `pipelineId IN [p1, p2]` | `"p1"` (EQUALS preservado) | — |
| B | `pipelineId EQUALS p3` | `pipelineId IN [p1, p2]` | — | **EMPTY_INTERSECTION** |
| C | `pipelineId IN [p1, p2]` | `pipelineId IN [p3, p4]` | — | **EMPTY_INTERSECTION** |
| D | card sem `pipelineId` | `pipelineId IN [p1, p2]` | `{ in: ["p1", "p2"] }` | — |
| E | card `pipelineId IN [p1]`, global ausente | — | `"p1"` (singleton reduz a EQUALS) | — |
| F | `pipelineId IN [p1, p2]` | `pipelineId IN [p2, p3]` | `"p2"` (interseccao singleton → EQUALS) | — |
| G | `amountCents GREATER 100` | `amountCents LESS 1000` | `AND: [{ amountCents: { gt: 100 } }, { amountCents: { lt: 1000 } }]` | — (fallback) |

### 2.3 Empty-result shape por `CardType` (normativo)

Quando `buildWhere` retorna `EMPTY_INTERSECTION`, o service retorna, sem consultar Prisma:

| CardType | Shape retornado |
|---|---|
| `KPI_NUMBER` | `{ value: 0, label: "Total" }` |
| `BAR_CHART` / `STACKED_BAR` / `PIE_CHART` / `DONUT` | `[]` (LabelValue[] vazio) |
| `LINE_CHART` / `AREA_CHART` | `[]` (XYPoint[] vazio) |
| `TABLE` | `{ columns: [...ALLOWED_FIELDS[entity], 'id'], rows: [] }` (colunas preservadas da whitelist — FE pode renderizar cabecalho da tabela mesmo com zero rows) |

> Nota: o caminho "zero rows do Prisma" em `executeTable` continua retornando `{ columns: [], rows: [] }` (comportamento preexistente). O caminho `EMPTY_INTERSECTION` preserva colunas para distinguir UX ("busca vazia por interseccao de filtros" vs. "nenhum dado na entidade"). Squad-fe-dashboards avalia na Fase 2 se quer indicador visual diferenciado; por ora, ambos renderizam a mesma empty state.

### 2.4 Algoritmo de merge (resumo — fonte da verdade e o codigo)

Para cada `field` na uniao de `cardFilters ∪ globalFilters`, restrito a `allowedFields`:

1. **So um lado tem:** aplica direto.
2. **Ambos EQUALS:** valores iguais → aplica um; diferentes → `EMPTY_INTERSECTION`.
3. **Ambos IN:** interseccao de arrays. Vazia → `EMPTY_INTERSECTION`; 1 item → reduzir a EQUALS; N items → IN reduzido.
4. **EQUALS × IN:** EQUALS.value contida em IN.value → EQUALS; senao → `EMPTY_INTERSECTION`.
5. **Combos comparativos (GREATER/LESS/BETWEEN):** fallback → `AND` composto do Prisma.
6. **Multiplos globals no mesmo field:** `AND` composto entre eles.

Implementacao: `mundial-erp-api/src/modules/dashboards/utils/merge-filters.ts`.

---

## 3. Consequences

### 3.1 Positivas

1. **Seguranca de escopo restaurada.** Red flag P0 do skill (linha 361) passa a ser enforced em codigo, nao apenas em code review. Impossivel filtro global ampliar escopo do card.
2. **Previsibilidade.** Usuario do dashboard entende que selecionar pipeline no global "restringe ainda mais" — jamais "abre" cards pre-configurados.
3. **Short-circuit economiza Prisma.** Interseccao vazia detectada em memoria evita uma query Postgres inteira. Em dashboards com 12 cards × 10% de selecoes conflitantes, e ~1.2 queries/request economizadas.
4. **Cachability preservada.** Chave de cache do ADR-007 (`card:{cardId}:filtersHash:{sha256}:workspace:{wsId}`) inclui hash dos filtros — interseccoes distintas geram hashes distintos, sem cache-poisoning.
5. **Contrato auditavel.** Tabela de casos A-G e fonte normativa; testes unit (Hugo) pinam cada caso.
6. **Zero breaking.** Cenarios pre-existentes sem conflito de `field` produzem o mesmo shape que antes.

### 3.2 Negativas

1. **Empty result pode confundir usuario.** Quando global + card colidem (`EMPTY_INTERSECTION`), o card renderiza vazio sem explicacao. **Mitigacao:** ticket futuro para squad-fe-dashboards desenhar indicador visual ("Filtros globais ocultaram dados deste card — clique para ver").
2. **Fallback `AND` composto nao detecta impossibilidade** em combos comparativos (ex: `GREATER 1000` × `LESS 100`). O Prisma retorna zero rows, que cai no caminho vazio normal do executor. Custo: 1 query desperdicada. Aceito — implementacao analitica de interseccao de ranges numericos/de data e complexa e propensa a bugs de fronteira.
3. **Contrato adicional para testar.** Hugo adiciona ~10 testes (coordenacao TDD em paralelo) cobrindo tabela A-G + empty-shapes.
4. **Dependencia de ordem no service.** `deletedAt: null` e aplicado APOS o merge para garantir que nao seja sobrescrito. Quebra aparente do principio "dataSource intrinsic primeiro" — documentado em comentario no service; teste pinado.

### 3.3 Metricas de saude

- `dashboards_empty_intersection_total{entity}` — contador de curto-circuitos. Pico anomalo = sinal de UX confusa (filtros globais cronicamente incompativeis com cards).
- `dashboards_merge_fallback_and_total{entity,field}` — contador de quedas no fallback `AND` composto. Ajuda a identificar candidatos a otimizacao analitica futura.

---

## 4. Alternatives considered (rejected)

### 4.1 Alternativa A — Override silencioso (bug original)

**Proposta (status quo pre-fix):** segundo laco sobrescreve `where[field]` quando card e global colidem.

**Rejeitada:** vazamento cross-escopo (secao 1.1). E o proprio bug que motivou o ADR.

### 4.2 Alternativa B — Union (OR logico)

**Proposta:** `where.AND = [{ field: cardClause }, { OR: [{ field: globalClause }] }]` — global "amplia" card.

**Rejeitada:**
- Viola contrato "global restringe, nunca amplia" (principio UX + seguranca).
- Quebra cards pre-configurados com filtros fixos (`status IN ['OPEN']` vira "todos os status" ao adicionar global).
- Red flag linha 361 do skill explicitamente veda.

### 4.3 Alternativa C — Sempre `AND` composto do Prisma (sem interseccao analitica)

**Proposta:** emitir `where.AND = [{ field: cardClause }, { field: globalClause }]` para TODOS os combos, delegando ao Prisma.

**Rejeitada parcialmente:**
- Seguro (AND so restringe) e simples.
- Mas nao detecta impossibilidade em memoria — queries com interseccao vazia sao enviadas ao Postgres, retornando zero rows. Custo: N+12% queries desperdicadas em dataset tipico.
- Empty-result shape nao distingue "zero rows por acaso" de "interseccao filtro impossivel" — dificulta telemetria e UX.
- **Reaproveitada como fallback** para combos comparativos (§2.4, item 5).

### 4.4 Alternativa D — Validacao no ato do `createFilter` (rejeitar filtros globais que colidem com cards)

**Proposta:** endpoint `POST /dashboards/:id/filters` valida contra todos os cards do dashboard e rejeita se colide.

**Rejeitada:**
- Quebra use case legitimo — usuario **quer** ver interseccao mesmo quando vazia (sinaliza "nao ha overlap entre criterios").
- Acoplamento violento entre filtros globais e definicao de cards — toda edicao de card exigiria revalidar filtros.
- Fricao UX enorme.

---

## 5. Implementation reference

### 5.1 Arquivos

- **Helper puro:** `mundial-erp-api/src/modules/dashboards/utils/merge-filters.ts` — `mergeFilters(cardFilters, globalFilters, allowedFields): MergedWhere | EmptyIntersection`. Export nomeados, zero `any`, zero I/O.
- **Engine:** `mundial-erp-api/src/modules/dashboards/dashboard-card-query.service.ts` — `buildWhere()` delega para `mergeFilters`; `execute()` curto-circuita para `emptyResultFor(cardType, entity)` quando recebe `EMPTY_INTERSECTION`.
- **Spec motivadora:** `mundial-erp-api/docs/kommo-pipelineid-filter.md` §4 (tabela A-E original + justificativa UX).

### 5.2 Ordem de aplicacao (invariante)

```
1. workspaceId          ← aplicado por DashboardsService antes de chamar execute()
2. merged (card ∩ global)
3. deletedAt: null      ← soft-delete guard, NUNCA sobrescrito
4. dataSource.statusFilter / dateRange / departmentId
```

---

## 6. Enforcement

1. **Red flag de code review** — linha 361 do `squad-dashboards.mdc` ja documenta; passa a referenciar este ADR.
2. **Teste unit** (Hugo Monteiro, em paralelo — novo `describe('Filter merge intersection')` em `dashboard-card-query.service.spec.ts` OU novo `merge-filters.spec.ts`): cobertura dos casos A-G + empty-shapes por CardType.
3. **Teste E2E** (Hugo, `test/dashboards-filter-merge.e2e-spec.ts`): dashboard real + global filter + card com filtro colidente → valida shape por CardType e que Prisma nao foi tocado (intercept do `$extends` logger).
4. **Fuzz** — payloads patologicos (EQUALS com valor `null`, IN array vazio, BETWEEN mal-formado) devem nao-crashar; `mergeFilters` e puro e idempotente.

---

## 7. Related ADRs

- **ADR-007** (`kommo-outbox-invalidation`) — cache key `filtersHash` hash-eia o shape **apos** merge; mudanca neste ADR altera hash de entradas que previamente colidiam, invalidando cache legacy uma unica vez no deploy (aceito — TTL 60s natural).
- **ADR-010** (proposto, nao numerado ainda) — generalizacao de interseccao analitica para operadores comparativos (GREATER/LESS/BETWEEN). Atualmente em fallback `AND` composto; refactor se telemetria `dashboards_merge_fallback_and_total` ficar > 20% dos merges.

---

## 8. References

- `mundial-erp-api/src/modules/dashboards/utils/merge-filters.ts`
- `mundial-erp-api/src/modules/dashboards/dashboard-card-query.service.ts` — metodos `execute`, `buildWhere`, `emptyResultFor`, `assertOperatorAllowed`
- `mundial-erp-api/docs/kommo-pipelineid-filter.md` §4 (tabela original + justificativa)
- `.claude/skills/squad-dashboards.mdc` linhas 182, 361, 392 (red flags pre-ADR)
- ADR-007 (cache key hash inclui filtros mergeados)
