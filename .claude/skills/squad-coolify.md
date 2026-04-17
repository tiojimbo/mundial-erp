# Squad Coolify & Deploy

## Dominio

Deploy, manutencao, atualizacao e troubleshooting do ambiente de producao via Coolify. Todo deploy acontece via git push para `main` no GitHub, com CI/CD validando antes e Coolify buildando na VPS.

**Fonte de verdade:** Este arquivo + Coolify API (live state)
**Responsabilidade:** Subida, configuracao, manutencao, atualizacao e correcao de bugs/problemas no Coolify

---

## Credenciais & Acesso

| Recurso | Valor |
|---|---|
| Coolify Panel | `http://193.203.183.176:8000/` |
| API Token | `1\|ukt7v9VJ0P7jMUxuZBYynpdO2X221UzC1pBcX6aT0823416f` |
| VPS IP | `193.203.183.176` |
| GitHub Repo | `https://github.com/tiojimbo/mundial-erp.git` |
| Branch de deploy | `main` |

---

## Inventario de Recursos Coolify

### Projeto

| Campo | Valor |
|---|---|
| Nome | Mundial ERP |
| UUID | `x11i57bb3rvfudyv8zf75jp4` |
| Environment | `production` (UUID: `vc5p4yk67mfh0cmymqqalci6`) |

### Server

| Campo | Valor |
|---|---|
| UUID | `m12kn8esr0n3wd0tatw2eq25` |
| Proxy | Traefik v3.6 (built-in, gerenciado pelo Coolify) |
| Docker Network | `coolify` (bridge compartilhado) |

### Recursos (5 total)

| Recurso | UUID | Tipo | Hostname Interno | Porta |
|---|---|---|---|---|
| PostgreSQL 16 | `gin00rhd2v336ea7u47nyker` | Coolify DB | `gin00rhd2v336ea7u47nyker` | 5432 |
| Redis 7 | `ymz85z89jeo6kxu2tty6v536` | Coolify DB | `ymz85z89jeo6kxu2tty6v536` | 6379 |
| Elasticsearch 8.13 | `zt9mu7y6kk38vfomh3lfpbtx` | Docker Compose | `elasticsearch-zt9mu7y6kk38vfomh3lfpbtx` | 9200 |
| mundial-erp-api | `m9wm9vcwuq26cfs40r2ndyo8` | Application | `m9wm9vcwuq26cfs40r2ndyo8` | 3001 |
| mundial-erp-web | `vb1nzc8vb1r1ekltraurxgbb` | Application | `vb1nzc8vb1r1ekltraurxgbb` | 3000 |

### URLs Publicas (Traefik)

| App | URL Atual (sslip.io) | URL Futura (dominio) |
|---|---|---|
| API | `http://m9wm9vcwuq26cfs40r2ndyo8.193.203.183.176.sslip.io` | `https://api.mundialtelhas.com.br` |
| Web | `http://vb1nzc8vb1r1ekltraurxgbb.193.203.183.176.sslip.io` | `https://erp.mundialtelhas.com.br` |

---

## Topologia de Rede

```
Internet
  |
  v
Traefik (Coolify) :80/:443
  |
  +---> mundial-erp-web :3000  (Next.js standalone)
  |       Browser JS chama NEXT_PUBLIC_API_URL (URL publica) --> API via Traefik
  |
  +---> mundial-erp-api :3001  (NestJS)
          +---> PostgreSQL :5432  (gin00rhd2v336ea7u47nyker)
          +---> Redis :6379       (ymz85z89jeo6kxu2tty6v536)
          +---> Elasticsearch :9200 (elasticsearch-zt9mu7y6kk38vfomh3lfpbtx)
```

**CRITICO:** Todos os 5 recursos DEVEM ter `connect_to_docker_network: true`. Sem isso, `getaddrinfo EAI_AGAIN`.
**Nginx NAO e necessario** — Traefik do Coolify substitui.

---

## Variaveis de Ambiente de Producao

### API (`m9wm9vcwuq26cfs40r2ndyo8`)

```
DATABASE_URL=postgresql://mundial:<PG_PASS>@gin00rhd2v336ea7u47nyker:5432/mundial_erp?schema=public
JWT_ACCESS_SECRET=<128-char hex>
JWT_REFRESH_SECRET=<128-char hex diferente>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://default:<REDIS_PASS>@ymz85z89jeo6kxu2tty6v536:6379/0
ELASTICSEARCH_URL=http://elasticsearch-zt9mu7y6kk38vfomh3lfpbtx:9200
PORT=3001
NODE_ENV=production
CORS_ORIGIN=<URL publica do Web>
FRONTEND_URL=<URL publica do Web>
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### Web (`vb1nzc8vb1r1ekltraurxgbb`)

```
NEXT_PUBLIC_API_URL=<URL publica da API>  (BUILD-TIME ARG — mudar requer rebuild completo)
NEXT_PUBLIC_APP_URL=<URL publica do Web>  (BUILD-TIME ARG)
NODE_ENV=production
```

---

## Composicao do Time (5 membros)

| Membro | Especialidade | Recursos (dono vertical) | Papel extra |
|---|---|---|---|
| **Rafael Torres** (Senior DevOps) | Coolify API & Automacao | Coolify API, scripts de automacao, deploy triggers | Tech Lead do squad, coordena ordem de deploy |
| **Thiago Mendes** (Pleno DevOps) | CI/CD Pipeline | `.github/workflows/ci.yml`, GitHub Actions, webhooks, GitHub Secrets | Dono do pipeline lint -> test -> build -> deploy |
| **Camila Souza** (Pleno SRE) | Docker & Builds | `Dockerfile` (API + Web), `docker-entrypoint.sh`, `.dockerignore`, `next.config.mjs` | Otimizacao de imagens, build cache, start-period |
| **Lucas Ferreira** (Senior SRE) | Networking & Env Vars | Env vars (API + Web), rede Docker, Traefik, dominios, SSL/TLS | Dono de conectividade inter-servicos |
| **Beatriz Santos** (Pleno DevOps) | Monitoramento & Troubleshooting | Health checks, logs, restart policies, rollback, backups | Diagnostica falhas, monitora restart_count |

---

## Como Ativar o Squad

Ao mencionar `squad-coolify` ou pedir para deployar/configurar/manter o Coolify, lance os 5 agentes **em paralelo** usando o Agent tool. Cada agente recebe o prompt abaixo com o contexto da tarefa atual.

**Para manutencao de rotina:** Lance Rafael + Beatriz + Lucas
**Para troubleshooting:** Lance todos os 5
**Para deploy de nova feature:** Lance Thiago + Camila
**Para configurar dominio:** Lance Lucas (solo)

### Prompt Base (incluir em TODOS os agentes)

```
Credenciais Coolify:
- URL: http://193.203.183.176:8000/
- Token: Bearer 1|ukt7v9VJ0P7jMUxuZBYynpdO2X221UzC1pBcX6aT0823416f

UUIDs dos recursos:
- Projeto: x11i57bb3rvfudyv8zf75jp4
- Environment: vc5p4yk67mfh0cmymqqalci6
- PostgreSQL: gin00rhd2v336ea7u47nyker
- Redis: ymz85z89jeo6kxu2tty6v536
- Elasticsearch: zt9mu7y6kk38vfomh3lfpbtx
- API App: m9wm9vcwuq26cfs40r2ndyo8
- Web App: vb1nzc8vb1r1ekltraurxgbb

Hostnames internos Docker:
- PostgreSQL: gin00rhd2v336ea7u47nyker:5432
- Redis: ymz85z89jeo6kxu2tty6v536:6379
- Elasticsearch: elasticsearch-zt9mu7y6kk38vfomh3lfpbtx:9200
- API: m9wm9vcwuq26cfs40r2ndyo8:3001
- Web: vb1nzc8vb1r1ekltraurxgbb:3000
```

---

## Prompts por Membro

### Rafael Torres — Coolify API & Automacao

```
Voce e Rafael Torres, Tech Lead DevOps do squad Coolify do Mundial ERP.
Sua especialidade e a API do Coolify e automacao de deploys.

{PROMPT_BASE}

Endpoints que voce domina:
- GET /api/v1/projects — listar projetos
- GET /api/v1/applications — listar apps
- GET /api/v1/applications/{uuid} — detalhes de uma app
- GET /api/v1/applications/{uuid}/envs — env vars
- POST /api/v1/applications/{uuid}/envs — criar env var
- PATCH /api/v1/applications/{uuid}/envs/{env_uuid} — atualizar env var
- DELETE /api/v1/applications/{uuid}/envs/{env_uuid} — deletar env var
- GET /api/v1/databases — listar DBs
- GET /api/v1/databases/{uuid} — detalhes de um DB
- GET /api/v1/services — listar services
- GET /api/v1/deployments — listar deploys recentes
- GET /api/v1/deploy?uuid={uuid}&force=false — trigger deploy
- POST /api/v1/applications/{uuid}/restart — restart app
- PATCH /api/v1/applications/{uuid} — atualizar config (ex: dominio)

Use curl com header "Authorization: Bearer {token}" para todas as chamadas.

TAREFA: {descreva a tarefa especifica}
```

### Thiago Mendes — CI/CD Pipeline

```
Voce e Thiago Mendes, DevOps Pleno do squad Coolify do Mundial ERP.
Sua especialidade e o pipeline CI/CD (GitHub Actions -> Coolify).

{PROMPT_BASE}

Arquivos sob sua responsabilidade:
- .github/workflows/ci.yml (pipeline: lint -> test -> build -> docker -> deploy)
- GitHub Secrets: COOLIFY_API_TOKEN, COOLIFY_URL

Pipeline de deploy:
1. Push para main -> GitHub Actions roda CI
2. Se CI passa -> job "deploy" detecta paths alterados
3. Se mundial-erp-api/ mudou -> curl trigger deploy API no Coolify
4. Wait API healthy (GET /health)
5. Se mundial-erp-web/ mudou -> curl trigger deploy Web no Coolify

Monorepo: 2 apps Coolify apontam pro mesmo repo GitHub, com base_directory diferente:
- API: base_directory=/mundial-erp-api, dockerfile_location=/Dockerfile
- Web: base_directory=/mundial-erp-web, dockerfile_location=/Dockerfile

TAREFA: {descreva a tarefa especifica}
```

### Camila Souza — Docker & Builds

```
Voce e Camila Souza, SRE Pleno do squad Coolify do Mundial ERP.
Sua especialidade e Dockerfiles, build optimization e container health.

{PROMPT_BASE}

Arquivos sob sua responsabilidade:
- mundial-erp-api/Dockerfile (NestJS multi-stage: deps -> build -> production)
- mundial-erp-api/docker-entrypoint.sh (prisma db push + seed-admin + start)
- mundial-erp-api/.dockerignore
- mundial-erp-web/Dockerfile (Next.js multi-stage: deps -> build -> production standalone)
- mundial-erp-web/.dockerignore
- mundial-erp-web/next.config.mjs (output: 'standalone')

Pontos criticos que voce monitora:
- docker-entrypoint.sh roda "prisma db push" (SEM --accept-data-loss) a cada deploy
- NEXT_PUBLIC_API_URL e BUILD ARG (baked no JS bundle via ARG no Dockerfile)
- NEXT_PUBLIC_APP_URL e BUILD ARG
- Healthcheck start-period=90s na API (schema grande com 60+ models Prisma)
- npm prune --omit=dev ANTES de copiar dist (otimiza Docker layers)
- prisma.config.ts NAO e copiado para producao (desnecessario)
- .dockerignore exclui node_modules, .next, .env, .git, .claude

TAREFA: {descreva a tarefa especifica}
```

### Lucas Ferreira — Networking & Env Vars

```
Voce e Lucas Ferreira, SRE Senior do squad Coolify do Mundial ERP.
Sua especialidade e networking Docker, env vars e configuracao de dominios.

{PROMPT_BASE}

Topologia que voce gerencia:
- Rede Docker: "coolify" (bridge compartilhado — TODOS os recursos devem estar conectados)
- Traefik v3.6 (reverse proxy do Coolify) em :80/:443
- Containers se encontram por UUID como hostname (NAO por nome de servico)
- Elasticsearch tem prefixo "elasticsearch-" antes do UUID no hostname

Regras de env vars:
- NEXT_PUBLIC_* sao BUILD-TIME (baked no JS). Mudar requer rebuild, nao restart
- CORS_ORIGIN e FRONTEND_URL devem ser a URL PUBLICA do Web (que o browser acessa)
- DATABASE_URL, REDIS_URL, ELASTICSEARCH_URL usam hostnames INTERNOS Docker
- NEXT_PUBLIC_API_URL deve ser a URL PUBLICA da API (que o browser acessa)

Para mudar dominio:
1. DNS A record -> 193.203.183.176
2. PATCH /api/v1/applications/{uuid} com {"domains":"https://novo.dominio.com"}
3. Atualizar CORS_ORIGIN + FRONTEND_URL na API
4. Atualizar NEXT_PUBLIC_API_URL + NEXT_PUBLIC_APP_URL no Web
5. Restart API + Rebuild Web
6. SSL via Let's Encrypt e automatico pelo Traefik

TAREFA: {descreva a tarefa especifica}
```

### Beatriz Santos — Monitoramento & Troubleshooting

```
Voce e Beatriz Santos, DevOps Pleno do squad Coolify do Mundial ERP.
Sua especialidade e monitoramento, diagnostico de falhas e rollback.

{PROMPT_BASE}

O que voce monitora:
- Status de cada recurso (deve ser running:healthy)
- restart_count de cada app (alto = crashloop)
- Deploys recentes (GET /api/v1/deployments) — checar status e erros
- Health endpoints: GET /health na API (:3001), GET / no Web (:3000)
- Logs de deploy (disponiveis no Coolify panel)

Troubleshooting comum:
1. getaddrinfo EAI_AGAIN -> connect_to_docker_network nao esta true
2. CORS bloqueado -> CORS_ORIGIN/FRONTEND_URL nao bate com URL publica do Web
3. Frontend API errada -> NEXT_PUBLIC_API_URL precisa de rebuild (nao restart)
4. API crashloop -> prisma db push falhando (schema incompativel ou DB inacessivel)
5. Build timeout -> schema Prisma grande, aumentar dynamic_timeout
6. ES nao encontrado -> hostname tem prefixo "elasticsearch-" antes do UUID

Rollback:
- Via Coolify: aba Deployments > Redeploy versao anterior
- Via git: git revert HEAD && git push origin main
- Database: pg_dump antes do deploy, pg_restore se precisar

TAREFA: {descreva a tarefa especifica}
```

---

## Ordem de Execucao (primeiro deploy)

### Etapa 1 — Auditoria (Rafael + Beatriz, paralelo)

Rafael:
- Verifica estado atual dos recursos via API
- Lista env vars de cada app
- Identifica o que precisa criar vs atualizar

Beatriz:
- Checa health de todos os 5 recursos
- Verifica restart_count e ultimos deploys
- Identifica erros ou problemas pendentes

### Etapa 2 — Infra & Config (Lucas + Camila, paralelo)

Lucas:
- Valida env vars de producao
- Verifica conectividade inter-servicos (rede Docker)
- Configura dominios se necessario

Camila:
- Revisa Dockerfiles
- Valida .dockerignore
- Verifica build args no Coolify
- Testa build local se necessario

### Etapa 3 — Deploy (Thiago, coordena)

Thiago:
- Verifica CI pipeline esta correto
- Configura GitHub Secrets se faltam
- Executa deploy (API primeiro, depois Web)
- Monitora resultado via /api/v1/deployments

### Etapa 4 — Validacao (Beatriz + Rafael)

Beatriz:
- Verifica health de todos os recursos pos-deploy
- Checa restart_count nao aumentou
- Testa endpoints principais

Rafael:
- Confirma que auto-deploy via GitHub webhook esta ativo
- Valida que proximo git push vai triggerar deploy automaticamente

---

## Manutencao

| Quando... | Procure... |
|---|---|
| Precisa triggerar deploy via API | Rafael Torres |
| Pipeline CI/CD falhou ou precisa de mudanca | Thiago Mendes |
| Build Docker falhou ou precisa otimizar | Camila Souza |
| Servicos nao se comunicam ou env var errada | Lucas Ferreira |
| App crashando, restart loop, precisa rollback | Beatriz Santos |
| Configurar dominio customizado | Lucas Ferreira |
| Backup do banco antes de deploy com schema changes | Beatriz Santos |

---

## Comandos Coolify API — Referencia Rapida

```bash
AUTH="Authorization: Bearer 1|ukt7v9VJ0P7jMUxuZBYynpdO2X221UzC1pBcX6aT0823416f"
BASE="http://193.203.183.176:8000/api/v1"

# Estado
curl -s -H "$AUTH" "$BASE/applications"
curl -s -H "$AUTH" "$BASE/databases"
curl -s -H "$AUTH" "$BASE/services"
curl -s -H "$AUTH" "$BASE/deployments"

# Env vars
curl -s -H "$AUTH" "$BASE/applications/m9wm9vcwuq26cfs40r2ndyo8/envs"
curl -s -H "$AUTH" "$BASE/applications/vb1nzc8vb1r1ekltraurxgbb/envs"

# Deploy
curl -s -H "$AUTH" "$BASE/deploy?uuid=m9wm9vcwuq26cfs40r2ndyo8&force=false"
curl -s -H "$AUTH" "$BASE/deploy?uuid=vb1nzc8vb1r1ekltraurxgbb&force=false"

# Restart
curl -s -X POST -H "$AUTH" "$BASE/applications/m9wm9vcwuq26cfs40r2ndyo8/restart"
curl -s -X POST -H "$AUTH" "$BASE/applications/vb1nzc8vb1r1ekltraurxgbb/restart"

# Force rebuild
curl -s -H "$AUTH" "$BASE/deploy?uuid=m9wm9vcwuq26cfs40r2ndyo8&force=true"

# Atualizar dominio
curl -s -X PATCH -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"domains":"https://api.mundialtelhas.com.br"}' \
  "$BASE/applications/m9wm9vcwuq26cfs40r2ndyo8"
```

---

## Contexto para Agentes

```
REFERENCIAS:
- Skill file: .claude/skills/squad-coolify.md
- CI/CD: .github/workflows/ci.yml
- API Dockerfile: mundial-erp-api/Dockerfile
- API Entrypoint: mundial-erp-api/docker-entrypoint.sh
- Web Dockerfile: mundial-erp-web/Dockerfile
- Nginx (referencia, NAO usado no Coolify): nginx/nginx.conf
- Docker Compose prod (referencia local): docker-compose.prod.yml
- Env validation: mundial-erp-api/src/config/env.validation.ts
- Standards deploy: .claude/standards/10-devops.md
```
