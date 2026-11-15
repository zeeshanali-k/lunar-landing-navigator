#!/usr/bin/env bash
# Module 5 cross-layer smoke verification script (QA-001).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "==> 1. Planning & ledger validation"
python3 scripts/validate_task_ledger.py
python3 scripts/check_file_lengths.py
git diff --exit-code -- README.md

echo "==> 2. Frontend typecheck, unit tests, and build"
cd frontend
./node_modules/.bin/tsc --noEmit

for test_file in src/__tests__/*.test.ts; do
  echo "  -> Running $test_file"
  ./node_modules/.bin/esbuild "$test_file" --bundle --platform=node --format=esm \
    | node --input-type=module
done

./node_modules/.bin/vite build

echo "==> 3. Optional backend checks (if uv environment is frozen and synced)"
cd "$repo_root/backend"
if ./.venv/bin/python -m pytest --version >/dev/null 2>&1; then
  ./.venv/bin/python -m pytest -v
  ./.venv/bin/python -m ruff check .
  ./.venv/bin/python -m ruff format --check .
  ./.venv/bin/python -m mypy src tests
else
  echo "SKIP: backend pytest/ruff/mypy not installed in backend/.venv (pending ARCH-001)."
fi

echo "SMOKE TEST PASSED"
