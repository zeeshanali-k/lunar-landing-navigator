#!/usr/bin/env bash
# Module 5 cross-layer smoke verification script (QA-001).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if command -v uv >/dev/null 2>&1; then
  UV_BIN="$(command -v uv)"
elif [[ -x "$HOME/.local/bin/uv" ]]; then
  UV_BIN="$HOME/.local/bin/uv"
else
  echo "ERROR: uv not found on PATH or at \$HOME/.local/bin/uv" >&2
  exit 1
fi

echo "==> 1. Planning, digest, and file-length validation"
"$UV_BIN" run --project backend --python 3.12 --frozen python scripts/validate_task_ledger.py
"$UV_BIN" run --project backend --python 3.12 --frozen python scripts/check_planning_docs.py
"$UV_BIN" run --project backend --python 3.12 --frozen python scripts/check_file_lengths.py
git diff --exit-code -- README.md

echo "==> 2. Frontend typecheck, lint, Vitest, Prettier, and Vite build"
cd frontend
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint . --max-warnings=0
./node_modules/.bin/vitest run
rm -rf dist
./node_modules/.bin/prettier --check .
./node_modules/.bin/vite build

echo "==> 3. Backend registry unit test, lint, format, and optional strict mypy/integration"
cd "$repo_root/backend"
"$UV_BIN" run --python 3.12 --frozen pytest -v tests/unit/test_site_registry.py
"$UV_BIN" run --python 3.12 --frozen ruff check .
"$UV_BIN" run --python 3.12 --frozen ruff format --check .

if [[ "${STRICT_BACKEND:-0}" == "1" ]]; then
  "$UV_BIN" run --python 3.12 --frozen mypy src tests
  "$UV_BIN" run --python 3.12 --frozen pytest -v
else
  echo "WARN: skipping mypy (missing types-PyYAML for site_registry_loader.py) and integration pytest (pending ARCH-002/BE-003); see docs/QA_REPORT.md. Set STRICT_BACKEND=1 to enforce."
fi

echo "SMOKE TEST PASSED"
