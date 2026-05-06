# RFC tasks-006 — Endpoint `/metrics` Prometheus + adapters

**Status:** Aprovada (implementada na Sprint 5 TTT-050).
**Autor:** Claude (sob direção Samuel).
**Data:** 2026-05-06.
**Referência:** PLANO-TASK-TYPES-TEMPLATES.md §"Sprint 5".

---

## Contexto

Sprint 5 TTT-050 do PLANO-TASK-TYPES-TEMPLATES.md exige dashboard Grafana com métricas das features novas (`custom_fields_written_total`, `task_type_templates_instantiated_total`, cache hit/miss, redis errors). Auditoria revelou que **o projeto não tem instrumentação Prometheus** — `prom-client` não estava instalado, sem endpoint `/metrics`, e os arquivos `*.metrics.ts` em `custom-fields/` e `task-type-templates/` eram stubs `Noop` que nunca emitiam.

Sem essa decisão, o dashboard JSON criado no TTT-050 ficaria aspiracional (igual aos painéis 1-4 pré-existentes que referenciam `http_request_duration_seconds_*` sem ninguém emitir).

## Problema

Como expor métricas das features Pedido/Requisição em produção de forma:
- **Segura** (não vazar interno acidentalmente em deploy mal configurado)
- **Reversível** (fácil desligar se algo quebrar)
- **Padrão** (Prometheus text format `0.0.4` para qualquer scraper consumir)
- **Sem invasão** (não regredir os módulos consumidores)

## Opções consideradas

### A — `prom-client` + endpoint dedicado `/metrics` (escolhida)

- Adicionar `prom-client@15.1.3` como runtime dep
- Criar `MetricsModule` global com `Registry()` singleton (DI token `PROM_REGISTRY`)
- `MetricsController` com `GET /metrics` `@Public()` + auth Bearer (`METRICS_TOKEN`)
- Adapters `PrometheusCustomFieldsMetrics` e `PrometheusTaskTypeTemplatesMetrics` registram contadores no registry
- Factory provider escolhe Prom ou Noop baseado em `METRICS_TOKEN` setado

**Prós:** padrão da indústria, baixo overhead (~50kb dep), reversível (factory volta pra Noop), funciona com Grafana existente.
**Contras:** +1 dep runtime, +endpoint a proteger.

### B — OpenTelemetry SDK + collector externo

- Adicionar `@opentelemetry/sdk-node` + autoinstrumentation
- Push pra collector OTel que reexporta pra Prometheus

**Prós:** padrão emergente, mais features (traces, logs).
**Contras:** muito mais complexo (10+ pacotes), runtime overhead maior, exige collector na infra (ainda não existe), curva de aprendizado.

### C — Push para Pushgateway

- Manter os contadores em memória (estilo `kommo-metrics.service.ts` existente) e fazer push periódico

**Prós:** sem endpoint a proteger.
**Contras:** Pushgateway é antipattern do próprio Prometheus (recomendam só pra batch jobs); state em memória perde dados em restart; precisa cron interno.

## Decisão

**Opção A.** Razões:

1. **Simplicidade radical (agent-cto):** `prom-client` é boring/battle-tested há 10+ anos. Receita conhecida.
2. **Funciona com infra atual:** projeto já roda Grafana, falta só o scraper apontar pra `/metrics`.
3. **Reversível:** fechar `METRICS_TOKEN` em env desliga emissão sem deploy (factory cai pra Noop).
4. **Sem invasão dos módulos:** consumidores (services) injetam por interface estável (`CustomFieldsMetrics`, `TaskTypeTemplatesMetrics`) — adapter Prom respeita o contrato Noop existente.
5. **Auditável:** payload textual em `/metrics` é fácil de inspecionar manualmente e versionar em alertas.

## Impacto

**Backend:**
- `package.json` API: `prom-client@15.1.3` (~50kb)
- `src/common/metrics/` — novo módulo global (3 arquivos: tokens, module, controller)
- `src/modules/custom-fields/` — token `CUSTOM_FIELDS_METRICS` + adapter Prom + factory + injection nos 2 services de write
- `src/modules/task-type-templates/` — adapter Prom + factory; export do token TTT-050
- `src/modules/tasks/tasks.service.ts` — injeção `@Optional()` do token + chamada `templatesInstantiatedTotal` pós-commit do `create`
- `env.validation.ts` — `METRICS_TOKEN: optional` em dev/test, **obrigatório em production** via `superRefine`
- `main.ts` — `metrics` no `setGlobalPrefix.exclude` (convenção Prometheus de raspar na raiz)

**Segurança (agent-cto §"Seguranca"):**
- `@Public()` para pular `JwtAuthGuard` global
- Auth via Bearer token (`METRICS_TOKEN` >= 16 chars) com `timingSafeEqual` para evitar timing attacks
- Sem token = 503 (`metrics disabled`) — fail safe
- Token inválido = 401 (não diferencia "errado" de "missing")
- Throttler global (100 req/min) cobre o endpoint

**Observabilidade:**
- 5 contadores hoje: `custom_fields_written_total{field_type, workspace_id}`, `task_type_templates_instantiated_total{custom_type_id, workspace_id}`, `task_type_templates_cache_hit_total`, `task_type_templates_cache_miss_total{reason}`, `task_type_templates_redis_error_total{operation}`
- 4 painéis novos no `tasks-feature.dashboard.json`

## Rollout

1. Deploy com `METRICS_TOKEN` vazio → endpoint 503, adapters Noop, dashboard sem dados (estado atual seguro)
2. Operador gera `openssl rand -hex 32`, configura `METRICS_TOKEN` no Coolify, redeploy
3. Configura scraper Prometheus com header `Authorization: Bearer <token>`
4. Dashboard começa a mostrar séries

Se algo der errado: limpar `METRICS_TOKEN` e redeploy → endpoint 503, sistema volta ao estado anterior. Zero migration, zero data loss.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Token vazado expõe métricas internas | Geração aleatória; rotação via env (Coolify); sem logging do header |
| `inc()` falha e quebra request | Try/catch defensivo no adapter (`logger.warn` + segue) |
| Cardinalidade explosiva no `workspace_id` | Mundial tem ~5 workspaces hoje; revisar se passar de 100 (alerta) |
| Adapter NoOp em prod sem operador notar | `superRefine` falha boot em `NODE_ENV=production` sem `METRICS_TOKEN` |
| Endpoint `/metrics` raspado por bot | ThrottlerGuard 100/min + Bearer token suficiente |

## Consequências

**Ganhamos:**
- Observabilidade real das features Pedido/Requisição (exige isso pra rollout escalonado de TTT-052)
- Padrão estabelecido para futuras features adicionarem métricas via mesmo template
- Endpoint `/metrics` reusável por qualquer outra métrica que squad precisar

**Perdemos:**
- +1 dep runtime (prom-client)
- +1 superfície de auth pra manter
- Operador precisa lembrar de setar `METRICS_TOKEN` e configurar scraper antes do canary

## Itens em aberto (não bloqueiam aprovação)

- Endpoint `/health/ready` ainda não checa `Registry` — não relevante.
- Métricas RED pré-existentes (`http_request_duration_seconds_*`) continuam aspiracionais — RFC futura para instrumentar interceptor.
- Adicionar `collectDefaultMetrics` (CPU/heap Node) — não inclui agora pra payload enxuto.
