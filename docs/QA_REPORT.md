# Module 5 QA Report (`QA-001` Baseline on `feat/m5-comparison-qa-delivery`)

**Scope:** Verified implementation of Module 5 (`comparison-board`, `window-finder`, `briefing-export`, provenance footer, unit tests, smoke script, and demo script) reconciled with `DEVELOPMENT_PLAN.md` Revision 5 (`16`-site registry, `2026-01-01`–`2029-01-01` ephemeris window, `ARCH-001`, and `DATA-001`).
**Status of `QA-001`:** Blocked from final ledger closure until upstream `M1` (`DATA-002`–`DATA-006`), `M2` (`ARCH-002`, `BE-001`–`BE-003`), `M3` (`FE-001`–`FE-003`), and `P0-GATE` / `P1-APPROVAL` land on `main`.

---

## REQ-12 Evidence Matrix

| # | Category | Current Branch Status | Details & Gaps Observed |
|---|---|---|---|
| 1 | **Registry** (`DATA-001`) | `DONE (M1)` | `backend/config/curated_sites.yaml` contains all 16 REQ-05 entries with `coordinate_source_url`, verified by `backend/tests/unit/test_site_registry.py`. |
| 2 | **Terrain availability** (`DATA-005`, `BE-003`) | `PENDING (M1/M2)` | `backend/data/site_packs/` contains only `.gitkeep`; `GET /api/v1/sites/{id}/terrain` currently reads `contracts/fixtures/terrain.sample.json` and does not yet enforce 409 `TERRAIN_NOT_AVAILABLE` for Class B sites. |
| 3 | **Grid** (`DATA-005`) | `PENDING (M1)` | `dem_tiler.py` and `test_dem_tiler.py` not yet landed on `main`. |
| 4 | **Raycast** (`DATA-005`) | `PENDING (M1)` | `raycaster.py` and `test_raycaster.py` not yet landed on `main`. |
| 5 | **Ephemeris** (`DATA-003`, `DATA-004`, `BE-001`) | `PENDING (M1/M2)` | Horizons downloads (`26305` rows across `2026-01-01`–`2029-01-01`), `ephemeris.json` packs, `mission_time.py`, and `interpolation.py` not yet landed on `main`. |
| 6 | **Physics** (`BE-002`) | `PENDING (M2)` | `backend/src/domain/` contains only `constants.py`; domain modules (`horizon_geometry.py`, `solar_power.py`, `comms_visibility.py`, `countdown_detector.py`, `feasibility_scorer.py`) are not yet landed. |
| 7 | **Aggregation** (`BE-002`) | `PENDING (M2)` | Hand-computed unit tests and `P1-COMPARE` (`compare_scenarios.py`) / `P1-WINDOWS` (`scan_windows.py`) backend use cases are not yet landed; backend `/compare` and `/windows` still serve static fixtures. |
| 8 | **Contracts** (`ARCH-002`) | `PENDING (M2)` | `contracts/openapi.json` and `frontend/src/types/api.generated.ts` are not yet generated (`contracts/openapi-draft.yaml` and manual TS types remain); `backend/tests/integration/test_contracts_and_health.py` fails against the updated `/health` payload (`moon_radius_km`) and still expects `artemis-shackleton-ridge` fixtures. |
| 9 | **Offline** (`DATA-006`, `FE-003`) | `PARTIAL` | `httpClient.ts` enforces network/5xx fallback and `OFFLINE_FIXTURE_UNAVAILABLE`; `frontend/public/data/fixtures/manifest.json` does not exist yet because `DATA-006` (`build_pack_index.py`) has not run. |
| 10 | **Build** (`ARCH-001`, `FE-*`, `M5`) | `PASS (Frontend + Registry)` / `FAIL (Upstream Backend)` | Frontend `tsc --noEmit`, ESLint (`--max-warnings=0`), Prettier, 5 Vitest files, and `vite build` pass. Backend `test_site_registry.py` (`6/6`), `ruff check .`, and `ruff format --check .` pass; however upstream `mypy src tests` fails on `backend/src/infrastructure/site_registry_loader.py:8` (missing `types-PyYAML` stub) and `tests/integration/test_contracts_and_health.py` fails on `/health`. |
| 11 | **Docs & Guardrails** (`DOC-*`, `REQ-12`) | `PASS` | `validate_task_ledger.py`, `check_planning_docs.py`, `check_file_lengths.py` (`0` violations > 280 lines), and `git diff --exit-code -- README.md` exit `0`. |

---

## Verified Commands on `feat/m5-comparison-qa-delivery`

- `uv run --project backend --python 3.12 --frozen python scripts/validate_task_ledger.py` -> exit `0`
- `uv run --project backend --python 3.12 --frozen python scripts/check_planning_docs.py` -> exit `0`
- `uv run --project backend --python 3.12 --frozen python scripts/check_file_lengths.py` -> exit `0` (`0` violations > 280 lines)
- `git diff --exit-code -- README.md` -> exit `0`
- `cd frontend && ./node_modules/.bin/tsc --noEmit` -> exit `0`
- `cd frontend && ./node_modules/.bin/eslint . --max-warnings=0` -> exit `0`
- `cd frontend && ./node_modules/.bin/vitest run` -> exit `0` (`5` test files, `5` passed)
- `cd frontend && rm -rf dist && ./node_modules/.bin/prettier --check .` -> exit `0`
- `cd frontend && ./node_modules/.bin/vite build` -> exit `0`
- `cd backend && uv run --python 3.12 --frozen pytest -v tests/unit/test_site_registry.py` -> exit `0` (`6` passed)
- `cd backend && uv run --python 3.12 --frozen ruff check .` -> exit `0`
- `cd backend && uv run --python 3.12 --frozen ruff format --check .` -> exit `0`
- Observed upstream failures (tracked for `M1`/`M2`/`ARCH-002`):
  - `cd backend && uv run --python 3.12 --frozen mypy src tests` -> exit `1` (`src/infrastructure/site_registry_loader.py:8`: `Library stubs not installed for "yaml" [import-untyped]`)
  - `cd backend && uv run --python 3.12 --frozen pytest -v tests/integration/test_contracts_and_health.py` -> exit `1` (`1 failed, 5 passed`; `test_health_endpoint` fails on added `moon_radius_km`, while static contract fixtures still carry removed `artemis-shackleton-ridge`).

---

## Remaining Upstream Gaps Required Before Ship / `P0-GATE`

1. **M1 (`DATA-002`–`DATA-006`) + `types-PyYAML`:** Acquire LOLA 80 m DEM and JPL Horizons tracks (`2026-01-01`–`2029-01-01`, `26305` rows), add `types-PyYAML` or ignore rule in protected `backend/pyproject.toml` so `mypy src tests` exits `0` on `site_registry_loader.py`, build site packs + pack index, and generate `frontend/public/data/fixtures/manifest.json`.
2. **M2 (`ARCH-002`, `BE-001`–`BE-003`, `P1-COMPARE` / `P1-WINDOWS` backend):** Generate `contracts/openapi.json` and `frontend/src/types/api.generated.ts`, implement real physics/aggregation/countdown/scoring/compare/window endpoints, update integration tests for `/health` (`moon_radius_km`), Class B `409`, and `16`-site IDs, and run socket-disabled `pytest`.
3. **M3 (`FE-001`–`FE-003`):** Wire generated types via `frontend/src/types/index.ts`, gate P1 map/persona elements out of the default P0 cockpit, add `step` / `fixed_array_azimuth_deg` / `min_comms_elev_deg` controls, and resolve issue `#9` (`educationalGlossary.ts`).
4. **Gates (`P0-GATE`, `P1-APPROVAL`, `M5` assignment):** Close `P0-GATE` and `P1-APPROVAL` in `plan/task-ledger.json` and assign `M5` ownership in `plan/OWNERS.md` with human digest sign-off.
