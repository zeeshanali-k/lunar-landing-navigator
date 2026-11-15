# Module 2: Clean-Architecture Backend API & Mission Scoring Engine

<!-- STATUS: HISTORICAL | REASON: DEVELOPMENT_PLAN.md and plan/task-ledger.json are the only operative authorities; this document is design context only | REPLACEMENT: DEVELOPMENT_PLAN.md#req-01 | TASKS: DOC-001 -->

**Parent Plan:** [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md)
**Architecture Spec:** [00-architecture-and-standards.md](00-architecture-and-standards.md)
**Assigned Role:** Backend & API Architect
**Feature IDs:** `F2.1` – `F2.7`

---

## Module Objective
Deliver a fast, cleanly layered **Python + FastAPI** backend following Hexagonal (Ports & Adapters) Architecture. All mission engineering rules (finite-disk solar illumination, solar array power, DTE communication windows, Sunset/Earthset countdowns, feasibility scoring, and schedule comparison) live in pure, dependency-free `domain/` modules that are independently unit-tested.

---

## Clean Architecture Layering

```text
api/routes/*.py          (HTTP JSON in/out only, <35 lines per endpoint)
       ↓
application/*.py         (Use-cases coordinating ports & domain services)
       ↓
domain/*.py              (Pure Python physics, scoring & countdown algorithms — 0 external deps)
       ↑
infrastructure/*.py      (Implements application/ports.py: site packs, vectorized LOLA DEM, SPICE, cache)
```

---

## Feature Breakdown

<!-- STATUS: SUPERSEDED | REASON: SPICE adapters and in-memory DEM wiring are removed from runtime; ports remain | REPLACEMENT: DEVELOPMENT_PLAN.md#req-06 | TASKS: BE-003 -->
### `F2.1` — Domain Entities, Ports & Clean Architecture Skeleton
* **Target Files:**
  * `backend/src/domain/constants.py` (~45 lines)
  * `backend/src/domain/models.py` (~145 lines)
  * `backend/src/application/ports.py` (~75 lines)
  * `backend/src/api/main.py` & `backend/src/api/dependencies.py` (~90 lines each)
* **What to Build:**
  * Constants (`MOON_RADIUS_KM = 1737.4`, `SOLAR_CONSTANT_W_M2 = 1361.0`, `SUN_ANGULAR_RADIUS_DEG = 0.267`, `EARTH_ANGULAR_RADIUS_DEG = 0.95`).
  * Immutable dataclasses: `SiteMetadata`, `HorizonProfile`, `EphemerisPoint`, `TimestepAssessment`, `MissionSummary`, `ScenarioDelta`.
  * Abstract Python `Protocol` interfaces in `ports.py`:
    * `SiteRepository` (`list_sites()`, `get_site()`, `get_terrain_patch()`, `get_horizon_profile()`)
    * `EphemerisProvider` (`compute_sun_earth_track(lat_deg, lon_deg, timestamps_utc)`)
    * `DynamicTerrainProvider` (`compute_horizon_and_patch(lat_deg, lon_deg, observer_height_m)`)
  * `dependencies.py` wires `infrastructure/` singletons (pre-loaded SPICE kernels + `float32` South Pole LOLA DEM in memory) into FastAPI route handlers.
* **Acceptance Criteria:** `domain/` has zero imports outside Python stdlib (`math`, `dataclasses`, `datetime`, `typing`); `GET /api/v1/health` responds `200 OK`.

---

<!-- STATUS: SUPERSEDED | REASON: the disk formula below is a linear approximation, not an exact circular-segment area fraction | REPLACEMENT: DEVELOPMENT_PLAN.md#req-09 | TASKS: BE-002 -->
### `F2.2` — Finite-Disk Solar Illumination, Mast Height & 3-Mode Array Power Engine
* **Target Files:**
  * `backend/src/domain/horizon_geometry.py` (~95 lines)
  * `backend/src/domain/solar_power.py` (~120 lines)
* **What to Build:**
  * **`horizon_geometry.py`:**
    * Interpolates 360° terrain horizon elevation $h_{\text{terr}}(\text{az})$ at any exact azimuth (handling `359° → 0°` wrap-around cleanly).
    * **Observer Mast Height Adjustment:** If `observer_height_m` differs from default `2.0m` (e.g., a `10.0m` tall solar tower), applies a fast first-order horizon depression adjustment or calls the vectorized raycaster (`F1.3`).
    * **Finite Solar Disk Grazing (`sun_visible_fraction`):** At the South Pole, the Sun (`0.534°` diameter, radius $r_{\odot} = 0.267^\circ$) skims mountain ridges for hours. Compute visible disk fraction:
      $$f_{\text{disk}} = \text{clamp}\!\left(\frac{\theta_{\text{sun}} - h_{\text{terr}}(\text{az}_{\text{sun}}) + r_{\odot}}{2 r_{\odot}},\; 0.0,\; 1.0\right)$$
> **Correction:** this is a linear occultation approximation, not the exact visible area of a circular disk. It is locked for this build. See REQ-09.

      `is_sunlit` is `True` whenever $f_{\text{disk}} > 0.05$.
  * **`solar_power.py`:** Computes `solar_power_factor` (`[0.0–1.0]`) and irradiance ($\text{W/m}^2 = 1361 \times \text{factor}$) across **three selectable solar array architectures**:
    1. **`horizontal_fixed`:** Flat deck panel → $f_{\text{disk}} \cdot \max(0, \sin\theta_{\text{sun}})$.
    2. **`vertical_fixed`:** Vertical panel facing fixed azimuth $\alpha_0$ → $f_{\text{disk}} \cdot \max(0, \cos\theta_{\text{sun}}\cos(\text{az}_{\text{sun}} - \alpha_0))$.
    3. **`vertical_tracking`:** 360° azimuth-tracking vertical mast → $f_{\text{disk}} \cdot \cos\theta_{\text{sun}}$.
* **Acceptance Criteria:** Unit tests prove flat panels yield `< 9%` power at `5°` Sun elevation while vertical tracking arrays yield `> 99%`, and partial ridge grazing smoothly scales `sun_visible_fraction` between `0` and `1`.

---

<!-- STATUS: SUPERSEDED | REASON: min_comms_elev_deg means clearance above the effective horizon; conjunction is reported separately | REPLACEMENT: DEVELOPMENT_PLAN.md#req-09 | TASKS: BE-002 -->
### `F2.3` — Direct-to-Earth (DTE) Communication Window, Margin & Conjunction Engine
* **Target File:** `backend/src/domain/comms_visibility.py` (~110 lines)
* **What to Build:**
  * Compute `earth_clearance_deg = earth_elev_deg - horizon_elev_at_earth_az`.
  * `is_dte_visible = earth_clearance_deg >= min_comms_elev_deg`.
  * Compute **Sun–Earth Angular Separation (`sun_earth_sep_deg`)** via spherical law of cosines:
    * Flags **Solar Conjunction / Earth Eclipse** when `sun_earth_sep_deg < 1.5°` (Earth blocking the Sun or causing high solar RF noise on DTE antennas!).
  * Identify contiguous DTE pass windows and simultaneous **Sun + DTE overlap hours**.
* **Acceptance Criteria:** Far-side sites (`Chang’e-4`) return `0.0` DTE hours cleanly; near-pole sites report exact clearance margins above ridges.

---

### `F2.4` — Operational Countdown & Transition Detector
* **Target File:** `backend/src/domain/countdown_detector.py` (~130 lines)
* **What to Build:**
  * Solves the challenge requirement: *"display how much time remains before sunset or Earthset."*
  * Evaluates a `+15 day` lookahead buffer beyond the user's `end_utc` so countdown timers near the end of the mission timeline still report the true next transition!
  * For every timestep $t_i$, computes in `O(N)` via backward single-pass index scanning:
    * `hours_to_next_sunset` (if currently sunlit) / `hours_to_next_sunrise` (if in shadow)
    * `hours_to_next_earthset` (if DTE active) / `hours_to_next_earthrise` (if blocked)
    * `longest_dark_streak_hours` and `longest_comms_blackout_hours` within the mission window.
* **Acceptance Criteria:** Runs in `< 2 ms` for 720 timesteps (single backward pass, no $O(N^2)$ nested loops); returns `null` safely when no transition occurs within lookahead.

---

<!-- STATUS: SUPERSEDED | REASON: scoring equations are now closed and must not be tuned toward expected percentages | REPLACEMENT: DEVELOPMENT_PLAN.md#req-09 | TASKS: BE-002 -->
### `F2.5` — Mission Feasibility Scoring Engine & Risk Warnings
* **Target File:** `backend/src/domain/feasibility_scorer.py` (~125 lines)
* **What to Build:**
  * Computes an interpretable `0–100` `feasibility_score` and 4 breakdown sub-scores (`power_score`, `thermal_score`, `comms_score`, `terrain_score`):
    * **Power (`35%`):** Weighted blend of `sunlit_fraction` and `mean_solar_power_factor`.
    * **Thermal Survival (`25%`):** Exponential penalty as `longest_dark_streak_hours` exceeds `24h`, `72h`, and `150h`.
    * **DTE Comms (`25%`):** Based on `dte_fraction` and `overlap_sun_and_dte_hours`.
    * **Terrain Slope (`15%`):** `< 5°` → `100`, `5°–10°` → `85–60`, `> 15°` → `< 30`.
  * Generates actionable engineering `risk_warnings` strings (e.g., *"Horizontal solar array yields only 6% efficiency at 3.4° Sun angle — switch to Vertical Tracking Mast"*).
* **Acceptance Criteria:** Deterministic, unit-tested scoring with clear warning triggers.

---

<!-- STATUS: SUPERSEDED | REASON: arbitrary custom evaluation is out of P0; comparison is gated behind P1-APPROVAL | REPLACEMENT: DEVELOPMENT_PLAN.md#req-02 | TASKS: BE-003, P1-COMPARE -->
### `F2.6` — Scenario Evaluation, Multi-Site Comparison & Schedule-Shift Use Cases
* **Target Files:**
  * `backend/src/application/evaluate_scenario.py` (~115 lines)
  * `backend/src/application/compare_scenarios.py` (~135 lines)
* **What to Build:**
  * **`evaluate_scenario.py`:** Handles both curated `site_id` and arbitrary `custom_coords` (invoking `vectorized_raycaster.py` in `< 12 ms`), runs ephemeris + domain scoring, caches via `memory_cache.py`, and returns `Contract B`.
  * **`compare_scenarios.py`:** Evaluates `2–4` scenarios concurrently (`Contract D`)—supporting both **Multi-Site Comparison** and **Launch-Delay / Reschedule Comparison** (same site across multiple dates)—and computes exact deltas vs. `baseline_index` plus `recommended_scenario_id`.
* **Acceptance Criteria:** Evaluates 4 parallel 14-day scenarios in `< 150 ms` total.

---

<!-- STATUS: SUPERSEDED | REASON: window scanning is a gated P1 task and performance budgets are not acceptance criteria | REPLACEMENT: DEVELOPMENT_PLAN.md#req-12 | TASKS: P1-WINDOWS -->
### `F2.7` — 12-Month Window Scanner & FastAPI Delivery Endpoints
* **Target Files:**
  * `backend/src/application/scan_windows.py` (~135 lines)
  * `backend/src/api/routes/sites.py` (~75 lines)
  * `backend/src/api/routes/evaluate.py` (~45 lines)
  * `backend/src/api/routes/compare.py` (~45 lines)
  * `backend/src/api/routes/windows.py` (~50 lines)
  * `backend/src/api/schemas/*.py` (4 files, ~75 lines each)
* **What to Build:**
  * **Vectorized Window Scanner (`scan_windows.py`):** Evaluates a full 365-day year in **one vectorized SPICE pass** (`2,920` 3-hour steps across the year) and uses sliding-window rolling sums to score every candidate start date in `< 80 ms` (`Contract E`)!
  * **FastAPI Endpoints:**
    * `GET /api/v1/sites` → `Contract A`
    * `GET /api/v1/sites/{site_id}/terrain` & `POST /api/v1/terrain/custom` → `Contract C` (so custom coordinates also render in 3D!)
    * `POST /api/v1/evaluate` → `Contract B`
    * `POST /api/v1/compare` → `Contract D`
    * `POST /api/v1/windows` → `Contract E`
* **Acceptance Criteria:** All 6 endpoints documented in `/docs`; `pytest` unit + integration suite passes `100%`.
