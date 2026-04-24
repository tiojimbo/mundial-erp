# ADR-005 — `kommo-webhook-hmac`

> Assinatura HMAC-SHA256 obrigatoria em `POST /webhooks/kommo/:workspaceId`, com secret per-`KommoAccount`, janela de clock skew de 5 minutos, replay protection via unique constraint `(workspaceId, eventId)` e comparacao `timingSafeEqual`. Qualquer outro algoritmo (SHA1, MD5) ou ausencia de signature resulta em 401, sem vazar detalhes.

| Campo | Valor |
|---|---|
| **ID** | ADR-005 |
| **Titulo** | `kommo-webhook-hmac` |
| **Status** | **Accepted** — em vigor a partir de 2026-04-24 |
| **Autor** | Rafael Quintella (Tech Lead / Integration Architect, squad-kommo) |
| **Data** | 2026-04-24 |
| **Supersedes** | — |
| **Related** | ADR-006 (`kommo-token-envelope-encryption`, futura — define como `hmacSecret` e armazenado encriptado), ADR-007 (`kommo-outbox-invalidation` — consome o `workspaceId` validado por este ADR), `docs/threat-model-kommo.md` §§ T-S1/T-T1-T6, PLANO-KOMMO-DASHBOARD.md §§ 7.2, 8.2 |
| **Squads afetados** | squad-kommo, squad-infra (rate limit edge), squad-dashboards (consumer downstream) |

---

## 1. Context

### 1.1 Superficie de ataque

`POST /webhooks/kommo/:workspaceId` e a unica rota Kommo exposta publicamente sem JWT. O Kommo chama essa URL sempre que ha mudanca de estado em conversas, mensagens, leads ou agentes (plano §4.1 — 10+ tipos de evento). Sem validacao criptografica, o endpoint vira **vetor direto de tenant leak + DoS + poisoning de dados** (ver threat-model-kommo.md §§ T-S1, T-T1, T-T5):

- **Spoof cross-tenant:** atacante descobre `workspaceId` (enumeravel via URL), envia evento forjado "conversation.resolved" para inflar metrica de outro tenant.
- **Injecao de payload sujo:** alterar `responsibleAgentId`, `pipelineId`, `contentPreview` (PII do cliente legitimo).
- **Replay:** capturar um webhook valido e reenviar N vezes, corrompendo contadores (`KommoMetricSnapshot`).
- **DoS:** sem rate-limit discriminatorio, qualquer IP pode saturar worker BullMQ.

### 1.2 O que o Kommo oferece

O Kommo anexa em cada webhook um header de assinatura (a documentacao lista o nome exato; o nosso controller lera da request). Assinatura e calculada como HMAC sobre o **raw body** com um shared secret gerado na hora do OAuth connect + listado em `KommoAccount.hmacSecret`. Clock sync entre Kommo e nossa infra e razoavel (NTP do provider) mas nao infinito — na pratica, a janela aceitavel e ~5 min.

### 1.3 Restricoes do projeto

1. **Multi-tenant hermetico** — principio #1 squad-kommo. Verificacao de HMAC nao basta: tambem e preciso checar que o `workspaceId` da URL bate com o `account_id` dentro do payload assinado. Um atacante com HMAC valido de W1 nao pode postar em `/webhooks/kommo/W2` para induzir cross-write.
2. **p95 ≤ 100ms no ack** — SLI do plano §9.2 (`kommo_webhook_ack_latency_seconds`). Validacao precisa ser O(1): HMAC puro + lookup unico por `workspaceId` no banco (cache + fallback).
3. **Zero log de secret/token** — principio #13 squad-kommo. Logger NUNCA imprime `hmacSecret`, nem truncado.
4. **Webhook e fonte primaria** mas **nao pode bloquear cron-secundario** — reconciliacao 5min/hourly/daily precisa funcionar se um webhook especifico falhar HMAC (evento fica em DLQ, cron re-popula). ADR-008 cobre essa redundancia.

---

## 2. Decision

### 2.1 Resumo

1. **HMAC-SHA256 obrigatorio** em todo request. Qualquer outro algoritmo explicito (SHA1, MD5) ou missing header → **401 Unauthorized**. Resposta nao revela se o workspace existe.
2. **Secret per-`KommoAccount`** — coluna `hmacSecret` da tabela `KommoAccount`, armazenada encriptada via envelope encryption (ADR-006 futura). Na pasta de codigo, `KommoAccountsRepository.findByWorkspace(workspaceId)` retorna o secret ja desencriptado para uso in-memory; secret nunca trafega em log nem em erro.
3. **Comparacao `crypto.timingSafeEqual`** — sempre, ambos buffers de tamanho identico. Comparacao direta (`===`) e PROIBIDA por code review (red flag P0 squad-kommo principio #4).
4. **Janela de clock skew de 5 minutos** — payload Kommo carrega `timestamp` (unix seconds). Se `Math.abs(now - timestamp) > 300s` → **401** com log `reason=timestamp_out_of_window`. Anti replay preso a horario distante.
5. **Replay protection via unique constraint** — `KommoWebhookEvent (workspaceId, eventId)` e UNIQUE. Se INSERT falha com `P2002`, responder **200 `{ deduplicated: true, eventId }`** sem reprocessar. Idempotencia exata.
6. **`workspaceId` da URL deve casar com `account_id` do payload** — se HMAC valida mas os dois divergem → **403** + log `reason=workspace_account_mismatch` + alerta de seguranca (possivel URL manipulation). Esse caminho e raro o suficiente para merecer alerta P1 sem flood.
7. **Algoritmo nao-configuravel por request** — embora a API do `KommoApiClient.validateHmac` aceite parametro `algorithm`, o unico valor aceito em runtime e `'sha256'`. Qualquer outro retorna `false` de forma uniforme (nao throw, para o controller responder 401 limpo).
8. **Raw body obrigatorio** — middleware `express.raw({ type: 'application/json' })` configurado na rota `/webhooks/kommo/*`. JSON reparse apos validar assinatura. Re-serializar antes de hashear quebra HMAC — red flag documentada no service.

### 2.2 Pseudo-codigo do controller (proxima rodada)

```
1. rawBody     = req.body (Buffer)
2. signature   = req.header('x-kommo-signature')
3. account     = kommoAccountsRepo.findByWorkspace(workspaceId) ?? return 404
4. if (!kommoApiClient.validateHmac(rawBody, signature, account.hmacSecret)) return 401
5. payload     = JSON.parse(rawBody)
6. if (Math.abs(now - payload.timestamp) > 300) return 401 (log timestamp_out_of_window)
7. if (payload.account_id !== account.kommoAccountId) return 403 (alerta workspace_account_mismatch)
8. try { INSERT KommoWebhookEvent(workspaceId, eventId=payload.event_id, ...) }
   catch (P2002) { return 200 { deduplicated: true, eventId } }
9. enqueue BullMQ QUEUE_KOMMO_WEBHOOKS
10. return 200 { accepted: true, eventId }
```

Implementacao real entra em Sprint 2 (proxima rodada) — este ADR fixa o contrato.

### 2.3 Invariantes de seguranca (P0)

- **P0:** NUNCA logar `signature`, `hmacSecret`, `accessToken`, `refreshToken` — nem em debug, nem em erro.
- **P0:** NUNCA comparar signature com `===` ou `Buffer.compare` nao-timing-safe. SEMPRE `crypto.timingSafeEqual` com pre-check de length.
- **P0:** `workspaceId` do path SEMPRE checado contra `account_id` do payload apos HMAC. Ordem: HMAC primeiro (rejeita anonimos), mismatch depois (rejeita internos maliciosos).
- **P0:** Raw body preservado — se algum middleware global faz `JSON.parse` antes, o hash quebra. Rota `/webhooks/kommo/*` tem handler dedicado de raw body.
- **P1:** Clock skew window hardcoded 5min. Se NTP falhar, webhooks legitimos entrariam em 401 — alerta de `kommo_webhook_rejected_total{reason=timestamp_out_of_window}` detecta.

---

## 3. Consequences

### 3.1 Positivas

1. **Sem spoof cross-tenant** — atacante sem `hmacSecret` de W1 nao consegue forjar eventos, mesmo conhecendo `workspaceId`.
2. **Replay neutralizado** — unique constraint idempotente, nenhum recontador inflavel.
3. **Clock skew bounded** — janela de 5min limita janela de abuso de um webhook capturado.
4. **Timing attack neutralizado** — `timingSafeEqual` nao vaza byte-a-byte do secret.
5. **Latencia O(1)** — HMAC + lookup (cached) = <10ms para validacao pura, cabe folgado no SLI de 100ms.
6. **Auditabilidade** — `KommoWebhookEvent` com eventId, timestamp recebido, signature valida, enqueue status. Forense trivial.

### 3.2 Negativas

1. **Dependencia de NTP.** Se relogio do servidor divergir >5min do Kommo, webhooks legitimos caem em 401. Mitigacao: alerta Grafana em `kommo_webhook_rejected_total{reason=timestamp_out_of_window}` > 10/min.
2. **Secret rotation nao-trivial** — trocar `hmacSecret` exige coordenacao com Kommo (novo connect) ou endpoint administrativo de rotacao. Out of scope desta ADR; RFC `kommo-secret-rotation` futura.
3. **Raw body middleware extra** — um handler dedicado para `/webhooks/kommo/*` contorna o parser JSON global. Pequeno custo de manutencao documentacional.
4. **Falha de `hmacSecret` desencriptado em memoria** — se KMS cair (ADR-006), webhook responde 500 / cai em 401 dependendo do caminho. Aceito — cron-secundario recupera.

### 3.3 Metricas de saude (Grafana `kommo-webhooks`)

- `kommo_webhook_ack_latency_seconds` — histograma (alvo p95 ≤ 100ms).
- `kommo_webhook_rejected_total{reason}` — contador (`hmac_invalid` | `timestamp_out_of_window` | `workspace_account_mismatch` | `algorithm_rejected`).
- `kommo_webhook_deduplicated_total` — contador (replay legitimo detectado via unique constraint).
- `kommo_webhook_events_total{eventType}` — contador por tipo.
- Alerta P1: `kommo_webhook_rejected_total{reason="workspace_account_mismatch"}` > 0 — possivel ataque.

---

## 4. Alternatives considered (rejected)

### 4.1 Alternativa A — HMAC-SHA1

**Proposta:** aceitar SHA1 alem de SHA256 para compatibilidade com versoes antigas do webhook Kommo.

**Rejeitada:**
- SHA1 tem ataques de colisao publicos (SHAttered, 2017). Mesmo em HMAC-SHA1, recomendacao NIST e desuso.
- Suportar dois algoritmos abre downgrade: atacante que controla o header `algorithm` forcaria SHA1.
- Kommo suporta SHA256 nativo; nao ha ganho real.

### 4.2 Alternativa B — Sem janela de clock skew

**Proposta:** aceitar qualquer timestamp, delegar replay protection apenas a unique constraint.

**Rejeitada:**
- Unique constraint protege `eventId` duplicado, mas um atacante com webhook capturado pode esperar dias/semanas e reenviar com outro `eventId` injetado (se o Kommo nao incluir `eventId` no corpo assinado). Janela de clock skew corta esse vetor.
- Mesmo com eventId no corpo, uma sessao de captura longa acumula eventos reutilizaveis. Janela limita o valor do ataque.

### 4.3 Alternativa C — Comparacao direta `===`

**Proposta:** comparar `sig === expected` — mais simples, JS nativo.

**Rejeitada:**
- String/Buffer comparison em V8 e early-exit: retorna assim que encontra byte diferente. Timing leak mensuravel (centenas de ns a dezenas de us por byte) em rede com jitter baixo. Atacante paciente recupera byte a byte do secret.
- `crypto.timingSafeEqual` e padrao da API do Node para exatamente esse caso.

### 4.4 Alternativa D — Secret global unico (nao per-account)

**Proposta:** um `KOMMO_WEBHOOK_SECRET` global no env, compartilhado por todos workspaces.

**Rejeitada:**
- Compromisso de um tenant compromete todos.
- Rotacao atomica impossivel sem downtime global.
- Nao alinha com modelo do Kommo (que gera secret por connect).

### 4.5 Alternativa E — Checar workspace/account mismatch ANTES do HMAC

**Proposta:** primeiro comparar path com payload, depois HMAC.

**Rejeitada:**
- JSON.parse antes de validar HMAC abre superficie (parse DoS, prototype pollution se usasse `Object.assign`). HMAC primeiro garante que so processamos payload autenticado.
- Inverte tambem o custo: request anonimo ja foi validado estruturalmente antes de ter assinatura — desperdicio de CPU em ataque.

---

## 5. Implementation reference

- **Metodo:** `KommoApiClient.validateHmac` — `mundial-erp-api/src/modules/kommo-api-client/kommo-api-client.service.ts`.
- **Tests:** `mundial-erp-api/src/modules/kommo-api-client/kommo-api-client.service.spec.ts` — pinam algoritmo rejeitado, bit-flip, signature vazia, edge cases.
- **Controller (proxima rodada):** `mundial-erp-api/src/modules/kommo-webhooks/kommo-webhooks.controller.ts` — orquestracao HMAC → mismatch check → INSERT → enqueue.
- **Schema (Larissa, rodando em paralelo):** `KommoAccount.hmacSecret` (string encriptada), `KommoWebhookEvent (workspaceId, eventId)` com `@@unique`.

---

## 6. Enforcement

1. **Code review red flag P0:** qualquer comparacao de signature fora de `timingSafeEqual` e rejeitada. Documentado em `squad-kommo.mdc` principio #4 + #18.
2. **Unit test obrigatorio:** `validateHmac` testa bit-flip + algoritmo rejeitado + signature vazia + timing-safe contrato. Entregue nesta rodada.
3. **E2E obrigatorio (Carolina, Sprint 2):** `kommo-webhook-hmac.e2e-spec.ts` — fuzz com signatures mutadas, mismatch de workspace, clock skew out-of-window, replay com mesmo eventId.
4. **Alerta Grafana:** `kommo_webhook_rejected_total{reason="workspace_account_mismatch"}` > 0 dispara P1 (possivel ataque deliberado).

---

## 7. Open questions

1. **Nome exato do header de signature** — documentacao oficial Kommo. Resolve-se na proxima rodada ao implementar controller. Nao bloqueia este ADR.
2. **Tolerancia a tempo do proprio servidor desassincronizado** — se NTP falhar por >5min, queda de webhook e esperada. Runbook curto para SRE disparar re-sync NTP e reconciliacao manual.
3. **Rotacao de `hmacSecret`** — fluxo fora de escopo; RFC `kommo-secret-rotation` cobre.
4. **Header adicional de versao** — considerar no futuro suportar `X-Kommo-Signature-Version` para migracao segura a SHA-3 se Kommo adotar. Hoje: fora de escopo.

---

## 8. References

- `docs/threat-model-kommo.md` §§ T-S1 (spoof), T-T1-T6 (tampering).
- `.claude/plan/PLANO-KOMMO-DASHBOARD.md` §§ 7.2 (contrato webhook), 8.2 (idempotencia), 9.2 (SLIs).
- `.claude/skills/squad-kommo.mdc` principios #1 (nao vazar), #2 (HMAC), #4 (timing-safe), #13 (logs sem PII), #18 (code review).
- ADR-007 (`kommo-outbox-invalidation`) — consome `workspaceId` validado.
- ADR-006 (proposta — `kommo-token-envelope-encryption`) — cobre armazenamento do `hmacSecret`.
