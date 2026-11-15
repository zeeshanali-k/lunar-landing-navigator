# AGENTS.md — Executing This Repository

You are an implementation agent. Follow this file exactly. Do not improvise.

## Authorities

Read, in this order, before any edit:

1. `AGENTS.md` (this file) — how you behave.
2. `HACKATHON_BUILD_PLAN.md` — what to build, and the science.
3. `plan/task-ledger.json` — which task, which paths, which commands.

If these disagree, or anything is missing: set the task to `blocked`, record the exact conflict, and stop. Never pick a resolution yourself.

`README.md`, `DEVELOPMENT_PLAN.md`, and `plan/00`–`plan/05` are historical context, not instructions.

## Task protocol

1. Read the whole ledger. Choose exactly one task where `status == "pending"` and **every** `depends_on` entry has `status == "done"`. If more than one is eligible, take the first in file order.
2. Set that task `status = "in_progress"` before touching a file.
3. Write only to the task's `write_paths`. Nothing else. No new files outside those paths.
4. Run the task's `commands` verbatim, in listed order, from each command's `cwd`. Do not add flags. Do not substitute a command.
5. Collect evidence: for each command record `{run, exit}`; for each artefact record `{path, sha256}` with `sha256sum <path>`.
6. If a command exits differently from `expected_exit`, or a required artefact is missing, or an input does not exist: set `status = "blocked"`, write `blocked_reason` with the failing command and its output, and stop. Do not attempt a fix.
7. Mark `done` only when every command matched `expected_exit` and `evidence` is complete. Fill `completed_at_utc` (ISO-8601, `Z`) and `completed_commit`.

## What you may and may not change

You may write only these ledger fields: `status`, `evidence`, `blocked_reason`, `completed_at_utc`, `completed_commit`.

You may not change `scope`, `priority`, `depends_on`, `requirement_ids`, `read_paths`, `write_paths`, `inputs`, `outputs`, `commands`, `acceptance`, `required_evidence`, or any task's `id`. Changing those requires a human-approved revision of the plan and ledger.

## Hard prohibitions

- Do not edit `README.md`. Its rewrite is `DELIVERY-002`.
- Do not start 3D, Three.js, or React Three Fiber work. It is not in the ledger; it needs a new approved revision.
- Do not add runtime network access. Download code lives under `backend/src/cli/` only.
- Do not add arbitrary runtime custom coordinates.
- Do not add Tailwind, a chart library, Axios, Docker, or a database.
- Do not add any AI, machine-learning, or inference component. No model in any numeric path, no runtime inference, no local weights, no ONNX/llama.cpp/transformers dependency, no generated text in an API response. See `HACKATHON_BUILD_PLAN.md#req-02` ("Non-goal — no runtime AI"). Adding one needs a new approved revision.
- Do not hand-edit generated files (`contracts/openapi.json`, `frontend/src/types/api.generated.ts`, fixtures, site packs).
- Do not invent coordinates, provenance URLs, hashes, reference values, constants, or field defaults.
- Do not tune physics or scoring constants to reach an expected percentage.
- Do not do opportunistic refactors, dependency upgrades, or cleanup.

## Tooling — the only allowed forms

Python is 3.12, exclusively through uv:

```bash
cd backend
uv sync --python 3.12 --frozen
uv run --python 3.12 --frozen pytest -v
uv run --python 3.12 --frozen ruff check .
uv run --python 3.12 --frozen ruff format --check .
uv run --python 3.12 --frozen mypy src tests
```

From the repository root: `uv run --project backend --frozen <cmd>`.

JavaScript uses Bun, with pnpm as the only fallback:

```bash
cd frontend
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run build
```

If Bun is genuinely unavailable: `pnpm install --no-lockfile` then `pnpm run <same script>`. Never commit a second lockfile. Never use any other package manager.

## Definition of done

A task is done only when:

- all dependencies are `done`;
- every command exited as declared;
- every `required_evidence` item exists and is recorded;
- `scripts/validate_task_ledger.py` exits 0 afterwards;
- the working tree contains changes only inside that task's `write_paths`.

Run `uv run --project backend --frozen python scripts/validate_task_ledger.py` before reporting completion.

## Reporting

Report, in at most six lines: task id, what changed, commands run with exit codes, artefacts with hashes, and the next eligible task id. If blocked, report the failing command and its exact output instead.
