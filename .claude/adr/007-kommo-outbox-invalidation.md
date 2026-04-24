# ADR-007 — `kommo-outbox-invalidation`

> Invalidacao de cache de `/dashboards/:id/cards/:cardId/data` para entidades Kommo via evento `KOMMO_ENTITY_CHANGED` emitido no outbox dentro da mesma `$transaction` que persiste a entidade.

| Campo | Valor |
|---|---|
| **ID** | ADR-007 |
| **Titulo** | `kommo-outbox-invalidation` |
| **Status** | **Proposed** — aguarda aprovacao squad-kommo (Rafael Quintella) + squad-infra |
| **Autor** | Thales Rocha (Tech Lead squad-dashboards, owner do `DashboardCardQueryService`) |
| **Data** | 2026-04-23 |
| **Supersedes** | — |
| **Related** | ADR-003 (`task-outbox`), ADR-008 (`kommo-reconciliation-strategy`), ADR-009 (`kommo-metric-snapshot`), PLANO-KOMMO-DASHBOARD.md secao 8.6 |
| **Squads afetados** | squad-dashboards, squad-kommo, squad-infra, squad-fe-dashboards |

---

## 1. Context

### 1.1 Problema

A feature Dashboards (squad-dashboards) serve dados via `/dashboards/:id/cards/:cardId/data`, cujo hot path e protegido por cache Redis na chave `card:{cardId}:filtersHash:{hash}:workspace:{workspaceId}` (principio #8 do `squad-dashboards.mdc`, ADR-003 para entidades internas).

A integracao Kommo (PLANO-KOMMO-DASHBOARD.md) introduz **4 novas entidades replicadas** consumidas por 4 adapters no query engine:

- `kommoConversations`
- `kommoMessages`
- `kommoLeads`
- `kommoAgents`

A replicacao e **webhook-primary + cron-secondary** (ADR-008): `POST /webhooks/kommo/:workspaceId` grava `KommoWebhookEvent` + enqueue BullMQ; worker despacha handlers que escrevem na entidade-alvo **dentro de `$transaction`** + atualizam `KommoMetricSnapshot` (ADR-009).

**SLI critico** do PLANO secao 9.2: latencia `webhook → banco` p95 ≤ 10s. Traduzindo para o usuario final: **do momento em que o agente muda status no Kommo ate o numero atualizado aparecer no dashboard**, o orcamento total e ~10s. Como o cache TTL default de `/cards/data` e 60s (principio #8 do squad-dashboards), **sem invalidacao ativa o usuario veria numero stale por ate 60s apos a mutacao**, estourando o SLI.

### 1.2 Por que invalidacao sincrona nao serve

Opcao "ingenua": handler do worker, ao gravar `KommoConversation`, chama `cacheService.invalidate(cardIds)` **na mesma funcao**. Rejeitado por 4 motivos:

1. **Dupla escrita fragil.** Handler faria `prisma.$transaction([...write...])` + `redis.del(...)` em sequencia. Se Redis cair entre as duas, o Postgres fica atualizado mas o cache serve numero antigo ate TTL expirar — **inconsistencia assimetrica sem mecanismo de reconciliacao**.
2. **Acoplamento inverso.** `kommo-workers` passaria a conhecer o schema de chave de cache do `squad-dashboards`. Mudanca de chave (ex: incluir `dashboardFiltersHash` — ja no principio #8) exige deploy coordenado de 2 squads. Violacao do padrao que o proprio ADR-003 estabeleceu para entidades internas.
3. **Latencia no hot path do webhook.** O handler do worker deve processar o evento rapido (alvo implicito: <500ms por evento para manter o SLI webhook→banco ≤10s). Adicionar chamada Redis **sincrona** com retry ate 3x + timeout adiciona variancia imprevisivel. Fica pior: se o handler scan-ear dashboards que citam a entidade para descobrir `cardId`, a query + invalidacao passa a dominar o budget.
4. **Cross-cutting impossivel de testar.** Unit test do handler Kommo nao deve precisar mockar o cache do squad-dashboards. Violacao do principio #1 do agent-cto (separacao de camadas).

### 1.3 Por que TTL curto sem invalidacao tambem nao serve

Opcao alternativa: baixar TTL de 60s para 1-5s nos adapters Kommo. Rejeitado:

1. **Desperdicio de cache.** Cards KPI com aggregates (ex: "Total Resolvidas" all-time via `KommoMetricSnapshot`) nao mudam a cada segundo. TTL de 1-5s derruba cache hit rate para <20% (alvo do squad e ≥60%). Cada miss faz `prisma.kommoConversation.count()` — custo linear em dataset com 1M+ rows (mesmo mitigado por `KommoMetricSnapshot`, ha ainda a query do snapshot + validacao).
2. **Nao resolve o caso justo.** Entre a mutacao e o cache expirar, o usuario continua vendo stale. Apenas reduz a janela.
3. **Fere principio #15 (perf budget bloqueante).** `p95 /cards/data cache hit < 400ms` depende de cache hit alto.

### 1.4 Por que Pub/Sub Redis puro tambem nao serve

Opcao alternativa: worker Kommo publica em canal Redis Pub/Sub; squad-dashboards subscribe e invalida. Rejeitado:

1. **Sem durabilidade.** Pub/Sub do Redis e fire-and-forget. Se o subscriber (worker de invalidacao do squad-dashboards) estiver offline no momento do publish — deploy, OOM, restart — **o evento e perdido** e nunca invalidara. Inconsistencia permanente ate TTL expirar.
2. **Sem replay.** Nao ha jeito de "reler eventos das ultimas 5 min apos voltar". Cron de reconciliacao de 5 min (ADR-008) nao re-emite eventos de invalidacao — so re-executa escritas.
3. **Sem observabilidade por evento.** Nao ha tabela para auditar "este evento foi processado? por qual worker?".

### 1.5 Infra existente que podemos reutilizar

O repo ja tem:

- `mundial-erp-api/src/modules/task-outbox/` — padrao outbox com `TaskOutboxService.enqueue(tx, input)` chamado **dentro da `$transaction` do caller**, que insere em `task_outbox_events` + publica job BullMQ pos-commit via `queueMicrotask`. Worker transita `PENDING → PROCESSING → COMPLETED|FAILED|DEAD` com retry exponencial + jitter + DLQ.
- Constantes em `task-outbox.constants.ts`: `TASK_OUTBOX_RETRY.MAX_ATTEMPTS = 3`, backoff 1s→2s→4s, jitter ±20%, DLQ dedicada.
- Idempotencia por linha: `markProcessing` usa compareAndSet (`updateMany` condicional) — 2 workers nao processam o mesmo evento.

O plano (secao 2, ADR-007 linhado) ja documenta: **"Worker emite `KOMMO_ENTITY_CHANGED` no outbox ao gravar entidade; squad-dashboards consome e invalida cache. Aproveita infra outbox existente em `task-outbox/`."**

Este ADR formaliza e detalha esse padrao para o escopo Kommo.

---

## 2. Decision

### 2.1 Resumo

1. Criar um **outbox analogo** ao `task-outbox/` para eventos Kommo: `KommoOutbox` (nome tentativo — decisao de nomenclatura final em RFC `kommo-001-foundations`; pode ser tabela unica `kommo_outbox_events` OU reuso da mesma infra generalizada — ver Alternativa A).
2. **Todo handler de worker Kommo** que escreve entidade (`KommoConversation`, `KommoMessage`, `KommoLead`, `KommoAgent`) ou atualiza `KommoMetricSnapshot` emite o evento `KOMMO_ENTITY_CHANGED` **dentro da mesma `$transaction`** que persiste a mudanca. Atomico: ou ambos gravam, ou ambos revertem.
3. **squad-dashboards fornece um worker consumidor** (novo modulo, analogo ao `task-outbox.worker.ts`) que consome jobs do outbox Kommo com `eventType = 'KOMMO_ENTITY_CHANGED'`, le payload e invalida seletivamente o cache Redis das entradas `card:{cardId}:filtersHash:{*}:workspace:{workspaceId}` cujo `card.dataSource.entity` corresponda a `payload.entity`.
4. O cache key e fixado em formato invariante (principio #1 do squad-dashboards: `workspaceId` sempre na chave):

    ```
    card:{cardId}:filtersHash:{sha256(globalFilters + cardFilters)}:workspace:{workspaceId}
    ```

5. A invalidacao e **seletiva por `(workspaceId, entity)`** — NUNCA global, NUNCA cross-workspace.

### 2.2 Shape do evento `KOMMO_ENTITY_CHANGED`

```jsonc
{
  "event": "KOMMO_ENTITY_CHANGED",
  "entity": "conversation" | "message" | "lead" | "agent" | "metric_snapshot",
  "entityId": "ckxy123abc",                 // cuid da row recem-gravada/atualizada
  "workspaceId": "ckwsp456def",             // SEMPRE presente, SEMPRE validado != null
  "pipelineId": "ckpl789ghi" | null         // opcional — permite invalidacao granular quando filtro global do dashboard tem pipelineId
}
```

Regras:

- `event` e literal `"KOMMO_ENTITY_CHANGED"` (nao confundir com os 10 eventos Kommo-nativos da secao 4.1 do plano — esses sao nomes de **input** do webhook; `KOMMO_ENTITY_CHANGED` e o **output** do handler, unico tipo que o worker do squad-dashboards consome).
- `entity` e um dos 5 valores literais acima — correspondem 1:1 aos 4 adapters + snapshot. `metric_snapshot` dispara invalidacao em **cards que consomem KPI pre-agregado** via `dataSource.metricKey` (ver spec do adapter, secao 2.5 da spec companheira).
- `entityId` e informativo (para log/audit/rastreio), **nao usado como discriminante de invalidacao** — o worker invalida TODOS os cards que citam `entity` no workspace, nao apenas os que tocam aquele id especifico. Justificativa: nao temos indice reverso `entityId → cardIds` e cards com agregacoes (COUNT, SUM) dependem de **todas** as rows — mesmo que a mudanca seja em 1 row, a agregacao mudou.
- `workspaceId` e a chave primaria de roteamento — sem ele **NAO** ha como saber qual tenant invalidar, e falha de rota significa tenant leak (worst case: o worker invalida o cache de outro workspace).
- `pipelineId` e **otimizacao futura** (Fase 2) — quando o dashboard tem `DashboardFilter` global de `pipelineId`, podemos poupar invalidacao de cards que filtram pipelines diferentes do que mudou. **Na MVP (Sprint 3), o consumer IGNORA `pipelineId` e invalida tudo do `(workspaceId, entity)` — simplifica implementacao e elimina bugs sutis.** RFC futuro refina quando SLI de cache hit rate degradar.

### 2.3 Cache key format (invariante)

**Formato canonico** — violacao e P0 em code review:

```
card:{cardId}:filtersHash:{sha256hex}:workspace:{workspaceId}
```

Onde `sha256hex` e hash estavel (ordem de chaves normalizada) de `JSON.stringify({ globalFilters, cardFilters })`. Ja existente no hot path; este ADR apenas **formaliza a invariante** para o consumer do outbox saber como listar chaves a invalidar.

Motivacao de manter `workspaceId` na chave:

- **Zero risco de cross-tenant leak via cache**. Principio #1 do squad-dashboards. Mesmo que um bug no `buildWhere` esqueca de injetar `workspaceId`, o cache key distinto impede um tenant de ler cache de outro.
- **Invalidacao trivial por tenant**: padrao `SCAN MATCH card:*:filtersHash:*:workspace:{workspaceId}` cobre toda a invalidacao de W1 sem tocar em W2. Alternativa mais performatica e manter um **index set secundario** `cards:{workspaceId}:{entity}` → `Set<cardId>` atualizado no CRUD de DashboardCard; consumer faz `SMEMBERS` e itera. **Decisao MVP**: usar `SCAN COUNT 100 MATCH card:*:filtersHash:*:workspace:{workspaceId}` dado volume estimado (<10k chaves por workspace). Se degradar, migrar para index set em RFC follow-up.

### 2.4 Fluxo completo (happy path)

```
1. Kommo envia webhook -> POST /webhooks/kommo/:workspaceId
2. kommo-webhooks.service valida HMAC + INSERT KommoWebhookEvent + enqueue QUEUE_KOMMO_WEBHOOKS -> 200 (<80ms)
3. kommo-event-processor.worker consome job -> roteia por eventType
4. Handler (ex: chat-resolved.handler.ts) entra em this.prisma.$transaction(async tx => {
     a. tx.kommoConversation.update({ where: ..., data: { status: 'RESOLVED', resolvedAt: now } })
     b. tx.kommoMetricSnapshot.upsert({ ..., metricKey: 'total_resolved', value: { increment: 1 } })
     c. kommoOutbox.enqueue(tx, {
          aggregateId: conversationId,
          eventType: 'KOMMO_ENTITY_CHANGED',
          payload: { event: 'KOMMO_ENTITY_CHANGED', entity: 'conversation', entityId: conversationId, workspaceId, pipelineId },
        })
   })
5. Commit da $transaction -> rows Postgres + linha no kommo_outbox_events commitados juntos.
6. queueMicrotask publica job 'KOMMO_ENTITY_CHANGED' em QUEUE_KOMMO_OUTBOX (ou QUEUE generica compartilhada).
7. dashboard-cache-invalidation.worker (NOVO, squad-dashboards) consome:
     a. Le row do outbox + payload.
     b. entity = 'conversation' -> mapeia para dataSource.entity 'kommoConversations' (ver tabela em 2.6).
     c. SCAN MATCH card:*:filtersHash:*:workspace:{workspaceId} -> filtra keys cujos cards tenham dataSource.entity = 'kommoConversations' (consulta indice in-memory do CardRegistry, refreshed a cada CRUD de DashboardCard).
     d. DEL em batch das keys encontradas.
     e. Log estruturado + markCompleted.
8. Proxima requisicao /cards/:cardId/data gera novo snapshot no cache.
```

### 2.5 Mapeamento `payload.entity` -> `dataSource.entity`

Necessario porque o plano usa nomes singulares em snake_case nos payloads de evento (`"conversation"`) e o `DashboardCardQueryService` usa plural em camelCase (`"kommoConversations"` — ver secao 2.1 da spec companheira). Tabela:

| `payload.entity` (outbox) | `dataSource.entity` (query engine) | Adapter responsavel |
|---|---|---|
| `conversation` | `kommoConversations` | Larissa Bezerra |
| `message` | `kommoMessages` | Larissa Bezerra |
| `lead` | `kommoLeads` | Larissa Bezerra |
| `agent` | `kommoAgents` | Larissa Bezerra |
| `metric_snapshot` | **fan-out** para todos adapters Kommo que leem do snapshot (ver spec secao 2.5) | Larissa Bezerra |

Note: `metric_snapshot` e evento fan-out — quando um snapshot e atualizado, pode impactar multiplos cards de entidades diferentes (ex: "Total Resolvidas" le de snapshot mas `dataSource.entity` e `kommoConversations`). Consumer invalida por `metricKey`, nao por entidade — detalhe de implementacao que o worker resolve consultando `KommoMetricSnapshot.metricKey` -> set de cards que declaram `dataSource.metricKey` no JSON.

### 2.6 Invariantes de seguranca

- **P0:** `workspaceId` SEMPRE presente no payload. Validacao no `enqueue` e no `consume`: ausencia = **reject com log critico + DLQ + alerta**.
- **P0:** Consumer NUNCA invalida chaves de outro workspace. Implementacao: o padrao `SCAN` **SEMPRE** usa `MATCH ...:workspace:{workspaceId}` com `workspaceId` vindo do payload. Unit test obrigatorio: injetar 2 workspaces, emitir evento para W1, validar que chaves de W2 permanecem intactas.
- **P1:** Consumer tolerante a `entity` desconhecida: se `payload.entity` nao mapeia para nenhum adapter registrado, log `warn` + `markCompleted` (nao retry) — evita loop de DLQ quando novo tipo de entidade aparecer futuramente sem adapter correspondente atualizado.
- **P1:** Falha de invalidacao **nao reverte a escrita**. O outbox garante at-least-once do evento; se Redis estiver offline, worker de invalidacao faz retry (3x, backoff exp) e na 4a vai para DLQ. **Nesse caso, TTL do cache (60s default) atua como fallback de ultima linha** — usuario ve numero stale por ate 60s, SLI degrada para `webhook → card p95 ≤ 70s` temporariamente; alerta Grafana dispara, incident commander (Thales) intervem.

---

## 3. Consequences

### 3.1 Positivas

1. **Zero dupla escrita.** Write Postgres + enqueue outbox em `$transaction` — atomico. Se a tx falhar, nao ha evento orfao nem write orfao.
2. **Reutiliza infra outbox** ja testada, com retry, DLQ, observabilidade, idempotencia, metricas.
3. **Desacopla squad-kommo de squad-dashboards** no runtime — handler Kommo nao conhece Redis, nao conhece schema de cache. Unico contrato entre squads e o shape de `KOMMO_ENTITY_CHANGED`.
4. **Replay e debugabilidade.** Tabela `kommo_outbox_events` tem historico — rastreamos "quais invalidacoes aconteceram no ultimo 1h?" com SQL.
5. **Latencia total** — budget:
    - Webhook ack: <80ms (SLI 9.2)
    - Worker Kommo pega job: p50 <500ms (BullMQ)
    - Write Postgres + outbox insert (`$transaction`): p50 <80ms
    - Publish pos-commit (queueMicrotask + BullMQ add): <20ms
    - Worker de invalidacao pega job: p50 <300ms
    - `SCAN` + `DEL` chaves do workspace afetado: p50 <200ms para <10k chaves
    - **Total webhook → cache invalidado: 100ms-2s p50; p95 <5s.**
    - Bem dentro do SLI `webhook → card p95 ≤ 10s` do plano (secao 9.2), deixando ~5s de folga para proxima consulta do FE.
6. **Zero risco de cross-tenant via cache** — chave ja carrega `workspaceId`, consumer invalida apenas pelo `workspaceId` do payload.

### 3.2 Negativas

1. **Latencia de 100ms-2s adicionada** entre write e cache atualizado. **Aceita pelo SLI** (≤10s webhook→card) mas significa que, numa janela estreita apos mutacao, usuario que abrir o dashboard ainda vera numero antigo. Front ja fara auto-refresh 30s (plano secao 11.4), entao o gap e imperceptivel na UX normal. Debug pode surpreender — runbook explicita.
2. **Acopla squad-dashboards a infraestrutura BullMQ do squad-kommo** para rodar o consumer. Se BullMQ cair, invalidacao para — TTL assume o fallback (60s). Alerta P1 em DLQ depth > 500 cobre.
3. **Crescimento da tabela `kommo_outbox_events`** — purge cron diario (alinhado com `kommo-recon-daily` do ADR-008, clause secao 8.4) remove rows `COMPLETED > 30d`. Retencao suficiente para auditoria SOC + debug.
4. **Consumer de invalidacao e novo ponto de falha** — OOM, deadlock, deploy bug. Mitigacao: DLQ + monitoring + runbook + fallback TTL.
5. **Coordenacao cross-squad** — squad-kommo precisa respeitar o contrato `KOMMO_ENTITY_CHANGED` fielmente. Mudanca do shape requer bump de versao + migracao em 2 squads. Alternativa futura: generalizar outbox com `eventType` registrado num contrato compartilhado.

### 3.3 Metricas de saude (para Grafana dashboard `kommo-sync`)

- `kommo_outbox_enqueued_total{entity}` — contador
- `kommo_outbox_processing_seconds{entity}` — histograma (p50/p95/p99)
- `kommo_outbox_dlq_depth` — gauge (alerta P1 > 500)
- `dashboards_cache_invalidation_keys_deleted{entity,workspace}` — contador
- `dashboards_cache_invalidation_scan_duration_seconds` — histograma
- `dashboards_cache_hit_rate{entity}` — gauge (alvo ≥ 60%)
- `kommo_webhook_to_cache_latency_seconds` — histograma (SLI <10s p95)

---

## 4. Alternatives considered (rejected)

### 4.1 Alternativa A — Reusar literalmente `task-outbox` generalizado

**Proposta:** renomear `task-outbox` para `domain-outbox` generico, add `eventType = 'KOMMO_ENTITY_CHANGED'` ao enum, compartilhar tabela/worker.

**Rejeitada (na MVP):**

- Tabela `task_outbox_events` tem colunas `aggregateId` genericas mas o worker atual (`task-outbox.worker.ts`) tem logica especifica de `WorkItem` (projecao em `WorkItemActivity`, dispatch por `ACTIVITY_ONLY_EVENT_TYPES`, integracao com `TaskSseBus`).
- Generalizar exige refactor cross-cutting bloqueante para squad-tasks — fora do escopo do plano Kommo.
- Duplicar a infra (tabela + worker) custa ~2 dias de Larissa + Rafael; manter em modulos separados preserva ownership claro.

**Reaberta em:** RFC futuro `outbox-generalization` quando 3+ squads tiverem outbox dedicado (tasks, kommo, sync...).

### 4.2 Alternativa B — Invalidacao sincrona no handler

**Proposta:** handler chama `cacheService.invalidate(cardIds)` logo apos `$transaction` commitar.

**Rejeitada:**

- Dupla escrita fragil (secao 1.2).
- Acoplamento invertido squad-kommo → squad-dashboards.
- Latencia no hot path do webhook inflaciona o SLI webhook→banco.

### 4.3 Alternativa C — TTL curto sem invalidacao

**Proposta:** TTL 1-5s em cards Kommo; aceitar staleness na janela.

**Rejeitada:**

- Desperdicio de cache, hit rate cai <20%.
- Custo Postgres por KPI sem snapshot explode em dataset grande.
- Nao resolve para cards que leem `KommoMetricSnapshot` (ja pre-agregados — TTL grande ali e ok; TTL uniforme quebra trade-off).

### 4.4 Alternativa D — Redis Pub/Sub sem outbox

**Proposta:** handler publica em canal Redis Pub/Sub; subscriber no squad-dashboards invalida.

**Rejeitada:**

- Sem durabilidade — subscriber offline perde evento.
- Sem replay, sem auditoria.
- Incompativel com SLI de consistencia eventual garantida.

### 4.5 Alternativa E — Cron "varredura de staleness"

**Proposta:** cron de 5s que compara `max(updatedAt)` de cada entidade Kommo com `lastInvalidatedAt` do cache; invalida diferencas.

**Rejeitada:**

- Carga Postgres constante (4 queries a cada 5s por workspace ativo).
- Nao escala linearmente com numero de workspaces.
- Atraso garantido de 5s + reply — pior que outbox.

---

## 5. Implementation notes (para quem for codar — Sprint 3)

1. **squad-kommo (Larissa + Mateus):**
    - Criar `mundial-erp-api/src/modules/kommo-outbox/` espelhando `task-outbox/` (repositorio + service + constants + worker opcional se formos reusar o worker task ou se formos escrever um novo dedicado a `KOMMO_ENTITY_CHANGED`).
    - Handlers de worker Kommo chamam `kommoOutbox.enqueue(tx, { aggregateId, eventType: 'KOMMO_ENTITY_CHANGED', payload })` dentro de `$transaction`.
    - Teste obrigatorio: dado que handler do evento `chat_resolved` executa, `kommo_outbox_events` ganha 1 row com status PENDING + payload correto + `workspaceId` != null.

2. **squad-dashboards (Thales + Debora):**
    - Criar `mundial-erp-api/src/modules/dashboards/cache/dashboard-cache-invalidation.worker.ts` (nome provisorio).
    - Consumer: processor BullMQ que le `payload`, executa `SCAN + DEL` no Redis por `workspaceId` + filtra por `entity`.
    - Teste obrigatorio: E2E — grava evento no outbox via `enqueue` mock; verifica via `redis.keys('card:*:*:workspace:{wsId}')` vazio apos consumer rodar; verifica chaves de **outro** workspace intactas.

3. **squad-infra:**
    - Adicionar `QUEUE_KOMMO_OUTBOX` em `queue.module.ts` (ou reusar `QUEUE_KOMMO_WEBHOOKS` se plano unificar — decisao Rafael).
    - Provisionar limites de concorrencia (`KOMMO_OUTBOX_CONCURRENCY`, default 5).

4. **Migration:**
    - `kommo_foundations_2` (Sprint 2) ja contempla `kommo_outbox_events` OU ADR final decide juntar na migration `kommo_outbox` separada — Larissa define.

5. **Feature flag:**
    - Proteger atras de `KOMMO_SYNC_ENABLED` (ja existe no plano secao 1.2).

---

## 6. Open questions (para discussao antes de aprovar)

1. **Nomenclatura `kommo_outbox_events` vs. reuso de `task_outbox_events`** — decisao de Larissa + Rafael em RFC foundations.
2. **Consumer separado ou shared com task-outbox worker** — minha preferencia: separado em `dashboards/cache/` porque ownership e do squad-dashboards, nao do squad-kommo nem do squad-tasks.
3. **`SCAN` vs. index set `cards:{workspaceId}:{entity}`** — MVP usa SCAN (simples), futuro RFC migra se degradar.
4. **`pipelineId` no payload** — mantido como opcional **sem uso no MVP**; futuro RFC liga.
5. **Retencao de rows `kommo_outbox_events`** — alinhar com `kommo-recon-daily` (30d default). Pode variar por compliance.

---

## 7. Approval trail

- [ ] Rafael Quintella (Tech Lead squad-kommo)
- [ ] Larissa Bezerra (Backend squad-kommo — implementa enqueue)
- [ ] squad-infra representative (consumo de BullMQ + Redis)
- [ ] Thales Rocha (autor, squad-dashboards)
- [ ] Hugo Monteiro (QA squad-dashboards — valida invariantes de seguranca)

Apos aprovacao: mover status para **Accepted**, abrir story `K3-1a` (outbox) + `K3-1b` (consumer) no backlog Sprint 3.

---

## 8. References

- PLANO-KOMMO-DASHBOARD.md secoes 2 (ADR-007 resumido), 8.6 (invalidacao), 8.7 (adapter), 9 (SLIs).
- `squad-dashboards.mdc` principios #1 (workspaceId primeiro), #8 (cache), #9 (invalidacao via outbox).
- `mundial-erp-api/src/modules/task-outbox/` — template de referencia.
- ADR-003 (`task-outbox` original) — padrao base.
- ADR-008 (`kommo-reconciliation-strategy`) — fallback de cron.
- ADR-009 (`kommo-metric-snapshot`) — entidade virtual que tambem dispara invalidacao.
