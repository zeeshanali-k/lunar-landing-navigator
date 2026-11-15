# Ownership and Branch Model

Three humans, three machines, three different agents. This file is the **only** place identity lives. The task ledger refers to modules, never to people.

## Module ownership

| Module | Scope | Owner | Branch | Status |
|---|---|---|---|---|
| `M1` | Data, LOLA topography, ephemeris, raycast | bauerceptor | `bauerceptor` | active |
| `M2` | Backend API, physics, scoring, contracts | bauerceptor | `bauerceptor` | active |
| `M3` | Frontend core, site selection, 2D map, KPIs | usairam | `feat/module-3-frontend-core` | in review |
| `M4` | 3D terrain, sky-dome, advanced visualizations | devscion | `feat/m4-3d-terrain` | gated behind `P0-GATE` |
| `M5` | Comparison, window finder, delivery | **unassigned** | — | blocked |

`M5` is the remaining gap: QA, comparison, windows, and delivery have no owner.

`M1` and `M2` are both held by bauerceptor because they are tightly coupled: `M1` produces the packs and `M2` is the only consumer that can serve them, so one owner avoids a handoff stall on the critical path. Split `M2` out when a third backend person joins.

## Branch rules

1. `main` is trunk and is **never pushed to directly**.
2. Each person works on exactly one long-lived branch named in the table above.
3. Work reaches `main` only through a pull request.
4. The **PR author merges their own PR** and is the reviewer of record for it.
5. A PR is mergeable only when `scripts/validate_task_ledger.py`, `scripts/check_planning_docs.py`, and `scripts/check_file_lengths.py` all pass, plus the module's declared commands.
6. Nobody rebases, rewrites, or force-pushes another person's branch.
7. `main` changes reach a worker only by merging `main` into their branch; never by resetting it.
8. A push happens only when the human whose branch it is asks for one, in that moment. An agent commits locally and stops there.

## Write boundaries

Each module owns distinct directories. Creating or editing files outside your module's boundary requires an approved ledger revision.

| Module | Owns |
|---|---|
| `M1` | `backend/src/cli/`, `backend/src/infrastructure/`, `backend/config/`, `data/`, `backend/data/site_packs/` |
| `M2` | `backend/src/api/`, `backend/src/application/`, `backend/src/domain/`, `contracts/` |
| `M3` | `frontend/src/`, excluding `frontend/src/features/terrain-3d/` |
| `M4` | `frontend/src/features/terrain-3d/`, `frontend/src/features/sky-horizon/` |
| `M5` | `frontend/src/features/comparison-board/`, `frontend/src/features/window-finder/`, `docs/` |

**Shared files are human-owned.** `AGENTS.md`, `DEVELOPMENT_PLAN.md`, `plan/**`, `scripts/**`, `.gitignore`, and CI configuration are protected. No agent writes them, for any reason, including "fixing" a failing check. See `PROTECTED.md`.

## Commit identity

Every commit is authored and committed by the human operating the machine, using the identity already configured in their environment. No agent trailer, no `Co-authored-by:`, no `Signed-off-by:`, and no change to `user.name` or `user.email` is permitted. This is enforced by `.githooks/commit-msg` and by branch protection on `main`.

## Handoff

When a module's output is consumed by another, the producer records the artefact contract in the ledger task, and the consumer reads that artefact rather than re-deriving it. `M1` emits packs; `M2` serves them; `M3` renders responses. Nobody re-implements another module's physics to "unblock" themselves.
