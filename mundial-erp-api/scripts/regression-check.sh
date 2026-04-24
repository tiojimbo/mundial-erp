#!/usr/bin/env bash
# Regression check — bloqueia merge se mudanca em Tasks quebrar features legadas.
# Gate obrigatorio para todo PR que toca:
#   src/modules/tasks/**
#   src/modules/work-items/**
#   src/modules/task-*/**
#   src/modules/custom-task-types/**
#   src/modules/task-outbox/**
#
# Racional: PLANO-TASKS §1.3 + §16 risco R9 — zero regressao em orders,
# production-orders, financial-summary, invoices, bpm, work-items.
#
# Uso local: bash scripts/regression-check.sh
# Uso CI: job separado apos db push, antes de approve automatico.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${API_DIR}"

echo "[regression-check] diretorio: ${API_DIR}"
echo "[regression-check] rodando suites de features criticas (PLANO §16 R9)"

# Regex cobre modulos core do ERP mais work-items (base de Tasks).
# --runInBand: evita paralelismo que agrava flakiness de setup com DB.
npx jest \
  --config ./test/jest-e2e.json \
  --testPathPattern='test/e2e/(orders|production-orders|financial-summary|invoices|bpm|work-items)' \
  --runInBand \
  --forceExit \
  --detectOpenHandles

echo "[regression-check] OK — nenhuma regressao detectada"
