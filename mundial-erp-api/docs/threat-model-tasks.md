# Threat Model — Feature Tasks

> Metodologia: STRIDE + DREAD leve.
> Escopo: modulos `tasks/`, `task-*/`, `custom-task-types/`, `task-outbox/`, `work-items/` e suas dependencias (Prisma, Redis, ClamAV, storage S3, SSE).
> Likelihood / Impact: 1 (baixo) a 5 (critico). Residual = risco apos mitigacao aplicada.
> Owners: Mariana (SecEng) + Tatiana (QA/AppSec). Revisao trimestral.
> Ultima revisao: 2026-04-19. Proxima: 2026-07-19.

## Sumario de riscos

Total de vetores mapeados: 22. Criticos residuais: 0. Altos residuais: 1 (ClamAV bypass — aceito com defesa em profundidade). Medios: 4. Baixos: 17.

## Tabela STRIDE

| # | Asset | Threat | Likelihood | Impact | Mitigation | Residual |
|---|---|---|---|---|---|---|
| 1 | Attachment upload (POST /tasks/:id/attachments) | Attacker envia `.exe` com MIME `image/png` spoofado para bypass de filtro | 4 | 4 | Detecao via magic bytes (file-type lib) + allowlist MIME + extensao + reanalise pos-download; rejeita mismatch com 400 | 1 |
| 2 | Signed URL de download (GET /attachments/:id/signed-url) | URL vaza em log/referer e e reutilizada por terceiro ate expirar | 3 | 3 | TTL de 5 min + single-use nonce assinado HMAC + IP binding opcional + `log.redactUrls=true` no pino; rotacao de secret trimestral | 1 |
| 3 | Comment body (POST /tasks/:id/comments) | Payload markdown com `<script>` ou `javascript:` URL dispara XSS no feed de atividades | 5 | 5 | Sanitizer DOMPurify + allowlist de tags/atributos BlockNote-compat; CSP `script-src 'self'`; testes de fuzz com XSS payload corpus | 1 |
| 4 | Mention (`@user`) em comentario | Attacker menciona userId de outro workspace para forjar notificacao ou ler display name | 3 | 3 | `WorkspaceMembership` check antes de emitir mention-created; retorna 400 se user nao pertence ao ws; filtra mentions desconhecidas no render | 1 |
| 5 | Cross-tenant enum leak | Endpoint vaza `CustomTaskType` ou `TaskTag` de outro workspace via filtro/autocomplete | 4 | 4 | Todos os queries Prisma com `where.workspaceId` obrigatorio via base repository; lint rule `no-raw-workspace-query`; testes e2e de isolamento | 1 |
| 6 | CustomTaskType catalog | Enumeracao de tipos customizados via `GET /custom-task-types` sem auth ws ativa | 3 | 2 | Guard `WorkspaceContextGuard` + JWT claim `ws_id` valida contexto; omite `internal*` fields | 1 |
| 7 | Task dependency graph (POST /tasks/:id/dependencies) | Cadeia longa A->B->C->...->A forca recursao profunda no detector de ciclo (DoS CPU) | 3 | 3 | Detector iterativo com set visited + `maxDepth=64` + early-exit; retorna 409 em ciclo; timeout 500ms | 1 |
| 8 | Task merge (POST /tasks/:id/merge) | Merge concorrente gera corruption de subtasks/comentarios duplicados | 2 | 4 | Lock pessimista Redis `merge:{taskId}` ttl 30s + transacao Prisma serializavel + idempotency key header; rollback em falha | 1 |
| 9 | Task template expansion (POST /tasks/from-template/:id) | Template com 10k subtasks aninhadas trava o request (template bomb) | 3 | 3 | Valida no create: `maxSubtasks=500`, `maxDepth=5`, `maxChecklistItems=200`; expansao assincrona via outbox se > 50 | 1 |
| 10 | Outbox events | Replay de evento apos crash do listener duplica webhook / notificacao | 3 | 2 | `dedupeKey` por evento + UNIQUE `(eventId, listenerName)`; idempotency no handler downstream | 1 |
| 11 | Row Level Security | Query bruta via `$queryRaw` bypassa filtro workspace | 4 | 5 | RLS policy ativa `workspace_id = current_setting('app.workspace_id')`; SET session na conexao Prisma; lint proibe `$queryRaw` sem helper | 1 |
| 12 | Rate limiter | Atacante muda IP/User-Agent para escapar chave de rate-limit | 3 | 3 | Chave composta `userId + workspaceId + endpoint`; redis token bucket; 429 com header `Retry-After` | 1 |
| 13 | Mass assignment | PATCH /tasks/:id com `workspaceId` / `createdById` no body sobrescreve campos sensiveis | 4 | 4 | DTOs class-validator com `whitelist=true` + `forbidNonWhitelisted=true`; blocklist explicito em update | 1 |
| 14 | SSE connection (GET /tasks/:id/events) | User abre 100 conexoes SSE paralelas esgotando sockets do processo | 4 | 4 | Limite `maxConnections=3` por `(userId, taskId)` em Redis; 4a conexao recebe 429; heartbeat 30s; auto-close idle 5min | 1 |
| 15 | Markdown injection no bodyBlocks | Bloco BlockNote custom com `props.src` apontando para `file:///etc/passwd` | 3 | 3 | Parser valida schema JSON de cada block type; allowlist de props; sanitiza URL para `http(s):` apenas | 1 |
| 16 | ClamAV bypass | Arquivo polyglot (zip + pdf) escapa do scan antes de signed URL liberar | 3 | 4 | Scan no upload + scan lazy on-first-download + quarentena por default ate scan-ok; multiplos engines (ClamAV + yara) opcional | 2 |
| 17 | SQL injection via filters | Filtro `?status=XYZ` concatenado em raw SQL | 2 | 5 | Prisma ORM apenas + DTOs validados com enum; proibicao de `$queryRawUnsafe`; CodeQL no CI | 1 |
| 18 | Timing attack em login / task lookup | Resposta mais rapida revela task existente x 404 | 2 | 2 | Resposta 404 constante para nao-existe e sem-permissao; delay randomizado 10-30ms em auth failure | 1 |
| 19 | Session fixation | Token JWT reaproveitado apos logout em outra sessao | 2 | 3 | Blocklist de jti no Redis ate `exp`; rotacao em mudanca de senha; refresh token single-use | 1 |
| 20 | CSRF (cookies httpOnly) | Form em site terceiro aciona PATCH /tasks via cookie de sessao | 3 | 4 | SameSite=Lax default + CSRF double-submit token em writes; CORS allowlist estrito | 1 |
| 21 | NoSQL / Mongo-style injection via filters JSON | `?filter={"$ne": null}` no query string bypassa Prisma where | 2 | 3 | Parser proprio converte filter em AST; rejeita operadores nao-allowlisted; 400 em schema invalido | 1 |
| 22 | CVE em dependencias (Nest, Prisma, zod, clamav-lib) | Exploit publico em dep transitiva | 4 | 4 | `npm audit --production` gate no CI (fail=high); Dependabot weekly; Renovate major; SBOM em cada release | 2 |

## Notas de governanca

- Toda nova rota HTTP em `modules/tasks/**` exige linha adicional nesta tabela antes do merge.
- Revisao trimestral: Mariana + Tatiana revisitam Likelihood/Impact com dados de incidentes do trimestre.
- Mudanca de Residual >= 3 dispara ADR em `.claude/adr/`.
- Mapeamento para PLANO-TASKS §16 (R1..R12): esta tabela substitui a matriz simplificada.
