#!/usr/bin/env bash
# =============================================================================
# release-workspace.sh
#
# Orquestra o release seguro da funcionalidade de Workspaces (multi-tenancy
# enforcement). Aplica em ordem:
#   1) Migrations pendentes *exceto* a Migration 3 (NOT NULL)
#   2) Seed workspace (`prisma/seed-workspace.ts`) — somente se houver dados
#      com `workspace_id IS NULL`
#   3) Validacao da pre-condicao da Migration 3 (nenhum NULL restante)
#   4) Migration 3 (NOT NULL + FK RESTRICT) via `prisma db execute`
#
# Idempotente: cada step verifica estado antes de agir. Fail-fast com set -e.
#
# Variaveis de ambiente esperadas:
#   DATABASE_URL            (obrigatorio) — string de conexao Postgres
#   MULTI_WORKSPACE_ENABLED (obrigatorio) — precisa ser "true"
#   DRY_RUN                 (opcional)    — se "true", apenas imprime acoes
#
# Uso:
#   npm run release:workspace
#   npm run release:workspace:dry-run
# =============================================================================

set -euo pipefail

LOG_PREFIX="[RELEASE WORKSPACE]"
DRY_RUN="${DRY_RUN:-false}"

# Caminhos (o script e invocado a partir de mundial-erp-api/ via npm run)
MIGRATION_REQUIRED_ID="20260418000122_workspace_required"
MIGRATION_REQUIRED_FILE="prisma/migrations/${MIGRATION_REQUIRED_ID}/migration.sql"

# 23 tabelas workspace-scoped (mantidas em sincronia com seed-workspace.ts)
WORKSPACE_SCOPED_TABLES=(
  "departments"
  "status_templates"
  "clients"
  "client_classifications"
  "delivery_routes"
  "suppliers"
  "product_types"
  "products"
  "unit_measures"
  "brands"
  "product_departments"
  "price_tables"
  "companies"
  "payment_methods"
  "carriers"
  "dashboards"
  "orders"
  "order_types"
  "order_flows"
  "order_models"
  "financial_categories"
  "audit_logs"
  "chat_channels"
)

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
log() {
  echo "${LOG_PREFIX} $*"
}

fail() {
  echo "${LOG_PREFIX} ERROR: $*" >&2
  exit 1
}

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log "DRY_RUN: $*"
  else
    log "exec: $*"
    eval "$@"
  fi
}

# Executa uma query e retorna *apenas* o valor (trim).
# Prefere psql (se presente) — mais confiavel para capturar stdout simples.
# Fallback: `prisma db execute --stdin` (nao expoe resultset facilmente;
# portanto, este script exige psql no PATH do runner).
query_scalar() {
  local sql="$1"
  if ! command -v psql >/dev/null 2>&1; then
    fail "psql nao encontrado no PATH. Instale postgresql-client no runner do release."
  fi
  psql "${DATABASE_URL}" -Atqc "${sql}"
}

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
log "Iniciando release de Workspaces (DRY_RUN=${DRY_RUN})"

if [[ -z "${DATABASE_URL:-}" ]]; then
  fail "DATABASE_URL nao definida."
fi

if [[ "${MULTI_WORKSPACE_ENABLED:-}" != "true" ]]; then
  fail "MULTI_WORKSPACE_ENABLED deve ser 'true' antes de rodar o release."
fi

if [[ ! -f "${MIGRATION_REQUIRED_FILE}" ]]; then
  fail "Arquivo de Migration 3 nao encontrado: ${MIGRATION_REQUIRED_FILE}"
fi

# -----------------------------------------------------------------------------
# Step 1/4 — Aplicar migrations pendentes ANTES da Migration 3
# -----------------------------------------------------------------------------
log "Step 1/4: Aplicar migrations pendentes (exceto Migration 3)..."

# Estrategia: se a Migration 3 ainda nao foi aplicada nem esta pasta do historico,
# renomeamos temporariamente a pasta da Migration 3 para que `prisma migrate
# deploy` NAO tente aplica-la, e restauramos ao final desse step.
APPLIED=$(query_scalar "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '${MIGRATION_REQUIRED_ID}' AND finished_at IS NOT NULL" || echo "0")

if [[ "${APPLIED}" == "1" ]]; then
  log "  Migration 3 ja aplicada. Pulando Steps 1-3."
  SKIP_MIGRATION_3=true
else
  SKIP_MIGRATION_3=false
  HIDE_DIR="prisma/migrations/${MIGRATION_REQUIRED_ID}"
  HIDDEN_DIR="prisma/migrations/.${MIGRATION_REQUIRED_ID}.hidden"

  if [[ -d "${HIDE_DIR}" ]]; then
    run "mv '${HIDE_DIR}' '${HIDDEN_DIR}'"
  fi

  # trap para sempre restaurar a pasta escondida, mesmo em falha
  trap 'if [[ -d "'"${HIDDEN_DIR}"'" ]]; then mv "'"${HIDDEN_DIR}"'" "'"${HIDE_DIR}"'"; fi' EXIT

  run "npx prisma migrate deploy"

  # Restaura ja aqui (o trap cobre casos de falha mais abaixo)
  if [[ -d "${HIDDEN_DIR}" ]]; then
    run "mv '${HIDDEN_DIR}' '${HIDE_DIR}'"
  fi
  trap - EXIT
fi

# -----------------------------------------------------------------------------
# Step 2/4 — Seed (somente se necessario)
# -----------------------------------------------------------------------------
log "Step 2/4: Verificar pre-condicao do seed..."

if [[ "${SKIP_MIGRATION_3}" == "true" ]]; then
  log "  Skip: Migration 3 ja aplicada (implica seed ja rodou)."
else
  NULL_TOTAL=0
  for tbl in "${WORKSPACE_SCOPED_TABLES[@]}"; do
    c=$(query_scalar "SELECT COUNT(*) FROM \"${tbl}\" WHERE \"workspace_id\" IS NULL")
    NULL_TOTAL=$((NULL_TOTAL + c))
  done
  log "  Total de rows com workspace_id IS NULL: ${NULL_TOTAL}"

  if [[ "${NULL_TOTAL}" -gt 0 ]]; then
    log "  Rodando seed (npm run seed:workspace)..."
    run "npm run seed:workspace"
  else
    log "  Nenhum NULL encontrado. Seed ja aplicado anteriormente — skip."
  fi
fi

# -----------------------------------------------------------------------------
# Step 3/4 — Validar pre-condicao da Migration 3
# -----------------------------------------------------------------------------
log "Step 3/4: Validar pre-condicao da Migration 3..."

if [[ "${SKIP_MIGRATION_3}" == "true" ]]; then
  log "  Skip (Migration 3 ja aplicada)."
else
  POST_NULL_TOTAL=0
  OFFENDERS=""
  for tbl in "${WORKSPACE_SCOPED_TABLES[@]}"; do
    c=$(query_scalar "SELECT COUNT(*) FROM \"${tbl}\" WHERE \"workspace_id\" IS NULL")
    if [[ "${c}" -gt 0 ]]; then
      OFFENDERS="${OFFENDERS}\n    - ${tbl}: ${c} rows"
    fi
    POST_NULL_TOTAL=$((POST_NULL_TOTAL + c))
  done

  if [[ "${POST_NULL_TOTAL}" -gt 0 ]]; then
    log "Tabelas com workspace_id IS NULL apos seed:"
    echo -e "${OFFENDERS}" >&2
    fail "Abortando: ${POST_NULL_TOTAL} rows ainda possuem workspace_id NULL. Verifique o seed."
  fi
  log "  OK: todas as 23 tabelas limpas (workspace_id IS NOT NULL em 100% das rows)."
fi

# -----------------------------------------------------------------------------
# Step 4/4 — Aplicar Migration 3
# -----------------------------------------------------------------------------
log "Step 4/4: Aplicar Migration 3 (NOT NULL + FK RESTRICT)..."

if [[ "${SKIP_MIGRATION_3}" == "true" ]]; then
  log "  Skip (ja aplicada)."
else
  run "npx prisma db execute --file ${MIGRATION_REQUIRED_FILE} --schema prisma/schema.prisma"
  run "npx prisma migrate resolve --applied ${MIGRATION_REQUIRED_ID}"
fi

log "OK. Multi-tenancy enforcement ativo."
