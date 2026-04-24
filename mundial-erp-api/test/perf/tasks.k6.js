/**
 * k6 perf scenario — Tasks feature (PLANO-TASKS §14.1 + §1.3).
 *
 * Alvo: validar SLIs contra fixture de 50k tasks antes de liberar feature
 * flag por workspace. CI roda versao smoke (100 tasks, thresholds relaxados);
 * suite completa roda noturna no runner dedicado via
 * `scripts/run-k6-nightly.sh`.
 *
 * .js em vez de .ts — o runtime k6 e xk6/Goja, nao Node. Mantemos fora do
 * `tsc --noEmit` e instalamos `@types/k6` apenas se futuramente optarmos por
 * TypeScript transpilado com `k6 run --compatibility-mode=base`.
 *
 * Execucao:
 *   BASE_URL=https://api.staging.mundial-erp.io \
 *   AUTH_TOKEN=<jwt-with-ws> \
 *   SAMPLE_TASK_ID=<uuid> \
 *   FIXTURE_SIZE=50000 \
 *   k6 run --summary-export=summary.json tasks.k6.js
 *
 * Cenarios:
 *   - list_tasks         GET /tasks         10 RPS por 5min   p95 < 500ms
 *   - detail_task        GET /tasks/:id     ramp 1->20 VU 3m  p95 < 300ms
 *   - time_in_status_bulk POST body 100 ids  5 RPS por 2min   p95 < 500ms
 *   - search_fulltext    GET /tasks?search  3 RPS por 3min    p95 < 800ms
 *   - comments_burst     POST comments      spike 100 RPS 30s  valida 429+outbox
 *
 * Metrica custom `prisma_query_count` via header `X-DB-Query-Count`
 * (middleware Felipe Sprint 1) — threshold < 10 por request.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;
const FIXTURE_SIZE = Number(__ENV.FIXTURE_SIZE || 50000);
const SAMPLE_TASK_ID = __ENV.SAMPLE_TASK_ID;
const SAMPLE_TASK_IDS_CSV = __ENV.SAMPLE_TASK_IDS || '';
const SEARCH_TERMS = (__ENV.SEARCH_TERMS || 'report,invoice,deploy,review,bug')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const TASK_IDS_POOL = SAMPLE_TASK_IDS_CSV
  ? SAMPLE_TASK_IDS_CSV.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : SAMPLE_TASK_ID
    ? [SAMPLE_TASK_ID]
    : [];

const prismaQueryCount = new Counter('prisma_query_count');
const tasksListLatency = new Trend('tasks_list_latency_ms', true);
const tasksDetailLatency = new Trend('tasks_detail_latency_ms', true);
const searchLatency = new Trend('tasks_search_latency_ms', true);
const bulkLatency = new Trend('tasks_bulk_tis_latency_ms', true);
const commentPostLatency = new Trend('tasks_comment_post_latency_ms', true);
const outboxLag = new Trend('outbox_enqueue_latency_ms', true);
const queryBudgetExceeded = new Rate('db_query_budget_exceeded');

export const options = {
  scenarios: {
    list_tasks: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      exec: 'listScenario',
      tags: { scenario: 'list_tasks' },
    },
    detail_task: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 20 },
      ],
      exec: 'detailScenario',
      startTime: '10s',
      tags: { scenario: 'detail_task' },
    },
    time_in_status_bulk: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'bulkTimeInStatusScenario',
      startTime: '20s',
      tags: { scenario: 'time_in_status_bulk' },
    },
    search_fulltext: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 10,
      maxVUs: 25,
      exec: 'searchScenario',
      startTime: '30s',
      tags: { scenario: 'search_fulltext' },
    },
    comments_burst: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: 'commentsBurstScenario',
      startTime: '4m',
      tags: { scenario: 'comments_burst' },
    },
  },
  thresholds: {
    'http_req_duration{endpoint:list}': ['p(95)<500'],
    'http_req_duration{endpoint:detail}': ['p(95)<300'],
    'http_req_duration{endpoint:bulk_tis}': ['p(95)<500'],
    'http_req_duration{endpoint:search}': ['p(95)<800'],
    'http_req_duration{endpoint:comment}': ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
    // Rate limiter deve absorver o burst sem 5xx; 429 ainda conta como failed
    // em k6 default. Ajuste: considerar 429 esperado < 10% no burst.
    'http_req_failed{scenario:comments_burst}': ['rate<0.10'],
    // Budget de queries Prisma — header X-DB-Query-Count < 10 por request.
    db_query_budget_exceeded: ['rate<0.02'],
    'outbox_enqueue_latency_ms': ['p(95)<50'],
  },
};

function authHeaders() {
  if (!AUTH_TOKEN) {
    throw new Error(
      'AUTH_TOKEN env var e obrigatoria (JWT com workspace selecionado).',
    );
  }
  return {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function pickSearchTerm() {
  const idx = Math.floor(Math.random() * SEARCH_TERMS.length);
  return SEARCH_TERMS[idx] || 'task';
}

function pickTaskId() {
  if (TASK_IDS_POOL.length === 0) return null;
  const idx = Math.floor(Math.random() * TASK_IDS_POOL.length);
  return TASK_IDS_POOL[idx];
}

function recordQueryBudget(res) {
  const raw = res.headers['X-Db-Query-Count'];
  if (raw === undefined) return;
  const count = Number(raw);
  prismaQueryCount.add(count);
  queryBudgetExceeded.add(count > 10);
}

/**
 * Cenario: list_tasks — GET /tasks paginado.
 * SLI alvo: p95 < 500ms em fixture 50k.
 */
export function listScenario() {
  const res = http.get(`${BASE_URL}/api/v1/tasks?limit=50`, {
    headers: authHeaders(),
    tags: { endpoint: 'list' },
  });
  tasksListLatency.add(res.timings.duration);
  recordQueryBudget(res);
  check(res, {
    'list 200': (r) => r.status === 200,
    'list budget <= 10 queries': (r) => {
      const raw = r.headers['X-Db-Query-Count'];
      return raw === undefined || Number(raw) <= 10;
    },
  });
  sleep(0.5);
}

/**
 * Cenario: detail_task — GET /tasks/:id com ramp 1->20 VUs.
 * SLI alvo: p95 < 300ms.
 */
export function detailScenario() {
  const id = pickTaskId();
  if (!id) {
    return;
  }
  const res = http.get(`${BASE_URL}/api/v1/tasks/${id}`, {
    headers: authHeaders(),
    tags: { endpoint: 'detail' },
  });
  tasksDetailLatency.add(res.timings.duration);
  recordQueryBudget(res);
  check(res, {
    'detail 200': (r) => r.status === 200,
    'detail budget <= 10 queries': (r) => {
      const raw = r.headers['X-Db-Query-Count'];
      return raw === undefined || Number(raw) <= 10;
    },
  });
  sleep(0.2);
}

/**
 * Cenario: time_in_status_bulk — POST /tasks/time-in-status/bulk com 100 ids.
 * SLI alvo: p95 < 500ms.
 */
export function bulkTimeInStatusScenario() {
  const ids = [];
  const pool = TASK_IDS_POOL.length > 0 ? TASK_IDS_POOL : [];
  if (pool.length === 0) {
    return;
  }
  for (let i = 0; i < 100; i++) {
    ids.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  const payload = JSON.stringify({ taskIds: ids });
  const res = http.post(
    `${BASE_URL}/api/v1/tasks/time-in-status/bulk`,
    payload,
    { headers: authHeaders(), tags: { endpoint: 'bulk_tis' } },
  );
  bulkLatency.add(res.timings.duration);
  recordQueryBudget(res);
  check(res, {
    'bulk 200': (r) => r.status === 200,
    'bulk budget <= 10 queries': (r) => {
      const raw = r.headers['X-Db-Query-Count'];
      return raw === undefined || Number(raw) <= 10;
    },
  });
}

/**
 * Cenario: search_fulltext — GET /tasks?search=... em fixture 50k.
 * SLI alvo: p95 < 800ms (indice tsvector ativo).
 */
export function searchScenario() {
  const term = pickSearchTerm();
  const res = http.get(
    `${BASE_URL}/api/v1/tasks?search=${encodeURIComponent(term)}&limit=20`,
    {
      headers: authHeaders(),
      tags: { endpoint: 'search' },
    },
  );
  searchLatency.add(res.timings.duration);
  recordQueryBudget(res);
  check(res, {
    'search 200': (r) => r.status === 200,
    'search budget <= 10 queries': (r) => {
      const raw = r.headers['X-Db-Query-Count'];
      return raw === undefined || Number(raw) <= 10;
    },
    'search p95 sanity (< 2s)': (r) => r.timings.duration < 2000,
  });
  sleep(0.3);
}

/**
 * Cenario: comments_burst — POST comments em 100 RPS por 30s.
 * Valida:
 *   - rate limiter absorve sem 5xx (429 aceito ate 10%)
 *   - outbox nao acumula lag (header X-Outbox-Enqueue-Ms p95 < 50ms)
 */
export function commentsBurstScenario() {
  const id = pickTaskId();
  if (!id) {
    return;
  }
  const payload = JSON.stringify({
    body: `perf comment ${__VU}-${__ITER}`,
    bodyBlocks: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: `perf ${__VU}-${__ITER}` }],
      },
    ],
  });
  const res = http.post(
    `${BASE_URL}/api/v1/tasks/${id}/comments`,
    payload,
    { headers: authHeaders(), tags: { endpoint: 'comment' } },
  );
  commentPostLatency.add(res.timings.duration);
  recordQueryBudget(res);
  const outboxHeader = res.headers['X-Outbox-Enqueue-Ms'];
  if (outboxHeader) {
    outboxLag.add(Number(outboxHeader));
  }
  check(res, {
    'comment 201 or 429': (r) => r.status === 201 || r.status === 429,
    'comment nao 5xx': (r) => r.status < 500,
    'outbox lag < 50ms (quando header presente)': (r) => {
      const raw = r.headers['X-Outbox-Enqueue-Ms'];
      return raw === undefined || Number(raw) < 50;
    },
  });
}

// Entry default mantida para compatibilidade (quando roda sem --scenarios).
export default function perfScenario() {
  listScenario();
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(
      {
        fixtureSize: FIXTURE_SIZE,
        timestamp: new Date().toISOString(),
        data,
      },
      null,
      2,
    ),
    'summary.json': JSON.stringify(data, null, 2),
  };
}
