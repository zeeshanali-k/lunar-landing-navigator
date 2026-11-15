# Module 5 QA Report (`QA-001` Baseline on `feat/m5-comparison-qa-delivery`)

**Scope:** Verified implementation of Module 5 (`comparison-board`, `window-finder`, `briefing-export`, provenance footer, unit tests, smoke script, and demo script) against `DEVELOPMENT_PLAN.md` (`REQ-01`–`REQ-12`).
**Status of `QA-001`:** Blocked from final ledger closure until upstream `M1`, `M2`, `M3`, and human approval gates (`DOC-GATE`, `P0-GATE`, `P1-APPROVAL`) land on `main`.

---

## REQ-12 Evidence Matrix

| # | Category | Current Branch Status | Details & Gaps Observed |
|---|---|---|---|
| 1 | **Registry** (`DATA-001`) | `PENDING (M1)` | `backend/config/curated_sites.yaml` does not yet contain all 14 REQ-05 entries with `coordinate_source_url`. |
| 2 | **Terrain availability** (`DATA-005`, `BE-003`) | `PENDING (M1/M2)` | `backend/data/site_packs/` contains only `.gitkeep`; `GET /api/v1/sites/{id}/terrain` currently reads `contracts/fixtures/terrain.sample.json` and does not yet enforce 409 `TERRAIN_NOT_AVAILABLE` for Class B sites. |
| 3 | **Grid** (`DATA-005`) | `PENDING (M1)` | `dem_tiler.py` and `test_dem_tiler.py` not yet landed on `main`. |
| 4 | **Raycast** (`DATA-005`) | `PENDING (M1)` | `raycaster.py` and `test_raycaster.py` not yet landed on `main`. |
| 5 | **Ephemeris** (`DATA-003`, `DATA-004`, `BE-001`) | `PENDING (M1/M2)` | Horizons downloads, `ephemeris.json` packs, `mission_time.py`, and `interpolation.py` not yet landed on `main`. |
| 6 | **Physics** (`BE-002`) | `PENDING (M2)` | `backend/src/domain/` contains only `constants.py`; domain modules (`horizon_geometry.py`, `solar_power.py`, `comms_visibility.py`, `countdown_detector.py`, `feasibility_scorer.py`) are not yet landed. |
| 7 | **Aggregation** (`BE-002`) | `PENDING (M2)` | Hand-computed unit tests and `P1-COMPARE` (`compare_scenarios.py`) / `P1-WINDOWS` (`scan_windows.py`) backend use cases are not yet landed; backend `/compare` and `/windows` still serve static fixtures. |
| 8 | **Contracts** (`ARCH-002`) | `PENDING (M2)` | `contracts/openapi.json` and `frontend/src/types/api.generated.ts` are not yet generated (`contracts/openapi-draft.yaml` and manual TS types remain). |
| 9 | **Offline** (`DATA-006`, `FE-003`) | `PARTIAL` | `httpClient.ts` enforces network/5xx fallback and `OFFLINE_FIXTURE_UNAVAILABLE`; however `frontend/public/data/fixtures/manifest.json` does not exist yet because `DATA-006` (`build_pack_index.py`) has not run. |
| 10 | **Build** (`ARCH-001`, `FE-*`, `M5`) | `PASS (Frontend)` / `BLOCKED (Backend)` | Frontend `tsc --noEmit`, 5 unit test files (`delayOffsets`, `exportHelpers`, `horizonMath`, `timelineSegments`, `windowMath`), and `vite build` pass. Backend `pytest`/`ruff`/`mypy` are absent from `backend/.venv`, and `bun` / `eslint` / `prettier` / `vitest` (`ARCH-001`) are not installed yet. |
| 11 | **Docs & Guardrails** (`DOC-*`, `REQ-12`) | `PASS (with human sign-off note)` | `scripts/validate_task_ledger.py` exits 0, `scripts/check_file_lengths.py` exits 0 (0 violations > 280 lines), `README.md` is unmodified (`git diff --exit-code -- README.md` exits 0). `scripts/check_planning_docs.py` flags the user's uncommitted edit to `plan/OWNERS.md` until signed off with `ALLOW_PROTECTED=1`. |

---

## Verified Commands on `feat/m5-comparison-qa-delivery`

- `python3 scripts/validate_task_ledger.py` -> exit `0` (`28 tasks validated, 2 done, no cycles, all anchors resolved`; confirms zero physics literals and zero prohibited AI/3D dependencies in `frontend/src/`).
- `python3 scripts/check_file_lengths.py` -> exit `0` (`0 violations > 280 lines`).
- `git diff --exit-code -- README.md` -> exit `0`.
- `cd frontend && ./node_modules/.bin/tsc --noEmit` -> exit `0`.
- Frontend unit tests via `./node_modules/.bin/esbuild <file> --bundle --platform=node --format=esm | node --input-type=module`:
  - `src/__tests__/delayOffsets.test.ts` -> exit `0`
  - `src/__tests__/exportHelpers.test.ts` -> exit `0`
  - `src/__tests__/horizonMath.test.ts` -> exit `0`
  - `src/__tests__/timelineSegments.test.ts` -> exit `0`
  - `src/__tests__/windowMath.test.ts` -> exit `0`
- `cd frontend && ./node_modules/.bin/vite build` -> exit `0`.

---

## Remaining Upstream Gaps Required Before Ship / `P0-GATE`

1. **Governance sign-off:** Human approval of `plan/OWNERS.md` (`ALLOW_PROTECTED=1 python3 scripts/check_planning_docs.py --refresh`), `DOC-GATE`, `P0-GATE`, and `P1-APPROVAL` in `plan/task-ledger.json`.
2. **M1 (`DATA-001`–`DATA-006`):** Close 14-site registry, acquire LOLA 80 m DEM and JPL Horizons tracks, build site packs and pack index, generate `frontend/public/data/fixtures/manifest.json`.
3. **M2 (`ARCH-001`, `ARCH-002`, `BE-001`–`BE-003`, `P1-COMPARE` / `P1-WINDOWS` backend):** Freeze `backend/uv.lock`, generate `contracts/openapi.json` and `frontend/src/types/api.generated.ts`, implement real physics/aggregation/countdown/scoring/compare/window endpoints, and run socket-disabled `pytest` + `ruff` + `mypy`.
4. **M3 (`FE-001`–`FE-003`):** Add `eslint.config.js`, `.prettierrc.json`, `vitest.config.ts`, `bun.lock` alignment, remove P1 map/persona/custom-coord elements from the default P0 cockpit, and resolve issue #9 (`educationalGlossary.ts`).
