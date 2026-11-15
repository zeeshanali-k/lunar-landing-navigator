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
| `M3` frontend, P0 completeness | `PARTIAL` — M4 panels merged; `FE-001`/`FE-002`/`FE-003` remain (issues 5, 7, 8, 9, 14) | usairam |
| `M1` data pipeline | `READY` — `DATA-001` done; `agent-alpha` takes `DATA-002`/`DATA-003`, `agent-beta` takes `DATA-004`–`DATA-006` | bauerceptor |
| `M2` backend | `READY` — `agent-charlie` takes `ARCH-002` then `BE-001`–`BE-003` | bauerceptor |
| Parallel session (revision 5) | `READY` — worktrees/branches defined; zeta is the continuous merge queue and sole pusher of `bauerceptor` | bauerceptor |
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

Five issues gate P0 (issue 10 was closed by `DATA-001`). The M4 merge partially addresses 6, 7, and 8; they stay open until `FE-002` records the acceptance evidence. None were introduced by the governance work; they are the gap between what module 3 shipped and what REQ-11 requires. Numbers refer to the table below.

**Status as of this revision: all five are explicit ledger acceptance criteria.** They were previously implicit — living in this file but absent from the ledger — which meant an agent could satisfy `FE-002` while leaving P0 broken. The acceptance lists now name each one, so a task cannot be marked done with the gap open. Issue 3 (test runner) and issue 12 (`uv.lock`) were closed by `ARCH-001`; issue 10 (registry) was closed by `DATA-001`. The M4 SVG horizon/timeline panels merged as `00f7e77` but do not close `FE-002` until its evidence is recorded.

| # | Blocker | Ledger requirement | Why it blocks P0 |
|---|---|---|---|
| 1 | No fixture generator, so offline mode has nothing to read | `DATA-006` acceptance; `FE-003` depends on it | P0 promises a demo with no network; fixtures were deleted as duplicates and their replacement does not exist yet |
| 5 | 2D map and persona mode are P1 but mounted in the P0 cockpit | `FE-001` acceptance (P0 cockpit mounts no P1 feature) | Ships P1 surface area as if it were P0 and invites the fabricated-data path back |
| 6 | Horizon silhouette and timeline are placeholders | `FE-002` acceptance, items 4–6 | These are the two visualisations REQ-11 names as the P0 core; today they render a count and a fake slot |
| 7 | No Class B badge, spherical-limb notice, or provenance footer | `FE-002` acceptance, items 1–3 and 9 | A limb-only site would display as if it had measured terrain, which REQ-05 forbids |
| 8 | No `step`, `array_az`, or `min_comms` controls | `FE-002` acceptance, item 8 | Three of the eight canonical scenario fields exist in state and URL but no UI writes them |
| 10 | Registry holds 6 sites, not 16 | `DATA-001` acceptance | REQ-05 requires exactly 16; the demo would show less than half the curated set |

### Full list

| # | Issue | Where | Severity | Status |
|---|---|---|---|---|
| 1 | Fixtures deleted but no generator exists yet, so offline mode has nothing to read | `frontend/public/data/fixtures/` (absent), `DATA-006` | `BLOCKED` on `M1` | in `DATA-006` acceptance |
| 2 | `evaluateScenario`/`compareScenarios`/`scanWindows` now require a scenario key; comparison and windows callers are typed but their scenarios are P1 | `frontend/src/services/`, `P1-COMPARE`, `P1-WINDOWS` | low | open |
| 3 | No test runner or `test` script, so three ledger acceptance commands cannot run | `frontend/package.json`, `frontend/vitest.config.ts` | BLOCKER for P0 | `DONE` — closed by `ARCH-001` |
| 4 | Wire types are hand-maintained; `api.generated.ts` does not exist | `frontend/src/types/`, `ARCH-002` | MAJOR | in `ARCH-002` acceptance |
| 5 | 2D map and persona mode are built but are P1, mounted unconditionally in the cockpit | `frontend/src/features/lunar-map-2d/`, `frontend/src/features/persona-mode/` | MAJOR | in `FE-001` acceptance |
| 6 | Horizon silhouette and timeline were placeholders, the two P0 visualisations REQ-11 requires | `frontend/src/components/layout/AppShell.tsx` | BLOCKER for P0 | `PARTIAL` — M4 SVG panels merged as `00f7e77`; `FE-002` must verify acceptance |
| 7 | No Class B badge, spherical-limb notice, or provenance footer in the UI | `frontend/src/components/`, `frontend/src/features/` | BLOCKER for P0 | `PARTIAL` — M4 spherical-limb notice added; badge and footer still open |
| 8 | No `step`, `array_az`, or `min_comms` controls; values exist in state and URL but no UI writes them | `frontend/src/features/time-controls/` | BLOCKER for P0 | `PARTIAL` — M4 array/mast selector added; step, `array_az`, and `min_comms` still open |
| 9 | Educational glossary asserts unsourced science (1.54° tilt, 40 K, ±6.5° libration, "uninterrupted" DTE) and generates narrative from booleans | `frontend/src/features/persona-mode/educationalGlossary.ts` | MAJOR | open — deliberately deferred, see below |
| 10 | Registry holds 6 sites, not the 16 REQ-05 requires | `backend/config/curated_sites.yaml` | BLOCKER for P0 | `DONE` — closed by `DATA-001` |
| 11 | `contracts/openapi-draft.yaml` still hand-maintained alongside Pydantic | `contracts/` | MAJOR | in `ARCH-002` acceptance |
| 12 | `backend/uv.lock` absent, pytest not installed, so no Python check can run | `backend/` | BLOCKER for P0 | `DONE` — closed by `ARCH-001` |
| 13 | Fixture `terrain.sample.json` is 16×16; production contract is 128×128 | `contracts/fixtures/` | MINOR | open |
| 14 | `ARCH-002` deletes hand-written wire types but `frontend/src/types/index.ts` is outside its `write_paths`; the merged M4 panels import from that barrel | `frontend/src/types/index.ts`, `ARCH-002` | BLOCKER for `ARCH-002` | open — needs a human-approved ledger revision or `FE-001` ownership |
| 15 | M4 test files exported runner functions but registered no Vitest tests, so they collected zero tests | `frontend/src/__tests__/` | MAJOR | `DONE` — wired into Vitest; 2 tests pass |
| 16 | M4 code was merged to `main` without a ledger task or plan/registry update; `main` still carried revision 3, the 14-site ledger, and the 6-site registry | `frontend/src/features/sky-horizon/`, `frontend/src/features/mission-timeline/`, `frontend/src/features/earth-moon-contrast/`, `DEVELOPMENT_PLAN.md` | governance | `RECORDED` — Appendix F; M4 remains gated, no ledger task |

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
| `M1` | `agent-alpha` | `DATA-002` → `DATA-003` | ready |
| `M1` | `agent-beta` | `DATA-004` → `DATA-005` → `DATA-006` | `DATA-004` needs `DATA-003` + `ARCH-002`; `DATA-005` needs `DATA-002` + `ARCH-002`; `DATA-006` needs both packs |
| `M2` | `agent-charlie` | `ARCH-002` → `BE-001` → `BE-002` → `BE-003` | `BE-001` needs `DATA-004` + `ARCH-002`; `BE-002` needs `BE-001` + `DATA-005`; `BE-003` needs `BE-002` + `DATA-006` |
| `M3` | usairam | `FE-001` → `FE-002` → `FE-003`; see “M3 remaining work — handoff to usairam” | `ARCH-002`, `BE-003`, `DATA-006`; issue 9 human decision |
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

The M1 raw data and packs do **not** block `FE-001` or `FE-002` directly: the frontend consumes API
responses and generated types. M1 becomes a hard blocker for `FE-003` through `DATA-006`, and M2
blocks `FE-003` through `BE-003`. The immediate blocker for the first M3 task is **M2, not M1**.

The unblock path is the Wave 1 gate: `agent-charlie` completes `ARCH-002`, and `agent-zeta` merges
**and pushes** it. `FE-001` then becomes eligible and can run in parallel with the rest of the
data/backend pipeline. `FE-002` follows. `FE-003` waits for `BE-003` and `DATA-006`.

Until `ARCH-002` is merged and pushed, usairam can prepare without starting a task: merge
`bauerceptor` into `feat/module-3-frontend-core`, read the plan and ledger, review the merged M4
panels, and plan the `FE-001`/`FE-002` changes. Do not set a task `in_progress`, do not commit task
work, and do not hand-roll a temporary contract.

### Who unblocks which M3 task

| M3 task | Hard inputs | Agent signal | Final human message |
|---|---|---|---|
| `FE-001` | `ARCH-002` done, merged, and pushed | Charlie: `M3 HANDOFF READY — ARCH-002 done and verified; waiting for zeta merge.`; zeta: `M3 UNBLOCK — tell usairam to start FE-001 now.` | Tell usairam only after zeta has merged **and pushed** `ARCH-002`; give him the pushed `origin/bauerceptor` commit. |
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
- No force-push, no rebase, no squash, no agent-branch push. `completed_commit` hashes stay
  resolvable.
- If orchestrated with herdr: one agent per worktree, copy `NEXT_SESSION.md` into each worktree,
  route each `ZETA HANDOFF` to zeta, disable auto-merge/auto-push for A/B/C, and route
  `M3 UNBLOCK` to the human/usairam only after zeta’s push.

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
