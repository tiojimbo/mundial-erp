# ============================================================================
# Stage 1 — Install dependencies (include devDependencies)
# ============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci

# ============================================================================
# Stage 2 — Build
# ============================================================================
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN ./node_modules/.bin/nest build

# ============================================================================
# Stage 3 — Production
# ============================================================================
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

RUN npm prune --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
