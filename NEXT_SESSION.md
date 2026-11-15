# NEXT SESSION — start here

Read this file, then `AGENTS.md`, then `DEVELOPMENT_PLAN.md`. Do not read the whole repository first.

Last updated: commit `249ad35` plus the ledger correction below, on branch `bauerceptor`.

## Where the work stands

The governance layer is finished and committed. No application task has started. The ledger is the only queue that matters; do not plan work outside it.

```
DOC-001  done      single operative plan + annotated legacy docs
DOC-002  done      agent protocol, ledger, schema, validators
DOC-GATE pending   <-- YOU ARE HERE: human review, then approve
ARCH-001 blocked   waits on DOC-GATE
ARCH-002 blocked   waits on ARCH-001
DATA-001 blocked   waits on ARCH-001
```

Run `python3 scripts/validate_task_ledger.py` to see the live state. It prints how many tasks are done and refuses invalid evidence.

## Your one next action

`DOC-GATE` is a human gate, not a code task. It needs you to read `DEVELOPMENT_PLAN.md` and `AGENTS.md` in full, confirm the P0 scope in REQ-02, and record approval. Until `DOC-GATE` is `done`, every other task stays `blocked` and `ARCH-001` cannot start.

To close it: set `status` to `done`, put a short approval string in `approval`, add the evidence entry `{"kind":"approval","ref":"DOC-GATE human sign-off"}`, and fill `completed_at_utc` and `completed_commit`. Then run the validator again.

## Then, in order

**`ARCH-001`** — pinned tooling. Creates `backend/.python-version`, `backend/uv.lock`, `frontend/bun.lock`, ESLint/Prettier/Vitest config, and the `data/downloads/` ignore rule. This unblocks everything: today no Python check can run at all because there is no venv and no lockfile.

**Then two tracks run in parallel**, which is why `M1` and `M2` share an owner:

- **`DATA-001`** closes the site registry from 6 sites to the 14 REQ-05 requires, each with a coordinate provenance URL. This is also **P0 blocker #10**.
- **`ARCH-002`** closes the Pydantic contracts, generates `contracts/openapi.json` and `frontend/src/types/api.generated.ts`, and deletes the hand-maintained types. This resolves **P0 blocker #4**.

**Note:** the ledger has no task for the frontend P0 gaps. Issues #3, #6, #7, #8 in `WORK_LOG.md` — test runner, horizon silhouette, timeline, Class B badge, and the three missing controls — are *inside* `FE-001`/`FE-002` `write_paths` but not called out in their `acceptance`. Before starting `FE-001`, extend those acceptance lists so an agent cannot satisfy them while leaving the P0 gaps open. Changing `acceptance` is a human-approved ledger revision.

## What not to do

- Do not start 3D. `M4` waits on `P0-GATE`.
- Do not add AI, Tailwind, a chart library, Docker, or a database.
- Do not edit `README.md`; that is `DELIVERY-002`.
- Do not edit protected files without the human sign-off flag. `plan/protected.sha256` will fail the build.
- Do not let an agent relax a check to make a task pass. That is the one disqualifying failure.

## P0 is not shippable

Six blockers, all in `WORK_LOG.md` under **P0 blockers**:

1. No fixture generator, so offline mode reads nothing.
2. No test runner, so three acceptance commands cannot execute.
3. Horizon silhouette and timeline are placeholders.
4. No Class B badge, spherical-limb notice, or provenance footer.
5. No `step`, `array_az`, or `min_comms` controls.
6. Registry holds 6 of 14 sites.

Plus **#9**, the educational glossary, which asserts unsourced science and is deliberately deferred pending a cited source or approval to delete the numeric claims.

## Branch and remote

- Branch: `bauerceptor`, tracks `origin/bauerceptor`.
- `main` is trunk. Work reaches it only by pull request, authored and merged by the branch owner.
- `M3` (usairam) was reviewed, merged, and corrected on this branch. `main` has none of this work yet; it is five commits behind.
- Unpushed at handoff: none.
- `M5` still has no owner.

## How to verify this handoff is not stale

```bash
git branch --show-current          # expect: bauerceptor
git status --short                 # expect: empty
python3 scripts/validate_task_ledger.py
python3 scripts/check_planning_docs.py
python3 scripts/check_file_lengths.py
```

All three must exit 0. If any fails, the tree drifted since this file was written — trust the scripts over this file, then update `WORK_LOG.md`.
