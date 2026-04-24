#!/usr/bin/env bash
# Nightly k6 load test — fixture 50k tasks.
#
# Roda em runner dedicado (self-hosted, fora do CI critical path) as 02:00 UTC.
# Dispara o cenario completo de tasks.k6.js, exporta summary.json, e falha
# com exit != 0 se thresholds forem violados (k6 faz isso automaticamente).
#
# Uso local:
#   BASE_URL=https://api.staging.mundial-erp.io \
#   AUTH_TOKEN=<jwt> \
#   SAMPLE_TASK_IDS=<uuid1,uuid2,...> \
#   bash scripts/run-k6-nightly.sh
#
# Uso cron (GitHub Actions ou self-hosted):
#   0 2 * * * cd /opt/mundial-erp-api && bash scripts/run-k6-nightly.sh > logs/k6-$(date +%F).log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${API_DIR}"

: "${BASE_URL:?BASE_URL env var obrigatoria (ex: https://api.staging.mundial-erp.io)}"
: "${AUTH_TOKEN:?AUTH_TOKEN env var obrigatoria (JWT com workspace selecionado)}"

FIXTURE_SIZE="${FIXTURE_SIZE:-50000}"
SAMPLE_TASK_IDS="${SAMPLE_TASK_IDS:-}"
SEARCH_TERMS="${SEARCH_TERMS:-report,invoice,deploy,review,bug}"
SCRIPT="${API_DIR}/test/perf/tasks.k6.js"
OUTPUT_DIR="${OUTPUT_DIR:-${API_DIR}/test/perf/reports}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SUMMARY_PATH="${OUTPUT_DIR}/summary-${TIMESTAMP}.json"

mkdir -p "${OUTPUT_DIR}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "[run-k6-nightly] ERRO: k6 nao instalado. Veja https://k6.io/docs/get-started/installation/" >&2
  exit 127
fi

echo "[run-k6-nightly] BASE_URL=${BASE_URL}"
echo "[run-k6-nightly] FIXTURE_SIZE=${FIXTURE_SIZE}"
echo "[run-k6-nightly] SCRIPT=${SCRIPT}"
echo "[run-k6-nightly] SUMMARY=${SUMMARY_PATH}"
echo "[run-k6-nightly] iniciando ${TIMESTAMP}"

BASE_URL="${BASE_URL}" \
AUTH_TOKEN="${AUTH_TOKEN}" \
FIXTURE_SIZE="${FIXTURE_SIZE}" \
SAMPLE_TASK_IDS="${SAMPLE_TASK_IDS}" \
SEARCH_TERMS="${SEARCH_TERMS}" \
k6 run \
  --summary-export="${SUMMARY_PATH}" \
  --out "json=${OUTPUT_DIR}/raw-${TIMESTAMP}.json" \
  "${SCRIPT}"

EXIT_CODE=$?

echo "[run-k6-nightly] exit=${EXIT_CODE}"
echo "[run-k6-nightly] summary gravado em ${SUMMARY_PATH}"

exit "${EXIT_CODE}"
