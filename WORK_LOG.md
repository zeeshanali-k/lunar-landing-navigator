# Work Log

The **single running record of what has actually happened**. Plans say what should be built; the ledger says what may be worked on; this file says what was done, by whom, what broke, and what is left.

Update it whenever work lands. Do not duplicate this history into `DEVELOPMENT_PLAN.md`, `plan/OWNERS.md`, or a PR description. Link here instead.

**Legend:** `DONE` · `PARTIAL` · `BLOCKED` · `DEFERRED` · `NEW` (issue found while working, not yet fixed)

---

## Current state

| Area | State | Owner |
|---|---|---|
| Governance (single plan, ownership, anti-tamper guards) | `DONE` — ledger `DOC-001`, `DOC-002`, `DOC-GATE`, `ARCH-001` closed with evidence | bauerceptor |
| Human review gate | `DONE` — `DOC-GATE` closed 2026-11-15 with recorded approval | bauerceptor |
| `M3` frontend corrected onto the plan | `DONE` (committed on `bauerceptor`, not yet merged to `main`) | bauerceptor |
| `M3` frontend, P0 completeness | `PARTIAL` — issues 5–8 fixed on `feat/module-3-frontend-core` (`801aa0a`) and verified in a test merge; pending merge; #9 open | usairam |
| `M1` data pipeline | `PARTIAL` — `DATA-001` and `DATA-002` done; `DATA-003` next; `agent-beta` takes `DATA-004`–`DATA-006` | bauerceptor |
| `M2` backend | `READY` — `agent-charlie` takes `ARCH-002` then `BE-001`–`BE-003` | bauerceptor |
| Parallel session (revision 5) | `IN PROGRESS` — Wave 1: `DATA-002` merged and pushed at `876e758`; `ARCH-002` pending; zeta is the continuous merge queue and sole pusher of `bauerceptor` | bauerceptor |
| `M4` 3D | `PARTIAL` — M4 SVG horizon/timeline/contrast merged as `00f7e77`; `terrain-3d` remains `.gitkeep` and gated | devscion |
| `M5` comparison / QA / delivery | `BLOCKED` — unowned | — |
| **P0 release** | **`NOT SHIPPABLE` — 5 blockers remain (1, 5, 6, 7, 8)** | — |

---

## 2026-11-14 — bauerceptor

### Completed

| Change | Files |
|---|---|
| Merged the two root plans into one operative spec and deleted the duplicate | `DEVELOPMENT_PLAN.md`, removed `HACKATHON_BUILD_PLAN.md` |
| Demoted legacy plans to annotated history; every section carries a reason and a replacement anchor | `plan/00`–`plan/05` |
| Added the agent protocol | `AGENTS.md` |
| Added a machine-readable task DAG and its closed schema | `plan/task-ledger.json`, `plan/task-ledger.schema.json` |
| Added planning validators (DAG, evidence, anchor, README-immutability, AI/3D prohibition, frontend-physics) | `scripts/validate_task_ledger.py`, `scripts/check_planning_docs.py`, `scripts/planning_checks.py`, `scripts/prohibited_checks.py` |
| Split identity from ownership: modules `M1`–`M5`, names only in one file | `plan/OWNERS.md` |
| Declared protected files and pinned their digests | `PROTECTED.md`, `plan/protected-paths.txt`, `plan/protected.sha256`, `CODEOWNERS` |
| Added branch guard and anti-tamper commit hooks | `.githooks/check-branch`, `.githooks/commit-msg`, `.githooks/pre-commit` |
| Ignored 13 agent tool directories, kept `AGENTS.md` tracked | `.gitignore` |
| Assigned `M2` to bauerceptor (coupled to `M1` on the critical path) | `plan/OWNERS.md`, `plan/task-ledger.json` |

### Corrected from usairam's `feat/module-3-frontend-core`

Reviewed before merge: 13 blockers, all in two classes — client-side fabricated science and contract violations. Corrected rather than repaired, per the plan's rules.

| Fix | File | What changed |
|---|---|---|
| Removed client-side physics | `frontend/src/services/evaluationService.ts` | Deleted `adaptOfflineEvaluation`, `CURATED_SITE_META`, `resolveFallbackSite`, `SOLAR_CONSTANT_W_M2`. No more `arrayFactor`, `mastBonus`, `powerScale`, hardcoded `-35.0` Earth elevation, `-22` score penalty, or invented risk warnings. Responses pass through untouched. |
| Narrowed offline fallback | `frontend/src/services/httpClient.ts` | Falls back only on network failure or 5xx. 4xx surfaces as an error. Requires an exact match in a generated fixture manifest; no relabelling; raises `OFFLINE_FIXTURE_UNAVAILABLE` otherwise. |
| Removed site-metadata relabelling | `frontend/src/services/siteService.ts` | Dropped `transformFallback` and coordinate clamping. A 409 `TERRAIN_NOT_AVAILABLE` reaches the caller. |
| Canonical URL schema | `frontend/src/state/urlSync.ts` | Exactly `site,start,days,step,array,array_az,mast,min_comms`, in that order. Backend allowlists enforced. Invalid values produce a notice instead of silently reverting. Custom-coordinate keys rejected. |
| Removed coordinate clamping | `frontend/src/state/useMissionStore.ts` | No client-side clamp; the backend returns 422. Added `stepMinutes`, `fixedArrayAzimuthDeg`, `minCommsElevDeg`, `notices`, `terrainUnavailable`. |
| Contract types match the plan | `frontend/src/types/evaluation.ts` | `feasibility_score`, `terrain_score`, `elevation_m`, `mean_slope_deg` are nullable for Class B sites. Added `has_precomputed_terrain`, `is_dte_geometric`, `is_solar_conjunction`, `longest_comms_blackout_hours`. Added `DurationDays`, `StepMinutes`, `ObserverHeightM` allowlist types. |
| Stripped invented lunar data | `frontend/src/features/lunar-map-2d/mapProjection.ts` | Removed `SOUTH_POLE_FEATURES` (8 craters with fabricated coordinates, elevations, slopes) and the `MOON_RADIUS_KM` constant. Projection now takes the radius as a parameter. |
| Removed fabricated overlays and map-click coordinates | `frontend/src/features/lunar-map-2d/SouthPoleMap.tsx`, `LayerToggleBar.tsx` | Deleted the "PSR Ice" layer and elevation/slope overlays, which had no real data behind them. A map click no longer mints an arbitrary runtime coordinate. |
| Removed invented presets and clamp claim | `frontend/src/features/site-explorer/CustomCoordForm.tsx` | Deleted three hardcoded coordinate presets and the "pole guard clamps" text the backend no longer does. |
| Removed duplicate constant | `frontend/src/features/mission-kpis/OperationalKpiStrip.tsx` | Dropped the second `1361`; irradiance is displayed from the API. Class B sites render `N/A` rather than a fabricated score. |
| Moved the lunar radius out of the client | `backend/src/api/routes/health.py`, `frontend/src/services/healthService.ts`, `frontend/src/features/lunar-map-2d/SouthPoleMap.tsx` | The map needed the lunar radius for projection geometry. Rather than a second `1737.4` in TypeScript, `GET /api/v1/health` now returns `moon_radius_km` from `backend/src/domain/constants.py`, and the store holds it. The frontend-physics guard enforces this. |

### Verification

| Check | Result |
|---|---|
| `bun run typecheck` | pass |
| `bun run build` | pass (220 kB, 67 kB gzip) |
| `python3 scripts/validate_task_ledger.py` | pass |
| `python3 scripts/check_planning_docs.py` | pass |
| `python3 scripts/check_file_lengths.py` | pass |

---

## 2026-11-15 — bauerceptor

### Registry scope revision (human-approved)

Verified independently against NASA release 24-136 (2024-10-28): Artemis III candidate landing
regions were downselected from thirteen (2022) to **nine**. The seven polar entries in `REQ-05`
were not that nine — two (Shackleton Connecting Ridge, Faustini Rim A) were dropped in the 2024
downselect, and four of the nine were absent. The human approved aligning the `artemis_iii`
category to NASA's current nine and keeping the 2026-01-01…2029-01-01 ephemeris window.

| Change | Files |
|---|---|
| `REQ-05` registry is now 16 entries: NASA's nine current Artemis III regions plus the seven CLPS/Apollo/international sites | `DEVELOPMENT_PLAN.md` |
| Dropped `artemis-shackleton-ridge`, `artemis-faustini-rim-a`; added `artemis-mons-mouton-plateau`, `artemis-nobile-rim-2`, `artemis-degerlache-rim-2`, `artemis-slater-plain` | `DEVELOPMENT_PLAN.md` |
| Class A count is 9; registry counts in REQ-02, REQ-06, REQ-12 updated to 16 | `DEVELOPMENT_PLAN.md` |
| Ledger titles and acceptance updated from 14 to 16; Mons Mouton rule is now "two distinct regions", not "appears once" | `plan/task-ledger.json` |

### Validator correction

The `check_no_bare_python_invocations` check added in the previous session flagged its own regex
definitions and docstrings, and a stale multi-line header wrote a literal newline escape into
`plan/protected.sha256`. It now scans Markdown documentation only (excluding historical
`README.md`), which is where command instructions live, and the header is a single line. No check
was weakened: bare interpreter commands and disallowed package-manager forms in documentation
still fail.

### DOC-GATE closed

The human approved the operative plan and P0 scope in this session. `DOC-GATE` is now `done`
with an `approval` string, `completed_at_utc`, `completed_commit` (`0d1ae62`), and the required
approval evidence. `ARCH-001` becomes the next eligible task.

### Verification

| Check | Result |
|---|---|
| `uv run --project backend --python 3.12 --frozen python scripts/validate_task_ledger.py` | pass |
| `uv run --project backend --python 3.12 --frozen python scripts/check_planning_docs.py` | pass |
| `uv run --project backend --python 3.12 --frozen python scripts/check_file_lengths.py` | pass |

### Not done — deliberately

- `DATA-001` coordinate sourcing is **not** executed. `backend/config/curated_sites.yaml` still
  holds six entries, including the now-removed `artemis-shackleton-ridge`; the registry must be
  rebuilt to the 16 `REQ-05` entries with a provenance URL each. No coordinate was invented.
- `DOC-GATE` was closed on 2026-11-15 with recorded human approval; see the ledger task.
- Uncommitted out-of-order artefacts remain in the tree (`data/downloads/`,
  `data/manifests/` except `.gitkeep`, `scripts/fetch_horizons.py`). `fetch_horizons.py` is in
  the wrong directory for `DATA-003`; `backend/src/cli/` is the only permitted location.

### ARCH-001 — pinned tooling (done)

| Change | Files |
|---|---|
| Dev tools moved to `[dependency-groups]` so `uv sync` installs pytest/ruff/mypy | `backend/pyproject.toml` |
| Python pinned to 3.12 with a lockfile | `backend/.python-version`, `backend/uv.lock` |
| ESLint/Prettier/Vitest configs and scripts; lockfile updated | `frontend/` |
| Stop ignoring `backend/data/site_packs/`; keep `/data/downloads/` ignored | `.gitignore` |
| One-time Prettier baseline at `printWidth 140` + `objectWrap: preserve` | `frontend/src/**` |

Note: the Prettier baseline edited `frontend/src` outside ARCH-001's write paths. It was required
for `bun run format:check` to exit 0, and the chosen settings keep every file under the 280-line
hard limit. Recorded as evidence `prettier-baseline-scope`.

Verified: `uv sync`, `ruff check`, `bun install`, `typecheck`, `test`, `lint`, `format:check`,
`build`, and `check_file_lengths` all exit 0.

### DATA-001 — 16-site registry with coordinate provenance (done)

| Change | Files |
|---|---|
| Rebuilt the registry to the 16 REQ-05 entries in order, each anchored to an IAU-adopted named-feature centre with a `planetarynames.wr.usgs.gov/Feature/<id>` provenance URL | `backend/config/curated_sites.yaml` |
| Added a validated registry loader (PyYAML plus Pydantic v2, `extra=forbid`, coordinate bounds) | `backend/src/infrastructure/site_registry_loader.py` |
| Added unit coverage for order, uniqueness, HTTPS provenance, coordinate range, the two Mons Mouton entries, removed regions, and the nine south-polar Artemis III sites | `backend/tests/unit/test_site_registry.py` |
| Confirmed the source config references only `ldem_80s_80m` and the Horizons endpoint; no stale 120 m or global DEM URLs remain | `backend/config/data_sources.yaml` |

Coordinate anchors (IAU feature ID): Cabeus B `8058`; Haworth `14502`; Mons Malapert `16338`;
Mons Mouton `16070` (shared by both Mons Mouton regions); Nobile `4321` (shared by both Nobile Rim
regions); de Gerlache `1439`; Slater `15325`; Mons Latreille `15996` for Blue Ghost; Mons
Gruithuisen Delta `3981`; Lacus Mortis `3212`; Statio Tranquillitatis `5684`; Rima Hadley `5064`;
Statio Shiv Shakti `16272`; Statio Tianhe `15781`.

Verified: `pytest tests/unit/test_site_registry.py -v` (6 passed), `ruff check .` (clean),
`validate_task_ledger.py`, `check_planning_docs.py`, and `check_file_lengths.py` all exit 0.
`DATA-001` is closed at `e1dd973` with the evidence recorded in the ledger.

### Parallel-agent handover (revision 5)

The next session runs three agents in separate worktrees on branches cut from `bauerceptor`, with
`agent-zeta` integrating. The full runbook, wave schedule, per-task commands, and dispatch prompts
are in `NEXT_SESSION.md`; this entry records the decisions only.

| Decision | Reason |
|---|---|
| `bauerceptor` stays the integration branch; agents use `bauerceptor-alpha`, `bauerceptor-beta`, `bauerceptor-charlie` | Git cannot check out one branch in three worktrees, and the branch guard binds the human identity to one branch. The guard now accepts `<owner-branch>-*`; `plan/OWNERS.md` declares the session. |
| Agents hand off one task at a time; zeta merges only `done` or `blocked` tasks | The ledger validator permits at most one `in_progress` task, and the dependency DAG requires producer artefacts before a consumer starts. |
| Zeta owns `DEVELOPMENT_PLAN.md`, `WORK_LOG.md`, `NEXT_SESSION.md`, and the protected digests | These are protected or shared; agents keep only their own `WORK_LOG.md` subsection and uncommitted working notes. |
| Raw downloads are shared by symlink from the main worktree's `data/downloads/{lola,horizons}` | `data/downloads/` is ignored and will not appear in a new worktree; `agent-beta` needs `agent-alpha`'s raw bytes. |
| No rebase, squash, or force-push | Each task's `completed_commit` must remain resolvable after integration. |

Assignments: `agent-alpha` — `DATA-002`, `DATA-003`; `agent-beta` — `DATA-004`, `DATA-005`,
`DATA-006`; `agent-charlie` — `ARCH-002`, `BE-001`, `BE-002`, `BE-003`; `agent-zeta` — integration.

### M4 merge reconciliation (2026-11-15)

`origin/main` merged `feat/m4-3d-terrain` as `ebf8a23`. The merge did not update the plan, ledger,
`plan/OWNERS.md`, or the registry on `main`; those were still revision 3, the 14-site ledger, and
the 6-site registry. This branch's revision 5 and DATA-001 are newer and were preserved when
`origin/main` was merged into `bauerceptor` as `00f7e77`.

| Finding | Detail |
|---|---|
| What merged | SVG horizon/sky-dome, mission-timeline, Earth/Moon contrast, solar-array/mast selector, two test files, and the `AppShell` integration |
| What did not merge | `frontend/src/features/terrain-3d/` is still `.gitkeep`; no Three.js/R3F/WebGL/shadow-engine dependency; no frontend physical constants |
| Classification | The SVG horizon and timeline are P0 visualization inputs for `FE-002`, not the deferred 3D terrain. No ledger task is marked done; M4 remains gated |
| Test integrity | The merged tests initially collected zero tests: they exported runner functions but registered no Vitest test. They are now wired into `it(...)`; `bun run test` reports 2 passing tests |
| Formatting and build | Applied the repository Prettier baseline to the merged files; `typecheck`, `lint`, `format:check`, `test`, and `build` pass |
| Type risk | The panels import from `frontend/src/types`; `ARCH-002` deletes the hand-written modules but the barrel `frontend/src/types/index.ts` is outside its `write_paths`. See open issue 14 |
| P0 cockpit | The M4 `AppShell` still mounts `SouthPoleMap` and persona mode, so open issue 5 remains. The spherical-limb notice is added; the Class B badge and provenance footer remain with `FE-002` |

### M3 branch verification — usairam (2026-11-15)

Branch `feat/module-3-frontend-core` at `801aa0a`, based on `origin/main` `ebf8a23`. The branch has
not merged this `bauerceptor` revision-5/16-site work.

| Check | Result |
|---|---|
| Branch `bun run typecheck` / `bun run build` | pass |
| Branch has `lint`, `format:check`, or `test` scripts | **no** — it predates `ARCH-001`; `urlSync.test.ts` cannot run there |
| Test merge into `bauerceptor` | 9 conflicts: `WORK_LOG.md` and 8 frontend files |
| Integrated result (throwaway worktree) | `typecheck`, `lint`, 3 tests (2 M4 + `urlSync`), `format:check`, `build` all pass |
| `external_links` contract | present in `backend/src/api/schemas/site_schemas.py` and `contracts/fixtures/sites.sample.json` |
| Issue 9 | glossary untouched; still open |

Fixes verified on the branch:

- **#5** — `SouthPoleMap` and the explorer/persona views moved to `map`/`explorer` P1 tabs; the
  default P0 cockpit no longer mounts them.
- **#6** — `PolarSkyDome`, `PanoramaHorizonChart`, `MissionTimelinePanel`, and
  `SolarArraySelector` are mounted in the P0 cockpit.
- **#7** — Class A/B badges, the spherical-limb banner, the provenance footer (LOLA, JPL Horizons,
  QuickMap, Moon Trek, CSA), and removal of P0 custom coordinates from the drawer.
- **#8** — Step (10/60), array azimuth, and minimum-comms controls; dismissible URL notices; an
  `urlSync.test.ts` file.

Integration fixes required before closing:

- The branch has no `ARCH-001` toolchain. Merge `bauerceptor` into it to get `lint`,
  `format:check`, and `test`; do not run a separate toolchain.
- `urlSync.test.ts` called `runUrlSyncTests()` at import time and used the removed
  `artemis-shackleton-ridge` ID. In the integration it is wired into Vitest and uses
  `artemis-cabeus-peak`.
- `urlSync.ts` accepted a non-canonical `mode` query parameter. The integration removes it so the
  canonical eight keys stay exact.
- The merge conflicts are formatting plus the store/route changes. Take the M3 frontend
  implementation and keep the `bauerceptor` docs; `types/site.ts` auto-merges with nullable
  terrain fields and `external_links`.
- Do not rebase or rewrite the M3 branch; merge `bauerceptor` into it after the parallel session
  and preserve its commits.

Remaining after the merge: update `frontend/src/types/index.ts` against the generated
`ARCH-002` types, run the full frontend toolchain, close `FE-001`/`FE-002` with evidence, keep
`FE-003` waiting for `BE-003` + `DATA-006`, and resolve issue 9 editorially. Compare and Landing
Window tabs remain visible as P1 placeholders in the top bar; decide whether to gate them with the
P1 route.

### Coordinate source of record — IAU

The `DATA-001` registry uses IAU/USGS Gazetteer of Planetary Nomenclature named-feature centres as
the source of record (`https://planetarynames.wr.usgs.gov/Feature/<id>`). QuickMap is a documented
fallback only when the gazetteer has no suitable feature or is unavailable; Wikipedia, blogs, and
eyeballed map images are never a source. The 16-site registry records the feature URL per entry, and
no later task re-sources or invents a coordinate. This policy is now in `DEVELOPMENT_PLAN.md`
REQ-05.

### Next session

Dispatch the three agents and zeta using `NEXT_SESSION.md`. The first wave is `agent-alpha` on
`DATA-002` and `agent-charlie` on `ARCH-002`; `agent-beta` is read-only standby until the data and
contracts merge.

---

## Open issues

### P0 blockers — the release cannot ship until these are closed

Five issues gate P0 (issue 10 was closed by `DATA-001`). The M4 merge partially addresses 6, 7, and 8; the M3 branch `feat/module-3-frontend-core` (`801aa0a`) fixes 5–8 and is verified in a test merge. They stay open until that branch lands and `FE-001`/`FE-002` record the acceptance evidence. None were introduced by the governance work; they are the gap between what module 3 shipped and what REQ-11 requires. Numbers refer to the table below.

**Status as of this revision: all five are explicit ledger acceptance criteria.** They were previously implicit — living in this file but absent from the ledger — which meant an agent could satisfy `FE-002` while leaving P0 broken. The acceptance lists now name each one, so a task cannot be marked done with the gap open. Issue 3 (test runner) and issue 12 (`uv.lock`) were closed by `ARCH-001`; issue 10 (registry) was closed by `DATA-001`. The M4 SVG horizon/timeline panels merged as `00f7e77`, and the M3 branch `801aa0a` fixes 5–8; neither closes `FE-001`/`FE-002` until the branch merges and the evidence is recorded.

| # | Blocker | Ledger requirement | Why it blocks P0 |
|---|---|---|---|
| 1 | No fixture generator, so offline mode has nothing to read | `DATA-006` acceptance; `FE-003` depends on it | P0 promises a demo with no network; fixtures were deleted as duplicates and their replacement does not exist yet |
| 5 | 2D map and persona mode are P1 but mounted in the P0 cockpit | `FE-001` acceptance (P0 cockpit mounts no P1 feature) | Verified fixed on `feat/module-3-frontend-core` (`801aa0a`); pending merge |
| 6 | Horizon silhouette and timeline are placeholders | `FE-002` acceptance, items 4–6 | Verified fixed on `feat/module-3-frontend-core` (`801aa0a`); pending merge |
| 7 | No Class B badge, spherical-limb notice, or provenance footer | `FE-002` acceptance, items 1–3 and 9 | Verified fixed on `feat/module-3-frontend-core` (`801aa0a`); pending merge |
| 8 | No `step`, `array_az`, or `min_comms` controls | `FE-002` acceptance, item 8 | Verified fixed on `feat/module-3-frontend-core` (`801aa0a`); pending merge |
| 10 | Registry holds 6 sites, not 16 | `DATA-001` acceptance | REQ-05 requires exactly 16; the demo would show less than half the curated set |

### Full list

| # | Issue | Where | Severity | Status |
|---|---|---|---|---|
| 1 | Fixtures deleted but no generator exists yet, so offline mode has nothing to read | `frontend/public/data/fixtures/` (absent), `DATA-006` | `BLOCKED` on `M1` | in `DATA-006` acceptance |
| 2 | `evaluateScenario`/`compareScenarios`/`scanWindows` now require a scenario key; comparison and windows callers are typed but their scenarios are P1 | `frontend/src/services/`, `P1-COMPARE`, `P1-WINDOWS` | low | open |
| 3 | No test runner or `test` script, so three ledger acceptance commands cannot run | `frontend/package.json`, `frontend/vitest.config.ts` | BLOCKER for P0 | `DONE` — closed by `ARCH-001` |
| 4 | Wire types are hand-maintained; `api.generated.ts` does not exist | `frontend/src/types/`, `ARCH-002` | MAJOR | in `ARCH-002` acceptance |
| 5 | 2D map and persona mode are built but are P1, mounted unconditionally in the cockpit | `frontend/src/features/lunar-map-2d/`, `frontend/src/features/persona-mode/` | MAJOR | `VERIFIED` on `feat/module-3-frontend-core` at `801aa0a`; pending merge |
| 6 | Horizon silhouette and timeline were placeholders, the two P0 visualisations REQ-11 requires | `frontend/src/components/layout/AppShell.tsx` | BLOCKER for P0 | `VERIFIED` on `feat/module-3-frontend-core` at `801aa0a`; pending merge |
| 7 | No Class B badge, spherical-limb notice, or provenance footer in the UI | `frontend/src/components/`, `frontend/src/features/` | BLOCKER for P0 | `VERIFIED` on `feat/module-3-frontend-core` at `801aa0a`; pending merge |
| 8 | No `step`, `array_az`, or `min_comms` controls; values exist in state and URL but no UI writes them | `frontend/src/features/time-controls/` | BLOCKER for P0 | `VERIFIED` on `feat/module-3-frontend-core` at `801aa0a`; pending merge |
| 9 | Educational glossary asserts unsourced science (1.54° tilt, 40 K, ±6.5° libration, "uninterrupted" DTE) and generates narrative from booleans | `frontend/src/features/persona-mode/educationalGlossary.ts` | MAJOR | open — deliberately deferred, see below |
| 10 | Registry holds 6 sites, not the 16 REQ-05 requires | `backend/config/curated_sites.yaml` | BLOCKER for P0 | `DONE` — closed by `DATA-001` |
| 11 | `contracts/openapi-draft.yaml` still hand-maintained alongside Pydantic | `contracts/` | MAJOR | in `ARCH-002` acceptance |
| 12 | `backend/uv.lock` absent, pytest not installed, so no Python check can run | `backend/` | BLOCKER for P0 | `DONE` — closed by `ARCH-001` |
| 13 | Fixture `terrain.sample.json` is 16×16; production contract is 128×128 | `contracts/fixtures/` | MINOR | open |
| 14 | `ARCH-002` deletes hand-written wire types but `frontend/src/types/index.ts` is outside its `write_paths`; the merged M4 panels import from that barrel | `frontend/src/types/index.ts`, `ARCH-002` | BLOCKER for `ARCH-002` | open — needs a human-approved ledger revision or `FE-001` ownership |
| 15 | M4 test files exported runner functions but registered no Vitest tests, so they collected zero tests | `frontend/src/__tests__/` | MAJOR | `DONE` — wired into Vitest; 2 tests pass |
| 16 | M4 code was merged to `main` without a ledger task or plan/registry update; `main` still carried revision 3, the 14-site ledger, and the 6-site registry | `frontend/src/features/sky-horizon/`, `frontend/src/features/mission-timeline/`, `frontend/src/features/earth-moon-contrast/`, `DEVELOPMENT_PLAN.md` | governance | `RECORDED` — Appendix F; M4 remains gated, no ledger task |
| 17 | M3 branch lacks the `ARCH-001` toolchain; its `urlSync.test.ts` called the runner at import time and used the removed `artemis-shackleton-ridge` site | `frontend/package.json`, `frontend/src/__tests__/urlSync.test.ts` | MAJOR | `DONE IN INTEGRATION` — merge `bauerceptor` for the toolchain and use the Vitest `it` wiring/current site ID |
| 18 | M3 branch is based on revision 3 / 6-site registry and must merge `bauerceptor` (revision 5 / 16-site) before closing | `DEVELOPMENT_PLAN.md`, `backend/config/curated_sites.yaml` | MAJOR | `OPEN` — merge `bauerceptor` after `ARCH-002` |
| 19 | Compare and Landing Window P1 tabs remain visible as placeholders in the P0 top bar | `frontend/src/components/layout/TopCommandBar.tsx` | MINOR | `OPEN` — decide whether to gate them with the P1 route |

### Deliberately not fixed

**#9, the educational glossary.** Left unfixed on purpose, and it needs a human decision rather than a mechanical edit:

- Several claims are unsourced and one is likely wrong — the "1.54° tilt" reads as obliquity to the ecliptic, not axial tilt.
- Rewriting educational copy is editorial work: the correct replacements depend on which sources the team is willing to cite.
- The fix belongs with `F3.6` persona mode, which is P1 and not mounted in the P0 flow.
- Removing it outright would delete P1 work that is otherwise usable.

**Action required:** someone must either supply cited figures or approve deleting the numeric claims before this ships. Until then it stays an open issue rather than being quietly dropped.

---

## Pending work, by module

| Module | Agent | Next tasks | Blocked by |
|---|---|---|---|
| `M1` | `agent-alpha` | `DATA-003` | ready |
| `M1` | `agent-beta` | `DATA-004` → `DATA-005` → `DATA-006` | `DATA-004` needs `DATA-003` + `ARCH-002`; `DATA-005` needs `DATA-002` + `ARCH-002`; `DATA-006` needs both packs |
| `M2` | `agent-charlie` | `ARCH-002` → `BE-001` → `BE-002` → `BE-003` | `BE-001` needs `DATA-004` + `ARCH-002`; `BE-002` needs `BE-001` + `DATA-005`; `BE-003` needs `BE-002` + `DATA-006` |
| `M3` | usairam | Merge `feat/module-3-frontend-core` (`801aa0a`) with `bauerceptor` after `ARCH-002`; apply the integration fixes; close `FE-001`/`FE-002`; `FE-003` after `BE-003`/`DATA-006` | `ARCH-002`, `BE-003`, `DATA-006`; issue 9 human decision |
| `M4` | devscion | not startable | `P0-GATE` |
| `M5` | — | needs an owner | — |

---

## M3 remaining work — handoff to usairam

Owner: usairam. Branch: `feat/module-3-frontend-core`. Module: M3. Read `AGENTS.md`,
`DEVELOPMENT_PLAN.md` (revision 5), `plan/OWNERS.md`, and `plan/task-ledger.json` before starting.
The ledger acceptance is authoritative; the summary below is the remaining-work checklist.

Dependency order: `ARCH-002` → `FE-001` → `FE-002` → `FE-003`. `FE-003` also needs `BE-003` and
`DATA-006`. Do not start a task before every `depends_on` entry is `done` and merged.

### Can M3 start now?

No M3 ledger task is eligible today. `FE-001` depends on `ARCH-002` (`M2`), which is still pending;
`FE-002` depends on `FE-001`; `FE-003` depends on `FE-002`, `BE-003` (`M2`), and `DATA-006` (`M1`).

Current state (2026-11-15): usairam has already pushed issues 5–8 on
`feat/module-3-frontend-core` (`801aa0a`). A throwaway test merge into `bauerceptor` passed
`typecheck`, `lint`, 3 tests, `format:check`, and `build`. Do not re-implement 5–8. The remaining
work is the merge, the type-barrel update, and closing `FE-001`/`FE-002` with evidence.

The M1 raw data and packs do **not** block `FE-001` or `FE-002` directly: the frontend consumes API
responses and generated types. M1 becomes a hard blocker for `FE-003` through `DATA-006`, and M2
blocks `FE-003` through `BE-003`. The immediate blocker for the first M3 task is **M2, not M1**.

The unblock path is the Wave 1 gate: `agent-charlie` completes `ARCH-002`, and `agent-zeta` merges
**and pushes** it. Then usairam merges `bauerceptor` into `feat/module-3-frontend-core`, applies the
integration fixes (Vitest wiring/current site ID, no `mode` key, Prettier, type barrel), runs the
frontend checks, and closes `FE-001`/`FE-002`. `FE-003` waits for `BE-003` and `DATA-006`.

Until `ARCH-002` is merged and pushed, usairam should not start a new ledger task and should not
redo the UI work. He can review the test-merge findings above and prepare the type-barrel change,
but must not set a task `in_progress` or commit task work on a stale base.

### Who unblocks which M3 task

| M3 task | Hard inputs | Agent signal | Final human message |
|---|---|---|---|
| `FE-001` | `ARCH-002` done, merged, and pushed | Charlie: `M3 HANDOFF READY — ARCH-002 done and verified; waiting for zeta merge.`; zeta: `M3 UNBLOCK — merge bauerceptor and finish FE-001/FE-002.` | Tell usairam only after zeta has merged **and pushed** `ARCH-002`: merge `bauerceptor` into `feat/module-3-frontend-core`, apply the integration fixes, run the checks, and close `FE-001`/`FE-002`; do not re-implement 5–8. |
| `FE-002` | `FE-001` done | none from M1/M2 | usairam proceeds after `FE-001`; no agent wait. |
| `FE-003` | `FE-002` done + `DATA-006` (M1) + `BE-003` (M2) merged and pushed | Beta: `M3 FE-003 INPUT READY — DATA-006 merged; FE-003 still needs BE-003 and FE-002.`; zeta: `M3 FE-003 INPUT READY — DATA-006 and BE-003 merged; FE-003 still needs FE-002.` | Tell usairam to start `FE-003` only when `FE-002` is done and zeta has **pushed** both inputs; give him the pushed `origin/bauerceptor` commit. |

`agent-alpha` does not directly unblock an M3 task. Its `DATA-002`/`DATA-003` unblock beta’s
`DATA-004`/`DATA-005` and charlie’s `BE-001`/`BE-002`; it emits
`M1 DATA READY — DATA-002 and DATA-003 merged; beta may start DATA-004/DATA-005.` It must not tell
the human to start usairam.

`agent-beta`’s `DATA-004`/`DATA-005` unblock charlie, not M3. Only `DATA-006` is an `FE-003` input;
beta emits `M3 FE-003 INPUT READY — DATA-006 merged; FE-003 still needs BE-003 and FE-002.` and
must not claim the final unblock. Zeta emits the combined signal after `BE-003` merges.

The exact Charlie and zeta handoff lines, including the “do not emit if the typecheck/barrel check
failed” condition, are in `NEXT_SESSION.md` sections 9.1 and 10.7.

### Integration control — zeta is the merge queue

A/B/C do not merge or push `bauerceptor`. They commit their own branch and emit a `ZETA HANDOFF`;
zeta is the only writer and pusher of `bauerceptor`.

- Zeta starts in Wave 0, in parallel with alpha and charlie, and stays available as the merge queue.
  It processes one handoff at a time; no final-only zeta and no batched merges.
- Zeta merges only from a `ZETA HANDOFF` whose task is `done` or `blocked`. No handoff, no merge; an
  `in_progress` task is sent back.
- The handoff carries branch, worktree, commit, base `bauerceptor` commit, task status, exact
  commands and exits, evidence refs/hashes, changed paths, artefacts, pre-merge checks, M3 impact,
  and known risks.
- Zeta checks that the branch contains the current `bauerceptor` tip. If not, it syncs
  `bauerceptor` into the agent worktree, re-runs the task commands, and sends code conflicts back to
  the agent.
- Zeta merges with `--no-ff --no-commit`, resolves only ledger/digest/`WORK_LOG.md` conflicts,
  refreshes the digest, runs the three validators, the task commands, and the frontend checks,
  commits with `ALLOW_PROTECTED=1`, fetches, and pushes `origin/bauerceptor`.
- Only after the push succeeds does zeta sync the next worktrees and emit an M3 signal. If a check
  or the push fails, zeta does not push and does not unblock; it reports.
- After every integration zeta emits `ZETA MERGED — <TASK-ID> integrated at <merge-commit>; pushed
  origin/bauerceptor; checks green; synced <worktree>; next: <agent/task>.` On failure it emits
  `ZETA BLOCKED — <TASK-ID> not merged; reason: <exact check/conflict>; no push; action:
  <agent/human>.` A/B/C wait for `ZETA MERGED` before the next task.
- No force-push, no rebase, no squash, no agent-branch push. `completed_commit` hashes stay
  resolvable.
- If orchestrated with Herdr: use `herdr worktree open` for the existing agent worktrees, start one
  agent per worktree, route each `ZETA HANDOFF` with `herdr agent prompt agent-zeta`, and keep
  Herdr out of merge/push. Route `M3 UNBLOCK` to the human/usairam only after zeta’s push.

The handoff block is in `NEXT_SESSION.md` section 5.6:

```text
ZETA HANDOFF — <TASK-ID> ready to merge
Branch: <branch>
Worktree: <path>
Commit: <hash>
Task status: done|blocked
Base: <bauerceptor commit you synced to>
Commands: <cmd> exit 0; <cmd> exit 0
Evidence: <refs, exit codes, sha256>
Changed paths: <paths; must be within write_paths + ledger + digest + WORK_LOG>
Artefacts: <paths and sha256>
Pre-merge checks: <task tests, ruff/typecheck/extra checks you ran>
M3 impact: none | FE-001 ready after merge | FE-003 input only
Known risks: <none or exact>
Do not merge if: <conditions, if any>
```

### FE-001 — app shell, stores, canonical URL, typed client

Status (2026-11-15): implemented on `feat/module-3-frontend-core` at `801aa0a`; remaining is the
`bauerceptor` merge after `ARCH-002`, the generated-type barrel, and ledger closure. Do not
re-implement the UI.

Dependencies: `ARCH-002`. Write paths: `frontend/src/components/layout`, `frontend/src/state`,
`frontend/src/services`, `frontend/src/App.tsx`, `frontend/src/types/coordinates.ts`,
`frontend/src/types/index.ts`, `frontend/src/__tests__/urlSync.test.ts`.

Remaining:

- Replace the hand-written wire imports with the generated types from `ARCH-002`. Update
  `frontend/src/types/index.ts` to re-export the generated types (the merged M4 panels import from
  `../../types`); stop using `site.ts`, `evaluation.ts`, `comparison.ts`, and `windows.ts`.
- Keep `coordinates.ts` to `degToRad`, `radToDeg`, and `normalizeAzimuthDeg`; remove
  `MOON_RADIUS_KM`, `POLE_LAT_CLAMP_DEG`, `clampLunarLatitude`, and `azElevToThreeXYZ`. No physical
  constant literal may remain under `frontend/src`; the lunar radius comes from
  `GET /api/v1/health`.
- Verify the canonical URL keys are exactly `site,start,days,step,array,array_az,mast,min_comms` in
  that order, round-trip deterministically, fall back to documented defaults with a rendered
  notice, and reject custom-coordinate keys.
- Keep mission, playback, and comparison stores separate; scrubbing must not re-render the shell.
- The client uses generated types, native `fetch`, and `AbortController`; no Axios.
- The P0 cockpit must not mount a P1 feature. The merged M4 `AppShell` still mounts `SouthPoleMap`
  and the persona-mode views; gate them behind a P1 route or remove them from the default cockpit.
  Open issue 5.
- Mount the merged M4 horizon/timeline/contrast panels as P0 inputs; do not treat M4 as a second
  feature set. They are already in `AppShell`.
- Tests: `frontend/src/__tests__/urlSync.test.ts`; run `bun run test`. Evidence: `bun run test`.

### FE-002 — controls, KPI strip, horizon silhouette, timeline

Status (2026-11-15): implemented on `feat/module-3-frontend-core` at `801aa0a`; remaining is the
`bauerceptor` merge after `ARCH-002`, preserving the Vitest wiring and closing with evidence. Do not
re-implement the UI.

Dependencies: `FE-001`. Write paths: `frontend/src/components/layout`, `frontend/src/components/ui`,
`frontend/src/features/mission-kpis`, `frontend/src/features/mission-timeline`,
`frontend/src/features/site-explorer`, `frontend/src/features/sky-horizon`,
`frontend/src/features/time-controls`, `frontend/src/__tests__/horizonMath.test.ts`,
`frontend/src/__tests__/timelineSegments.test.ts`.

Remaining:

- Site selector: group by category; badge every Class B site; show the persistent “Terrain model
  unavailable — spherical limb only” notice wherever a terrain value would appear; never render a
  numeric elevation, slope, or feasibility score for Class B; render 409 `TERRAIN_NOT_AVAILABLE`
  as the unavailable state, not an error banner and not another site’s data. Open issue 7.
- Horizon: use the merged M4 `PolarSkyDome`/`PanoramaHorizonChart` as the base. It must draw the
  solid terrain silhouette from `terrain_elev_deg`, a separate dashed geometric limb from
  `geometric_limb_deg`, and the active Sun/Earth markers; hover shows azimuth, body elevation,
  horizon elevation, and clearance; an empty `horizon_profile` renders only the limb.
- Timeline: use the merged M4 `MissionTimelinePanel`/`timelineSegments` as the base. It must render
  three tracks — solar (sunlit/grazing/dark), DTE (available/blocked), and elevation — with a
  draggable playhead that scrubs the active sample.
- KPI strip: feasibility with sub-scores, solar elevation and status, hours to sunset/sunrise,
  Earth clearance and DTE status, hours to earthset/earthrise; render `N/A` for null values;
  highlight countdowns under 12 h. Open issue 6.
- Add controls for `step_minutes` (10 or 60), `fixed_array_azimuth_deg`, and `min_comms_elev_deg`;
  changing any writes the store and the canonical URL. The M4 `SolarArraySelector` covers array
  type and mast height; step, fixed array azimuth, and minimum comms elevation are still missing.
  Open issue 8.
- Add the persistent provenance footer: LOLA, JPL Horizons, QuickMap, Moon Trek, CSA; state whether
  the active site uses measured terrain or the spherical limb.
- Extend `frontend/src/__tests__/horizonMath.test.ts` and `timelineSegments.test.ts` to assert the
  three tracks and the azimuth sample count; do not delete or weaken the existing M4 tests. Add
  component/geometry coverage for the new controls and the Class B state.
- The `frontend/src/features/earth-moon-contrast` card is mounted in `AppShell` but is outside
  `FE-002`’s write paths. It is display-only; if it needs a change, request a human-approved ledger
  revision instead of editing it.
- Commands: `bun run typecheck`, `bun run test`; evidence both.

### FE-003 — real API and exact offline fixture behaviour

Dependencies: `FE-002`, `BE-003`, `DATA-006`. Write paths: `frontend/src/services`,
`frontend/public/data/fixtures`, `frontend/src/__tests__/offlineFallback.test.ts`,
`frontend/.env.example`.

Remaining:

- Wire the real API for sites, terrain, and evaluate; use generated types; no fixture substitution
  on a 4xx contract error.
- Fallback only on network failure or a 5xx, and only when the canonical scenario key matches a
  generated fixture manifest exactly. Show a persistent “Offline fixture” badge. An unmatched
  scenario shows `OFFLINE_FIXTURE_UNAVAILABLE`. Never reuse a fixture across sites or dates.
- The fixtures come from `DATA-006`; do not hand-edit `contracts/fixtures` or
  `frontend/public/data/fixtures`.
- Commands: `bun run test`, `bun run build`; evidence both.

### Cross-cutting M3 items

- Issue 5: P1 map/persona mounts in the P0 cockpit; `FE-001` owns the routing fix.
- Issue 7: Class B badge, notice, and provenance footer; `FE-002`.
- Issue 8: step, fixed array azimuth, and min-comms controls; `FE-002`.
- Issue 9: the educational glossary’s unsourced science needs a human decision (supply citations or
  approve deleting the numeric claims); it is P1 persona-mode work, not a P0 blocker.
- Issue 14: `ARCH-002` deletes the hand-written types but `frontend/src/types/index.ts` is outside
  its write paths. `FE-001` owns the barrel; after `ARCH-002`, re-export the generated types and run
  `bun run typecheck`. The merged M4 panels import from `../../types`.
- Issue 15: the M4 tests were vacuous; they are now wired into Vitest and must stay at least 2
  passing tests. `FE-002` owns their extension.
- Issue 16: the M4 merge is reconciled in `DEVELOPMENT_PLAN.md` Appendix F; the panels are P0
  visualization inputs for `FE-002`, not the deferred 3D terrain.

### Verification and guardrails

- `bun run typecheck`, `bun run lint`, `bun run test`, `rm -rf dist && bun run format:check`,
  `bun run build`, and the three planning validators from the repository root.
- No Tailwind, chart library, Axios, 3D/Three.js/R3F, or frontend physics constant. No hand-edited
  generated types or fixtures. No test deletion, skip, tautology, or widened tolerance. No
  `README.md` or protected-file edits. No push, rebase, or force-push.
- Work on `feat/module-3-frontend-core`; merge `main` (or the integrated `bauerceptor` after the
  parallel session) into it. Never reset or rewrite the branch.

---

## Decisions taken while working

| Decision | Reason |
|---|---|
| Corrected `M3` on `bauerceptor` rather than asking usairam to rewrite | The fabrication path sat in one file and depended on a constant table; deleting it was smaller than describing it. His component structure, CSS theme, and stores are kept. |
| Map and persona mode left in place, not deleted | Both are legitimate P1 work already written. Removing them would waste effort; the open issue is that they are mounted in the P0 cockpit, which is a routing fix, not a rewrite. |
| `svgPointToLatLon` kept in the map module | Pure projection geometry for a P1 feature, not physics; removing it would break the map for no safety gain. |
| Comparison store now passes a scenario key | The fallback contract requires one; typing it surfaced the missing P1 scenarios. |
| Zeta is the only writer/pusher of `bauerceptor`; A/B/C hand off with `ZETA HANDOFF` | Concurrent merges and unpushed bases are the main failure mode. One merge at a time, push every green integration, then sync the next worktree. An M3 unblock is actionable only after the push. |

---

### DATA-002 — done — agent-alpha

- Branch/commit: `bauerceptor-alpha` @ `009d0bf` (task work); the ledger closure is the branch tip.
- Changed: `backend/src/infrastructure/pds_dem.py` (PDS3 label parser, size/hash verifier, elevation reader); `backend/src/cli/download_lola.py` (build-time acquisition with `.part`, verification, atomic rename, manifest writer); `backend/tests/unit/test_pds_dem.py` (10 tests); `data/manifests/lola/manifest.json` (generated provenance).
- Commands: `uv run --project backend --frozen python -m src.cli.download_lola` — exit 0; `uv run --python 3.12 --frozen pytest tests/unit/test_pds_dem.py -v` — exit 0 (10 passed).
- Evidence: `data/manifests/lola/manifest.json` sha256 `2d2b4554755ef1799930cc1968e1aa330c95145fd113d7356336605298957817`; image 115,520,000 bytes sha256 `e6591eeea35402ca5e124ca00f5bf0774381a2d4fa919144b455d82b8ff65fdc`; label 4,986 bytes sha256 `107c7558cbf8832e4119d3c8c2b1b272623344275c85378a9b0e03c22876eb33`.
- Parsed label: 7600×7600, `LSB_INTEGER` 16-bit, `SCALING_FACTOR` 0.5, `OFFSET` 1737400, 80 m/pix, `POLAR STEREOGRAPHIC`, `PLANETOCENTRIC`, centre longitude 0, latitude bounds −90…−80, projection offsets 3799.5.
- Open issues: none. The untracked manifest that existed in the main worktree reversed `MINIMUM_LATITUDE`/`MAXIMUM_LATITUDE` and lacked `parser_version` and the label hash; it was regenerated under this task, so that stale file should not be reused.
- Proposed doc deltas: none. `SCALING_FACTOR = 0.5` (elevation = DN × 0.5) was verified against the live PDS label, which is byte-identical to the cached copy (sha256 `107c7558cbf8832e4119d3c8c2b1b272623344275c85378a9b0e03c22876eb33`); the label states `HEIGHT = (DN * SCALING_FACTOR)`. The label is the source of record and `pds_dem.read_elevations` reads the factor from it, so a plan restatement is unnecessary. This withdraws the proposal recorded in the Wave 1 entry above; no plan edit is requested.

```text
ZETA HANDOFF — DATA-002 ready to merge
Branch: bauerceptor-alpha
Worktree: /home/red/Projects/lunar-landing-alpha
Commit: bauerceptor-alpha tip after this closure commit; task work commit 009d0bf
Task status: done
Base: abe3b0c (bauerceptor at session start)
Commands: uv run --project backend --frozen python -m src.cli.download_lola exit 0; uv run --python 3.12 --frozen pytest tests/unit/test_pds_dem.py -v exit 0
Evidence: data/manifests/lola/manifest.json sha256 2d2b4554755ef1799930cc1968e1aa330c95145fd113d7356336605298957817; image 115520000 bytes sha256 e6591eeea35402ca5e124ca00f5bf0774381a2d4fa919144b455d82b8ff65fdc; label sha256 107c7558cbf8832e4119d3c8c2b1b272623344275c85378a9b0e03c22876eb33
Changed paths: backend/src/cli/download_lola.py, backend/src/infrastructure/pds_dem.py, backend/tests/unit/test_pds_dem.py, data/manifests/lola/manifest.json, plan/task-ledger.json, plan/protected.sha256, WORK_LOG.md
Artefacts: data/manifests/lola/manifest.json sha256 2d2b4554755ef1799930cc1968e1aa330c95145fd113d7356336605298957817
Pre-merge checks: ruff check and ruff format --check on the new files exit 0; validate_task_ledger.py, check_planning_docs.py, check_file_lengths.py exit 0
M3 impact: none
Known risks: the 115 MB raw image stays ignored at data/downloads/lola (shared cache); a rerun verifies it instead of re-downloading
Do not merge if: the manifest or image hash differs, or any validator fails
```

### Wave 1 — DATA-002 integrated — agent-zeta

- Merged `bauerceptor-alpha` @ `5806a99` into `bauerceptor` as `876e758` with `--no-ff`; pushed `abe3b0c..876e758` to `origin/bauerceptor`.
- Scope verified: only `backend/src/cli/download_lola.py`, `backend/src/infrastructure/pds_dem.py`, `backend/tests/unit/test_pds_dem.py`, `data/manifests/lola/manifest.json`, plus `plan/task-ledger.json`, `plan/protected.sha256`, `WORK_LOG.md`. No out-of-scope path; branch contained the `bauerceptor` tip.
- Re-ran `pytest tests/unit/test_pds_dem.py -v` — exit 0 (10 passed). Independently verified artefact hashes: manifest `2d2b4554…`, image 115,520,000 bytes `e6591eee…`, label `107c7558…`.
- Validators after digest refresh: `validate_task_ledger.py` exit 0 (28 tasks, 6 done); `check_planning_docs.py` exit 0; `check_file_lengths.py` exit 0 (0 violations).
- Cleared a merge blocker: the main worktree carried an untracked out-of-order `data/manifests/lola/manifest.json` (reversed latitude bounds, no label hash). Preserved outside the tree in the session scratchpad, not reused.
- Synced `bauerceptor` into the alpha worktree (fast-forward to `876e758`). Next: `agent-alpha` runs `DATA-003`; `ARCH-002` remains pending. No M3 signal (alpha does not unblock M3).
- Proposed doc delta for human decision: `DEVELOPMENT_PLAN.md` REQ-04 omits `SCALING_FACTOR = 0.5` (elevation = DN × 0.5), which `DATA-005` needs. Not changed here.
- Noted: `origin/feat/m5-comparison-qa-delivery` appeared on fetch; out of scope for this session and untouched.

---

### DATA-003 — done — agent-alpha

- Branch/commit: `bauerceptor-alpha` @ `6f16004` (task work); the ledger closure is the branch tip.
- Changed: `backend/src/cli/horizons_client.py` (locked request builder, retry-aware fetch, marker-tolerant parser, coverage validator, reference selection); `backend/src/cli/download_horizons.py` (registry/config loading, raw archive through `.part`, manifests, frozen references, resumable run); `backend/tests/unit/test_horizons_parser.py` (14 tests); `data/manifests/horizons/` (32 manifests); `data/manifests/references/horizons/` (32 frozen reference files).
- Commands: `uv run --project backend --frozen python -m src.cli.download_horizons` — exit 0 (32 fetched, then 32 reused on rerun); `uv run --python 3.12 --frozen pytest tests/unit/test_horizons_parser.py -v` — exit 0 (14 passed).
- Evidence: manifest aggregate `8aa65a3439e5c5cf76634ba6325b706c8b03540a6098b08f840ca89a3fc7cf43` over 32 files; representative `data/manifests/horizons/artemis-slater-plain.sun.json` sha256 `f9f71f5afa3f10707f85ce28b5ea459c7f1f652ba6f26b3a2d3da8c152a5308f`. Raw responses are 1,189,736 bytes each and stay ignored in the shared cache.
- Coverage: every track has exactly 26,305 rows at 3,600 s from 2026-01-01T00:00:00Z to 2029-01-01T00:00:00Z. The first response is validated before the bulk fetch and every response is validated again.
- Independent check: the archived `artemis-slater-plain.sun.txt` row block is byte-identical to a fresh Horizons fetch (rows sha256 `e6253285…`); only the header request-timestamp line differs, which is why the recorded raw hash covers the full response.
- Marker handling: the real responses contain `*i` (daylight, interfering body up) and a bare `i` (night, interfering body up). A `*`-only or `*[im]`-only pattern would silently drop 13,051 rows per track; the parser accepts `*`, `*i`, `*m`, `i`, `m`, and the blank-flag four-token row, each covered by a test.
- Decision: `SITE_COORD` altitude is **0.0 km** for all 16 sites because `curated_sites.yaml` carries no `elevation_m` and REQ-05 forbids hand-entering one. Every manifest records `site_coord_used.altitude_source = "reference_sphere_zero: registry has no elevation_m"`. A 1 km altitude error shifts topocentric Sun/Earth geometry by ~1e-3° or less, far inside the 0.05° tolerance, but the frozen request should be revisited if REQ-07 later requires pack-derived altitudes.
- Open issue (for `BE-001`): REQ-07 requires interpolation error proven against **frozen off-grid** Horizons references, but no task owns an off-grid fetch. `DATA-003` acceptance asks only for hourly reference rows, and `BE-001`/`QA-001` have no download write paths. The frozen files here sample every 24th hourly row plus the final row per site and body. Severity: medium for `BE-001`; it blocks that off-grid test.
- Proposed doc deltas: (1) state in REQ-07 that the frozen ephemeris uses `SITE_COORD` altitude 0.0 km until packs exist, or add `elevation_m` to the registry; (2) assign a short off-grid reference fetch (for example 30-minute steps over the 2027-11-01 reference window) to a data task so `BE-001` has frozen references. This entry also withdraws the `SCALING_FACTOR` proposal in the Wave 1 entry above: the factor was verified against the live PDS label and is read from the label, so no plan edit is needed.

```text
ZETA HANDOFF — DATA-003 ready to merge
Branch: bauerceptor-alpha
Worktree: /home/red/Projects/lunar-landing-alpha
Commit: bauerceptor-alpha tip after this closure commit; task work commit 6f16004
Task status: done
Base: a43e602 (bauerceptor tip synced before the task)
Commands: uv run --project backend --frozen python -m src.cli.download_horizons exit 0; uv run --python 3.12 --frozen pytest tests/unit/test_horizons_parser.py -v exit 0
Evidence: data/manifests/horizons aggregate sha256 8aa65a3439e5c5cf76634ba6325b706c8b03540a6098b08f840ca89a3fc7cf43; artemis-slater-plain.sun.json sha256 f9f71f5afa3f10707f85ce28b5ea459c7f1f652ba6f26b3a2d3da8c152a5308f; 14 passed
Changed paths: backend/src/cli/download_horizons.py, backend/src/cli/horizons_client.py, backend/tests/unit/test_horizons_parser.py, data/manifests/horizons/, data/manifests/references/horizons/, plan/task-ledger.json, plan/protected.sha256, WORK_LOG.md
Artefacts: 32 manifests under data/manifests/horizons, 32 reference files under data/manifests/references/horizons
Pre-merge checks: ruff check . exit 0; ruff format --check clean; 14 tests pass; validate_task_ledger.py, check_planning_docs.py, check_file_lengths.py exit 0
M3 impact: none (this unblocks beta DATA-004/DATA-005 and charlie BE-001/BE-002 once merged)
Known risks: two ledger tasks in a row on this branch (DATA-002 was integrated at 876e758); the raw cache is ignored and shared
Do not merge if: any manifest is missing, a track's parsed_rows is not 26305, the manifest aggregate differs, or a validator fails
```
