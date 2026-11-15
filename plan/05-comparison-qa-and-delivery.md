# Module 5: Scenario Comparison, Landing Window Finder, QA & Hackathon Delivery

<!-- STATUS: HISTORICAL | REASON: DEVELOPMENT_PLAN.md and plan/task-ledger.json are the only operative authorities; this document is design context only | REPLACEMENT: DEVELOPMENT_PLAN.md#req-01 | TASKS: DOC-001 -->

**Parent Plan:** [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md)
**Architecture Spec:** [00-architecture-and-standards.md](00-architecture-and-standards.md)
**Assigned Role:** Full-Stack / QA / Product & Demo Lead
**Feature IDs:** `F5.1` – `F5.6`

---

## Module Objective
Address the core mission-planning pain point emphasized in the NASA challenge description—**rapid scenario trade-offs when landing locations or launch dates slip**—and close the loop with automated cross-layer QA, strict file-size enforcement, resilient deployment, and a rehearsed Space Apps pitch.

---

## Feature Breakdown

<!-- STATUS: SUPERSEDED | REASON: comparison is promoted to the first P1 task and requires P1-APPROVAL | REPLACEMENT: DEVELOPMENT_PLAN.md#req-02 | TASKS: P1-COMPARE -->
### `F5.1` — Side-by-Side Scenario Comparison Matrix
* **Target Files:**
  * `frontend/src/features/comparison-board/ComparisonBoardView.tsx` (~155 lines)
  * `frontend/src/features/comparison-board/ScenarioColumnCard.tsx` (~110 lines)
  * `frontend/src/features/comparison-board/TradeoffRadarChart.tsx` (~105 lines)
* **What to Build:**
  * Dedicated workspace consuming `Contract D` (`POST /api/v1/compare`) to compare **2 to 4 pinned scenarios** (`Site × Date × Array/Mast`) side-by-side:
    * Structured KPI comparison table with color-coded delta badges vs. Baseline Scenario #1 (e.g., `+21.4 sunlit hrs`, `-34.0 dark streak hrs`, `+14.2 DTE %`).
    * Overlaid multi-scenario **Power & DTE Gantt strips** stacked vertically so engineers immediately see which site survives when another enters shadow.
    * Overlaid **360° Horizon Profiles** comparing two sites' mountain skylines on a single chart.
    * 4-axis **Trade-Off Radar Chart** (`power_score`, `thermal_score`, `comms_score`, `terrain_score`).
* **Acceptance Criteria:** Adding/removing scenarios via `useComparisonStore` updates deltas in `< 150 ms`.

---

<!-- STATUS: SUPERSEDED | REASON: launch delays are fixed at +14, +29.5, +90, and +180 days | REPLACEMENT: DEVELOPMENT_PLAN.md#req-02 | TASKS: P1-DELAYS -->
### `F5.2` — Launch Delay / Schedule-Shift Sensitivity Explorer
* **Target Files:**
  * `frontend/src/features/comparison-board/ScheduleShiftExplorer.tsx` (~145 lines)
* **What to Build:**
  * Directly solves the challenge scenario: *"Hardware development challenges or launch delays force mission planners to reconsider their original landing date."*
  * User picks a primary site + target landing date, then clicks **"Simulate Launch Slip (+14d / +29.5d / +90d / +180d)"**—automatically evaluating 4 shifted dates across lunar seasons and showing:
    * How illumination and Earth libration clearance change if a launch slips from Southern Summer toward Southern Winter.
    * Auto-recommended **"Best Alternative Site on Delayed Date"** if the primary site's feasibility score drops below `70`.
* **Acceptance Criteria:** Generates a 4-window delay sensitivity comparison in one click (`< 200 ms`).

---

<!-- STATUS: SUPERSEDED | REASON: window scanning is gated P1; the seasonal-cycle claim below was scientifically wrong and is corrected inline | REPLACEMENT: DEVELOPMENT_PLAN.md#req-09 | TASKS: P1-WINDOWS -->
### `F5.3` — 12-Month Optimal Landing Window Heatmap
* **Target Files:**
  * `frontend/src/features/window-finder/WindowHeatmapView.tsx` (~160 lines)
  * `frontend/src/features/window-finder/TopWindowsList.tsx` (~90 lines)
* **What to Build:**
  * Connects to `POST /api/v1/windows` (`Contract E`, `F2.7`):
    * Renders a **365-day calendar heatmap** colored by `feasibility_score (0–100)` for any selected site and mission duration (`7d` or `14d`).
    * Highlights **Top 5 Recommended Landing Windows** with sunlit %, DTE %, and longest eclipse streak.
    * Clicking any calendar cell or top window loads that exact date straight into the 3D Mission Cockpit (`F3.1`).
* **Acceptance Criteria:** Visually reveals both the `29.5-day` synodic lunar day cycle and the `346-day` draconic/seasonal illumination cycle at the South Pole.
> **Correction:** polar seasonal illumination is annual (~365 days) with an ~18.6-year nodal modulation. 346.6 days is the eclipse year and the draconic month is 27.212 days; neither is a general South-Pole illumination season. See REQ-09.


---

<!-- STATUS: SUPERSEDED | REASON: export is not a dependency of any P0 or P1 task | REPLACEMENT: DEVELOPMENT_PLAN.md#req-02 | TASKS: DELIVERY-001 -->
### `F5.4` — Mission Briefing Exporter (Planner & Educator Output)
* **Target Files:**
  * `frontend/src/features/briefing-export/exportHelpers.ts` (~110 lines — CSV/JSON builders)
  * `frontend/src/features/briefing-export/MissionBriefingModal.tsx` (~120 lines)
* **What to Build:**
  * Export current scenario or side-by-side comparison as:
    1. **Raw Ephemeris & Power CSV** (for engineers to drop into Excel/MATLAB/Python).
    2. **Structured Scenario JSON** + **Shareable URL Link** (`urlSync.ts`).
    3. **Printable Mission Briefing Sheet (`window.print()` CSS)** summarizing site coordinates, horizon risks, DTE windows, and explicit **NASA data provenance citations** (`NASA LRO LOLA DEM`, `JPL Horizons / NAIF SPICE`, `Quickmap / Moon Trek`, `CSA Artemis Context`).
* **Acceptance Criteria:** Exports download cleanly in browser with valid headers and UTC ISO-8601 timestamps.

---

<!-- STATUS: SUPERSEDED | REASON: acceptance evidence is now command-based and recorded in docs/QA_REPORT.md | REPLACEMENT: DEVELOPMENT_PLAN.md#req-12 | TASKS: QA-001 -->
### `F5.5` — End-to-End Integration, Edge-Case & File-Size Gate QA
* **Target Files:**
  * `scripts/check_file_lengths.py` (~55 lines)
  * `scripts/smoke_test.sh` (~60 lines)
  * `backend/tests/integration/test_api_contracts.py` (~135 lines)
  * `frontend/src/__tests__/coordinateMapping.test.ts` (~95 lines)
* **What to Build:**
  * **Automated Anti-Monolith Gate (`check_file_lengths.py`):** Scans all `.py`, `.ts`, and `.tsx` source files; warns at `> 200` lines and fails exit code `1` if any file exceeds `280` lines.
  * **Critical Lunar Edge-Case Tests:**
    * **Exact South Pole (`-90.0°, 0.0°`)** azimuth clamping (`-89.9999°`) with zero `NaN` or division-by-zero errors.
    * **Antimeridian (`±180°` longitude)** wrap-around in horizon interpolation and 2D stereographic projection.
    * **Far-side site (`Chang'e-4`)** returning `0%` DTE comms cleanly without countdown crashes.
    * **Cross-Layer Compass Alignment Test:** Verifies that an obstacle placed Due East (`Azimuth 90°`) in `TerrainPatch` (`local_enu`) casts a shadow Due West (`Azimuth 270°`) in `celestialVectors.ts` when the Sun is at `Azimuth 90°`.
* **Acceptance Criteria:** `check_file_lengths.py` passes with 0 violations; all backend & frontend tests green; `/evaluate` p95 latency `< 100 ms`.

---

<!-- STATUS: SUPERSEDED | REASON: Docker and cloud deployment are out of scope; demo rehearsal and delivery remain as delivery tasks | REPLACEMENT: DEVELOPMENT_PLAN.md#req-02 | TASKS: DELIVERY-001 -->
### `F5.6` — Deployment, Offline Fail-Safe & Space Apps Pitch Package
* **Target Files:**
  * `Dockerfile.backend` & `Dockerfile.frontend` (~40 lines each)
  * `docker-compose.yml` (~45 lines)
  * `docs/DEMO_SCRIPT.md` (~110 lines — exact 3-minute judging script)
* **What to Build:**
  * Containerized local & cloud deployment (`docker-compose up` + cloud URL).
  * Pre-populate `frontend/public/data/fixtures/` with static `Contracts A–E` JSON packs for the top 6 demo sites so live pitch demos work even if venue Wi-Fi drops.
  * Rehearsed **3-Minute Live Demo Flow**:
    1. *0:00–0:35 Hook:* Why Artemis South Pole is an extreme geometry puzzle (grazing `2°` Sun, zero-atmosphere razor shadows, Earth wobbling near mountain ridges) vs. fragmented legacy tools (Quickmap + Horizons).
    2. *0:35–1:35 Live 3D Cockpit:* Select **Shackleton Connecting Ridge** → scrub lunar day → watch 3D crater shadows, Polar Sky-Dome Earth libration loop, and Sunset/Earthset countdowns live → flip from Flat Panel (`6%` power) to **10m Vertical Tracking Mast (`99%` power)**.
    3. *1:35–2:25 Rapid Re-planning:* Simulate a **90-day launch delay** (`F5.2`), watch longest dark streak spike, then open **12-Month Window Heatmap** (`F5.3`) + **Side-by-Side Comparison** (`F5.1`) to pick a viable backup site (`Mons Mouton`) in 10 seconds.
    4. *2:25–3:00 Education & Scientific Proof:* Toggle **Explorer Mode** (`F3.6`) + show `< 0.05°` **JPL Horizons validation report** (`F1.7`).
* **Acceptance Criteria:** Rehearsed dry run finishes under 3 minutes; backup 1080p screen recording saved 2 hours before deadline.
