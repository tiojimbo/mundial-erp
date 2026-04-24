# Performance tests — Tasks feature

## Objetivo

Validar os SLIs definidos em `PLANO-TASKS.md` §1.3:

| SLI                        | Alvo             |
| -------------------------- | ---------------- |
| `GET /tasks` p95           | < 500 ms (50k)   |
| `GET /tasks/:id` p95       | < 300 ms         |
| Queries Prisma por request | <= 10 (budget)   |
| Error rate                 | < 0.1%           |

## Pre-requisitos

- k6 instalado (`choco install k6` / `brew install k6` / binario standalone).
- API rodando em `BASE_URL` (default `http://localhost:3001`).
- Token JWT valido com workspace selecionado via `POST /workspaces/:id/select`.
- Fixture populada no workspace do token.

## Fixture de 50k tasks

**Status: TODO Sprint 1 (owner Diego).** Criar script `prisma/seed-tasks-perf.ts`
que:

1. Cria 1 workspace dedicado `perf-tasks`.
2. Cria 10 processos LIST.
3. Distribui `FIXTURE_SIZE` WorkItems entre os processos (5k por processo default).
4. 20% com `dueDate` vencida, 20% com `dueDate` futura, 60% sem `dueDate`.
5. Output: `{ workspaceId, token, sampleTaskId }` em stdout JSON para consumo do k6.

Ate existir, rode apenas o smoke test com fixture menor (ver abaixo).

## Como rodar

### Smoke (CI — thresholds relaxados)

```bash
# 100 tasks, 1 minuto, budget de queries nao enforced
FIXTURE_SIZE=100 \
  BASE_URL=http://localhost:3001 \
  K6_TOKEN=<jwt> \
  SAMPLE_TASK_ID=<task_id> \
  k6 run --duration 1m --vus 10 test/perf/tasks.k6.js
```

### Full (nightly — 50k fixture)

```bash
FIXTURE_SIZE=50000 \
  BASE_URL=https://staging.mundial.internal \
  K6_TOKEN=<jwt> \
  SAMPLE_TASK_ID=<task_id> \
  k6 run test/perf/tasks.k6.js
```

### Gerar fixture (apos Sprint 1)

```bash
npm run seed:tasks-perf -- --size=50000 --workspace=perf-tasks
```

## Custom metrics

- `tasks_list_latency_ms` — Trend, p95 esperado < 500ms.
- `tasks_detail_latency_ms` — Trend, p95 esperado < 300ms.
- `prisma_query_count` — Counter. Alimentado pelo header `X-DB-Query-Count`.
  **TODO Sprint 1 (Felipe):** middleware ainda nao existe; check retorna
  true quando header esta ausente. Apos implementar, mover threshold
  `prisma_query_count: ['count<=10']` do comentario para ativo.

## Interpretando resultado

- `checks` deve ser 100% para o smoke gate passar.
- `http_req_duration{endpoint:list} p95` violado => regressao de query ou
  indice faltando.
- `http_req_failed rate >= 1%` => investigar logs no request-id.

## Proximos passos (pos Sprint 1)

- Integrar com k6 Cloud (`--out cloud`) para historico/comparativo.
- Adicionar cenarios de write (POST /tasks, PATCH /tasks/:id).
- Cenario especifico para `GET /tasks/:id` com 50+ watchers/comments.
