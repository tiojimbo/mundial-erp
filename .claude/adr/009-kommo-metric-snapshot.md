# ADR-009 — `kommo-metric-snapshot`

> Pre-agregados por evento em `KommoMetricSnapshot` para KPIs do dashboard "Analytics Comercial" que exigem `COUNT(*)`/`AVG(...)` sobre tabelas Kommo com volume >1M rows. Atualizado atomicamente dentro da mesma `$transaction` que grava a entidade-fonte; adapters da query engine leem do snapshot quando `dataSource.metricKey` esta presente.

| Campo | Valor |
|---|---|
| **ID** | ADR-009 |
| **Titulo** | `kommo-metric-snapshot` |
| **Status** | **Proposed** — contrato definido aqui; implementacao em Sprint 3 (story K3-3) |
| **Autor** | Larissa Bezerra (Backend Pleno, squad-kommo) |
| **Data** | 2026-04-24 |
| **Supersedes** | — |
| **Related** | ADR-007 (`kommo-outbox-invalidation`), ADR-008 (`kommo-reconciliation-strategy`), PLANO-KOMMO-DASHBOARD.md secao 5.2 (schema), secao 8.7 (adapter), secao 9 (SLIs) |
| **Squads afetados** | squad-kommo (producer), squad-dashboards (consumer via adapter) |

---

## 1. Context

### 1.1 Problema

O dashboard "Analytics Comercial" declara **8 KPIs MVP** que o `DashboardCardQueryService` precisa servir via `/dashboards/:id/cards/:cardId/data` com p95 < 400ms em cache miss (principio #15 do squad-dashboards):

| KPI (Analytics Comercial) | Tipo de agregado | Fonte |
|---|---|---|
| Total Resolvidas Desde o Inicio | `COUNT(KommoConversation WHERE status=RESOLVED)` | all-time, sem janela |
| Conversas em Aberto | `COUNT(KommoConversation WHERE status=OPEN)` | snapshot atual |
| Total de Mensagens Hoje | `COUNT(KommoMessage WHERE date(createdAt)=today)` | janela diaria |
| Tempo Medio de Primeira Resposta (min) | `AVG(firstResponseAt - firstMessageAt)` | janela 7d |
| Taxa de Resolucao 7d | `COUNT(resolved 7d) / COUNT(opened 7d)` | janela 7d |
| Performance por Atendente | `COUNT(KommoMessage GROUP BY authorAgentId)` | janela 7d |
| Horarios de Pico | `COUNT(KommoMessage GROUP BY hour(createdAt))` | janela 7d, 168 buckets |
| Leads Ativos | `COUNT(KommoLead WHERE status=ACTIVE)` | snapshot atual |

### 1.2 Por que calculo sob demanda nao serve

Em datasets com **1M+ rows por workspace** (clientes enterprise), `COUNT(*)` full scan custa 200-800ms mesmo com indice `(workspaceId, status)`. Cache miss do `/cards/data` bate no Postgres; p95 estoura orcamento de 400ms.

Piora quando:
- Dashboard tem 8 cards Kommo abertos simultaneamente (cold start) -> 8 COUNTs paralelos -> connection pool + I/O saturam.
- Cache tem TTL curto (60s default) -> apos cada invalidacao via `KOMMO_ENTITY_CHANGED` (ADR-007), proximo acesso e miss -> COUNT novamente.
- KPIs "Total Resolvidas Desde o Inicio" nao tem janela -> full scan sempre.

### 1.3 Por que materialized view tambem nao serve (MVP)

Alternativa canonica: `CREATE MATERIALIZED VIEW ... REFRESH CONCURRENTLY`. Rejeitado por:
- REFRESH CONCURRENTLY bloqueia ~5-30s em tabela grande; cron de 1min estouraria p95 durante a janela.
- Granularidade de refresh nao casa com nosso gatilho (evento por evento via webhook Kommo).
- Postgres MV nao tem `UPDATE WHERE condition INCREMENT`; para manter reativo teriamos que recriar completamente.

### 1.4 Por que cache agressivo sem pre-agregado tambem nao serve

Alternativa: TTL 10min nos KPIs. Rejeitado:
- SLI `webhook -> card p95 <= 10s` (plano secao 9.2) e incompativel com TTL 10min — usuario veria numero stale por minutos apos mudar status no Kommo.
- Invalidacao via ADR-007 traz o TTL de volta a ~1s efetivo em horario de pico -> cache hit rate despenca para <30%, longe do alvo (>=60%).
- Cache miss continua batendo em `COUNT(*)` full scan.

---

## 2. Decision

### 2.1 Resumo

1. `KommoMetricSnapshot` armazena **valores pre-agregados** indexados por `(workspaceId, pipelineId, metricKey, windowStart, windowEnd)`.
2. **Handlers de worker Kommo** atualizam o snapshot **dentro da `$transaction`** que grava a entidade-fonte. Atomico: ou ambos gravam, ou nenhum.
3. **Adapter da query engine** (squad-dashboards) le do snapshot quando `dataSource.metricKey` esta presente no DashboardCard — bypassa tabela-fonte.
4. **Cron diario** (`kommo-snapshot-rebuild`) recalcula baseline do zero e comita num swap — protege contra drift.

### 2.2 metricKeys do MVP

**Contrato fechado entre squads para seed e adapter.** Debora (seed Analytics Comercial) e Thales (adapter) usam estas chaves literais:

| metricKey | Descricao | windowStart/End | pipelineId |
|---|---|---|---|
| `total_resolved_alltime` | Conversas resolvidas desde sempre | `null`/`null` | `null` ou pipeline |
| `open_conversations` | Conversas em aberto agora | `null`/`null` | `null` ou pipeline |
| `total_messages_today` | Mensagens criadas hoje | inicio do dia UTC / fim | `null` |
| `avg_first_response_minutes_7d` | Tempo medio primeira resposta ultimos 7d | now-7d / now | `null` ou pipeline |
| `resolution_rate_7d` | Taxa resolucao ultimos 7d (value = int 0..10000, dividir por 100 para %) | now-7d / now | `null` ou pipeline |
| `messages_by_agent_7d` | Mensagens por agente 7d (um row por agente) | now-7d / now | `null`; agente via pipelineId='agent:{id}' (abuso proposital da coluna na MVP — ver Alternativa C da secao 4) |
| `messages_by_hour_7d` | Mensagens por hora-do-dia 7d (168 rows, um por hora 0..167) | now-7d / now | `null`; bucket via pipelineId='hour:{0..167}' |
| `leads_active` | Leads ativos agora | `null`/`null` | `null` ou pipeline |

Observacoes:
- `value BigInt` — cabe contagens ate 2^63-1 (>9 quintilhoes). Para AVG em minutos, armazenamos em ms; adapter divide por 60000.
- Para `resolution_rate_7d`, usamos escala fixa (multiplica por 10000) para caber em BigInt — evita introduzir coluna `Decimal` adicional.
- MVP aceita "abuso da coluna `pipelineId`" para carregar bucket discreto (agent/hour). Em RFC follow-up (`kommo-002-snapshots-polimorficos`) trocamos por tabela `KommoMetricSnapshotBucket` separada.

### 2.3 Invariantes

- **P0**: snapshot update SEMPRE dentro de `$transaction` com o write-fonte. Test obrigatorio: injetar falha na segunda statement (snapshot), validar que a primeira (entity) rollbackou.
- **P0**: `workspaceId` sempre na chave unica e na where. Cross-tenant snapshot leak = incidente P0.
- **P1**: cron de rebuild roda `0 3 * * *` UTC (03:00), baixa carga. Lock via `pg_advisory_lock(snapshotRebuildKey)` para evitar duas instancias paralelas.
- **P1**: adapter **nao fallback a tabela-fonte se snapshot estiver ausente** — retorna `null` + log `warn`; seed obriga snapshot existir na ativacao da integracao (backfill inicial popula todos os metricKeys). Fallback silencioso mascararia drift.

### 2.4 Fluxo de escrita (happy path)

```
Handler (chat_resolved) entra em this.prisma.$transaction(async tx => {
  // 1. Escreve entidade-fonte
  await tx.kommoConversation.update({
    where: { id },
    data: { status: 'RESOLVED', resolvedAt: now }
  });

  // 2. Incrementa snapshot all-time (key: total_resolved_alltime)
  await tx.kommoMetricSnapshot.upsert({
    where: {
      workspaceId_pipelineId_metricKey_windowStart_windowEnd: {
        workspaceId, pipelineId: null, metricKey: 'total_resolved_alltime',
        windowStart: null, windowEnd: null,
      }
    },
    create: { workspaceId, pipelineId: null, metricKey: 'total_resolved_alltime',
              windowStart: null, windowEnd: null, value: 1n },
    update: { value: { increment: 1n } }
  });

  // 3. Decrementa snapshot open (key: open_conversations) — conversa saiu do OPEN
  await tx.kommoMetricSnapshot.upsert({ ... metricKey: 'open_conversations', value: { decrement: 1n } });

  // 4. Emite outbox KOMMO_ENTITY_CHANGED (ADR-007) — entity: 'metric_snapshot' tambem
  await kommoOutbox.enqueue(tx, { ... entity: 'conversation' });
  await kommoOutbox.enqueue(tx, { ... entity: 'metric_snapshot', metricKey: 'total_resolved_alltime' });
});
```

Write amplification: 1 conversa resolvida -> 1 write entidade + 2-3 writes snapshot + 1-2 writes outbox. Aceitavel (~5 writes/evento); throughput budget do plano (1000 eventos/s por workspace enterprise) comporta — Postgres sustenta 10-50k writes/s em tabela bem indexada.

### 2.5 Fluxo de leitura (adapter)

```
DashboardCardQueryService recebe card com dataSource.metricKey = 'total_resolved_alltime'.
Adapter Kommo (Larissa):
  const snapshot = await prisma.kommoMetricSnapshot.findUnique({
    where: { workspaceId_pipelineId_metricKey_windowStart_windowEnd: {
      workspaceId, pipelineId: card.dataSource.pipelineId ?? null,
      metricKey: card.dataSource.metricKey,
      windowStart, windowEnd
    }}
  });
  return snapshot?.value ?? null;
```

P95 esperado: <5ms (single row lookup via unique index). Orcamento do adapter sobra ~395ms para serializacao + middleware.

### 2.6 Rebuild diario

Cron `0 3 * * *` UTC:
1. Lock via `pg_advisory_lock`.
2. Para cada workspace com integracao ativa:
   - Recalcula cada metricKey via COUNT/AVG na tabela-fonte.
   - Upsert snapshot com `value` recalculado.
3. Logs: `kommo_snapshot_rebuild_drift{metricKey,workspace}` — diff entre valor pre e pos-rebuild. Alerta P2 se drift > 1% da populacao.

Justifica-se mesmo sem bugs porque:
- Tx pode commitar entidade e falhar snapshot (unlikely mas possivel com constraint violation rara).
- Handlers podem ter bug que increment wrong metricKey.
- Backup/restore parcial pode deixar estados inconsistentes.

---

## 3. Consequences

### 3.1 Positivas

1. **p95 `/cards/data` cache miss de KPIs Kommo cai de 200-800ms para <5ms** — conforme o orcamento (400ms) com larga margem.
2. **SLI `webhook -> card p95 <= 10s`** continua atendido, porque snapshot e atualizado **no mesmo `$transaction`** do write-fonte (aditivo ao fluxo ja descrito em ADR-007).
3. **Cache hit rate alvo (>=60%) mais facil de atingir** — mesmo em cache miss, Postgres nao colapsa.
4. **Drift auto-corrigivel** via cron diario; alertas graduais se drift >1%.
5. **Rebuild barato** — COUNT em tabela de 1M rows com indice custa ~1-3s por workspace; 100 workspaces -> 3-5min total em horario vazio.

### 3.2 Negativas

1. **Write amplification** — cada evento Kommo escreve em 1-3 snapshots + 1 entidade. `$transaction` size aumenta ~30%. Mitigado por snapshots serem rows pequenos (~100 bytes) e indexed.
2. **Drift risk** se `$transaction` falhar parcialmente -> mitigado pelo cron de rebuild + test de consistencia.
3. **Complexidade para novos metricKeys** — cada KPI novo exige codigo no handler que aumenta/decrementa. Mitigado por tabela de mapping `eventType -> metricKeyDeltas[]` (ver secao 5).
4. **MVP usa `pipelineId` polimorfico** para bucket (agent/hour) — abuso proposital, debt tecnico documentado. Refactor em RFC follow-up.
5. **Primeira ativacao de integracao** — backfill inicial precisa popular todos os snapshots. E problema do Carolina (backfill worker) — contrato descrito aqui: no fim do backfill inicial, worker executa rebuild completo sincrono antes de liberar dashboard ao usuario.

### 3.3 Metricas de saude (Grafana `kommo-sync`)

- `kommo_snapshot_write_latency_seconds{metricKey}` — histograma
- `kommo_snapshot_drift_pct{metricKey,workspace}` — gauge, alerta P2 > 1%
- `kommo_snapshot_rebuild_duration_seconds{workspace}` — histograma
- `kommo_snapshot_missing{metricKey}` — counter (quando adapter acha `null`, alerta P1 > 0 em prod)

---

## 4. Alternatives considered (rejected)

### 4.1 Alternativa A — Materialized View com REFRESH CONCURRENTLY

Rejeitada:
- REFRESH CONCURRENTLY trava por 5-30s em tabelas grandes.
- Granularidade de refresh (cron) nao casa com gatilho por evento.
- Custo de reescrita total, nao incremental.

### 4.2 Alternativa B — Calculo sob demanda com cache TTL longo

Rejeitada:
- TTL longo estoura SLI `webhook -> card p95 <= 10s`.
- Invalidacao via ADR-007 derruba hit rate, forcando miss em `COUNT(*)` full scan.
- Principio #15 do squad-dashboards (perf budget bloqueante) fica em risco.

### 4.3 Alternativa C — Tabela polimorfica separada para buckets (agent/hour)

Proposta: `KommoMetricSnapshotBucket { snapshotId, bucketKey, bucketValue, value }`.

Rejeitada (na MVP):
- Exige nova migration + mais um model no schema-prisma — Sprint 1 ja bloqueou em 4 models.
- Abrir nova tabela com relation a `KommoMetricSnapshot` aumenta joinar em adapter -> regressao de p95.
- Abuso de `pipelineId` nos 2 casos especiais (agent/hour) e limitado e documentado.

**Reaberta em:** RFC `kommo-002-snapshots-polimorficos` quando 3+ KPIs precisarem de bucket alem de pipeline.

### 4.4 Alternativa D — Contagem incremental em Redis

Rejeitada:
- Redis nao da durabilidade fiavel para KPIs "all-time". Se Redis cair, perde estado -> drift permanente ate rebuild diario.
- Cross-tenant leak risk se key schema falhar (ja resolvido em cache mas aqui seria fonte de verdade).
- Nao participa de `$transaction` do Postgres — reintroduz dupla escrita rejeitada na ADR-007 secao 1.2.

---

## 5. Implementation notes (para Sprint 3 — story K3-3)

1. **Mapping `eventType -> metricKeyDeltas[]`** — tabela em `kommo-workers/handlers/snapshot-delta.ts`:
   ```ts
   const DELTAS: Record<KommoEventType, Array<{metricKey: string, delta: bigint, bucketFn?: (e) => string}>> = {
     chat_resolved: [
       { metricKey: 'total_resolved_alltime', delta: 1n },
       { metricKey: 'open_conversations', delta: -1n },
     ],
     message_created: [
       { metricKey: 'total_messages_today', delta: 1n },
       { metricKey: 'messages_by_agent_7d', delta: 1n, bucketFn: (e) => `agent:${e.authorAgentId}` },
       { metricKey: 'messages_by_hour_7d', delta: 1n, bucketFn: (e) => `hour:${new Date(e.createdAt).getUTCHours() + new Date(e.createdAt).getUTCDay() * 24}` },
     ],
     // ...
   };
   ```

2. **`KommoSnapshotsService.applyDeltas(tx, workspaceId, eventType, event)`** — itera DELTAS e faz upsert por item em loop dentro da `$transaction` do caller.

3. **`kommo-snapshot-rebuild.worker.ts`** — cron `0 3 * * *`, lock advisory, iteracao por workspace.

4. **Teste obrigatorio** — dado que handler processa `chat_resolved`, `KommoMetricSnapshot.value` para `total_resolved_alltime` incrementou em 1 E `open_conversations` decrementou em 1. Injection test: se o increment falhar, rollback reverte tambem o update da conversa.

5. **Migration `kommo_foundations_2`** (Sprint 2) ja contem o model `KommoMetricSnapshot`; implementacao Sprint 3 apenas popula.

---

## 6. Open questions

1. **Ownership do cron rebuild** — squad-kommo (Larissa) ou squad-infra (Amanda)? Proposta: Larissa codifica, Amanda garante scheduling + observabilidade.
2. **Limite de snapshots por workspace** — 8 KPIs x pipelineId x bucket pode crescer. Alerta `COUNT(snapshots) > 10000` por workspace?
3. **Consistency check em request-time** — devemos validar que snapshot nao esta "velho demais" (ex: `updatedAt < now - 5min`)? Custo: extra query por request. Proposta: log-only, sem bloquear.
4. **Backward-compat quando trocarmos escala de `resolution_rate_7d`** — versionar via `metricKey` (ex: `resolution_rate_7d_v2`) ou migracao atomica em noite de janela?

---

## 7. Approval trail

- [ ] Rafael Quintella (Tech Lead squad-kommo)
- [ ] Mateus Lacerda (Backend Handlers — consome `applyDeltas` nos handlers)
- [ ] Thales Rocha (squad-dashboards — adapter consome snapshot)
- [ ] Debora (squad-dashboards — seed Analytics Comercial usa metricKeys desta ADR)
- [ ] Carolina (Backfill — implementa rebuild inicial pos-backfill)
- [ ] Amanda (squad-infra — cron + Grafana)

Apos aprovacao: mover status para **Accepted**, criar story `K3-3` no Sprint 3 backlog.

---

## 8. References

- PLANO-KOMMO-DASHBOARD.md secao 5.2 (schema), secao 8.7 (adapter), secao 9 (SLIs), story K3-3 (Sprint 3), story K6-4 (Sprint 6).
- ADR-007 — `kommo-outbox-invalidation` (complementar; outbox emite `KOMMO_ENTITY_CHANGED` com `entity: 'metric_snapshot'` quando snapshot muda).
- ADR-008 — `kommo-reconciliation-strategy` (cron diario deste ADR alinha com rebuild de entidades-fonte).
- `squad-kommo.mdc` principios #1 (workspaceId primeiro), #3 (idempotencia via unique), #15 (perf budget).
- `squad-dashboards.mdc` principio #15 (perf budget bloqueante).
- `mundial-erp-api/prisma/schema.prisma` linhas 487-500 — model `KommoMetricSnapshot` (Sprint 2 migration).
