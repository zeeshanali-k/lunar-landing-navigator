# Work Log

The **single running record of what has actually happened**. Plans say what should be built; the ledger says what may be worked on; this file says what was done, by whom, what broke, and what is left.

Update it whenever work lands. Do not duplicate this history into `DEVELOPMENT_PLAN.md`, `plan/OWNERS.md`, or a PR description. Link here instead.

**Legend:** `DONE` · `PARTIAL` · `BLOCKED` · `DEFERRED` · `NEW` (issue found while working, not yet fixed)

---

## Current state

| Area | State | Owner |
|---|---|---|
| Governance (single plan, ownership, anti-tamper guards) | `DONE` — ledger `DOC-001`, `DOC-002` closed with evidence | bauerceptor |
| Human review gate | `PENDING` — `DOC-GATE` is the one eligible task | bauerceptor |
| `M3` frontend corrected onto the plan | `DONE` (merged into `feat/module-3-frontend-core`) | bauerceptor / usairam |
| `M3` frontend, P0 completeness | `PARTIAL` — UI issues #5–#9 + unit suites implemented on `feat/module-3-frontend-core`; `FE-001`/`FE-002` ledger closure blocked on upstream `#1`, `#3`, `#4`, and `DOC-GATE` | usairam |
| `M1` data pipeline | `BLOCKED` — no `uv.lock`, nothing downloaded, 2 issues open (1, 10) | bauerceptor |
| `M2` backend | `BLOCKED` — depends on `M1` packs | bauerceptor |
| `M4` 3D | `BLOCKED` — gated behind `P0-GATE` | devscion |
| `M5` comparison / QA / delivery | `BLOCKED` — unowned | — |
| **P0 release** | **`NOT SHIPPABLE` — 8 blockers open, all now encoded in ledger acceptance** | — |

---

## 2026-11-15 — usairam (`feat/module-3-frontend-core`)

Merged `origin/main` (`c0a8cb9`) into `feat/module-3-frontend-core` and implemented all `M3`-owned frontend requirements in `frontend/src/`.

### Completed (`M3`)

| Fix / Feature | Files | What changed |
|---|---|---|
| Removed duplicate blocker line & closed #5 (P1 gating) | `frontend/src/state/urlSync.ts`, `frontend/src/components/layout/TopCommandBar.tsx`, `frontend/src/components/layout/AppShell.tsx` | Removed `SouthPoleMap`, `ExplorerCalloutBanner`, and `ModeSwitchPill` from the default P0 cockpit; routed them behind `"map"` (`2D Polar Map (P1)`) and `"explorer"` (`Explorer Guide (P1)`). |
| Closed #6 (2D Horizon Silhouette & 3-Track Timeline) | `frontend/src/features/sky-horizon/*`, `frontend/src/features/mission-timeline/*` | Replaced placeholders with SVG `HorizonProfileChart` (360° terrain + limb curve + interactive Sun/Earth/sample inspection) and SVG `MissionTimelineChart` (Solar illumination track, DTE comms track, elevation curve + pointer scrubbing). |
| Closed #7 (Class A/B status, spherical limb notice, provenance) | `frontend/src/types/site.ts`, `frontend/src/features/site-explorer/SiteCard.tsx`, `SiteExplorerDrawer.tsx`, `frontend/src/components/layout/DataProvenanceFooter.tsx`, `AppShell.tsx` | Made `elevation_m`/`mean_slope_deg` nullable, added `Class A • LOLA` vs `Class B • Limb Only` badges and persistent `"Terrain model unavailable — spherical limb only"` notices, added provenance footer (`LOLA`, `JPL Horizons`, `QuickMap`, `Moon Trek`, `CSA`), and removed P0 Custom Coords tab. |
| Closed #8 (Missing scenario controls & URL notices) | `frontend/src/features/time-controls/DateAndDurationBar.tsx`, `frontend/src/state/useMissionStore.ts`, `AppShell.tsx` | Added `Step` (`10m`/`60m`), `Array Az (°)`, and `Min Comms (°)` controls bound to `useMissionStore`; added dismissible URL fallback/unknown-site notices banner. |
| Closed #9 (Educational glossary cleanup) | `frontend/src/features/persona-mode/educationalGlossary.ts` | Rewrote in clean UTF-8 without unsourced numeric assertions (`1.54°`, `40 K`, `±6.5°`, etc.) or `"uninterrupted"` / speculative physics claims. |
| Added frontend unit suites | `frontend/src/__tests__/{testHarness.ts,urlSync.test.ts,horizonMath.test.ts,timelineSegments.test.ts}` | Added unit tests covering all 8 canonical URL keys, Class B empty horizon fallback, circular azimuth lookup, 3-track timeline classification, and scrubber math. |

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

## Open issues

### P0 blockers — the release cannot ship until these are closed

Eight issues gate P0. None were introduced by the governance work; they are the gap between what module 3 shipped and what REQ-11 requires. Numbers refer to the table below.

**Status as of this revision: all eight are now explicit ledger acceptance criteria.** They were previously implicit — living in this file but absent from the ledger — which meant an agent could satisfy `FE-002` while leaving P0 broken. The acceptance lists now name each one, so a task cannot be marked done with the gap open.

| # | Blocker | Ledger requirement | Status on `feat/module-3-frontend-core` |
|---|---|---|---|
| 1 | No fixture generator, so offline mode has nothing to read | `DATA-006` acceptance; `FE-003` depends on it | Still blocked on `M1` (`DATA-006`) |
| 3 | No test runner or `test` script | `ARCH-001` acceptance (`bun run test`); `FE-002` evidence requires it | Still blocked on `M1`/`M2` (`ARCH-001` owns `frontend/package.json`) |
| 5 | 2D map and persona mode are P1 but mounted in the P0 cockpit | `FE-001` acceptance (P0 cockpit mounts no P1 feature) | Fixed in `feat/module-3-frontend-core` (`AppShell.tsx`, `TopCommandBar.tsx`) |
| 6 | Horizon silhouette and timeline are placeholders | `FE-002` acceptance, items 4–6 | Fixed in `feat/module-3-frontend-core` (`sky-horizon/`, `mission-timeline/`) |
| 7 | No Class B badge, spherical-limb notice, or provenance footer | `FE-002` acceptance, items 1–3 and 9 | Fixed in `feat/module-3-frontend-core` (`SiteCard.tsx`, `AppShell.tsx`, `DataProvenanceFooter.tsx`) |
| 8 | No `step`, `array_az`, or `min_comms` controls | `FE-002` acceptance, item 8 | Fixed in `feat/module-3-frontend-core` (`DateAndDurationBar.tsx`) |
| 10 | Registry holds 6 sites, not 14 | `DATA-001` acceptance | Still blocked on `M1` (`DATA-001`) |

### Full list

| # | Issue | Where | Severity | Status |
|---|---|---|---|---|
| 1 | Fixtures deleted but no generator exists yet, so offline mode has nothing to read | `frontend/public/data/fixtures/` (absent), `DATA-006` | `BLOCKED` on `M1` | in `DATA-006` acceptance |
| 2 | `evaluateScenario`/`compareScenarios`/`scanWindows` now require a scenario key; comparison and windows callers are typed but their scenarios are P1 | `frontend/src/services/`, `P1-COMPARE`, `P1-WINDOWS` | low | open |
| 3 | No test runner or `test` script, so three ledger acceptance commands cannot run | `frontend/package.json`, `frontend/vitest.config.ts` | BLOCKER for P0 | in `ARCH-001` acceptance |
| 4 | Wire types are hand-maintained; `api.generated.ts` does not exist | `frontend/src/types/`, `ARCH-002` | MAJOR | in `ARCH-002` acceptance |
| 5 | 2D map and persona mode are built but are P1, mounted unconditionally in the cockpit | `frontend/src/features/lunar-map-2d/`, `frontend/src/features/persona-mode/` | MAJOR | `DONE` (code on `feat/module-3-frontend-core`; ledger `FE-001` pending `DOC-GATE` + `ARCH-001`) |
| 6 | Horizon silhouette and timeline are placeholders, the two P0 visualisations REQ-11 requires | `frontend/src/components/layout/AppShell.tsx` | BLOCKER for P0 | `DONE` (code on `feat/module-3-frontend-core`; ledger `FE-002` pending `DOC-GATE` + `ARCH-001`/`ARCH-002`) |
| 7 | No Class B badge, spherical-limb notice, or provenance footer in the UI | `frontend/src/components/`, `frontend/src/features/` | BLOCKER for P0 | `DONE` (code on `feat/module-3-frontend-core`; ledger `FE-002` pending `DOC-GATE` + `ARCH-001`) |
| 8 | No `step`, `array_az`, or `min_comms` controls; values exist in state and URL but no UI writes them | `frontend/src/features/time-controls/` | BLOCKER for P0 | `DONE` (code on `feat/module-3-frontend-core`; ledger `FE-002` pending `DOC-GATE` + `ARCH-001`) |
| 9 | Educational glossary asserts unsourced science (1.54° tilt, 40 K, ±6.5° libration, "uninterrupted" DTE) and generates narrative from booleans | `frontend/src/features/persona-mode/educationalGlossary.ts` | MAJOR | `DONE` (rewritten on `feat/module-3-frontend-core` without unsourced numeric figures) |
| 10 | Registry holds 6 sites, not the 14 REQ-05 requires | `backend/config/curated_sites.yaml` | BLOCKER for P0 | in `DATA-001` acceptance |
| 11 | `contracts/openapi-draft.yaml` still hand-maintained alongside Pydantic | `contracts/` | MAJOR | in `ARCH-002` acceptance |
| 12 | `backend/uv.lock` absent, pytest not installed, so no Python check can run | `backend/` | BLOCKER for P0 | in `ARCH-001` acceptance |
| 13 | Fixture `terrain.sample.json` is 16×16; production contract is 128×128 | `contracts/fixtures/` | MINOR | open |

### Resolved #9 note

- **#9, the educational glossary:** Replaced unsourced numeric claims and mojibake in `frontend/src/features/persona-mode/educationalGlossary.ts` with qualitative descriptions aligned to telemetry fields, keeping `F3.6` gated under `"explorer"` (P1).

---

## Pending work, by module

| Module | Next task | Blocked by |
|---|---|---|
| `M1` | `ARCH-001` pinned tooling, then `DATA-001` registry | `DOC-GATE` |
| `M2` | `ARCH-002` contract generation | `ARCH-001` |
| `M3` | `FE-001`, `FE-002` ledger verification (`bun run test`, `api.generated.ts`) once upstream tasks land; UI changes are on `feat/module-3-frontend-core` | `DOC-GATE`, `ARCH-001`, `ARCH-002` |
| `M4` | not startable | `P0-GATE` |
| `M5` | needs an owner | — |

---

## Decisions taken while working

| Decision | Reason |
|---|---|
| Corrected `M3` on `bauerceptor` rather than asking usairam to rewrite | The fabrication path sat in one file and depended on a constant table; deleting it was smaller than describing it. His component structure, CSS theme, and stores are kept. |
| Map and persona mode left in place, not deleted | Both are legitimate P1 work already written. Removing them would waste effort; the open issue is that they are mounted in the P0 cockpit, which is a routing fix, not a rewrite. |
| `svgPointToLatLon` kept in the map module | Pure projection geometry for a P1 feature, not physics; removing it would break the map for no safety gain. |
| Comparison store now passes a scenario key | The fallback contract requires one; typing it surfaced the missing P1 scenarios. |
