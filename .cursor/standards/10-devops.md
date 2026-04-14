# 10 — DevOps: Docker, Deploy e Infraestrutura

Este documento cobre tudo que voce precisa saber para colocar uma aplicacao Bravy no ar — do container local ao deploy em producao. Se voce nunca mexeu com Docker ou CI/CD, comece do inicio. Se ja manja, pule para a secao que precisa.

---

## 10.1 — O que e Docker?

### A analogia do container de navio

Imagine um porto. Navios chegam carregados de **containers padronizados** — todos do mesmo tamanho, empilhaveis, e nao importa se dentro tem bananas, TVs ou cimento. O guindaste nao precisa saber o que tem dentro para mover.

Docker faz a mesma coisa com software. Voce empacota sua aplicacao, suas dependencias, sua configuracao — tudo dentro de um "container". Esse container roda igual em qualquer lugar: no seu Mac, no Linux do servidor, na maquina do colega.

**Antes do Docker:**
- "Na minha maquina funciona" era desculpa aceita
- Instalar PostgreSQL no Mac era diferente do Linux
- Cada dev tinha versoes diferentes de Node

**Com Docker:**
- Todo mundo roda o mesmo ambiente
- O servidor de producao e identico ao de desenvolvimento
- Subir o projeto inteiro e um comando: `docker compose up`

### Conceitos fundamentais

| Conceito | Analogia | O que e |
|----------|----------|---------|
| **Image** | Receita do bolo | Template read-only com tudo que a aplicacao precisa. Voce nao altera a imagem — cria uma nova versao |
| **Container** | Bolo pronto | Instancia em execucao de uma image. Pode ter varios containers da mesma image |
| **Volume** | Gaveta externa | Armazenamento persistente. Dados que sobrevivem quando o container morre |
| **Network** | Rede de telefones | Canal de comunicacao entre containers. Containers na mesma network se enxergam pelo nome |
| **Dockerfile** | A receita escrita | Arquivo texto com instrucoes passo a passo para construir uma image |
| **Registry** | Estante de receitas | Repositorio de images (Docker Hub, GitHub Container Registry) |

### Comandos essenciais (referencia rapida)

```bash
# Ver containers rodando
docker ps

# Ver TODOS os containers (incluindo parados)
docker ps -a

# Ver images locais
docker images

# Parar um container
docker stop <container_id>

# Remover containers parados, images sem uso, volumes orfaos
docker system prune -a --volumes

# Ver logs de um container
docker logs -f <container_id>

# Entrar dentro de um container
docker exec -it <container_id> sh
```

---

## 10.2 — O que e docker-compose?

### A "receita de containers"

Se o Dockerfile e a receita de **um** prato, o docker-compose e o **cardapio completo do restaurante** — define todos os pratos (servicos), como sao servidos (portas, volumes), e quem depende de quem (depends_on).

Em vez de rodar 5 comandos `docker run` com 20 flags cada, voce escreve um arquivo `docker-compose.yml` e sobe tudo com:

```bash
docker compose up -d
```

### Anatomia basica

```yaml
services:
  api:           # Nome do servico (vira hostname na network)
    build: .     # Onde esta o Dockerfile
    ports:       # Portas expostas (host:container)
      - "3000:3000"
    depends_on:  # Quem precisa estar de pe antes
      - postgres
    environment: # Variaveis de ambiente
      - DATABASE_URL=postgresql://...

  postgres:
    image: postgres:16  # Image pronta do Docker Hub
    volumes:
      - pg_data:/var/lib/postgresql/data  # Dados persistentes

volumes:
  pg_data:  # Declaracao do volume nomeado
```

### Comandos essenciais do compose

```bash
# Subir todos os servicos (em background)
docker compose up -d

# Subir reconstruindo images
docker compose up -d --build

# Parar tudo
docker compose down

# Parar e APAGAR volumes (cuidado: perde dados do banco!)
docker compose down -v

# Ver logs de todos os servicos
docker compose logs -f

# Ver logs de um servico especifico
docker compose logs -f api

# Executar comando dentro de um servico
docker compose exec api sh

# Ver status dos servicos
docker compose ps
```

---

## 10.3 — Dockerfile NestJS (multi-stage)

Multi-stage build reduz o tamanho final da image drasticamente. Em vez de uma image de 1.2GB com devDependencies, voce fica com ~150MB so com o necessario para rodar.

### Dockerfile

```dockerfile
# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts \
    && npx prisma generate

# ============================================================
# Stage 2: Build the application
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ============================================================
# Stage 3: Production image (minimal)
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nestjs \
    && adduser --system --uid 1001 nestjs

COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

RUN chown -R nestjs:nestjs /app

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### .dockerignore (backend)

```dockerignore
node_modules
dist
.git
.gitignore
.env
.env.*
*.md
.vscode
.idea
coverage
test
.eslintrc*
.prettierrc*
tsconfig.tsbuildinfo
docker-compose*.yml
Dockerfile*
.dockerignore
```

### Por que multi-stage?

| Stage | O que faz | O que carrega para o proximo |
|-------|-----------|------------------------------|
| `deps` | Instala node_modules e gera Prisma Client | node_modules com Prisma pronto |
| `build` | Compila TypeScript para JavaScript | Pasta `dist/` compilada |
| `production` | Image final minima | So dist + node_modules de producao |

**Resultado:** A image final nao tem TypeScript, devDependencies, testes, nem codigo-fonte. So o JavaScript compilado e as dependencias de runtime.

---

## 10.4 — Dockerfile Next.js (multi-stage standalone)

O Next.js tem um modo `standalone` que copia somente os arquivos necessarios para rodar, resultando em images muito menores.

### Prerequisito: habilitar standalone no next.config

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

### Dockerfile

```dockerfile
# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts

# ============================================================
# Stage 2: Build the application
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ============================================================
# Stage 3: Production image (minimal)
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nextjs \
    && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public

RUN mkdir .next \
    && chown nextjs:nextjs .next

COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "server.js"]
```

### .dockerignore (frontend)

```dockerignore
node_modules
.next
out
.git
.gitignore
.env
.env.*
*.md
.vscode
.idea
coverage
cypress
e2e
.eslintrc*
.prettierrc*
next-env.d.ts
tsconfig.tsbuildinfo
docker-compose*.yml
Dockerfile*
.dockerignore
```

### Nota sobre variaveis de ambiente no Next.js

Variaveis `NEXT_PUBLIC_*` sao injetadas **em build time** (sao substituidas no JavaScript final). Por isso o Dockerfile usa `ARG` + `ENV`:

```dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

Na hora do build, passe assim:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.bravy.com.br -t bravy-web .
```

Variaveis **sem** o prefixo `NEXT_PUBLIC_` sao de runtime e podem ser passadas via `environment` no compose normalmente.

---

## 10.5 — docker-compose.yml para desenvolvimento

Este e o compose que todo dev usa no dia a dia. Foco em hot-reload, ferramentas de debug e comodidade.

```yaml
version: "3.9"

services:
  # ──────────────────────────────────────────────
  # API — NestJS Backend
  # ──────────────────────────────────────────────
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
      target: deps
    container_name: bravy-api
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debugger
    volumes:
      - ./apps/api/src:/app/src
      - ./apps/api/prisma:/app/prisma
      - api_node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://bravy:bravy_dev_2024@postgres:5432/bravy_dev
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-never-use-in-production
      - JWT_EXPIRATION=1d
      - PORT=3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run start:dev
    networks:
      - bravy-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3

  # ──────────────────────────────────────────────
  # WEB — Next.js Frontend
  # ──────────────────────────────────────────────
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      target: deps
    container_name: bravy-web
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./apps/web/src:/app/src
      - ./apps/web/public:/app/public
      - web_node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXTAUTH_URL=http://localhost:3001
      - NEXTAUTH_SECRET=dev-secret-never-use-in-production
    depends_on:
      api:
        condition: service_healthy
    command: npm run dev
    networks:
      - bravy-network

  # ──────────────────────────────────────────────
  # PostgreSQL
  # ──────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: bravy-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=bravy
      - POSTGRES_PASSWORD=bravy_dev_2024
      - POSTGRES_DB=bravy_dev
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - pg_data:/var/lib/postgresql/data
    networks:
      - bravy-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bravy -d bravy_dev"]
      interval: 10s
      timeout: 5s
      start_period: 10s
      retries: 5

  # ──────────────────────────────────────────────
  # pgAdmin — Interface visual para o banco
  # ──────────────────────────────────────────────
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: bravy-pgadmin
    restart: unless-stopped
    ports:
      - "5050:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=dev@bravy.com.br
      - PGADMIN_DEFAULT_PASSWORD=admin
      - PGADMIN_CONFIG_SERVER_MODE=False
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - bravy-network

  # ──────────────────────────────────────────────
  # Redis — Cache e filas
  # ──────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: bravy-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - bravy-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      start_period: 5s
      retries: 3

# ──────────────────────────────────────────────────
# Volumes nomeados (dados persistem entre restarts)
# ──────────────────────────────────────────────────
volumes:
  pg_data:
    driver: local
  pgadmin_data:
    driver: local
  redis_data:
    driver: local
  api_node_modules:
    driver: local
  web_node_modules:
    driver: local

# ──────────────────────────────────────────────────
# Network isolada
# ──────────────────────────────────────────────────
networks:
  bravy-network:
    driver: bridge
```

### Dicas de uso no dia a dia

```bash
# Primeira vez (constroi tudo)
docker compose up -d --build

# Rodar migrations no banco
docker compose exec api npx prisma migrate dev

# Rodar seed
docker compose exec api npx prisma db seed

# Ver logs em tempo real
docker compose logs -f api web

# Reiniciar so a API (sem derrubar banco)
docker compose restart api

# Resetar tudo (inclusive banco — cuidado!)
docker compose down -v && docker compose up -d --build
```

---

## 10.6 — docker-compose.prod.yml

Producao e diferente de desenvolvimento: nada de hot-reload, nada de ferramentas de debug, tudo otimizado para performance e seguranca.

```yaml
version: "3.9"

services:
  # ──────────────────────────────────────────────
  # API — NestJS (production build)
  # ──────────────────────────────────────────────
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
      target: production
    container_name: bravy-api-prod
    restart: always
    expose:
      - "3000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - bravy-prod-network
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      start_period: 20s
      retries: 5

  # ──────────────────────────────────────────────
  # WEB — Next.js (production standalone)
  # ──────────────────────────────────────────────
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      target: production
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    container_name: bravy-web-prod
    restart: always
    expose:
      - "3001"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    depends_on:
      api:
        condition: service_healthy
    networks:
      - bravy-prod-network
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  # ──────────────────────────────────────────────
  # PostgreSQL
  # ──────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: bravy-postgres-prod
    restart: always
    expose:
      - "5432"
    env_file:
      - .env.production
    environment:
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - pg_prod_data:/var/lib/postgresql/data
    networks:
      - bravy-prod-network
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      start_period: 15s
      retries: 5

  # ──────────────────────────────────────────────
  # Nginx — Reverse Proxy + SSL
  # ──────────────────────────────────────────────
  nginx:
    image: nginx:1.25-alpine
    container_name: bravy-nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infrastructure/nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_webroot:/var/www/certbot:ro
      - certbot_certs:/etc/letsencrypt:ro
    depends_on:
      - api
      - web
    networks:
      - bravy-prod-network
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/nginx-health"]
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3

  # ──────────────────────────────────────────────
  # Certbot — Renovacao automatica de SSL
  # ──────────────────────────────────────────────
  certbot:
    image: certbot/certbot:latest
    container_name: bravy-certbot
    restart: unless-stopped
    volumes:
      - certbot_webroot:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    depends_on:
      - nginx
    networks:
      - bravy-prod-network
    entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot --quiet; sleep 12h & wait $${!}; done"

# ──────────────────────────────────────────────────
# Volumes persistentes
# ──────────────────────────────────────────────────
volumes:
  pg_prod_data:
    driver: local
  certbot_webroot:
    driver: local
  certbot_certs:
    driver: local

# ──────────────────────────────────────────────────
# Network isolada de producao
# ──────────────────────────────────────────────────
networks:
  bravy-prod-network:
    driver: bridge
```

### Diferencas entre dev e prod

| Aspecto | Desenvolvimento | Producao |
|---------|----------------|----------|
| **Portas** | Todas expostas (3000, 3001, 5432...) | Somente 80 e 443 via Nginx |
| **Volumes** | Codigo-fonte montado (hot-reload) | Nenhum — tudo dentro da image |
| **Restart** | `unless-stopped` | `always` |
| **Limites** | Sem limites | CPU e memoria limitados |
| **Logs** | stdout | Rotacao automatica (10MB, 3 arquivos) |
| **Debug** | Porta 9229 aberta | Nenhuma porta extra |
| **SSL** | Nao | Sim, via Let's Encrypt |
| **pgAdmin** | Sim | Nao (acesso via tunnel SSH se necessario) |

### Primeiro deploy com SSL

```bash
# 1. Gerar certificado inicial
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  --email devops@bravy.com.br \
  --agree-tos \
  --no-eff-email \
  -d app.bravy.com.br \
  -d api.bravy.com.br

# 2. Subir tudo
docker compose -f docker-compose.prod.yml up -d

# 3. Verificar se todos os servicos estao saudaveis
docker compose -f docker-compose.prod.yml ps
```

---

## 10.7 — nginx.conf

Configuracao completa do Nginx como reverse proxy com SSL, compressao, headers de seguranca e proxy para API e frontend.

```nginx
# ============================================================
# Nginx Configuration — Bravy Production
# ============================================================

user  nginx;
worker_processes  auto;
worker_rlimit_nofile 65535;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  2048;
    multi_accept on;
    use epoll;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # ──────────────────────────────────────────
    # Logging
    # ──────────────────────────────────────────
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for" '
                      'rt=$request_time';

    access_log  /var/log/nginx/access.log  main;

    # ──────────────────────────────────────────
    # Performance
    # ──────────────────────────────────────────
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;
    client_max_body_size 20M;
    server_tokens off;

    # ──────────────────────────────────────────
    # Gzip Compression
    # ──────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/x-javascript
        image/svg+xml
        font/woff2;

    # ──────────────────────────────────────────
    # Rate Limiting
    # ──────────────────────────────────────────
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # ──────────────────────────────────────────
    # Upstream Definitions
    # ──────────────────────────────────────────
    upstream api_backend {
        server api:3000;
        keepalive 32;
    }

    upstream web_frontend {
        server web:3001;
        keepalive 32;
    }

    # ──────────────────────────────────────────
    # Health Check (internal)
    # ──────────────────────────────────────────
    server {
        listen 80;
        server_name localhost;

        location /nginx-health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }

    # ──────────────────────────────────────────
    # HTTP → HTTPS Redirect
    # ──────────────────────────────────────────
    server {
        listen 80;
        server_name app.bravy.com.br api.bravy.com.br;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # ──────────────────────────────────────────
    # Frontend — app.bravy.com.br
    # ──────────────────────────────────────────
    server {
        listen 443 ssl http2;
        server_name app.bravy.com.br;

        # SSL Certificates
        ssl_certificate     /etc/letsencrypt/live/app.bravy.com.br/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/app.bravy.com.br/privkey.pem;

        # SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        # OCSP Stapling
        ssl_stapling on;
        ssl_stapling_verify on;
        resolver 8.8.8.8 8.8.4.4 valid=300s;
        resolver_timeout 5s;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

        # Proxy to Next.js
        location / {
            proxy_pass http://web_frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 60s;
            proxy_send_timeout 60s;
        }

        # Cache static assets
        location /_next/static/ {
            proxy_pass http://web_frontend;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location /static/ {
            proxy_pass http://web_frontend;
            proxy_cache_valid 200 30d;
            add_header Cache-Control "public, max-age=2592000";
        }
    }

    # ──────────────────────────────────────────
    # API — api.bravy.com.br
    # ──────────────────────────────────────────
    server {
        listen 443 ssl http2;
        server_name api.bravy.com.br;

        # SSL Certificates
        ssl_certificate     /etc/letsencrypt/live/api.bravy.com.br/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.bravy.com.br/privkey.pem;

        # SSL Configuration (same as frontend)
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        # OCSP Stapling
        ssl_stapling on;
        ssl_stapling_verify on;
        resolver 8.8.8.8 8.8.4.4 valid=300s;
        resolver_timeout 5s;

        # Security Headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

        # CORS Headers
        add_header Access-Control-Allow-Origin "https://app.bravy.com.br" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        add_header Access-Control-Allow-Credentials "true" always;

        # Preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://app.bravy.com.br";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept";
            add_header Access-Control-Allow-Credentials "true";
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        # Rate limit on login
        location /auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # General API rate limit
        location / {
            limit_req zone=api_limit burst=50 nodelay;
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_send_timeout 60s;
        }

        # Block sensitive paths
        location ~ /\. {
            deny all;
            return 404;
        }
    }
}
```

### O que essa config faz (resumo)

| Recurso | Descricao |
|---------|-----------|
| **HTTPS redirect** | Todo HTTP 80 redireciona para HTTPS 443 |
| **Let's Encrypt** | ACME challenge liberado na porta 80 para renovacao |
| **Gzip** | Comprime JSON, CSS, JS, SVG, fontes |
| **Rate limiting** | 30 req/s geral na API, 5 req/min no login |
| **Security headers** | HSTS, X-Frame-Options, CSP, X-Content-Type |
| **CORS** | Configurado para aceitar somente o dominio do frontend |
| **Cache de static** | Assets do Next.js com cache de 1 ano (immutable) |
| **WebSocket** | Upgrade headers para conexoes realtime |
| **Upstreams** | Keepalive connections para API e frontend |

---

## 10.8 — GitHub Actions CI/CD

Workflow completo que roda lint + testes em Pull Requests, e faz build + deploy em merge para `main`.

### Estrutura de arquivos

```
.github/
  workflows/
    ci.yml        # Lint + Test on PR
    deploy.yml    # Build + Push + Deploy on merge to main
```

### ci.yml — Lint e Testes

```yaml
name: CI — Lint & Test

on:
  pull_request:
    branches: [main, develop]
    paths-ignore:
      - "**.md"
      - "docs/**"

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"

jobs:
  # ──────────────────────────────────────────
  # Lint — ESLint + Prettier
  # ──────────────────────────────────────────
  lint:
    name: Lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [api, web]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: apps/${{ matrix.app }}/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: apps/${{ matrix.app }}

      - name: Run ESLint
        run: npm run lint
        working-directory: apps/${{ matrix.app }}

      - name: Check formatting
        run: npx prettier --check "src/**/*.{ts,tsx}"
        working-directory: apps/${{ matrix.app }}

  # ──────────────────────────────────────────
  # Test — Unit + Integration
  # ──────────────────────────────────────────
  test-api:
    name: Test API
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: bravy_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: apps/api/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: apps/api

      - name: Generate Prisma Client
        run: npx prisma generate
        working-directory: apps/api

      - name: Run migrations
        run: npx prisma migrate deploy
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/bravy_test

      - name: Run tests
        run: npm run test -- --coverage --passWithNoTests
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/bravy_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
          JWT_EXPIRATION: 1d
          NODE_ENV: test

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: api-coverage
          path: apps/api/coverage/

  test-web:
    name: Test Web
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: apps/web/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web

      - name: Run tests
        run: npm run test -- --coverage --passWithNoTests
        working-directory: apps/web
        env:
          NODE_ENV: test

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: web-coverage
          path: apps/web/coverage/

  # ──────────────────────────────────────────
  # Build check (garante que compila)
  # ──────────────────────────────────────────
  build-check:
    name: Build Check
    runs-on: ubuntu-latest
    needs: [test-api, test-web]
    strategy:
      matrix:
        app: [api, web]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: apps/${{ matrix.app }}/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: apps/${{ matrix.app }}

      - name: Build
        run: npm run build
        working-directory: apps/${{ matrix.app }}
```

### deploy.yml — Build, Push e Deploy

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - staging
          - production

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository }}

jobs:
  # ──────────────────────────────────────────
  # Build & Push Docker Images
  # ──────────────────────────────────────────
  build-and-push:
    name: Build & Push
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        app: [api, web]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.IMAGE_PREFIX }}/${{ matrix.app }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
            type=raw,value={{date 'YYYYMMDD-HHmmss'}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: apps/${{ matrix.app }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}

  # ──────────────────────────────────────────
  # Deploy to Staging
  # ──────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main' || github.event.inputs.environment == 'staging'
    environment:
      name: staging
      url: https://staging.bravy.com.br
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to staging server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/bravy
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            docker image prune -f
            echo "Staging deploy completed at $(date)"

      - name: Verify deployment
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            sleep 15
            curl -sf https://staging.bravy.com.br/health || exit 1
            echo "Health check passed"

  # ──────────────────────────────────────────
  # Deploy to Production (manual approval)
  # ──────────────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.event.inputs.environment == 'production'
    environment:
      name: production
      url: https://app.bravy.com.br
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to production server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/bravy
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            docker image prune -f
            echo "Production deploy completed at $(date)"

      - name: Verify deployment
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            sleep 15
            curl -sf https://app.bravy.com.br/health || exit 1
            echo "Health check passed"

      - name: Notify team
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deploy successful: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Secrets necessarios no GitHub

| Secret | Descricao |
|--------|-----------|
| `STAGING_HOST` | IP ou dominio do servidor de staging |
| `STAGING_USER` | Usuario SSH do servidor |
| `STAGING_SSH_KEY` | Chave privada SSH |
| `PRODUCTION_HOST` | IP ou dominio do servidor de producao |
| `PRODUCTION_USER` | Usuario SSH do servidor |
| `PRODUCTION_SSH_KEY` | Chave privada SSH |
| `NEXT_PUBLIC_API_URL` | URL da API para build do frontend |
| `SLACK_WEBHOOK_URL` | Webhook do Slack para notificacoes |

---

## 10.9 — .env.example

Template obrigatorio que deve existir na raiz de todo projeto. Cada variavel esta documentada.

```bash
# ============================================================
# .env.example — Template de variaveis de ambiente
# ============================================================
# Copie para .env e preencha os valores.
# NUNCA commite o .env real. Somente o .env.example.
# ============================================================

# ──────────────────────────────────────────
# Geral
# ──────────────────────────────────────────
NODE_ENV=development                # development | staging | production
PORT=3000                           # Porta da API
APP_NAME=Bravy                      # Nome da aplicacao (usado em emails, logs)
APP_URL=http://localhost:3001       # URL do frontend

# ──────────────────────────────────────────
# Banco de Dados (PostgreSQL)
# ──────────────────────────────────────────
POSTGRES_USER=bravy                 # Usuario do PostgreSQL
POSTGRES_PASSWORD=TROCAR_AQUI       # Senha do PostgreSQL (gere uma forte!)
POSTGRES_DB=bravy_dev               # Nome do banco
POSTGRES_HOST=postgres              # Host (nome do servico no compose)
POSTGRES_PORT=5432                  # Porta do PostgreSQL

# URL completa usada pelo Prisma
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public

# ──────────────────────────────────────────
# Redis
# ──────────────────────────────────────────
REDIS_HOST=redis                    # Host (nome do servico no compose)
REDIS_PORT=6379                     # Porta do Redis
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}

# ──────────────────────────────────────────
# Autenticacao (JWT)
# ──────────────────────────────────────────
JWT_SECRET=TROCAR_AQUI              # Minimo 32 caracteres, aleatorio
JWT_EXPIRATION=1d                   # Tempo de expiracao do access token
JWT_REFRESH_SECRET=TROCAR_AQUI      # Segredo do refresh token (diferente do JWT_SECRET!)
JWT_REFRESH_EXPIRATION=7d           # Tempo de expiracao do refresh token

# ──────────────────────────────────────────
# Next.js (Frontend)
# ──────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3000   # URL da API (acessivel pelo browser)
NEXTAUTH_URL=http://localhost:3001          # URL do NextAuth
NEXTAUTH_SECRET=TROCAR_AQUI                # Segredo do NextAuth (gere com: openssl rand -base64 32)

# ──────────────────────────────────────────
# Email (SMTP)
# ──────────────────────────────────────────
SMTP_HOST=smtp.gmail.com            # Servidor SMTP
SMTP_PORT=587                       # Porta (587 para TLS, 465 para SSL)
SMTP_USER=TROCAR_AQUI               # Email remetente
SMTP_PASSWORD=TROCAR_AQUI           # Senha de app (nao a senha do email!)
SMTP_FROM="Bravy <noreply@bravy.com.br>"  # Remetente exibido

# ──────────────────────────────────────────
# Storage (S3 / MinIO)
# ──────────────────────────────────────────
STORAGE_ENDPOINT=https://s3.amazonaws.com  # Endpoint do S3 (ou MinIO local)
STORAGE_REGION=sa-east-1                   # Regiao AWS
STORAGE_BUCKET=bravy-uploads               # Nome do bucket
STORAGE_ACCESS_KEY=TROCAR_AQUI             # Access Key
STORAGE_SECRET_KEY=TROCAR_AQUI             # Secret Key

# ──────────────────────────────────────────
# Sentry (Monitoramento de erros)
# ──────────────────────────────────────────
SENTRY_DSN=                         # DSN do Sentry (deixe vazio para desabilitar)
SENTRY_ENVIRONMENT=development      # Environment tag no Sentry

# ──────────────────────────────────────────
# pgAdmin (somente desenvolvimento)
# ──────────────────────────────────────────
PGADMIN_DEFAULT_EMAIL=dev@bravy.com.br   # Email para login no pgAdmin
PGADMIN_DEFAULT_PASSWORD=admin            # Senha do pgAdmin

# ──────────────────────────────────────────
# Backup
# ──────────────────────────────────────────
BACKUP_RETENTION_DAYS=30            # Quantos dias manter backups
BACKUP_PATH=/opt/bravy/backups      # Diretorio de backups no servidor
```

---

## 10.10 — Health check endpoint

Todo servico em producao **precisa** de um endpoint `/health`. E assim que o Docker, Nginx, load balancers e o CI/CD sabem se a aplicacao esta viva.

### Implementacao no NestJS

```typescript
// src/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.check();
  }
}
```

```typescript
// src/health/health.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: "ok" | "down";
  responseTime?: number;
  details?: Record<string, unknown>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const [database, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkMemory(),
    ]);

    const allOk = database.status === "ok" && memory.status === "ok";
    const allDown = database.status === "down" && memory.status === "down";

    return {
      status: allDown ? "down" : allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? "unknown",
      checks: {
        database,
        memory,
      },
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error("Database health check failed", error);
      return {
        status: "down",
        responseTime: Date.now() - start,
        details: { error: "Connection failed" },
      };
    }
  }

  private checkMemory(): ComponentHealth {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);

    return {
      status: heapUsedMB < 450 ? "ok" : "down",
      details: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
      },
    };
  }
}
```

```typescript
// src/health/health.module.ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

### Resposta do endpoint

```json
{
  "status": "ok",
  "timestamp": "2026-03-25T14:30:00.000Z",
  "uptime": 86432.5,
  "version": "1.2.0",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 3
    },
    "memory": {
      "status": "ok",
      "details": {
        "heapUsedMB": 85,
        "heapTotalMB": 128,
        "rssMB": 156
      }
    }
  }
}
```

### Registrar no AppModule

```typescript
// src/app.module.ts (trecho)
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    HealthModule,
    // ... outros modulos
  ],
})
export class AppModule {}
```

---

## 10.11 — Backup PostgreSQL

Backups sao inegociaveis. Se o banco caiu e voce nao tem backup, acabou. Este script automatiza o processo com rotacao.

### Script de backup

```bash
#!/usr/bin/env bash
# ============================================================
# backup-postgres.sh
# Backup automatizado do PostgreSQL com rotacao
# ============================================================
set -euo pipefail

# ──────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────
BACKUP_DIR="${BACKUP_PATH:-/opt/bravy/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="${DB_CONTAINER_NAME:-bravy-postgres-prod}"
DB_NAME="${POSTGRES_DB:-bravy_prod}"
DB_USER="${POSTGRES_USER:-bravy}"

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# ──────────────────────────────────────────
# Functions
# ──────────────────────────────────────────
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    if ! command -v docker &> /dev/null; then
        log "ERROR: docker not found"
        exit 1
    fi

    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        log "ERROR: Container ${DB_CONTAINER} is not running"
        exit 1
    fi
}

create_backup() {
    log "Starting backup of ${DB_NAME}..."

    mkdir -p "$BACKUP_DIR"

    docker exec "$DB_CONTAINER" \
        pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --verbose \
        2>> "$LOG_FILE" \
        | gzip > "$BACKUP_FILE"

    if [[ -f "$BACKUP_FILE" ]] && [[ -s "$BACKUP_FILE" ]]; then
        local size
        size=$(du -h "$BACKUP_FILE" | cut -f1)
        log "Backup created: ${BACKUP_FILE} (${size})"
    else
        log "ERROR: Backup file is empty or missing"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
}

rotate_backups() {
    log "Rotating backups older than ${RETENTION_DAYS} days..."

    local count
    count=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" | wc -l)

    if [[ "$count" -gt 0 ]]; then
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
        log "Deleted ${count} old backup(s)"
    else
        log "No old backups to delete"
    fi
}

verify_backup() {
    log "Verifying backup integrity..."

    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log "Backup integrity OK"
    else
        log "ERROR: Backup file is corrupted!"
        exit 1
    fi
}

show_stats() {
    local total_backups
    local total_size
    total_backups=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
    total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

    log "Stats: ${total_backups} backup(s), ${total_size} total"
}

# ──────────────────────────────────────────
# Main
# ──────────────────────────────────────────
main() {
    log "========================================="
    log "PostgreSQL Backup — START"
    log "========================================="

    check_prerequisites
    create_backup
    verify_backup
    rotate_backups
    show_stats

    log "========================================="
    log "PostgreSQL Backup — DONE"
    log "========================================="
}

main "$@"
```

### Configurar no cron

```bash
# Editar crontab
crontab -e

# Backup diario as 3:00 AM
0 3 * * * /opt/bravy/scripts/backup-postgres.sh >> /opt/bravy/backups/cron.log 2>&1

# Backup a cada 6 horas (para ambientes criticos)
0 */6 * * * /opt/bravy/scripts/backup-postgres.sh >> /opt/bravy/backups/cron.log 2>&1
```

### Restaurar um backup

```bash
# Listar backups disponiveis
ls -lh /opt/bravy/backups/*.sql.gz

# Restaurar (CUIDADO: sobrescreve o banco atual!)
gunzip < /opt/bravy/backups/bravy_prod_20260325_030000.sql.gz | \
  docker exec -i bravy-postgres-prod \
    pg_restore -U bravy -d bravy_prod --clean --if-exists
```

### Recomendacoes

| Pratica | Motivo |
|---------|--------|
| **Teste o restore periodicamente** | Backup sem teste nao e backup |
| **Guarde copias off-site** | Se o servidor morrer, o backup local vai junto |
| **Monitore o cron** | Se o script parou de rodar e ninguem percebeu, nao ha backup |
| **Use `--format=custom`** | Permite restore parcial (tabelas especificas) |
| **Comprima sempre** | Um banco de 2GB vira ~200MB comprimido |

---

## 10.12 — Checklist de deploy

Use esta lista **antes de cada deploy para producao**. Nao pule nenhum item.

### Pre-deploy

1. **Codigo revisado** — PR aprovado com pelo menos 1 code review
2. **Testes passando** — CI verde no GitHub Actions (lint + testes + build)
3. **Branch atualizada** — Rebase ou merge de `main` recente, sem conflitos
4. **Migrations testadas** — Se tem migration nova, testou local com dados reais?
5. **Variaveis de ambiente** — Todas as novas env vars estao no servidor de producao?
6. **`.env.example` atualizado** — Se adicionou variavel nova, documentou no template?
7. **Secrets rotacionados** — Se alterou algum secret, atualizou no GitHub Secrets E no servidor?
8. **Backup do banco** — Rodou backup ANTES do deploy (especialmente se tem migration destrutiva)
9. **Dependencias auditadas** — `npm audit` nao tem vulnerabilidades criticas?
10. **Build local funciona** — `docker compose -f docker-compose.prod.yml build` compila sem erro?

### Durante o deploy

11. **Modo manutencao** — Se o deploy e grande, ativou pagina de manutencao?
12. **Deploy sequencial** — Fez deploy primeiro no staging, validou, depois producao?
13. **Monitorando logs** — Esta acompanhando `docker compose logs -f` durante o deploy?
14. **Health check** — O endpoint `/health` retorna `ok` apos o deploy?

### Pos-deploy

15. **Teste de fumaca** — Testou manualmente os fluxos principais (login, CRUD principal)?
16. **Performance** — Tempo de resposta esta normal? Nao tem query lenta nova?
17. **Erros no Sentry** — Nenhum erro novo aparecendo?
18. **Notificou o time** — Avisou no Slack que o deploy foi feito?
19. **Tag de versao** — Criou tag no Git com a versao deployada?
20. **Documentacao** — Se mudou algo na infraestrutura, atualizou este documento?

### Se algo deu errado

```bash
# 1. Nao entre em panico

# 2. Voltar para a versao anterior
docker compose -f docker-compose.prod.yml down
git checkout <tag-da-versao-anterior>
docker compose -f docker-compose.prod.yml up -d --build

# 3. Se o problema e no banco (migration ruim)
# Restaure o backup que voce fez no item 8
gunzip < /opt/bravy/backups/bravy_prod_ULTIMO.sql.gz | \
  docker exec -i bravy-postgres-prod \
    pg_restore -U bravy -d bravy_prod --clean --if-exists

# 4. Avise o time IMEDIATAMENTE

# 5. Documente o que aconteceu (post-mortem)
```

---

## Proximos passos

Agora que voce domina Docker, deploy e infraestrutura:

- **[11-seguranca.md](11-seguranca.md)** — Aprenda o checklist de seguranca aplicada
- **[09-git-workflow.md](09-git-workflow.md)** — Revise o fluxo de branches e PRs
- **[12-guia-vibecoding.md](12-guia-vibecoding.md)** — Use LLMs para automatizar tarefas de DevOps

### Resumo dos arquivos criados neste guia

| Arquivo | Onde fica | Funcao |
|---------|-----------|--------|
| `Dockerfile` (API) | `apps/api/Dockerfile` | Build multi-stage do NestJS |
| `Dockerfile` (Web) | `apps/web/Dockerfile` | Build multi-stage do Next.js |
| `.dockerignore` | Raiz de cada app | Exclui arquivos desnecessarios do build |
| `docker-compose.yml` | Raiz do projeto | Ambiente de desenvolvimento |
| `docker-compose.prod.yml` | Raiz do projeto | Ambiente de producao |
| `nginx.conf` | `infrastructure/nginx/` | Reverse proxy com SSL |
| `.github/workflows/ci.yml` | `.github/workflows/` | CI: lint + testes |
| `.github/workflows/deploy.yml` | `.github/workflows/` | CD: build + push + deploy |
| `.env.example` | Raiz do projeto | Template de variaveis |
| `backup-postgres.sh` | `scripts/` | Backup automatizado do banco |

---

*Ultima atualizacao: Março 2026*
