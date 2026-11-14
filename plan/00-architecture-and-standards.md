# Module 0: Clean Architecture, Directory Layout & Engineering Standards

**Parent Plan:** [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md)
**Covers:** `ARCH-01`, `ARCH-02`, `ARCH-03`
**Target Audience:** All team members (read before writing the first line of code)

---

## 1. Core Architectural Philosophy

To avoid spaghetti code, duplicate physics logic, and 1,000-line monolith files during a fast-paced hackathon, this project enforces **Clean Architecture (Hexagonal / Ports & Adapters)** on the backend, **Zero Code Duplication** between offline data pipelines and the runtime API, and **Feature-Sliced Modular Architecture** on the frontend.

### Non-Negotiable Code Rules
1. **Strict File Size Ceiling:**
   * **Ideal file length:** 60–180 lines.
   * **Soft warning:** > 200 lines (split helper functions or subcomponents out).
   * **Hard limit:** **280 lines max** per source file (excluding static JSON fixtures or lockfiles). Enforced automatically by `scripts/check_file_lengths.py`.
2. **One Responsibility Per File:**
   * A math module computes physics only (no FastAPI imports, no `print` debugging, no filesystem writes).
   * A FastAPI route handler only parses validated input, calls one Application Use Case, and returns a typed DTO (target: `< 35` lines per endpoint).
   * A React component renders UI and delegates state/calculations to custom hooks (`useXxx.ts`) and pure helper utilities (`xxxMath.ts`).
3. **Dependency Direction & Single Source of Truth for Math:**
   * **Backend & Pipeline:** `api/` and `cli/` → `application/` → `domain/` ← `infrastructure/`.
   * `domain/` sits at the center and imports **nothing** from `fastapi`, `httpx`, `spiceypy`, or `rasterio`.
   * **No Duplicate Physics:** Both the offline pre-computation CLI (`Module 1`) and the live FastAPI server (`Module 2`) share the exact same `backend/src/domain/` and `backend/src/infrastructure/` packages—never copy-paste raycasting or SPICE code into two separate folders!
4. **Type Safety Everywhere:**
   * Backend uses Python 3.11+ type hints + **Pydantic v2** schemas.
   * Frontend uses **TypeScript (strict mode)** with shared interfaces matching the backend schemas.
5. **Docstrings & Unit-Explicit Naming:**
   * Every public function/class gets a concise docstring stating units (`degrees`, `radians`, `meters`, `UTC ISO-8601`, `hours`).
   * **Always include units in variable names** where ambiguity is possible (e.g., `sun_elev_deg`, `radius_km`, `step_minutes`, `observer_height_m`)—this prevents costly lunar coordinate bugs.

---

## 2. Complete Project Directory Structure

```text
lunar-landing-navigator/
├── DEVELOPMENT_PLAN.md                  # Master plan & feature assignment matrix
├── plan/                                # Detailed module specifications (00 to 05)
├── scripts/
│   ├── check_file_lengths.py            # ARCH-03: Fails CI if any .py/.ts/.tsx > 280 lines
│   └── smoke_test.sh                    # F5.5: End-to-end health, contract & latency check
├── contracts/                           # Shared API schemas & mock fixtures (ARCH-02)
│   ├── openapi-draft.yaml
│   └── fixtures/
│       ├── sites.sample.json            # Contract A fixture
│       ├── evaluate.sample.json         # Contract B fixture
│       ├── terrain.sample.json          # Contract C fixture
│       ├── compare.sample.json          # Contract D fixture
│       └── windows.sample.json          # Contract E fixture
│
├── backend/                             # Shared Python Workspace (Modules 1 & 2)
│   ├── pyproject.toml
│   ├── config/
│   │   ├── curated_sites.yaml           # F1.1: Apollo, CLPS, Artemis III, Global sites
│   │   └── data_sources.yaml            # LOLA DEM & JPL Horizons endpoints
│   ├── data/                            # Cached SPICE kernels, LOLA grids & prebuilt site packs
│   │   ├── kernels/                     # de440s.bsp, moon_pa_de421, moon_080317.tf, naif0012.tls
│   │   ├── lola_grids/                  # In-memory float32 South Pole DEM (~25 MB) + global grid
│   │   └── site_packs/                  # Precomputed JSON/NPZ site packs + south_pole_overview.json
│   ├── src/
│   │   ├── domain/                      # Pure physics, geometry & mission rules (0 external deps)
│   │   │   ├── constants.py             # Moon radius (1737.4 km), solar constant (1361 W/m²), sun angular radius (0.267°)
│   │   │   ├── models.py                # Entities: Site, EphemerisSample, HorizonProfile, MissionScore
│   │   │   ├── horizon_geometry.py      # F1.3/F2.2: Spherical limb drop, 360° horizon interpolation, solar disk fraction
│   │   │   ├── solar_power.py           # F2.2: Cosine incidence, horizontal vs. tower vs. tracker, mast height
│   │   │   ├── comms_visibility.py      # F2.3: DTE Earth visibility, clearance margin & solar conjunction check
│   │   │   ├── countdown_detector.py    # F2.4: Sunset/Sunrise/Earthset/Earthrise + dark streaks
│   │   │   └── feasibility_scorer.py    # F2.5: Weighted multi-criteria mission score & risk warnings
│   │   ├── application/                 # Use-cases & repository interfaces
│   │   │   ├── ports.py                 # Abstract Protocols: SiteRepo, DemProvider, EphemerisProvider
│   │   │   ├── evaluate_scenario.py     # Orchestrates single Site × DateRange evaluation
│   │   │   ├── compare_scenarios.py     # F2.6: Side-by-side & schedule-shift delta analysis
│   │   │   └── scan_windows.py          # F2.7: Multi-month landing window heatmap generator
│   │   ├── infrastructure/              # External adapters, DEM processing, SPICE & caching
│   │   │   ├── site_registry_loader.py  # F1.1: Loads & validates curated_sites.yaml
│   │   │   ├── lola_downloader.py       # F1.2: Downloads & clips South Pole / global LOLA GeoTIFFs
│   │   │   ├── dem_tiler.py             # F1.2: Resamples local East-North-Up (ENU) 128x128 patch
│   │   │   ├── terrain_metrics.py       # F1.5: Computes slope, roughness & PSR flags
│   │   │   ├── vectorized_raycaster.py  # F1.3: <12ms NumPy vectorized 360° horizon raycaster
│   │   │   ├── spice_ephemeris.py       # F1.4: Local SPICE kernel ephemeris (with Earth libration)
│   │   │   ├── horizons_http_client.py  # F1.4/F1.7: JPL Horizons REST API client for validation
│   │   │   ├── site_pack_repo.py        # Reads/writes precomputed JSON/NPZ site packs
│   │   │   └── memory_cache.py          # LRU cache for sub-50ms repeat queries
│   │   ├── cli/                         # Module 1 CLI runners (reuse domain & infrastructure!)
│   │   │   ├── build_site_packs.py      # F1.6: Generates static precomputed packs & overview grid
│   │   │   └── validate_horizons.py     # F1.7: Cross-checks SPICE & raycaster vs. JPL Horizons
│   │   └── api/                         # Module 2 Thin FastAPI delivery layer
│   │       ├── main.py                  # App factory, CORS, exception handlers
│   │       ├── dependencies.py          # Dependency injection wiring ports -> adapters
│   │       ├── schemas/                 # Pydantic request/response DTOs
│   │       │   ├── site_schemas.py
│   │       │   ├── evaluation_schemas.py
│   │       │   ├── comparison_schemas.py
│   │       │   └── window_schemas.py
│   │       └── routes/
│   │           ├── health.py
│   │           ├── sites.py             # GET /sites, GET /sites/{id}/terrain, POST /terrain/custom
│   │           ├── evaluate.py          # POST /api/v1/evaluate
│   │           ├── compare.py           # POST /api/v1/compare
│   │           └── windows.py           # POST /api/v1/windows
│   └── tests/
│       ├── unit/                        # Fast tests for domain math & raycaster (no network)
│       └── integration/                 # FastAPI TestClient & JPL Horizons accuracy suite
│
└── frontend/                            # Modules 3, 4 & 5: React + TypeScript + Three.js
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── types/                       # TypeScript mirrors of backend DTOs (Contracts A–E)
    │   │   ├── site.ts
    │   │   ├── evaluation.ts
    │   │   ├── comparison.ts
    │   │   └── windows.ts
    │   ├── services/
    │   │   ├── httpClient.ts
    │   │   ├── siteService.ts           # F3.2: API calls + mock fixture fallback toggle
    │   │   └── evaluationService.ts
    │   ├── state/                       # Zustand stores + URL query param sync
    │   │   ├── useMissionStore.ts       # Active site, date range, array mode, mast height, persona mode
    │   │   ├── usePlaybackStore.ts      # Current timestamp index, play/pause, speed
    │   │   ├── useComparisonStore.ts    # Pinned comparison scenarios (up to 4)
    │   │   └── urlSync.ts               # F3.1: Deep-link URL query synchronization for team sharing
    │   ├── components/
    │   │   ├── layout/                  # F3.1: AppShell, TopCommandBar, SplitWorkspace
    │   │   └── ui/                      # Small reusable Badge, Slider, Tooltip, MetricCard
    │   └── features/
    │       ├── site-explorer/           # F3.3: Curated site list + custom coordinate modal
    │       ├── lunar-map-2d/            # F3.4: 2D South Pole map + Quickmap/Moon Trek links
    │       ├── time-controls/           # F3.5: Date picker, duration preset, playback scrubber
    │       ├── persona-mode/            # F3.6: Planner vs. Explorer mode + educational callouts
    │       ├── mission-kpis/            # F3.7: Operational KPI strip & Sunset/Earthset timers
    │       ├── terrain-3d/              # F4.1–F4.2: Three.js ENU mesh + sharp shadow lighting
    │       ├── sky-horizon/             # F4.3–F4.4: 360° Horizon Silhouette + Polar Sky-Dome
    │       ├── mission-timeline/        # F4.5–F4.6: Power/Comms Gantt + Solar Array/Mast toggle
    │       ├── earth-moon-contrast/     # F4.7: Atmospheric & day-length explainer panel
    │       ├── comparison-board/        # F5.1–F5.2: Side-by-side & Launch Delay explorer
    │       ├── window-finder/           # F5.3: 12-month feasibility calendar heatmap
    │       └── briefing-export/         # F5.4: JSON/CSV/Printable mission briefing export
    └── public/
        └── data/                        # Static compressed heightmaps & fallback fixtures
```

---

## 3. Shared Data Contracts (`ARCH-02` — Lock in Hour 1!)

To allow **Module 1 (Data)**, **Module 2 (Backend)**, and **Modules 3–5 (Frontend)** to develop simultaneously from Hour 1 without waiting for each other, commit these 5 JSON contracts immediately inside `contracts/fixtures/`.

### Contract A: `SiteSummary` (`GET /api/v1/sites`)
```json
{
  "id": "artemis-shackleton-ridge",
  "name": "Shackleton Connecting Ridge",
  "category": "artemis_iii",
  "agency": "NASA",
  "lat_deg": -89.45,
  "lon_deg": 135.2,
  "elevation_m": 1240.0,
  "mean_slope_deg": 4.8,
  "has_precomputed_terrain": true,
  "summary": "High-elevation ridge connecting Shackleton and de Gerlache craters with extended illumination.",
  "external_links": {
    "quickmap_url": "https://quickmap.lroc.asu.edu/?...",
    "moon_trek_url": "https://trek.nasa.gov/moon/..."
  }
}
```

### Contract B: `EvaluateRequest` & `EvaluateResponse` (`POST /api/v1/evaluate`)
**Request:**
```json
{
  "site_id": "artemis-shackleton-ridge",
  "custom_coords": null,
  "start_utc": "2027-11-01T00:00:00Z",
  "duration_days": 14,
  "step_minutes": 60,
  "solar_array_type": "vertical_tracking",
  "observer_height_m": 2.0,
  "min_comms_elev_deg": 5.0
}
```

**Response:**
```json
{
  "site": {
    "id": "artemis-shackleton-ridge",
    "name": "Shackleton Connecting Ridge",
    "lat_deg": -89.45,
    "lon_deg": 135.2,
    "elevation_m": 1240.0,
    "mean_slope_deg": 4.8
  },
  "summary": {
    "feasibility_score": 84.5,
    "sub_scores": {
      "power_score": 88.0,
      "thermal_score": 82.0,
      "comms_score": 79.0,
      "terrain_score": 91.0
    },
    "sunlit_hours": 268.0,
    "sunlit_fraction": 0.798,
    "longest_dark_streak_hours": 38.0,
    "dte_comms_hours": 212.0,
    "dte_fraction": 0.631,
    "overlap_sun_and_dte_hours": 176.0,
    "mean_solar_power_factor": 0.76,
    "mean_irradiance_w_m2": 1034.4,
    "risk_warnings": [
      "38h continuous shadow period requires thermal survival battery sizing."
    ],
    "next_events_from_start": {
      "hours_to_sunset": 114.0,
      "hours_to_sunrise": null,
      "hours_to_earthset": 162.0,
      "hours_to_earthrise": null
    }
  },
  "horizon_profile": [
    { "azimuth_deg": 0, "terrain_elev_deg": 1.8, "geometric_limb_deg": -0.08 }
  ],
  "timeseries": [
    {
      "timestamp_utc": "2027-11-01T00:00:00Z",
      "sun_az_deg": 42.1,
      "sun_elev_deg": 3.4,
      "sun_horizon_elev_deg": 1.9,
      "sun_visible_fraction": 1.0,
      "is_sunlit": true,
      "solar_power_factor": 0.89,
      "earth_az_deg": 118.4,
      "earth_elev_deg": 6.1,
      "earth_horizon_elev_deg": 1.2,
      "earth_clearance_deg": 4.9,
      "is_dte_visible": true,
      "sun_earth_sep_deg": 76.3,
      "hours_to_next_sunset": 114.0,
      "hours_to_next_sunrise": null,
      "hours_to_next_earthset": 162.0,
      "hours_to_next_earthrise": null
    }
  ]
}
```

### Contract C: `TerrainPatch` (`GET /api/v1/sites/{id}/terrain` & `POST /api/v1/terrain/custom`)
**Critical Alignment Rule:** Every `TerrainPatch` is resampled into a **Local Topocentric East-North-Up (ENU)** grid centered at `(lat_deg, lon_deg)`, where column `+X = Local East (Azimuth 90°)` and row `+Y = Local North (Azimuth 0°)`. This guarantees 3D shadows and 2D/polar horizon charts never suffer from polar stereographic longitude rotation!
```json
{
  "site_id": "artemis-shackleton-ridge",
  "frame": "local_enu",
  "grid_size": 128,
  "patch_radius_km": 20.0,
  "center_elevation_m": 1240.0,
  "min_elevation_m": -2800.0,
  "max_elevation_m": 1950.0,
  "elevations_m_flat": [1210.5, 1212.0],
  "slopes_deg_flat": [3.2, 4.1],
  "psr_mask_flat": [0, 0]
}
```

### Contract D: `CompareRequest` & `CompareResponse` (`POST /api/v1/compare`)
Used by Module 5 (`F5.1` & `F5.2`) for both multi-site and launch-delay comparisons:
```json
{
  "baseline_index": 0,
  "scenarios": [
    {
      "scenario_id": "scen-1",
      "label": "Shackleton Ridge — Nov 2027 (Baseline)",
      "evaluation": { "...": "Full or summary EvaluateResponse" },
      "deltas_vs_baseline": {
        "feasibility_score_delta": 0.0,
        "sunlit_hours_delta": 0.0,
        "longest_dark_streak_hours_delta": 0.0,
        "dte_comms_hours_delta": 0.0
      }
    }
  ],
  "recommended_scenario_id": "scen-1"
}
```

### Contract E: `WindowsRequest` & `WindowsResponse` (`POST /api/v1/windows`)
Used by Module 5 (`F5.3`) to render the 12-month optimal landing window calendar heatmap:
```json
{
  "site_id": "artemis-shackleton-ridge",
  "mission_duration_days": 14,
  "solar_array_type": "vertical_tracking",
  "windows": [
    {
      "start_utc": "2027-01-01T00:00:00Z",
      "feasibility_score": 86.2,
      "sunlit_fraction": 0.84,
      "dte_fraction": 0.65,
      "longest_dark_streak_hours": 32.0
    }
  ],
  "top_windows": [
    { "rank": 1, "start_utc": "2027-12-14T00:00:00Z", "feasibility_score": 92.4, "sunlit_fraction": 0.93, "dte_fraction": 0.71 }
  ]
}
```

---

## 4. Coordinate & Quality Guardrails (`ARCH-03`)

| Rule | Specification |
| :--- | :--- |
| **Internal Coordinate Convention** | **Selenographic East-Positive:** `lat_deg` in `[-90, +90]`, `lon_deg` in `[-180, +180]`. **Topocentric Azimuth:** `0° = Local North (toward Equator along local meridian)`, `90° = Local East`, `180° = Local South (toward South Pole)`, `270° = Local West`. *(At exact `-90.0°S`, clamp `lat_deg = -89.9999°` so meridian North remains well-defined!)* |
| **Three.js 3D Axis Mapping** | `+X = Local East (Az 90°)`, `+Y = Up (Elevation)`, `-Z = Local North (Az 0°)`. Direction vector from `(az_rad, elev_rad)`: `x = cos(elev) * sin(az)`, `y = sin(elev)`, `z = -cos(elev) * cos(az)`. |
| **Automated File-Size Gate** | `python scripts/check_file_lengths.py` scans `backend/src` and `frontend/src`; warns at `200` lines and exits `1` if any code file exceeds `280` lines. |
