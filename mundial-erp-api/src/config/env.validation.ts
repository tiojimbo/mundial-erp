import { z } from 'zod';

export const envSchema = z
  .object({
  // Database
  DATABASE_URL: z.string().min(1),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis — supports REDIS_URL (redis://:pass@host:port) or individual vars
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Elasticsearch
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),

  // Pro Finanças
  PRO_FINANCAS_URL: z.string().optional(),
  PRO_FINANCAS_EMAIL: z.string().optional(),
  PRO_FINANCAS_PASSWORD: z.string().optional(),

  // CNPJ Lookup (autopreencher custom-field tipo CNPJ).
  // BrasilAPI primario (sem key) + ReceitaWS fallback. Cache Redis 7d.
  BRASIL_API_TIMEOUT_MS: z.coerce.number().default(4000),
  RECEITA_WS_TIMEOUT_MS: z.coerce.number().default(6000),
  RECEITA_WS_API_KEY: z.string().optional(),
  CNPJ_LOOKUP_CACHE_TTL_SECONDS: z.coerce.number().default(604800),

  // App
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  // Feature Flags
  // Vide ADR-001. Default true desde 2026-04-19 (rollout concluído).
  MULTI_WORKSPACE_ENABLED: z.enum(['true', 'false']).default('true'),

  // Tasks v2 (paridade ClickUp — Sprints 1-7).
  // TASKS_V2_ENABLED=false é kill switch GLOBAL — roteia 404 em /tasks/*.
  // TASKS_V2_DISABLED_WORKSPACES: CSV de workspaceIds opt-out (precedência
  // sobre workspace.settings.tasksV2Enabled). Vide PLANO-TASKS.md §9.1.
  TASKS_V2_ENABLED: z.enum(['true', 'false']).default('true'),
  TASKS_V2_DISABLED_WORKSPACES: z.string().default(''),

  // Tasks SSE (PLANO-TASKS §7.5). Kill switch do endpoint
  // GET /tasks/:taskId/events. Default ON; desligar isoladamente se o
  // barramento SSE apresentar regressao sem precisar desabilitar REST.
  TASKS_SSE_ENABLED: z.coerce.boolean().default(true),

  // Tasks outbox fallback DEV — quando true, TaskOutboxService projeta
  // WorkItemActivity e marca o evento como COMPLETED dentro da mesma
  // $transaction do caller (dispensa Redis/BullMQ). Publicacao SSE continua
  // via bus local (EventEmitter2). Uso APENAS em desenvolvimento local.
  // Em producao deve ser `false` — worker async via Redis e a fonte de
  // verdade (ADR-002).
  TASKS_OUTBOX_SYNC_DEV: z.coerce.boolean().default(false),

  // Kommo integration (PLANO-KOMMO-DASHBOARD §1.2, §18).
  // Kill switch global — 'false' faz o KommoFeatureFlagGuard responder 404
  // em /kommo/* e /webhooks/kommo/* (principio #1 squad-kommo: nao vazar
  // existencia da feature). Default 'false' ate rollout canary concluir.
  // Per-workspace refinement vem depois via workspace.settings/env CSV.
  KOMMO_SYNC_ENABLED: z.enum(['true', 'false']).default('false'),
  KOMMO_DASHBOARD_ENABLED: z.enum(['true', 'false']).default('false'),

  // Credenciais OAuth2 Kommo. Mantidas optional aqui — a validacao "dura"
  // (obrigatorio quando KOMMO_SYNC_ENABLED=true) acontece no boot do
  // KommoApiClient, nao aqui, porque um workspace pode estar disabled e
  // outro habilitado na mesma instancia (multi-tenant).
  KOMMO_CLIENT_ID: z.string().optional(),
  KOMMO_CLIENT_SECRET: z.string().optional(),
  KOMMO_OAUTH_REDIRECT_URI: z.string().url().optional(),

  // CSRF secret usado para assinar o `state` do OAuth (ADR-004 futura).
  // Min 32 chars garante entropia suficiente para HMAC-SHA256.
  KOMMO_CSRF_SECRET: z.string().min(32).optional(),

  // KMS key id para envelope encryption de accessToken/refreshToken/hmacSecret
  // (ADR-006 futura). Em dev/local aceita o placeholder 'local-dev'.
  KOMMO_ENCRYPTION_KEY_ID: z.string().optional(),

  // Master key do envelope encryption Kommo (ADR-006 §2.1).
  // Formato: 32 bytes codificados em base64 (44 chars). Gerar com
  //   `openssl rand -base64 32`
  // Optional no schema (lazy validation) — o `KommoEncryptionService`
  // valida no constructor: feature Kommo wireada sem a chave = boot
  // quebra com mensagem clara. Em dev local, setar no .env; em prod,
  // gerenciar via Coolify env (mesma classe de risco que JWT_*_SECRET).
  KOMMO_ENCRYPTION_KEY: z
    .string()
    .regex(/^[A-Za-z0-9+/]{43}=$/u, {
      message:
        'KOMMO_ENCRYPTION_KEY must be 32 bytes base64-encoded ' +
        '(44 chars incl. padding); generate with `openssl rand -base64 32`',
    })
    .optional(),

  // Seed opt-in para criar o dashboard "Analytics Comercial" no seed do
  // workspace (Debora — seed-workspace.ts). 'false' por default.
  SEED_KOMMO_DASHBOARD: z.enum(['true', 'false']).default('false'),

  // Custom Fields write (PLANO-TASK-TYPES-TEMPLATES Sprint 1 — TTT-013).
  // Kill switch global das rotas de WRITE de definitions/values (POST,
  // PATCH, DELETE). Default `false` ate concluir M1. Quando OFF, o
  // CustomFieldsWriteGuard responde 404 nas rotas write — GET segue
  // disponivel (leitura nao quebra UI). Per-workspace refinement vem
  // depois via workspace.settings caso necessario.
  FEATURE_CUSTOM_FIELDS_WRITE_ENABLED: z.coerce.boolean().default(false),

  // Task Type Templates (PLANO-TASK-TYPES-TEMPLATES Sprint 3 — TTT-033, M2).
  // Kill switch global do modulo de templates 1:1 com CustomTaskType.
  // Default `false` ate concluir M2. Quando OFF, o TaskTypeTemplatesGuard
  // responde 404 em GET /task-type-templates e GET /task-type-templates/:id;
  // tasks.service.create ignora qualquer template e segue fluxo legado
  // (sem instanciar CustomFieldValue automatico). Flag independente da
  // FEATURE_CUSTOM_FIELDS_WRITE_ENABLED para permitir rollback granular
  // por modulo (vide PLANO §Decisoes-Chave D8).
  FEATURE_TASK_TYPE_TEMPLATES_ENABLED: z.coerce.boolean().default(false),

  // Sprint 5 (TTT-050) — Prometheus `/metrics` endpoint.
  // Bearer token exigido para raspar `/metrics`. Em production e exigido
  // (refinement abaixo); em development/test pode ficar vazio — endpoint
  // responde 503 ("metrics disabled") e adapters caem em Noop. Operador
  // gera token aleatorio (>= 32 chars) e configura o scraper com
  // `Authorization: Bearer <token>`.
  METRICS_TOKEN: z.string().min(16).optional(),
  })
  .superRefine((env, ctx) => {
    // Production exige METRICS_TOKEN para evitar deploy sem observabilidade
    // (agent-cto §"Observabilidade — Se Nao Monitora, Nao Existe"). Sem
    // refinement, o app sobe sem token e ninguem percebe ate o primeiro
    // incidente — por isso falhamos boot em prod.
    if (env.NODE_ENV === 'production' && !env.METRICS_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['METRICS_TOKEN'],
        message:
          'METRICS_TOKEN obrigatorio em production (>= 16 chars). ' +
          'Gere com: openssl rand -hex 32',
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(
      `Environment validation failed:\n${JSON.stringify(formatted, null, 2)}`,
    );
  }
  return result.data;
}
