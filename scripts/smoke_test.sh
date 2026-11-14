#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/3] Checking source file lengths..."
PYTHON_BIN="python3"
if [[ -x "backend/.venv/bin/python" ]]; then
  PYTHON_BIN="backend/.venv/bin/python"
fi
"$PYTHON_BIN" scripts/check_file_lengths.py

echo "==> [2/3] Running backend test suite..."
if [[ -x "backend/.venv/bin/pytest" ]]; then
  (cd backend && .venv/bin/pytest -v)
else
  echo "ERROR: backend/.venv/bin/pytest not found."
  exit 1
fi

echo "==> [3/3] Running frontend TypeScript check..."
(cd frontend && npm run typecheck)

echo "All Track 0 smoke checks passed."
