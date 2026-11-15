# Ownership and Branch Model

Three humans, three machines, three different agents. This file is the **only** place identity lives. The task ledger refers to modules, never to people.

## Module ownership

| Module | Scope | Owner | Branch | Status |
|---|---|---|---|---|
| `M1` | Data, LOLA topography, ephemeris, raycast | bauerceptor | `bauerceptor` | active |
| `M2` | Backend API, physics, scoring, contracts | bauerceptor | `bauerceptor` | active |
| `M3` | Frontend core, site selection, 2D map, KPIs | usairam | `feat/module-3-frontend-core` | in review |
| `M4` | 3D terrain, sky-dome, advanced visualizations | devscion | `feat/m4-3d-terrain` | partial — SVG horizon/timeline/contrast merged; `terrain-3d` remains `.gitkeep` and gated |
| `M5` | Comparison, window finder, delivery | devscion | in review |

`M5` is the remaining gap: QA, comparison, windows, and delivery have no owner.

The merged M4 SVG horizon/timeline/contrast panels are P0 visualization inputs for `FE-002`, not the deferred 3D terrain. `frontend/src/features/terrain-3d/` remains `.gitkeep`; actual 3D terrain still needs a human-approved revision after `P0-GATE`. See `DEVELOPMENT_PLAN.md` Appendix F.

`M1` and `M2` are both held by bauerceptor because they are tightly coupled: `M1` produces the packs and `M2` is the only consumer that can serve them, so one owner avoids a handoff stall on the critical path. Split `M2` out when a third backend person joins.

## Parallel agent session (revision 5)

A declared parallel session lets one human run several agents on the same modules without giving any agent a second identity. Each agent gets a dedicated branch cut from the owner branch and a separate worktree. The branch guard accepts the owner branch and its `-*` suffixed agent branches.

| Agent | Branch | Tasks | Scope |
|---|---|---|---|
| `agent-alpha` | `bauerceptor-alpha` | `DATA-002`, `DATA-003` | Data acquisition |
| `agent-beta` | `bauerceptor-beta` | `DATA-004`, `DATA-005`, `DATA-006` | M1 packs |
| `agent-charlie` | `bauerceptor-charlie` | `ARCH-002`, `BE-001`, `BE-002`, `BE-003` | M2 backend |
| `agent-zeta` | `bauerceptor` | integration only | Merge, digests, documents |

These branches exist only for the declared session. No agent edits another agent's `write_paths`, and no agent edits the shared files listed under “Write boundaries”. The integrator merges each branch into the owner branch with `--no-ff`; no squash, rebase, or force-push.

## Branch rules

1. `main` is trunk and is **never pushed to directly**.
2. Outside a declared parallel-agent session, each person works on exactly one long-lived branch named in the table above. In a declared session, the same human may use the dedicated agent branches listed under “Parallel agent session”; every such branch is cut from and merged back into the owner branch.
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

In a parallel session, an agent's boundary is the current ledger task's `write_paths`, not the whole module directory. Only the integrator resolves shared-file conflicts and updates the planning documents.

## Commit identity

Every commit is authored and committed by the human operating the machine, using the identity already configured in their environment. No agent trailer, no `Co-authored-by:`, no `Signed-off-by:`, and no change to `user.name` or `user.email` is permitted. This is enforced by `.githooks/commit-msg` and by branch protection on `main`.

## Handoff

When a module's output is consumed by another, the producer records the artefact contract in the ledger task, and the consumer reads that artefact rather than re-deriving it. `M1` emits packs; `M2` serves them; `M3` renders responses. Nobody re-implements another module's physics to "unblock" themselves.
