# Lunar Landing Site Navigator — Development Plan

**Status:** OPERATIVE. This is the single plan and the only technical authority for implementation.
**Challenge:** [NASA Space Apps 2026 — Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/)
**Team:** three modules owned by three people; see [`plan/OWNERS.md`](plan/OWNERS.md).
**Revision:** 5. Revision 3 merged the former `HACKATHON_BUILD_PLAN.md` (revision 2) into this document and superseded both earlier files. Revision 4 aligns the registry to NASA's nine current Artemis III candidate regions and extends ephemeris coverage to 2026-01-01…2029-01-01; see Appendix D. Revision 5 defines the parallel agent execution model, branch-per-worktree policy, and integration protocol without changing any science, contract, or acceptance rule; see Appendix E. Revision 5 also reconciles the M4 frontend merge from `main` and records the IAU coordinate source of record; see Appendices E and F.

This plan replaces every earlier plan in this repository. `plan/00`–`plan/05` remain as historical design context and are not executable.

---

## Authority and precedence

There are exactly three authorities. They do not overlap.

| Authority | Governs |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Agent behaviour: task selection, allowed writes, command execution, evidence, blocking |
| **This file** (`DEVELOPMENT_PLAN.md`) | Technical scope, scientific definitions, contracts, data, acceptance requirements, gates |
| [`plan/task-ledger.json`](plan/task-ledger.json) | Executable task order, ownership, allowed paths, per-task commands and evidence |

**Conflict rule:** if any two authorities disagree, or any instruction is missing, the agent sets the task to `blocked`, records the exact conflict, and stops. An agent never resolves a conflict by choosing. Only a human-approved revision of this file and the ledger resolves it.

**Non-operative documents.** `README.md` and `plan/00`–`plan/05` are historical/design context. They are explicitly *not* executable instructions. Where they contradict this plan, this plan wins and the legacy text carries a `SUPERSEDED` marker. `HACKATHON_BUILD_PLAN.md` no longer exists; its content was merged here in revision 3.

**No silent substitution.** No agent may substitute a package manager, dependency, ephemeris source, frame, data product, file path, endpoint, algorithm, constant, or scope. All of these are closed below.

### Governance files

| File | Purpose |
|---|---|
| [`AGENTS.md`](AGENTS.md) | The agent protocol: authorities, task selection, allowed writes, blocking, commit identity. |
| [`WORK_LOG.md`](WORK_LOG.md) | The single record of what was actually done, by whom, what broke, and what is left. Never duplicate this history elsewhere. |
| [`plan/OWNERS.md`](plan/OWNERS.md) | Module → human → branch. The only place a person's name appears. |
| [`PROTECTED.md`](PROTECTED.md) | Files no agent may write: this plan, the ledger, the validators, hooks, and test configuration. |
| [`plan/protected-paths.txt`](plan/protected-paths.txt) | The machine-readable protected list the `commit-msg` hook enforces. |
| [`plan/protected.sha256`](plan/protected.sha256) | Digest manifest; drift fails the build even if the hook is bypassed. |

### Anti-tampering rule

An agent is judged by these checks and therefore may never modify them, relax them, or route around them. Specifically, an agent may not: edit a validator or the plan; delete, rename, skip, or weaken a test; widen a tolerance without a recorded reason; replace an assertion with a tautology; edit `.gitignore` or CI to exclude its own work; or mark a task `done` with incomplete evidence.

When a check fails, the agent reports the failure and stops. Making the check pass by changing the check is the one failure this project treats as disqualifying.

---

## Requirement index

| ID | Requirement | Primary tasks |
|---|---|---|
| [REQ-01](#req-01) | Precedence and agent authority | DOC-001, DOC-002, DOC-GATE |
| [REQ-02](#req-02) | Scope, ownership, and promotion/demotion | DOC-001, P1-APPROVAL |
| [REQ-03](#req-03) | Pinned tooling and canonical commands | ARCH-001 |
| [REQ-04](#req-04) | Data layout, provenance, and Git policy | ARCH-001, DATA-002, DATA-003, DATA-006 |
| [REQ-05](#req-05) | Closed site registry and terrain availability | DATA-001, DATA-005 |
| [REQ-06](#req-06) | Single contract source and pack schemas | ARCH-002 |
| [REQ-07](#req-07) | Ephemeris, mission time, and interpolation | DATA-003, DATA-004, BE-001 |
| [REQ-08](#req-08) | Terrain grid and raycast definitions | DATA-002, DATA-005 |
| [REQ-09](#req-09) | Physics, aggregation, countdowns, scoring | BE-002 |
| [REQ-10](#req-10) | API errors, offline behaviour, network isolation | BE-003, FE-003 |
| [REQ-11](#req-11) | Frontend scope, URL state, visualization | FE-001, FE-002 |
| [REQ-12](#req-12) | Validation, deterministic gates, prohibited work | QA-001, P0-GATE, P1-GATE |

<a id="req-01"></a>
## REQ-01 Precedence and agent authority

1. Read `AGENTS.md`, this file, and one ledger task before editing anything.
2. Select exactly one `pending` task whose `depends_on` entries are all `done`. Set it `in_progress` before work begins.
3. Modify only that task's declared `write_paths`. Never edit a generated file by hand.
4. Run the task's `commands` verbatim, in the listed order, from the declared `cwd`.
5. Agents may write only execution fields on the task: `status`, `evidence`, `blocked_reason`, `completed_at_utc`, `completed_commit`.
6. Agents may not alter `scope`, `priority`, `depends_on`, `requirement_ids`, `read_paths`, `write_paths`, `inputs`, `outputs`, `commands`, `acceptance`, or `required_evidence`. Those need a human-approved ledger revision.
7. Mark `done` only when every command exits as expected **and** every required evidence artefact exists.
8. On any failed command, missing input, or ambiguity: set `blocked` with the exact reason and stop. Do not attempt speculative fixes.
9. Do not edit `README.md`, do not start 3D work, do not add runtime downloads, and do not activate P1 without a completed `P1-APPROVAL` record.
10. Do not perform opportunistic cleanup, refactors, dependency upgrades, or "while I'm here" changes.
11. Parallel agents each select one task independently. A branch carries at most one `in_progress` task, and the integration branch never receives a branch whose task is still `in_progress`. A branch is integrated only after its task is `done` or `blocked`, and only the integrator merges it. See Appendix E.

<a id="req-02"></a>
## REQ-02 Scope, ownership, and promotion/demotion

### P0 — first shippable release

Sixteen curated sites; site/date/duration controls; precomputed Sun and Earth ephemeris; real LOLA terrain for covered sites and an honest `spherical_limb_only` model elsewhere; 360° horizon silhouette; multi-day power/DTE timeline; KPI strip with solar elevation and hours-to-sunset/earthset; power and DTE assessment; canonical shareable URL; and an offline demo that requires no network.

**P0 has no** custom coordinates, comparison, window heatmap, 2D polar map, 3D, PSR masks, export, Docker, cloud deployment, or database.

### P1 — only after `P1-APPROVAL`

Promoted to the front of P1 because they serve the challenge's explicit "rapid comparison" objective:

1. **`P1-COMPARE`** — side-by-side comparison of 2–4 scenarios with deltas versus baseline.
2. **`P1-DELAYS`** — launch-delay sensitivity at exactly **+14, +29.5, +90, +180 days**.
3. **`P1-MAP`** — 2D south-pole stereographic map using the generated overview product.
4. **`P1-WINDOWS`** — annual landing-window heatmap over precomputed data.
5. **`P1-CUSTOM-SITES`** — build-time onboarding of a new approved site pack, followed by normal curated-site access.

`P1-CUSTOM-SITES` means *build-time* pack generation. It must never introduce a runtime `POST /terrain/custom`, a runtime Horizons call, or a runtime download.

### Deferred with reasons (not executable tasks)

| Item | Reason |
|---|---|
| Arbitrary runtime custom coordinates | A precomputed offline pack cannot serve an arbitrary coordinate; see REQ-07 coverage. |
| PSR mask extraction | Requires a documented multi-epoch illumination analysis; not a single-elevation check (REQ-08). |
| Exact circular-segment disk overlap | The linear approximation in REQ-09 is locked and labelled; upgrading it needs a separate approved revision. |
| 3D terrain and shadow engine | Highest cost and risk, lowest challenge-value per hour; requires a new human-approved ledger revision after `P1-GATE`. |
| Briefing export | Only if a delivery task explicitly adds it; not a dependency of any P0/P1 task. |
| Docker / cloud deployment | Local run and a static build are sufficient for judging. |
| Millisecond performance targets | No performance claim without a measured artefact; precomputation makes them moot. |

### Non-goal — no runtime AI

This product contains **no artificial intelligence, machine learning, or inference of any kind**. This is a deliberate design decision, not an omission.

| Prohibited without exception | Why |
|---|---|
| Any model in a numeric path (ephemeris, horizon, power, DTE, countdowns, scoring, ranking) | Every judged number must be reproducible from committed data and closed-form code. A model output is unfalsifiable and cannot be checked against JPL references. |
| Any runtime inference call (local or remote) | Violates the runtime network isolation in REQ-10 and the offline demo guarantee. A model in the live demo path is a demo that can fail on stage. |
| Any local model weights, tokenizer, or inference runtime in the repository or container | Adds hundreds of MB, a new failure surface, and CPU latency with zero challenge value. |
| Any embedded model, ONNX runtime, llama.cpp, transformers, or similar dependency | Same reasons. Not a dependency of any P0, P1, or delivery task. |
| Any generative text in an API response | All user-visible explanatory text is a committed static template with computed values injected. Templates are more accurate than generation for this content and are instant. |

**Permitted and already in use:** deterministic templating for explanatory copy, where a committed string has computed values interpolated into it. This is not AI.

**Rationale for agents:** every requirement in this plan resolves to a lookup, an interpolation, a closed-form trigonometric expression, a zero-crossing search, or a weighted sum. If a proposed change would put a model in the path of any number the user sees, it is out of scope. Do not add a chatbot, an assistant, a natural-language filter, an LLM-based explanation, or a "smart" recommendation because a stakeholder asks about AI, because there is spare time, or because it seems impressive. Adding one requires a new human-approved revision of this plan and the ledger.

### Ownership

Ownership is by **module ID**, never by person. [`plan/OWNERS.md`](plan/OWNERS.md) is the single place identity lives; every ledger task names an `owner` and a `reviewer` module (`M1`–`M5`).

| Module | Scope | Owner |
|---|---|---|
| `M1` | Data, LOLA topography, ephemeris, raycast | bauerceptor |
| `M2` | Backend API, physics, scoring, contracts | **unassigned** |
| `M3` | Frontend core, site selection, 2D map, KPIs | usairam |
| `M4` | 3D terrain, sky-dome | devscion (gated) |
| `M5` | Comparison, windows, QA, delivery | **unassigned** |

`M2` blocks everything downstream: `M1` produces packs that only `M2` serves, and `M3` renders only what `M2` returns. `scripts/validate_task_ledger.py` refuses to accept a task as `in_progress` or `done` while its module has no assigned owner.

Work reaches `main` only through a pull request authored and merged by the human who owns that module. Shared files are listed in [`PROTECTED.md`](PROTECTED.md) and are human-owned; no agent writes them.

<a id="req-03"></a>
## REQ-03 Pinned tooling and canonical commands

### Python — exactly 3.12, exclusively uv

Authoritative configuration (applied by `ARCH-001`, specified here):

```text
backend/pyproject.toml
  requires-python = "==3.12.*"
  [tool.ruff]  target-version = "py312"
  [tool.mypy]  python_version = "3.12"   strict = false
backend/.python-version                 -> 3.12
backend/uv.lock                         -> committed
```

Bootstrap, once per machine:

```bash
cd backend
uv python install 3.12
uv lock
```

Steady state (the only form allowed in tasks and CI):

```bash
uv sync --python 3.12 --frozen
uv run --python 3.12 --frozen pytest -v
uv run --python 3.12 --frozen ruff check .
uv run --python 3.12 --frozen ruff format --check .
uv run --python 3.12 --frozen mypy src tests
uv run --python 3.12 --frozen uvicorn src.api.main:app --reload --port 8000
```

From the repository root, use the `--project` form: `uv run --project backend --frozen <cmd>`.

No alternative Python install or dependency-install workflow is permitted anywhere in documents, tasks, CI, or code.

`mypy` runs in **non-strict** mode for this build. `strict = true` is a post-hackathon goal.

### JavaScript/TypeScript — Bun primary, pnpm secondary

```text
frontend/package.json  "packageManager": "bun@<pinned>"
frontend/bun.lock      committed (the only frontend lockfile)
```

Primary:

```bash
cd frontend
bun install --frozen-lockfile
bun run typecheck      # tsc --noEmit
bun run lint           # eslint . --max-warnings=0
bun run format:check   # prettier --check .
bun run test           # vitest run
bun run build          # tsc --noEmit && vite build
bun run dev
```

Fallback, only when Bun is unavailable on the machine:

```bash
pnpm install --no-lockfile
pnpm run <the same script names>
```

Never commit a second lockfile. Never introduce another package manager.

### Locked library choices

| Concern | Decision |
|---|---|
| Styling | Existing CSS custom properties in `frontend/src/index.css`. No Tailwind. |
| Charts/map | Hand-written SVG plus pure TypeScript scaling/path helpers. No chart library, no D3, no Mapbox. |
| 3D | None in P0/P1. `three` / `@react-three/fiber` / `@react-three/drei` are removed unless a later approved 3D revision re-adds them. |
| HTTP | Native `fetch` + `AbortController`. No Axios. |
| State | Zustand, split into mission / playback / comparison stores. |
| Tests | Vitest, Node environment. jsdom only if component tests are added. |
| Types | Generated from the backend contract (REQ-06). |

<a id="req-04"></a>
## REQ-04 Data layout, provenance, and Git policy

```text
data/
  downloads/                      # IGNORED. raw upstream bytes only
    lola/ldem_80s_80m.img
    lola/ldem_80s_80m.lbl
    horizons/{site_id}.{sun|earth}.txt
  manifests/                      # TRACKED. provenance and frozen references
    lola/manifest.json
    horizons/{site_id}.{sun|earth}.json
    references/horizons/*.json
    site_packs/index.json
backend/data/site_packs/          # TRACKED. generated, validated runtime JSON
  {site_id}/ephemeris.json
  {site_id}/terrain.json          # only when real LOLA coverage exists
```

`.gitignore` (applied by `ARCH-001`):

```gitignore
/data/downloads/
/data/manifests/**/*.raw
```

`data/manifests/` and `backend/data/site_packs/` are tracked so an offline demo and a fresh clone work without network access.

### Source of terrain data — exactly one product

| Field | Value |
|---|---|
| Product | `ldem_80s_80m.img` + `ldem_80s_80m.lbl` |
| Location | `https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/` |
| Required size | **115,520,000 bytes** (exact) |
| Shape | 7600 × 7600, `LSB_INTEGER`, 16-bit |
| Scale | `MAP_SCALE = 80 m/pix` |
| Projection | `POLAR STEREOGRAPHIC`, center latitude −90, center longitude 0 |
| Latitude type | `PLANETOCENTRIC` |
| Reference | `OFFSET = 1737400 m` (radius, not height) |
| Projection offsets | `LINE_PROJECTION_OFFSET = SAMPLE_PROJECTION_OFFSET = 3799.5` |
| Coverage | 80°S – 90°S |

Superseded and forbidden: `LDEM_80S_120M`, `LDEM_16`, any GeoTIFF assumption, and any global DEM. The global LOLA GDR directory returns HTTP 404 "WEBPAGE UNAVAILABLE"; the cylindrical tiles are 900 MB–2 GB per tile and are not used.

### Ephemeris source — JPL Horizons, build time only

Locked request parameters:

| Parameter | Value |
|---|---|
| Endpoint | `https://ssd.jpl.nasa.gov/api/horizons.api` |
| `COMMAND` | `'10'` for the Sun, `'399'` for Earth |
| `CENTER` | `'coord@301'` (Moon body centre, topocentric site) |
| `COORD_TYPE` | `'GEODETIC'` |
| `SITE_COORD` | `'<east_longitude_deg>,<latitude_deg>,<altitude_KILOMETRES>'` |
| `QUANTITIES` | `'4'` (apparent azimuth/elevation) |
| `EPHEM_TYPE` | `'OBSERVER'` |
| `OBJ_DATA` | `'NO'` |
| Frame | **MOON_ME**, east-positive longitude |

**Unit trap — locked:** `SITE_COORD` altitude is in **kilometres**, not metres. Convert site elevation `m → km` by dividing by 1000 before building the request. Longitude is **east-positive** on the Moon; do not convert to west-positive.

**Response parsing — locked:** rows lie between `$$SOE` and `$$EOE`. Each row carries a marker column that may be `*`, `*i`, or `*m`; a pattern expecting only `*` silently matches nothing. Same-day `START_TIME` and `STOP_TIME` are rejected by the service, so stop must be strictly later.

### Manifest requirements

Every downloaded artefact records: original URL, final URL after redirects, retrieval UTC, HTTP status, byte count, SHA-256, product/label metadata, parser version, and the SHA-256 of every generated output derived from it.

Every Horizons manifest records: the complete ordered parameter set, canonical request JSON, `COMMAND`, `CENTER`, `COORD_TYPE`, `SITE_COORD`, `QUANTITIES`, frame identification, retrieval UTC, HTTP status, byte count, raw-response SHA-256, parsed row count, and generated-pack SHA-256.

Downloads write to `<name>.part`, verify size and hash, then atomically rename. A hash mismatch fails the task; it never silently replaces the expected source.

**Network isolation:** download code lives under `backend/src/cli/` only. `backend/src/api/`, `backend/src/application/`, and `backend/src/domain/` must not import it. Runtime never contacts the network.

<a id="req-05"></a>
## REQ-05 Closed site registry and terrain availability

Exactly **16 unique** entries, in this order, which is the `GET /api/v1/sites` response order:

| # | `id` | Name | Category | Terrain |
|---|---|---|---|---|
| 1 | `artemis-cabeus-peak` | Peak near Cabeus B | `artemis_iii` | LOLA |
| 2 | `artemis-haworth` | Haworth | `artemis_iii` | LOLA |
| 3 | `artemis-malapert-massif` | Malapert Massif | `artemis_iii` | LOLA |
| 4 | `artemis-mons-mouton-plateau` | Mons Mouton Plateau | `artemis_iii` | LOLA |
| 5 | `artemis-mons-mouton` | Mons Mouton | `artemis_iii` | LOLA |
| 6 | `artemis-nobile-rim-1` | Nobile Rim 1 | `artemis_iii` | LOLA |
| 7 | `artemis-nobile-rim-2` | Nobile Rim 2 | `artemis_iii` | LOLA |
| 8 | `artemis-degerlache-rim-2` | de Gerlache Rim 2 | `artemis_iii` | LOLA |
| 9 | `artemis-slater-plain` | Slater Plain | `artemis_iii` | LOLA |
| 10 | `clps-mare-crisium` | Mare Crisium (Blue Ghost) | `clps_commercial` | limb only |
| 11 | `clps-gruithuisen-domes` | Gruithuisen Domes | `clps_commercial` | limb only |
| 12 | `clps-lacus-mortis` | Lacus Mortis | `clps_commercial` | limb only |
| 13 | `apollo-11-tranquillitatis` | Apollo 11 (Mare Tranquillitatis) | `apollo_historic` | limb only |
| 14 | `apollo-15-hadley-rille` | Apollo 15 (Hadley Rille) | `apollo_historic` | limb only |
| 15 | `isro-chandrayaan-3-shiv-shakti` | Chandrayaan-3 (Shiv Shakti Point) | `international` | limb only |
| 16 | `cnsa-change-4-von-karman` | Chang'e-4 (Von Kármán Crater) | `international` | limb only |

Rules:

1. The `artemis_iii` nine are NASA's current Artemis III candidate landing regions, announced 2024-10-28 ([NASA release 24-136](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/)). They replaced the original 2022 set of thirteen; Shackleton Connecting Ridge and Faustini Rim A were excluded in that downselect and are not in the registry.
2. Every entry carries a `coordinate_source_url` recording where its `lat_deg`/`lon_deg` came from. **An agent must never invent a coordinate.** If a provenance URL cannot be captured, `DATA-001` is `blocked`.
   The source of record is the IAU/USGS Gazetteer of Planetary Nomenclature feature centre (`https://planetarynames.wr.usgs.gov/Feature/<id>`). A QuickMap pinned URL is the documented fallback only when the gazetteer has no suitable feature or is unavailable; Wikipedia, blogs, and eyeballed map images are never a source. This is the coordinate policy for the registry; no later task re-sources or invents a coordinate.
3. `Mons Mouton` and `Mons Mouton Plateau` are two distinct Artemis III regions on the same massif, not a duplicate. Secondary mission associations live in `summary`, not in extra categories.
4. `elevation_m` and `mean_slope_deg` are derived from the generated site pack, never hand-entered.
5. `has_precomputed_terrain` reflects actual pack presence, not registry intent.
6. `parent_body` is not modelled; lunar sites only.

### Terrain availability model — two explicit classes

**Class A — LOLA-covered (the 9 south-polar sites, latitude ≤ −80°).** Real DEM patch, real elevation, real slope, real 360° horizon.

**Class B — `spherical_limb_only` (the other 7).** No fabricated data whatsoever:

- no `TerrainPatch`, no `elevation_m`, no `mean_slope_deg`, no PSR mask;
- `has_precomputed_terrain = false`;
- Sun/Earth geometry is evaluated against the spherical limb only;
- `GET /api/v1/sites/{id}/terrain` returns **409 `TERRAIN_NOT_AVAILABLE`**;
- `terrain_score` and `feasibility_score` are **`null`**, and the remaining sub-scores are **not** renormalised to hide the gap;
- the UI must display "Terrain model unavailable — spherical limb only".

This is a deliberate, labelled model limitation. It must never be described as measured topography.

<a id="req-06"></a>
## REQ-06 Single contract source and pack schemas

### One source of truth

Pydantic v2 models in `backend/src/api/schemas/` are authoritative.

**No duplication is permitted anywhere.** Exactly one artefact owns each fact:

| Fact | Sole owner | Everything else |
|---|---|---|
| Wire contract shape | `backend/src/api/schemas/*.py` | `contracts/openapi.json` and `frontend/src/types/api.generated.ts` are **generated**; never hand-edited |
| Fixture content | generator in `backend/src/cli/build_pack_index.py` | `contracts/fixtures/` and `frontend/public/data/fixtures/` are **generated copies**; a hand edit to either is a defect |
| Site registry | `backend/config/curated_sites.yaml` | `SiteSummary` is derived at load time; do not restate coordinates in code, fixtures, or tests |
| Physical constants | `backend/src/domain/constants.py` | tests import them; tests must not restate literal values already defined there |
| Canonical URL keys | this plan, REQ-11 | parsed from one allowlist module; not repeated per component |
| Physics formulas | `backend/src/domain/` | no second implementation in `cli/`, tests, or the frontend |

**The frontend computes no physics.** Every number a user sees arrives from the API. Consequently the frontend must not define physical constants, coordinate transforms, or horizon/illumination math. Specifically, the current `frontend/src/types/coordinates.ts` is replaced in P0: `MOON_RADIUS_KM` and `POLE_LAT_CLAMP_DEG` are deleted (clamping and radius belong to the backend), `clampLunarLatitude` is deleted (validation happens server-side and returns a 422), and `azElevToThreeXYZ` is deleted (it exists only for 3D, which is out of scope). The frontend retains only display helpers that are provably not physics: degrees/radians conversion and azimuth normalisation for rendering.

A check in `QA-001` fails the build if `contracts/fixtures` and `frontend/public/data/fixtures` differ, if any generated file was modified by hand, or if a physical constant literal appears in `frontend/src/`.

```bash
# generation, run by ARCH-002 and checked by QA-001
uv run --project backend --frozen python -m src.cli.export_openapi   # -> contracts/openapi.json
bun run --cwd frontend gen:types                                     # -> src/types/api.generated.ts
```

`contracts/openapi-draft.yaml` becomes non-operative historical material. Hand-maintained TypeScript wire interfaces are replaced by `api.generated.ts`. CI fails on drift between Pydantic models, `openapi.json`, generated types, and the committed fixtures.

Request models set `extra="forbid"`. A misspelled field must fail validation rather than silently take a default.

### P0 endpoints only

```text
GET  /api/v1/health
GET  /api/v1/sites
GET  /api/v1/sites/{site_id}/terrain
POST /api/v1/evaluate
```

`/compare`, `/windows`, `/terrain/custom`, and `/sites/{id}/terrain` for Class B sites return 404 or 409 exactly as specified in REQ-10. They are not registered in P0 except where REQ-10 requires a response.

### Enumerations and request allowlists

```text
duration_days    : 7 | 14 | 29.5
step_minutes     : 10 | 60
observer_height_m: 1.5 | 2.0 | 10.0
solar_array_type : horizontal_fixed | vertical_fixed | vertical_tracking
fixed_array_azimuth_deg : default 0.0        (0 = north, 90 = east), range [0, 360)
min_comms_elev_deg      : default 5.0, range [-5.0, 45.0]
site_id                 : one of the 16 registry IDs
```

Values outside an allowlist are a **422**. `observer_height_m` is an allowlist rather than a range because only three horizon profiles are precomputed (REQ-08).

### `EphemerisPack`

```json
{
  "schema_version": 1,
  "site_id": "artemis-shackleton-ridge",
  "frame": "MOON_ME",
  "longitude_convention": "east_positive",
  "azimuth_convention": "clockwise_from_north",
  "start_utc": "2026-01-01T00:00:00Z",
  "stop_utc": "2029-01-01T00:00:00Z",
  "step_seconds": 3600,
  "sample_count": 26305,
  "sun_az_deg": [0.0],
  "sun_elev_deg": [0.0],
  "earth_az_deg": [0.0],
  "earth_elev_deg": [0.0],
  "source_manifest_sha256": "…",
  "site_coord_used": { "lon_deg": 135.2, "lat_deg": -89.45, "altitude_km": 1.24 }
}
```

Invariants: `sample_count = (stop − start)/step + 1`; all four arrays have exactly `sample_count` finite values; `sun_az_deg` and `earth_az_deg` in `[0, 360)`; elevations in `[-90, 90]`; timestamps derived as `start + i·step_seconds`.

### `TerrainPack`

```json
{
  "schema_version": 1,
  "site_id": "artemis-shackleton-ridge",
  "model": "lola_80s_80m",
  "source_manifest_sha256": "…",
  "frame": "local_enu",
  "grid_size": 128,
  "extent_m": 40000.0,
  "spacing_m": 314.9606299212598,
  "row_direction": "south_to_north",
  "column_direction": "west_to_east",
  "center_elevation_m": 0.0,
  "elevations_m": [0.0],
  "slopes_deg": [0.0],
  "horizons": [
    { "observer_height_m": 1.5,  "azimuth_deg": [0.0], "terrain_elev_deg": [0.0], "geometric_limb_deg": [0.0] },
    { "observer_height_m": 2.0,  "azimuth_deg": [0.0], "terrain_elev_deg": [0.0], "geometric_limb_deg": [0.0] },
    { "observer_height_m": 10.0, "azimuth_deg": [0.0], "terrain_elev_deg": [0.0], "geometric_limb_deg": [0.0] }
  ],
  "psr_mask": null
}
```

Invariants: `elevations_m` and `slopes_deg` have exactly `grid_size² = 16384` finite values; flattening is `index = row·128 + column`; each `azimuth_deg` is exactly `[0,1,…,359]`; `psr_mask` is `null` in P0.

<a id="req-07"></a>
## REQ-07 Ephemeris, mission time, and interpolation

### Coverage

**2026-01-01T00:00:00Z through 2029-01-01T00:00:00Z inclusive, hourly, 26,305 samples per body per site.**

The stop date is **2029-01-01**, not 2028-12-31. A stop of 2028-12-31 yields only 26,281 samples and silently drops the final day. Verified against Horizons: `START_TIME='2026-01-01'`, `STOP_TIME='2029-01-01'`, `STEP_SIZE='1h'` returns exactly 26,305 rows.

Rationale: supports current-date evaluation, the reference scenario (2027-11-01), all four launch delays (+14, +29.5, +90, +180 d), and every P1 window candidate including its 15-day lookahead. Latest evaluable start is ≈ 2028-11-16.

**Hard rule:** an evaluation is valid only if `start + mission_duration + 15 days ≤ coverage_stop`, and `start ≥ coverage_start`. Otherwise reject with `422 EPHEMERIS_RANGE_EXCEEDED`. Never extrapolate, never clamp silently, never serve a neighbouring site's data.

### Mission sampling

Timezone-aware UTC only. Naive timestamps are a 422. Output is always `…Z`.

```text
t[i] = start + i · step          for i = 0 … N−1        (start inclusive, end exclusive)
N    = duration_days · 1440 / step_minutes
```

| Duration | 60-min steps | 10-min steps |
|---|---:|---:|
| 7 days | 168 | 1008 |
| 14 days | 336 | 2016 |
| 29.5 days | 708 | 4248 |

The allowlists guarantee `N` is integral. Each sample represents exactly `step` hours. There is no duplicated endpoint sample.

### Interpolation

- Elevation: linear between the two bracketing hourly samples.
- Azimuth: shortest signed angular delta,

```text
delta = ((a1 − a0 + 180) mod 360) − 180
a(f)  = (a0 + f · delta) mod 360
```

- No extrapolation beyond either endpoint.
- Interpolation error must be `< 0.05°`, proven against frozen off-grid Horizons references (`QA-001`), using circular difference for azimuth.

### Lookahead

Transition detection (REQ-09) samples internally up to `end_utc + 15 days`. Lookahead samples are **never** returned in `timeseries`. `next_events_from_start` must be exactly equal to the countdown fields of `timeseries[0]`.

<a id="req-08"></a>
## REQ-08 Terrain grid and raycast definitions

### `local_enu` grid — closed

| Property | Value |
|---|---|
| Size | 128 × 128 |
| Flattening | `index = row · 128 + column` |
| Columns | west → east (`+X = East`) |
| Rows | south → north (`+Y = North`) |
| Outer sample-centre extent | 40,000 m |
| Spacing | `40000 / 127 = 314.9606299212598 m` |
| East coordinate | `east_m = (column − 63.5) · spacing_m` |
| North coordinate | `north_m = (row − 63.5) · spacing_m` |
| `center_elevation_m` | DEM sample at the site coordinate itself, not a grid average |
| Slope | `np.gradient(elevations, spacing_m)` per axis, then `atan(|∇|)` in degrees |

The 128 × 128 patch at 315 m spacing already oversamples the 80 m DEM by ~4×. That is intentional and sufficient; do not request a finer grid.

### Pixel-to-`local_enu` resampling

In a south-polar stereographic grid, pixel axes rotate against local north by the site longitude. Sample each column along local **East** and each row along local **North**, using bilinear interpolation, so that `0° = North` and `90° = East` hold at every longitude.

**Do not guess the rotation sign.** `DATA-002` must probe known pixels and assert the direction in a unit test; a mirrored longitude axis is invisible on symmetric craters and catastrophic on Shackleton Connecting Ridge.

### Raycast — closed

| Property | Value |
|---|---|
| Azimuths | 0…359°, 1° steps |
| Radial samples | 240, logarithmically spaced |
| Radius range | **0.15 km → 120 km** |
| Moon radius | 1737.4 km |
| Refraction | none (zero lunar atmosphere) |
| Source surface | the full source DEM, **not** the 40 km display patch |
| Observer heights | 1.5 m, 2.0 m, 10.0 m (precomputed separately) |

**120 km is a hard ceiling, not a preference.** The DEM ends at 80°S; the closest covered site (Mons Mouton, −84.65°) has only ~141 km to that boundary, so 150 km sampling would run off the array. Clamp to 120 km and assert per-site boundary safety in a test.

Apparent elevation for a sample at surface height `h`, ground range `d`, observer `h₀`:

```text
ψ = d / R_moon
θ = atan2( (R + h)·cos ψ − (R + h₀),  (R + h)·sin ψ )
```

Geometric limb:

```text
θ_limb = −acos( (R + h_ground) / (R + h₀) )
```

which is ≈ −0.087° for a 2 m observer on flat ground. A flat surface therefore yields ≈ −0.087°, **not** 0°.

`terrain_elev_deg` and `geometric_limb_deg` are stored separately. The effective horizon used for visibility is:

```text
H(az) = max( terrain_elev_deg, geometric_limb_deg )
```

**PSR is not computed in P0.** A single peak-elevation check does not establish permanent shadow; that requires a documented multi-epoch illumination analysis. `psr_mask` is `null`.

<a id="req-09"></a>
## REQ-09 Physics, aggregation, countdowns, scoring

All formulas below are normative. No constant may be tuned to produce a preferred percentage.

### Solar illumination — linear occultation approximation

```text
r_sun = 0.267 deg
f_sun = clamp( (sun_elev_deg − H(sun_az_deg) + r_sun) / (2·r_sun), 0, 1 )
is_sunlit = f_sun > 0
```

This is an explicitly labelled **linear approximation** of partial occultation by the terrain edge, not an exact circular-segment area fraction. It is locked for this build.

### Solar power

```text
horizontal_fixed : f_sun · max(0, sin(sun_elev))
vertical_fixed   : f_sun · max(0, cos(sun_elev) · cos(sun_az − fixed_array_azimuth))
vertical_tracking: f_sun · max(0, cos(sun_elev))
irradiance_w_m2  = 1361 · solar_power_factor
```

`solar_power_factor` is clamped to `[0, 1]`.

### Direct-to-Earth

```text
earth_clearance_deg = earth_elev_deg − H(earth_az_deg)
is_dte_geometric    = earth_clearance_deg ≥ min_comms_elev_deg      # equality passes
sun_earth_sep_deg   = acos( clamp( cos(ze)·cos(ae) + sin(ze)·sin(ae)·cos(Δaz), −1, 1 ) )
is_solar_conjunction = sun_earth_sep_deg < 1.5
is_dte_available    = is_dte_geometric and not is_solar_conjunction
```

`min_comms_elev_deg` is clearance **above the effective horizon**, not elevation above the horizontal plane. Both interpretations appear in the legacy docs; this one is authoritative. `is_dte_geometric` and `is_solar_conjunction` are both exposed so neither is hidden.

Chang'e-4 reports zero DTE hours because its geometry produces it. There must be no site-specific special case anywhere.

### Aggregation

With `Δ_h = step_minutes / 60` and `N` mission samples:

```text
hours_in_state          = count(state) · Δ_h
fraction                = count(state) / N
longest_…_streak_hours  = longest_consecutive_run(state) · Δ_h
mean_solar_power_factor = mean over all N samples   (darkness included)
dte_comms_hours         = count(is_dte_available) · Δ_h
dte_fraction            = count(is_dte_available) / N
overlap_sun_and_dte_hours = count(is_sunlit and is_dte_available) · Δ_h
overlap_fraction        = count(is_sunlit and is_dte_available) / N
```

Streaks are clipped to the mission window. Aggregates use only mission samples; lookahead exists solely for countdowns.

### Countdowns

For each sample, scan forward for the next **strictly future** transition: solar zero-crossing of `f_sun`, and DTE crossing of the clearance threshold or the conjunction boundary. Interpolate the crossing time linearly between bracketing samples and report elapsed hours from the current sample. Return `null` when no transition occurs within the 15-day lookahead.

### Feasibility scoring

For Class A (LOLA-covered) sites:

```text
P = 100 · (0.5·sunlit_fraction + 0.5·mean_solar_power_factor)
T = 100 · exp( −max(0, longest_dark_streak_hours − 24) / 72 )
C = 100 · (0.75·dte_fraction + 0.25·overlap_fraction)
R = 100 · clamp( (15 − mean_slope_deg) / 10, 0, 1 )
feasibility_score = 0.35·P + 0.25·T + 0.25·C + 0.15·R
```

For Class B (limb-only) sites, `R` and `feasibility_score` are `null`; `P`, `T`, and `C` are still reported.

Risk warnings are deterministic strings emitted when a stated threshold is crossed (dark streak > 24 h, DTE fraction < 0.25, mean slope > 10°, horizontal array power < 0.10 at mean elevation < 5°). Warning text is fixed in `BE-002`, not improvised per request.

### Prohibited reasoning

- Never adjust physics, constants, or epochs to reach a target `sunlit_fraction`.
- Ephemeris and terrain validate **independently**. A topocentric solar position does not demonstrate observed illumination; local terrain can block the Sun.
- Never assert a measured illumination history without citing an independent product.
- Describe polar seasonality as **annual (~365 days)** with **~18.6-year nodal modulation**. The 2027–2028 pack cannot show a full nodal cycle. Do not claim a 346-day seasonal cycle: 346.6 days is the eclipse year and the draconic month is 27.212 days.

<a id="req-10"></a>
## REQ-10 API errors, offline behaviour, network isolation

### Error envelope

```json
{ "error": { "code": "STRING", "message": "STRING", "details": {} } }
```

| Status | Code | When |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Schema violation, naive UTC, out-of-allowlist value, forbidden extra field |
| 422 | `EPHEMERIS_RANGE_EXCEEDED` | Mission plus lookahead outside pack coverage |
| 404 | `SITE_NOT_FOUND` | Unknown `site_id` |
| 409 | `TERRAIN_NOT_AVAILABLE` | Class B site terrain request |
| 503 | `SITE_PACK_UNAVAILABLE` | Required pack missing |
| 503 | `SITE_PACK_INVALID` | Pack fails schema/invariant validation |
| 500 | `INTERNAL_ERROR` | Unexpected only |

An error must never cause fabricated data, a fallback to another site, or a canned fixture.

### Runtime network isolation

- `backend/src/api/`, `application/`, `domain/`: no outbound network calls.
- Download and Horizons clients may be imported only from `backend/src/cli/`.
- `QA-001` runs the API suite with sockets disabled and requires success.

### Frontend fallback — exact

1. Fallback triggers **only** on network failure or a 5xx from the API.
2. It applies **only** when the canonical scenario key matches a generated fixture manifest exactly.
3. It displays a persistent **"Offline fixture"** badge.
4. 4xx contract errors never fallback.
5. An unmatched scenario shows **`OFFLINE_FIXTURE_UNAVAILABLE`**.
6. Fixtures are generated from the same packs and validated against the same Pydantic contracts.

<a id="req-11"></a>
## REQ-11 Frontend scope, URL state, visualization

### P0 screens

Single workspace: site selector (grouped by category, Class B badge), date/duration/step controls, array type + azimuth + mast height, KPI strip, 360° horizon silhouette, multi-day timeline, and a persistent data-provenance footer.

### Canonical URL state

Exactly these keys, in this order:

```text
site, start, days, step, array, array_az, mast, min_comms
```

Parsing validates against the same allowlists and defaults as the backend. Serialisation is deterministic so a shared link round-trips. Unknown keys are dropped; invalid values fall back to the documented default **and** the UI shows a notice. Custom-coordinate keys are rejected in P0.

### Visualisation rules

- **Horizon silhouette:** SVG. Solid terrain silhouette from `terrain_elev_deg`; dashed geometric limb from `geometric_limb_deg`; Sun and Earth markers at the active sample; hover shows azimuth, body elevation, horizon elevation, and clearance.
- **Timeline:** SVG. Three stacked tracks — solar (sunlit / grazing / dark), DTE (available / blocked), and elevation curves. Playhead scrubs the active sample.
- **KPI strip:** feasibility with sub-scores, solar elevation and status, hours to sunset/sunrise, Earth clearance and DTE status, hours to earthset/earthrise. Countdowns highlight under 12 h.
- **Class B sites:** no terrain-dependent chart; show the spherical-limb-only notice and a `null` feasibility score.
- Static paths are memoised; playhead state lives in `usePlaybackStore` so scrubbing does not re-render the shell.

No chart library. No Tailwind. No 3D in P0/P1.

<a id="req-12"></a>
## REQ-12 Validation, deterministic gates, prohibited work

All acceptance is a command or a frozen numeric comparison. Prohibited acceptance language: "looks right", "looks like a moon ridge", "real NASA physics", "believable", "polish", "responsive", "nearly free", "real slack", "all tests pass".

### Required evidence

1. **Registry** — exactly 16 unique IDs, unique names, finite coordinates in range, a provenance URL per entry.
2. **Terrain availability** — pack presence matches `has_precomputed_terrain`; Class B terrain request returns 409.
3. **Grid** — 128×128, 16,384 finite values, spacing `40000/127`, row/column directions, one axis-orientation unit test against probed pixels.
4. **Raycast** — synthetic crater recovers analytic horizon within `< 0.02°`; flat surface yields the analytic limb for all three heights; a boundary test proves no sampling beyond 120 km.
5. **Ephemeris** — direct samples match frozen Horizons references exactly; off-grid interpolation error `< 0.05°` using circular azimuth difference; a coverage test rejects out-of-range requests.
6. **Physics** — golden tests for `f_sun` at 0 / partial / full, all three array modes, DTE threshold equality, conjunction, and Class B `null` scores.
7. **Aggregation** — counts, fractions, streaks, means against hand-computed cases; `next_events_from_start` equals `timeseries[0]`.
8. **Contracts** — Pydantic → `openapi.json` → `api.generated.ts` → fixtures drift check fails on any diff; extra fields rejected.
9. **Offline** — API suite passes with sockets disabled; frontend fixture fallback covered by tests including the 4xx no-fallback case.
10. **Build** — `ruff check`, `ruff format --check`, `mypy`, `bun run typecheck`, `lint`, `format:check`, `test`, `build` all exit 0.
11. **Docs** — `scripts/validate_task_ledger.py` and `scripts/check_planning_docs.py` exit 0; `README.md` unchanged; file-length gate passes.

### Gates

`DOC-GATE` → `P0-GATE` → `P1-APPROVAL` → `P1-GATE`. A gate is satisfied only by a human recording approval in the ledger after the dependent commands pass. P1 tasks stay `pending` until `P1-APPROVAL` is `done`.

### Prohibited work

Runtime downloads; runtime ephemeris computation; arbitrary custom coordinates in P0; 3D/Three.js/R3F; Tailwind; chart libraries; Docker; databases; PSR computation; exact disk-area overlap; performance claims without a measured artefact; editing generated files by hand; editing `README.md` before its delivery task; inventing coordinates, hashes, reference values, or provenance URLs; tuning physics to reach expected percentages.

---

## Appendix A — Verified external facts

Measured against live servers on 2026-11-14. Values marked ✔ were re-confirmed against the Horizons manual.

| Fact | Value |
|---|---|
| `ldem_80s_80m.img` size | 115,520,000 bytes ✔ |
| `ldem_80s_80m.img` shape/scale | 7600 × 7600, 16-bit LSB, 80 m/pix ✔ |
| Grid coverage | 80°S – 90°S, polar stereographic, planetocentric, centre lon 0 ✔ |
| `OFFSET` | 1,737,400 m (reference radius) ✔ |
| Global LOLA GDR (`ldem_16`, `ldem_4`) | HTTP 404, "WEBPAGE UNAVAILABLE" |
| Valley `ldem_1024` cylindrical tile | 943,718,400 bytes (unused) |
| `ldem_256` hemispheric tile | 2,123,366,400 bytes (unused) |
| Horizons topocentric lunar observer | Supported via `CENTER='coord@301'` ✔ |
| Horizons `SITE_COORD` altitude unit | **kilometres** ✔ |
| Horizons lunar frame / longitude | MOON_ME, east-positive ✔ |
| Horizons full year @ 1 h | 8761 rows, 400,256 bytes, ~3.0 s |
| Sun @ Shackleton, 2027-11-01T00:00Z | az 20.104826°, elev 2.052617° |
| Earth @ Shackleton, 2027-11-01T00:00Z | az 230.458937°, elev −6.171839° |
| Longitude convention probe | site lon +90°, subsolar lon ≈ 0 → Sun az 269.5° (west) ⇒ east-positive ✔ |
| PDS range requests | Supported (HTTP 206) |

These are measurements, not guarantees. `DATA-002`/`DATA-003` re-verify size and hash at build time and fail on mismatch.

## Appendix B — What revision 2 changed, and why

| Superseded | Reason |
|---|---|
| Runtime SpiceyPy/Skyfield + NAIF kernels | Adds a CSPICE build, kernel packaging, and a deployment failure mode; Horizons supplies higher-level topocentric az/el directly and is precomputed once. |
| 120 m / global DEM products | 404 unavailable; 80 m south-polar product is verified and 4× oversampled for a 315 m grid. |
| 150 km raycast | Runs off the grid for the lowest-latitude covered site; 120 km is safe and asserted. |
| 3D terrain and grazing-shadow engine | Highest cost and risk in the original plan; horizon silhouette conveys the same physics. Requires a new approved revision. |
| Tailwind, chart libraries, Axios | Duplicate the committed CSS-variable theme and add surface area with no challenge value. |
| Hand-maintained contracts in three places | Already divergent; generated from Pydantic with a drift check. |
| Arbitrary custom coordinates in P0 | Impossible with an offline precomputed pack; deferred to build-time onboarding. |
| `F1.7` SPICE-vs-Horizons validator | Replaced by frozen-reference and interpolation tests. |
| Docker, database, deployment tasks | Not needed for judging; removed from P0/P1. |
| Performance budgets (12 ms / 80 ms / 100 ms) | Invisible to evaluation; precomputation makes them moot. |
| `mypy strict = true` | Annotation overhead during a timed build; non-strict now, strict later. |
| Feature-hour estimates and 5-person playbooks | Not executable and not binding; replaced by the ledger DAG. |
| Legacy 2-person split | Left delivery/QA unowned; every task now names an owner. |

---

## Appendix C — Historical design documents

The following remain in the repository as design context. They are **not** executable, they are not a source of truth, and any statement in them that contradicts this plan is superseded. Each carries a `STATUS: HISTORICAL` marker and inline `STATUS: SUPERSEDED` notes explaining what replaced it.

| Document | Scope | Module |
|---|---|---|
| [`plan/00-architecture-and-standards.md`](plan/00-architecture-and-standards.md) | Repo structure, Clean Architecture rules, contract examples, `local_enu` conventions, file-size gate | `M2` |
| [`plan/01-data-and-ephemeris-module.md`](plan/01-data-and-ephemeris-module.md) | Curated sites, LOLA tiling, raycaster, ephemeris and accuracy validation | `M1` |
| [`plan/02-backend-api-module.md`](plan/02-backend-api-module.md) | Domain physics, DTE comms, countdowns, scoring, FastAPI endpoints | `M2` |
| [`plan/03-frontend-core-and-2d-map.md`](plan/03-frontend-core-and-2d-map.md) | App shell, stores, URL sync, site explorer, 2D map, persona modes | `M3` |
| [`plan/04-3d-terrain-and-visualizations.md`](plan/04-3d-terrain-and-visualizations.md) | 3D terrain, shadows, horizon silhouette, sky-dome, timeline | `M4` |
| [`plan/05-comparison-qa-and-delivery.md`](plan/05-comparison-qa-and-delivery.md) | Comparison, window finder, QA, delivery and pitch | `M5` |

**What in the old master plan is dead, and where it went:**

| Removed from the old plan | Replaced by |
|---|---|
| Feature-hour estimates (`2h`, `4h`, …) | The ledger DAG: readiness comes from `depends_on`, not from a clock. |
| Team playbooks for 2–5 people | `plan/OWNERS.md` module assignment. |
| 48-hour phase roadmap with hour windows | Gate tasks `DOC-GATE` → `P0-GATE` → `P1-APPROVAL` → `P1-GATE`, each with commands and human approval. |
| "First 3 actions to kick off" | The ledger's first eligible task, `DOC-001`. |
| Requirement-traceability matrix mapping objectives to feature IDs | REQ-01…REQ-12 below, each naming its primary tasks. |

The old plan's *intent* — real NASA data, honest physics, rapid site comparison for planners and educators — is unchanged. Only its execution model was replaced.

---

## Appendix D — What revision 4 changed, and why

Revision 4 is a scope correction approved by the human owner. It does not change any physics,
contract, or acceptance rule from revision 3.

| Superseded | Revision 4 | Reason |
|---|---|---|
| 14-site registry with seven `artemis_iii` entries from the 2022 candidate set | 16-site registry: NASA's **nine** current Artemis III candidate regions plus the seven CLPS/Apollo/international sites | NASA downselected Artemis III from thirteen regions (2022) to nine on 2024-10-28, [release 24-136](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/). |
| `artemis-shackleton-ridge` (Shackleton Connecting Ridge), `artemis-faustini-rim-a` (Faustini Rim A) | Removed | Both were in the original thirteen and were excluded by NASA in the 2024 downselect. |
| — | `artemis-mons-mouton-plateau`, `artemis-nobile-rim-2`, `artemis-degerlache-rim-2`, `artemis-slater-plain` added | These are among NASA's current nine and were missing from the old registry. `Mons Mouton` and `Mons Mouton Plateau` are two distinct regions on the same massif. |
| Ephemeris coverage 2027-01-01 … 2028-07-01 (13,129 hourly samples) | 2026-01-01 … 2029-01-01 (26,305 hourly samples) | Supports current-date evaluation, the reference scenario, all four launch delays, and every P1 window candidate with its 15-day lookahead. A stop of 2028-12-31 silently drops the final day. |

Execution history for this revision is in `WORK_LOG.md`; it is not duplicated here.

---

## Appendix E — Parallel agent execution (revision 5)

Revision 5 changes how the existing ledger tasks are executed, not what they produce. The task
DAG, commands, acceptance criteria, physics, contracts, registry, and evidence rules are unchanged.

### Roles

| Agent | Branch | Tasks, in order | Scope |
|---|---|---|---|
| `agent-alpha` | `bauerceptor-alpha` | `DATA-002`, `DATA-003` | LOLA DEM and JPL Horizons acquisition |
| `agent-beta` | `bauerceptor-beta` | `DATA-004`, `DATA-005`, `DATA-006` | Ephemeris packs, terrain packs, pack index and fixtures |
| `agent-charlie` | `bauerceptor-charlie` | `ARCH-002`, `BE-001`, `BE-002`, `BE-003` | Contracts, mission time and interpolation, physics, DTE, scoring, API |
| `agent-zeta` | `bauerceptor` | integration only | Scope and evidence audit, merge, digests, documents, final validation |

The ledger remains the task authority. Agent names and wave assignments live in `NEXT_SESSION.md`
and this appendix; they are never added to the ledger or its closed schema.

### Branch and worktree model

`bauerceptor` is the integration branch. Git permits a branch to be checked out in only one
worktree, so each agent works in a separate worktree on a dedicated branch cut from `bauerceptor`:
`bauerceptor-alpha`, `bauerceptor-beta`, and `bauerceptor-charlie`. The branch guard accepts the
owner branch and any `<owner-branch>-*` suffix declared in `plan/OWNERS.md`; it continues to reject
`main`, detached HEAD, and every other branch.

Integration uses `git merge --no-ff`. Squash, rebase, force-push, and branch rewriting are
forbidden because every closed task records its `completed_commit` in the ledger and that commit
must remain resolvable.

### Concurrency rules

1. One agent, one task at a time. A branch carries at most one `in_progress` task.
2. An agent starts a task only when every `depends_on` entry is `done` on `bauerceptor` and the
   agent has merged `bauerceptor` into its worktree so the producer's artefacts and contracts are
   present.
3. An agent hands off after each task. It sets the task `done` or `blocked`, commits, and stops. It
   does not begin the next task until the integrator has merged the branch and synced
   `bauerceptor` back into the agent's worktree.
4. The integration branch never receives a branch whose task is still `in_progress`. The integrator
   merges only `done` or `blocked` tasks.
5. An agent writes only its current task's `write_paths`, its own task's ledger execution fields,
   its own working notes (kept outside the committed tree), and a subsection of `WORK_LOG.md`. It does not edit another agent's files,
   the ledger definitions, `DEVELOPMENT_PLAN.md`, `plan/OWNERS.md`, `NEXT_SESSION.md`, scripts,
   hooks, or generated files by hand.
6. Shared-file conflicts are resolved by the integrator: the ledger keeps both tasks' execution
   fields, `plan/protected.sha256` is regenerated rather than hand-merged, and `WORK_LOG.md` keeps
   both subsections.
7. A failed command, missing input, or invalid artefact sets the task `blocked` with the exact
   reason. An agent does not fix outside `write_paths`, relax a test, bypass a hook, or substitute
   another data source.
8. No agent pushes. No agent changes `user.name` or `user.email`. Commits carry no agent trailer.

### Wave schedule

The DAG fixes the schedule; it is not a preference.

| Wave | `agent-alpha` | `agent-beta` | `agent-charlie` | Integrator gate |
|---|---|---|---|---|
| 0 | setup | setup | setup | Governance commit, worktrees, handover copies |
| 1 | `DATA-002` | standby | `ARCH-002` | Merge `DATA-002` and `ARCH-002`; refresh; validate |
| 2 | `DATA-003` | standby | standby | Merge `DATA-003`; refresh; validate |
| 3 | done | `DATA-004` | standby | Merge `DATA-004`; refresh; validate |
| 4 | done | `DATA-005` | `BE-001` | Merge `DATA-005` and `BE-001`; refresh; validate |
| 5 | done | `DATA-006` | `BE-002` | Merge `DATA-006` and `BE-002`; refresh; validate |
| 6 | done | done | `BE-003` | Merge `BE-003`; final validation |

Standby is read-only preparation: reading the plan, ledger, source interfaces, and existing
artefacts, and updating the agent's own working notes. A standby agent creates no task output and
sets no dependent task `in_progress`.

### Cross-worktree data contract

`data/downloads/` is ignored and does not appear in a new worktree. The canonical raw cache is
`data/downloads/lola/` and `data/downloads/horizons/` in the main worktree. Each agent worktree
links its `data/downloads/lola` and `data/downloads/horizons` to that cache. Raw bytes remain
uncommitted; the tracked manifests under `data/manifests/` are the provenance record. Each worktree
creates its own `backend/.venv` with `uv sync --python 3.12 --frozen`.

Existing untracked manifests under `data/manifests/lola/` and `data/manifests/horizons/` are
unverified out-of-order artefacts. `agent-alpha` audits and regenerates or verifies them under
`DATA-002` and `DATA-003`; no later agent treats them as trusted until the manifest records the
required URL, retrieval time, byte count, and SHA-256. The untracked `scripts/fetch_horizons.py`
is out of scope and is never committed; `DATA-003` writes its clients under `backend/src/cli/`.

### Integration protocol

For each finished branch, `agent-zeta`:

1. Confirms the branch name and that the task is `done` or `blocked`.
2. Audits the diff against `bauerceptor`: only the task's `write_paths`, that task's ledger
   execution fields, the agent's `WORK_LOG.md` subsection, and the refreshed
   `plan/protected.sha256`.
3. Re-runs the task's commands on the agent branch and checks evidence references, exit codes,
   artefact hashes, and test integrity.
4. Merges with `--no-ff`, resolving the ledger, digest, and work-log conflicts by the rules above.
   Any other conflict is a stop.
5. Runs `scripts/validate_task_ledger.py`, `scripts/check_planning_docs.py`,
   `scripts/check_file_lengths.py`, and the task's commands. A failure blocks the merge.
6. Updates `WORK_LOG.md` and `NEXT_SESSION.md`. It updates `DEVELOPMENT_PLAN.md` only for a genuine
   normative change, never for routine progress.
7. Commits with `ALLOW_PROTECTED=1` and no trailer, then merges `bauerceptor` into the remaining
   active agent worktrees before the next wave.

---

## Appendix F — M4 merge reconciliation (revision 5)

`origin/main` merged `feat/m4-3d-terrain` (merge `ebf8a23`) before this revision was written. That
merge did not update this plan, the ledger, `plan/OWNERS.md`, or the registry on `main`; they were
still revision 3, the 14-site ledger, and the 6-site registry. This branch's revision 5 and the
DATA-001 16-site registry are newer and were preserved when `origin/main` was merged into
`bauerceptor` as `00f7e77`. This appendix reconciles the merged code with the operative plan.

### What merged

The M4 merge adds SVG/CSS frontend panels and their tests:

- `frontend/src/features/sky-horizon/` — 360° horizon silhouette, sky-dome projection, and horizon
  math.
- `frontend/src/features/mission-timeline/` — multi-day timeline, solar-array and mast-height
  selector, and timeline segment grouping.
- `frontend/src/features/earth-moon-contrast/` — Earth/Moon geometry contrast card.
- `frontend/src/__tests__/` — `horizonMath.test.ts` and `timelineSegments.test.ts`.
- `frontend/src/components/layout/AppShell.tsx` — mounts the panels in place of the previous
  placeholder slots.

### What did not merge

`frontend/src/features/terrain-3d/` remains only `.gitkeep`. The merge adds no `three`,
`@react-three/fiber`, `@react-three/drei`, WebGL, or shadow-engine dependency, and no frontend
physical constant. The deferred 3D terrain and shadow engine are still prohibited. The `.gitkeep`
placeholder is not approval for 3D work; a future implementation needs a new human-approved
revision after `P0-GATE`.

### Status and classification

- The merged SVG horizon and timeline panels are **P0 visualization inputs for `FE-002`**. They do
  not make any ledger task done; the ledger remains the task authority, and the M4 merge created no
  task. `FE-002` must review the panels and record the acceptance evidence before `P0-GATE`.
- The P0 cockpit must not mount P1 features. `SouthPoleMap` and persona mode remain P1 and are
  still an open issue for `FE-001`/`FE-002`. The M4 `AppShell` keeps them mounted; the routing fix
  remains with those tasks.
- The merged panels add the spherical-limb notice, solar-array/mast controls, and the horizon and
  timeline visualizations. The Class B badge, provenance footer, and remaining `FE-002` acceptance
  items are still open until that task closes.
- No task was marked done by the merge, and no M4 task is added by this revision. M4 remains gated
  behind `P0-GATE`.

### Type-contract risk for `ARCH-002`

The merged panels import `HorizonProfilePoint`, `TimeseriesPoint`, `EvaluateResponse`,
`EvaluationSummary`, `SolarArrayType`, and `ObserverHeightM` from `frontend/src/types`.
`ARCH-002` deletes the hand-written `site`, `evaluation`, `comparison`, and `windows` modules, but
`frontend/src/types/index.ts` is outside its current `write_paths`. The barrel must re-export the
generated types, or the panels must import the generated types directly.

`ARCH-002` must run `bun run typecheck` after generating the contracts. If the barrel or a merged
panel fails, set `ARCH-002` blocked and report. A human-approved ledger revision must add
`frontend/src/types/index.ts` to `ARCH-002`'s `write_paths` or assign the barrel to `FE-001`. Do not
hand-edit the generated types.

### Coordinate source of record

The registry remains the DATA-001 16-site registry, sourced from IAU/USGS Gazetteer named-feature
centres. QuickMap is a documented fallback only. The M4 merge does not change the registry, and no
task in this revision re-sources a coordinate.
