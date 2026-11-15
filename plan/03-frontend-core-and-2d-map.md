# Module 3: Frontend Core, Site Selection, 2D Map & Dual-Audience UX

<!-- STATUS: HISTORICAL | REASON: DEVELOPMENT_PLAN.md and plan/task-ledger.json are the only operative authorities; this document is design context only | REPLACEMENT: DEVELOPMENT_PLAN.md#req-01 | TASKS: DOC-001 -->

**Parent Plan:** [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md)
**Architecture Spec:** [00-architecture-and-standards.md](00-architecture-and-standards.md)
**Assigned Role:** Frontend Core & UX Lead
**Feature IDs:** `F3.1` – `F3.7`

---

<!-- STATUS: SUPERSEDED | REASON: Tailwind is dropped in favour of the committed CSS-variable theme | REPLACEMENT: DEVELOPMENT_PLAN.md#req-03 | TASKS: FE-001 -->
## Module Objective
Build the modular **React + TypeScript + Tailwind** workspace shell, global state stores (with shareable URL query sync), typed API client (with offline fixture fallback), site explorer, interactive 2D lunar map, playback time controller, and dual **Mission Planner / Explorer** experience—so `Module 4` (3D & sky charts) and `Module 5` (comparison & window finder) plug cleanly into shared hooks and layout slots.

---

## Feature Breakdown

<!-- STATUS: SUPERSEDED | REASON: the canonical URL key set is now exactly site,start,days,step,array,array_az,mast,min_comms | REPLACEMENT: DEVELOPMENT_PLAN.md#req-11 | TASKS: FE-001 -->
### `F3.1` — App Shell, Workspace Layout, State Stores & Shareable URL Sync
* **Target Files:**
  * `frontend/src/components/layout/AppShell.tsx` (~90 lines)
  * `frontend/src/components/layout/TopCommandBar.tsx` (~110 lines)
  * `frontend/src/state/useMissionStore.ts` (~115 lines)
  * `frontend/src/state/usePlaybackStore.ts` (~80 lines)
  * `frontend/src/state/useComparisonStore.ts` (~95 lines)
  * `frontend/src/state/urlSync.ts` (~65 lines)
* **What to Build:**
  * Clean dark aerospace command-center theme (`Space Slate` palette with accessible high-contrast Amber/Solar Gold for Sun, Cyan/Earth Blue for DTE Comms, Emerald/Amber/Crimson for viability status).
  * Multi-view navigation tabs: **Mission Cockpit** (2D/3D/Sky/Timeline), **Compare Scenarios** (`Module 5`), **Landing Window Finder** (`Module 5`), and **Explorer Guide**.
  * **State Stores (Zustand):**
    * `useMissionStore`: holds `selectedSite`, `customCoords`, `startUtc`, `durationDays`, `solarArrayType`, `observerHeightM`, `personaMode ('planner' | 'explorer')`, `evaluationData`, `terrainPatch`, `loading`, `error`.
    * `usePlaybackStore`: holds `currentIndex`, `isPlaying`, `playbackSpeed`, and `stepForward()` / `jumpToIndex()` actions—isolating 60fps animation state so the whole app shell never re-renders during scrubbing!
  * **Shareable Team Permalink (`urlSync.ts`):** Syncs `?site=...&start=...&days=...&array=...&mast=...&mode=...` into `window.history.replaceState` with a **"Copy Scenario Link"** button so science and engineering teams can share exact scenarios instantly.
* **Acceptance Criteria:** Layout adapts cleanly on 1440px projector screens and 1280px laptops; opening a shared URL restores the exact scenario.

---

<!-- STATUS: SUPERSEDED | REASON: wire types are generated from Pydantic; fallback applies only on network failure with an exact fixture-key match | REPLACEMENT: DEVELOPMENT_PLAN.md#req-10 | TASKS: ARCH-002, FE-003 -->
### `F3.2` — Typed API Client & Offline Fixture Fallback Layer
* **Target Files:**
  * `frontend/src/types/site.ts`, `evaluation.ts`, `comparison.ts`, `windows.ts` (4 small files, ~65 lines each)
  * `frontend/src/services/httpClient.ts` (~75 lines)
  * `frontend/src/services/siteService.ts` (~85 lines)
  * `frontend/src/services/evaluationService.ts` (~105 lines)
* **What to Build:**
  * Strongly typed REST wrappers matching `Contracts A–E` (`GET /sites`, `GET /sites/{id}/terrain`, `POST /terrain/custom`, `POST /evaluate`, `POST /compare`, `POST /windows`) with `AbortController` cancellation on rapid user clicks.
  * **Demo Fail-Safe Mode (`VITE_OFFLINE_FALLBACK=true`):** If the backend is unreachable or offline during live judging, automatically falls back to static fixtures in `public/data/fixtures/` with a subtle status indicator so the demo never crashes.
* **Acceptance Criteria:** Zero `any` types; frontend runs independently with mock fixtures from Hour 2.

---

<!-- STATUS: SUPERSEDED | REASON: custom coordinates are out of P0 and only enter via build-time onboarding in P1 | REPLACEMENT: DEVELOPMENT_PLAN.md#req-02 | TASKS: P1-CUSTOM-SITES -->
### `F3.3` — Landing Site Explorer & Custom Coordinate Input
* **Target Files:**
  * `frontend/src/features/site-explorer/SiteExplorerDrawer.tsx` (~130 lines)
  * `frontend/src/features/site-explorer/SiteCard.tsx` (~75 lines)
  * `frontend/src/features/site-explorer/CustomCoordForm.tsx` (~110 lines)
* **What to Build:**
  * Searchable, filterable site selector grouped by category:
    * **Artemis III South Pole** | **CLPS / Commercial** | **Apollo Historic** | **International**
  * Clicking **"Custom Coordinates"** opens a validated input for any `lat_deg` (`-90` to `+90`) and `lon_deg` (`-180` to `+180`) plus optional mission label—simultaneously calling `POST /evaluate` and `POST /terrain/custom` so custom sites get full 3D terrain and horizon analysis in `< 100 ms`!
  * **"Pin to Compare (`+`)"** button on every site card feeds `useComparisonStore`.
* **Acceptance Criteria:** Switching sites or submitting custom coordinates updates all charts, 2D map, and 3D scene smoothly without stale data flashes.

---

<!-- STATUS: SUPERSEDED | REASON: the 2D map is promoted to P1-MAP and consumes a generated overview product | REPLACEMENT: DEVELOPMENT_PLAN.md#req-11 | TASKS: P1-MAP -->
### `F3.4` — Interactive 2D Lunar South Pole Map & Quickmap/Moon Trek Bridge
* **Target Files:**
  * `frontend/src/features/lunar-map-2d/SouthPoleMap.tsx` (~170 lines)
  * `frontend/src/features/lunar-map-2d/mapProjection.ts` (~85 lines)
  * `frontend/src/features/lunar-map-2d/LayerToggleBar.tsx` (~65 lines)
* **What to Build:**
  * Polar stereographic 2D interactive canvas/SVG map (`80°S–90°S` South Pole overview + global equirectangular toggle for equatorial Apollo/CLPS sites) powered by `south_pole_overview.json` (`F1.6`).
  * **Exact Polar Stereographic Projection (`mapProjection.ts`):**
    * Forward: $r = 2 R_{\text{moon}} \tan\!\left(\frac{90^\circ + \text{lat}}{2}\right)$, $x = r \sin(\text{lon})$, $y = r \cos(\text{lon})$ (with `0°E` pointing toward top/Earth-facing meridian).
    * Inverse: exact click `(x, y) → (lat_deg, lon_deg)` to drop a custom lander pin anywhere on the map!
  * Live **Sun & Earth azimuth compass rays** drawn around the active site pin + toggleable **Elevation**, **Slope Hazard**, and **PSR** overlays.
  * Direct **"Inspect in NASA Quickmap ↗"** and **"Open in Moon Trek ↗"** links pre-centered at the active `(lat, lon)`.
* **Acceptance Criteria:** Clicking any spot on the 2D map computes inverse projection within `0.01°` and triggers custom site evaluation.

---

<!-- STATUS: SUPERSEDED | REASON: 3D synchronisation is removed; P0 scrubs the SVG horizon and timeline only | REPLACEMENT: DEVELOPMENT_PLAN.md#req-11 | TASKS: FE-002 -->
### `F3.5` — Date, Duration & Time-Scrubber Playback Controller
* **Target Files:**
  * `frontend/src/features/time-controls/DateAndDurationBar.tsx` (~120 lines)
  * `frontend/src/features/time-controls/PlaybackScrubber.tsx` (~130 lines)
* **What to Build:**
  * Quick Date Presets (*Artemis III Window Nov 2027*, *Southern Summer Peak*, *Southern Winter Dip*, *Full 29.5d Lunar Day*) + custom UTC date/time picker + duration selector (`7d`, `14d`, `29.5d`).
  * Play/Pause scrubber controlling `usePlaybackStore.currentIndex` via `requestAnimationFrame` with speed multipliers (`1 hr/s`, `6 hr/s`, `24 hr/s`) and one-click operational jump buttons: **"Jump to Next Sunset"** and **"Jump to Next Earthset"**.
* **Acceptance Criteria:** Scrubbing updates 3D shadows (`F4.2`), Sky-Dome (`F4.4`), Timeline playhead (`F4.5`), and KPI countdowns (`F3.7`) at 60fps.

---

<!-- STATUS: SUPERSEDED | REASON: persona mode is expressed as labels and callouts over the single P0 workspace, not a second UI | REPLACEMENT: DEVELOPMENT_PLAN.md#req-11 | TASKS: FE-002 -->
### `F3.6` — Dual-Audience Mode (*Mission Planner* vs. *Explorer / Educator*)
* **Target Files:**
  * `frontend/src/features/persona-mode/ModeSwitchPill.tsx` (~60 lines)
  * `frontend/src/features/persona-mode/educationalGlossary.ts` (~120 lines)
  * `frontend/src/features/persona-mode/GuidedChallengesModal.tsx` (~130 lines)
* **What to Build:**
  * Global segmented toggle in the top bar:
    * **Mission Planner Mode:** Displays exact degrees, $\text{W/m}^2$ irradiance, horizon clearance margins, solar disk visible fraction, terrain slope degrees, and engineering risk warnings.
    * **Explorer / Educator Mode:** Adds plain-English **"Why does this happen?"** interactive callouts (explaining South Pole grazing sunlight, zero atmosphere sharp shadows, Earth libration wobble, and **CSA / international Artemis contributions**), plus 3 guided **"Mission Detective Challenges"** (e.g., *"Why does Chang'e-4 have 0% Direct-to-Earth comms?"*, *"Why does a 10m solar mast beat a flat panel at Shackleton?"*).
* **Acceptance Criteria:** Toggling modes instantaneously adapts labels and educational overlays without losing state.

---

### `F3.7` — Operational KPI & Countdown Summary Strip
* **Target Files:**
  * `frontend/src/features/mission-kpis/OperationalKpiStrip.tsx` (~140 lines)
  * `frontend/src/features/mission-kpis/CountdownBadge.tsx` (~75 lines)
* **What to Build:**
  * Live-updating HUD strip reading `timeseries[currentIndex]` and `summary`:
    * **Feasibility Score** (`0–100` color-coded badge + 4 sub-score breakdown popover)
    * **Sun Status & Elevation** (`SUNLIT +3.4° (100% disk)` vs. `GRAZING` vs. `IN SHADOW` + Solar Power $\text{W/m}^2$)
    * **Countdown to Sunset / Sunrise** (`4d 18h remaining`)
    * **DTE Comms Status & Earth Clearance** (`LINK ACTIVE (+4.9° margin)` vs. `TERRAIN BLOCKED`)
    * **Countdown to Earthset / Earthrise** (`6d 18h remaining`)
* **Acceptance Criteria:** Countdowns update smoothly during playback scrubbing and highlight in amber when `< 12h` remain before Sunset or Earthset.
