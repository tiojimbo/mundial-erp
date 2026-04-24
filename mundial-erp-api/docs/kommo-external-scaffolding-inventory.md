# Inventário — pasta externa `C:\Users\USER\Documents\agents\kommo`

> Produzido em Sprint 1 / K1-1 (Mateus Figueiredo — workers/reconciliation/backfill).
> Objetivo: mapear código reaproveitável para a integração Kommo do Mundial ERP (PLANO-KOMMO-DASHBOARD, §3.3).

---

## Resumo executivo (< 50 palavras)

Pasta externa é um **MCP server Kommo CRM** (read/write via API v4) + 3 scripts utilitários. **Vale aproveitar:**
(a) **schemas Zod** dos recursos Kommo (22 arquivos) como fonte-de-verdade para tipos de payload; (b) **`KommoClient`** (HTTP+HAL normalizer) como referência para `KommoApiClient` do ERP.
**Não aproveitar** o transporte MCP — ERP usa NestJS HTTP/BullMQ.

---

## Conteúdo encontrado

| Caminho (relativo à raiz kommo) | Tipo | Tamanho | Aproveitamento |
|---|---|---|---|
| `CLAUDE.md` | instruções agente Kommo CRM Manager | 96 linhas | **Ler antes de implementar handlers** — regras operacionais do Kommo (rate-limit 7 req/s, semantics de status/pipeline, reservas "default", max 250 batch, webhooks duplicados). **Mateus + Rafael** consultam antes de escrever código de chamada à API. |
| `mcp-server/package.json` | metadata | - | Deps: `@modelcontextprotocol/sdk@^1.12.1`, `zod@^3.24.0`. **NÃO importar** — ERP não usa MCP SDK. Serve como referência de versionamento Zod (ERP usa `class-validator`, não Zod — schemas servem como documentação). |
| `mcp-server/src/services/kommo-client.ts` | HTTP client Kommo | 420 linhas | **Referência forte para Rafael (kommo-api-client)**: `KommoClient` class com `GET/POST/PATCH/PUT/DELETE`, `buildUrl` com query params, `KommoApiError` com mensagens amigáveis por status (400/401/402/403/404/429/500), `extractEmbedded` para HAL+JSON `_embedded`, `normalizeListResponse` para paginação, `formatAsMarkdown`. **Reaproveitar:** lógica de erro friendly + HAL pagination helper (porta para NestJS + HttpService + Logger). **NÃO copiar:** loadConfig env-based (ERP usa ConfigService), ClientRegistry multi-account (ERP faz via workspaceId→KommoAccount). Nem `truncate`/`formatResult` (só para MCP output). |
| `mcp-server/src/schemas/*.ts` (22 files) | Zod schemas de cada recurso Kommo | ~90KB total | **Referência para Larissa (schema Prisma)** e **Mateus (DTOs de payload webhook)**. Especificamente: `leads.ts`, `chats.ts`, `webhooks.ts`, `pipelines.ts`, `users.ts`, `tags.ts`, `notes.ts`, `events.ts`, `tasks.ts` documentam campos que Kommo expõe (ex: `status_id`, `pipeline_id`, `responsible_user_id`, `custom_fields_values[]`, `_embedded.contacts/companies`). **Aproveitar:** lista de campos por recurso. **Não copiar literalmente:** ERP valida via `class-validator`, não Zod. |
| `mcp-server/src/tools/*.ts` (22 files) | Tool handlers MCP | 18KB index.ts + 22 files | **Baixo valor direto** — são shims entre MCP SDK e `KommoClient`. Pode ser consultado para entender quais endpoints Kommo o MCP utiliza (list/get/create/update/delete por recurso). |
| `mcp-server/src/types.ts`, `constants.ts` | tipos auxiliares + `REQUEST_TIMEOUT_MS`, `CHARACTER_LIMIT` | pequenos | Consultar valor de `REQUEST_TIMEOUT_MS` como benchmark (ERP decide o próprio). |
| `mcp-server/src/index.ts` | bootstrap MCP | - | Irrelevante para o ERP. |
| `mcp-server/dist/`, `node_modules/` | build/deps | - | Ignorar. |
| `mcp-server/evaluation.xml` | relatório de avaliação MCP | 1.7KB | Ignorar. |
| `mcp-server/.env` | credenciais runtime | pequeno | **NÃO** copiar. ERP exige `ConfigService` + envelope encryption. |
| `scripts/_probe.mjs` | script exploratório Kommo (users/contacts/timestamps) | 31 linhas | Baixo valor — one-off para debugging histórico. |
| `scripts/_first_message.mjs` | amostragem de eventos Kommo `/events` | 40+ linhas | **Referência para Mateus (backfill worker)**: mostra uso prático do endpoint `/events` com `filter[created_at][from/to]`, `filter[type][N]`, paginação `limit=100/page=N`. Serve como protótipo para o paginador de backfill. |
| `scripts/_unanswered.mjs` | investigação de leads sem resposta | 4.1KB | Referência para lógica de conversas sem responsável (card "Sem Responsável" MVP). Consultar padrões de consulta, não copiar. |
| `.claude/settings.local.json` | permissões MCP locais | 7.7KB | Ignorar. Específico daquela sessão de agente. |
| `.claude/skills/` | (pasta com possíveis skills) | não inspecionada | Listar em próxima rodada se necessário. |
| `.gitignore` | - | - | Ignorar. |

---

## Decisões

**Aproveitar:**
1. **Lista de campos por recurso Kommo** (schemas Zod) — insumo direto para Larissa dimensionar colunas dos 11 models Prisma.
2. **Lógica de erros friendly HTTP status** (`KommoApiError.friendlyMessage`) — Rafael pode portar para o circuit breaker + retry do `KommoApiClient`.
3. **`extractEmbedded` / `normalizeListResponse`** — algoritmo de HAL+JSON padrão Kommo, vai para o `KommoApiClient` do ERP.
4. **CLAUDE.md** — leitura obrigatória antes de implementar (rate-limit 7 req/s, semântica de `status_id` vs `pipeline_id`, máximos de batch 250, regra de não-duplicação de webhooks).
5. **`scripts/_first_message.mjs`** — protótipo de paginador do endpoint `/events` para o backfill de 90 dias.

**Deixar de fora:**
1. MCP transport (`@modelcontextprotocol/sdk`) — ERP usa NestJS HTTP/BullMQ, não MCP.
2. `loadConfig()` env-based e `ClientRegistry` multi-account — ERP resolve por `workspaceId → KommoAccount` no Prisma.
3. Todas as tools MCP (`tools/*.ts`) — são camada de apresentação do MCP, não são lógica de negócio.
4. Formatação Markdown de output — output do ERP é JSON com envelope `{data, meta}`.
5. `scripts/_probe.mjs` e `scripts/_unanswered.mjs` — exploratórios descartáveis.

**Por quê deixar de fora:** MCP é protocolo stdio para orquestração Claude→API. O ERP expõe REST próprio e persiste no Postgres; transporte é incompatível. Reescrever HTTP client em NestJS-style (`HttpService` + retries configuráveis + `Logger` + `ConfigService`) é mais barato que forçar adaptação.

---

## Handshakes com a squad

### Rafael Moreira (K2-1/K2-2 — `kommo-api-client/`)

- **Pronto para reusar:** porte o algoritmo de `normalizeListResponse` + `extractEmbedded` (HAL+JSON) da pasta externa para `mundial-erp-api/src/modules/kommo-api-client/kommo-api-client.service.ts`.
- **Mensagens de erro HTTP:** adaptar `KommoApiError.friendlyMessage()` para logs estruturados (não para resposta usuário final, que é lançada via `InternalServerErrorException`). Útil para observabilidade.
- **OAuth:** pasta externa **só usa long-lived token** (`KOMMO_ACCESS_TOKEN` env + `Authorization: Bearer`). **Não há OAuth2 pronto** — você terá que implementar do zero (ADR-004 §8.1). Porém o formato `Authorization: Bearer ${token}` já é o mesmo para OAuth → pode compartilhar o mesmo `request()` privado.
- **Rate limit 7 req/s** (CLAUDE.md §Rules#7): informa o orçamento para `kommo-rate-limiter.service.ts`.

### Larissa (K1-2 — `prisma/schema.prisma` + Migration `kommo_foundations`)

- **Campos de domínio já documentados** nos schemas Zod (pasta externa). Principais referências:
  - `leads.ts` → `KommoLead`: `name`, `price`, `pipeline_id`, `status_id`, `responsible_user_id`, `custom_fields_values[]`, tags, `_embedded.contacts[]`, `_embedded.companies[]`, `loss_reason_id`, `created_at`, `updated_at`.
  - `chats.ts` → `KommoConversation`/`KommoMessage`: `conversation_id`, `user.id/name/phone/email`, `message.type` (`text|file|picture|video|voice|sticker`), `delivery_status` (`sent|delivered|read|error`).
  - `webhooks.ts` → lista de eventos aceitos (`settings: array<string>`) — alinhar com §4.1 do plano.
- Campos datetime vêm do Kommo como **unix timestamp em segundos** (ver `scripts/_first_message.mjs`: `Math.floor(date.getTime()/1000)`). Definir mapeamento no repository layer (Larissa decide tipo em Prisma: provavelmente `DateTime` e converter no mapper).

### Carolina Bastos (testes E2E, fixtures)

- **Formato de payloads Kommo documentado** nos schemas Zod — use como referência canônica ao montar fixtures dummy futuros.
- `scripts/_first_message.mjs` mostra resposta real do endpoint `/events` (campos `type`, `created_at`, filtro por faixa de tempo). Útil para montar fixture de backfill.
- **Queues stubadas** desta rodada (`QUEUE_KOMMO_WEBHOOKS`, `QUEUE_KOMMO_BACKFILL`) estão prontas para ser mockadas em testes E2E quando K2-3 chegar.

---

## Status da exploração

- Pasta `C:\Users\USER\Documents\agents\kommo` **existe e é acessível** via `Glob`/`Read`/`Bash` (é working-dir adicional listada no prompt).
- Subpastas `.claude/skills/` **não inspecionadas em profundidade** — baixa prioridade nesta rodada.
- `mcp-server/dist/` e `mcp-server/node_modules/` **ignorados** intencionalmente (artefatos).
- **Sem mudanças** feitas na pasta externa (read-only).

---

## Próximos passos (rodadas futuras)

1. **Rafael (K2-1):** copiar algoritmo HAL normalizer de `kommo-client.ts` para o `KommoApiClient` do ERP. Documentar divergências (NestJS style + ConfigService + token rotation).
2. **Larissa (K1-2):** tabela cruzada "campo Kommo → coluna Prisma" usando schemas Zod como fonte.
3. **Mateus (K2-3, próxima rodada):** implementar 9 handlers em `kommo-workers/handlers/` consumindo tipos derivados dos schemas Zod (ou types Prisma gerados após Larissa).
4. **Carolina:** extrair 1 payload real de cada tipo (via MCP existente ou CLAUDE.md) para fixtures `*.fixture.ts` no ERP.
