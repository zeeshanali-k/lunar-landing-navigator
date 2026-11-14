# Lunar Landing Site Navigator — Master Development Plan

**Challenge:** [NASA Space Apps 2026 — Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/)
**Architecture Style:** Clean Architecture (Hexagonal Ports & Adapters Unified Python Backend + Feature-Sliced Modular React/Three.js Frontend)
**Code Philosophy:** Small, single-responsibility files (`60–180` lines target; hard CI cap `280` lines via `scripts/check_file_lengths.py`), strict TypeScript & Python typing, zero duplicate math between CLI & API, pure unit-tested physics.

---

## 1. Navigation & Module Documents

| File | Scope | Feature IDs |
| :--- | :--- | :--- |
| **[00-architecture-and-standards.md](plan/00-architecture-and-standards.md)** | Unified repo structure, Clean Architecture rules, all 5 shared JSON contracts (`Contracts A–E`), `local_enu` coordinate rules & CI file-size gate | `ARCH-01` – `ARCH-03` |
| **[01-data-and-ephemeris-module.md](plan/01-data-and-ephemeris-module.md)** | Curated sites (14), `local_enu` LOLA DEM tiler, `<12ms` vectorized no-atmosphere raycaster, SPICE/Horizons ephemeris & `<0.05°` validator | `F1.1` – `F1.7` |
| **[02-backend-api-module.md](plan/02-backend-api-module.md)** | Pure domain physics (finite solar disk grazing, mast height, 3-mode solar arrays, DTE comms & solar conjunction, countdowns, scoring) & FastAPI endpoints | `F2.1` – `F2.7` |
| **[03-frontend-core-and-2d-map.md](plan/03-frontend-core-and-2d-map.md)** | App shell, Zustand stores + URL permalink sharing, typed API + offline fallback, site picker, 2D stereographic South Pole map, Planner/Explorer modes | `F3.1` – `F3.7` |
| **[04-3d-terrain-and-visualizations.md](plan/04-3d-terrain-and-visualizations.md)** | Three.js `local_enu` terrain mesh, grazing-angle crater shadow engine, 360° Horizon Silhouette, Polar Sky-Dome, Gantt Timeline & Array/Mast simulator | `F4.1` – `F4.7` |
| **[05-comparison-qa-and-delivery.md](plan/05-comparison-qa-and-delivery.md)** | Multi-site & launch-delay comparison, 12-month window heatmap, briefing export, polar edge-case QA, Docker & 3-min pitch script | `F5.1` – `F5.6` |

---

## 2. High-Level System Architecture

```text
+-----------------------------------------------------------------------------------+
|               UNIFIED PYTHON WORKSPACE (backend/src — Modules 1 & 2)              |
|                                                                                   |
|  [Module 1 CLI: build_site_packs.py / validate_horizons.py]                       |
|                        \                                                          |
|                         v                                                         |
|  [Module 2 API: routes] -> [application use-cases] -> [domain physics (0 deps)]   |
|                                  ^                                                |
|                                  | (ports.py)                                     |
|        [infrastructure: LOLA local_enu tiler, <12ms Vectorized Raycaster,         |
|                         SPICE Ephemeris (with Libration), SitePacks, LRU Cache]   |
+-----------------------------------------------------------------------------------+
                                          |  Typed REST + Contracts A–E
                                          v
+-----------------------------------------------------------------------------------+
|                    FRONTEND WORKSPACE (React + TypeScript + Three.js)             |
|  [services/api + fallback] -> [state/Zustand + URL Sync] -> [features/* modules]  |
|   • 2D South Pole Map + Quickmap/Moon Trek links    • 3D ENU Terrain & Shadows    |
|   • 360° Horizon Silhouette & Polar Sky-Dome        • Power/DTE Gantt Timeline    |
|   • Side-by-Side Comparison & Window Heatmap        • Planner vs. Explorer Mode   |
+-----------------------------------------------------------------------------------+
```

### Challenge Objective & NASA Resource Traceability
| Challenge Requirement / Resource | Implemented By Feature(s) |
| :--- | :--- |
| Curated landing sites (Apollo, CLPS, Artemis, International) + custom `(lat, lon)` | `F1.1`, `F2.7`, `F3.3`, `F3.4` |
| Rapid scenario comparison (multi-site & launch date shifts) + shareable URLs | `F2.6`, `F3.1`, `F5.1`, `F5.2` |
| Solar elevation, finite solar disk grazing, mast height & array orientation trade-offs | `F2.2`, `F4.5`, `F4.6` |
| Direct-to-Earth (DTE) comms windows, clearance margins & Earth libration wobble | `F1.4`, `F2.3`, `F4.4` |
| Time remaining to Sunset / Earthset & longest dark streak | `F2.4`, `F3.7`, `F4.5` |
| Zero-atmosphere lunar horizon (terrain elevation + spherical limb drop) | `F1.3`, `F2.2`, `F4.2`, `F4.3`, `F4.7` |
| Multiple visualizations (2D Stereographic Map, 3D ENU Terrain, Sky-Dome, Timeline) | `F3.4`, `F4.1`–`F4.5` |
| Mission Planners + Educators / General Public accessibility | `F3.6`, `F4.7`, `F5.4` |
| NASA LOLA, JPL Horizons, Quickmap, Moon Trek & CSA resources | `F1.1`, `F1.2`, `F1.4`, `F1.7`, `F3.4`, `F3.6` |

---

## 3. Master Feature Registry & Assignment Matrix

Use the **Feature IDs** below for Git branches (`feat/F2.2-solar-power`), issue tracking, and team standups.
* **Priority Key:** `P0` = Must-have core MVP (Hours 0–24) | `P1` = Winning differentiator (Hours 20–36) | `P2` = Polish & resilience (Hours 36–44)

### Track 0 — Shared Foundation (`ARCH`)
| ID | Feature | Spec | Suggested Owner | Depends On | Priority | Est. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ARCH-01` | Unified monorepo scaffolding (`backend/`, `frontend/`, `contracts/`, `scripts/`) | [Module 0](plan/00-architecture-and-standards.md#2-complete-project-directory-structure) | Backend / Lead | — | `P0` | 1h |
| `ARCH-02` | Lock all 5 JSON API contracts (`Contracts A–E`) & sample mock fixtures | [Module 0](plan/00-architecture-and-standards.md#3-shared-data-contracts-arch-02--lock-in-hour-1) | Backend + FE Lead | `ARCH-01` | `P0` | 1h |
| `ARCH-03` | Linting, typing, `local_enu` axis rules & `check_file_lengths.py` (<280 lines) | [Module 0](plan/00-architecture-and-standards.md#4-coordinate--quality-guardrails-arch-03) | Lead / QA | `ARCH-01` | `P0` | 1h |

### Module 1 — Data, Topography & Ephemeris Engine (`F1.x`)
| ID | Feature | Spec | Suggested Owner | Depends On | Priority | Est. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F1.1` | Curated Lunar Landing Site Registry (14 sites + Quickmap/Trek URLs) | [Module 1](plan/01-data-and-ephemeris-module.md#f11--curated-lunar-landing-site-registry) | Data / Astro | `ARCH-01` | `P0` | 2h |
| `F1.2` | NASA LOLA DEM Downloader & `local_enu` (`128×128`) Region Tiler | [Module 1](plan/01-data-and-ephemeris-module.md#f12--nasa-lola-dem-downloader--local-enu-tiler) | Data / Astro | `F1.1` | `P0` | 4h |
| `F1.3` | `<12ms` Vectorized No-Atmosphere 360° Terrain Horizon Raycaster | [Module 1](plan/01-data-and-ephemeris-module.md#f13--vectorized-no-atmosphere-terrain-horizon-mask-raycaster) | Data / Astro | `F1.2` | `P0` | 4h |
| `F1.4` | JPL Horizons & SPICE Ephemeris Engine (with Earth Libration & Pole Guard) | [Module 1](plan/01-data-and-ephemeris-module.md#f14--jpl-horizons--spice-ephemeris-engine-with-lunar-libration) | Data / Astro | `ARCH-01` | `P0` | 4h |
| `F1.5` | Local Slope, Roughness & PSR Mask Extractor | [Module 1](plan/01-data-and-ephemeris-module.md#f15--local-slope-roughness--psr-extractor) | Data / Astro | `F1.2`, `F1.3` | `P1` | 2h |
| `F1.6` | Pre-computation CLI Pipeline (`build_site_packs.py` + South Pole map + fixtures) | [Module 1](plan/01-data-and-ephemeris-module.md#f16--pre-computation-cli-pipeline) | Data / Astro | `F1.1`–`F1.5` | `P0` | 2h |
| `F1.7` | Ephemeris & Horizon Accuracy Validator (`< 0.05°` vs. JPL Horizons) | [Module 1](plan/01-data-and-ephemeris-module.md#f17--ephemeris--horizon-accuracy-validator) | Data / Astro | `F1.3`, `F1.4` | `P1` | 2h |

### Module 2 — Clean-Architecture Backend API & Scoring (`F2.x`)
| ID | Feature | Spec | Suggested Owner | Depends On | Priority | Est. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F2.1` | Domain Models, `ports.py` & FastAPI DI Skeleton | [Module 2](plan/02-backend-api-module.md#f21--domain-entities-ports--clean-architecture-skeleton) | Backend Lead | `ARCH-02` | `P0` | 2h |
| `F2.2` | Finite-Disk Solar Grazing, Mast Height & 3-Mode Array Power Engine | [Module 2](plan/02-backend-api-module.md#f22--finite-disk-solar-illumination-mast-height--3-mode-array-power-engine) | Backend Lead | `F2.1` | `P0` | 3h |
| `F2.3` | Direct-to-Earth (DTE) Comms Window, Margin & Solar Conjunction Engine | [Module 2](plan/02-backend-api-module.md#f23--direct-to-earth-dte-communication-window-margin--conjunction-engine) | Backend Lead | `F2.1` | `P0` | 2h |
| `F2.4` | Single-Pass `O(N)` Countdown Detector (Sunset, Earthset, Dark Streaks) | [Module 2](plan/02-backend-api-module.md#f24--operational-countdown--transition-detector) | Backend Lead | `F2.2`, `F2.3` | `P0` | 3h |
| `F2.5` | Mission Feasibility Scoring Engine (4 Sub-Scores & Risk Warnings) | [Module 2](plan/02-backend-api-module.md#f25--mission-feasibility-scoring-engine--risk-warnings) | Backend Lead | `F2.2`–`F2.4` | `P0` | 2h |
| `F2.6` | Scenario Evaluation & Multi-Scenario Comparison (`POST /compare`) | [Module 2](plan/02-backend-api-module.md#f26--scenario-evaluation-multi-site-comparison--schedule-shift-use-cases) | Backend Lead | `F2.5`, `F1.6` | `P1` | 3h |
| `F2.7` | `<80ms` Vectorized 12-Month Window Scanner & FastAPI Routes (`Contracts A–E`) | [Module 2](plan/02-backend-api-module.md#f27--12-month-window-scanner--fastapi-delivery-endpoints) | Backend Lead | `F2.6` | `P1` | 3h |

### Module 3 — Frontend Core, Site Selection & 2D Map (`F3.x`)
| ID | Feature | Spec | Suggested Owner | Depends On | Priority | Est. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F3.1` | App Shell, Aerospace Theme, Zustand Stores & Shareable URL Sync | [Module 3](plan/03-frontend-core-and-2d-map.md#f31--app-shell-workspace-layout-state-stores--shareable-url-sync) | Frontend Core | `ARCH-01` | `P0` | 2h |
| `F3.2` | Typed API Client (`Contracts A–E`) & Offline Fixture Fallback Layer | [Module 3](plan/03-frontend-core-and-2d-map.md#f32--typed-api-client--offline-fixture-fallback-layer) | Frontend Core | `ARCH-02`, `F3.1` | `P0` | 2h |
| `F3.3` | Landing Site Explorer & Custom `(lat, lon)` Input (with 3D Terrain Fetch) | [Module 3](plan/03-frontend-core-and-2d-map.md#f33--landing-site-explorer--custom-coordinate-input) | Frontend Core | `F3.2` | `P0` | 3h |
| `F3.4` | Interactive 2D Stereographic South Pole Map + Quickmap/Moon Trek Links | [Module 3](plan/03-frontend-core-and-2d-map.md#f34--interactive-2d-lunar-south-pole-map--quickmapmoon-trek-bridge) | Frontend Core | `F3.2`, `F1.6` | `P1` | 4h |
| `F3.5` | Date, Duration & 60fps Playback Scrubber Controller | [Module 3](plan/03-frontend-core-and-2d-map.md#f35--date-duration--time-scrubber-playback-controller) | Frontend Core | `F3.1` | `P0` | 3h |
| `F3.6` | Dual-Audience Mode (*Mission Planner* vs. *Explorer / Educator*) | [Module 3](plan/03-frontend-core-and-2d-map.md#f36--dual-audience-mode-mission-planner-vs-explorer--educator) | Frontend / UX | `F3.1` | `P1` | 3h |
| `F3.7` | Live Operational KPI & Sunset/Earthset Countdown Strip | [Module 3](plan/03-frontend-core-and-2d-map.md#f37--operational-kpi--countdown-summary-strip) | Frontend Core | `F3.2`, `F3.5` | `P0` | 2h |

### Module 4 — 3D Terrain, Sky-Dome & Operational Visualizations (`F4.x`)
| ID | Feature | Spec | Suggested Owner | Depends On | Priority | Est. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F4.1` | 3D `local_enu` Lunar Terrain Mesh Builder & 4 Surface Shader Modes | [Module 4](plan/04-3d-terrain-and-visualizations.md#f41--3d-local-enu-lunar-terrain-mesh-builder--surface-modes) | 3D / Viz Lead | `ARCH-02`, `F3.1` | `P0` | 4h |
| `F4.2` | Grazing-Angle Solar Ray & Sharp Crater Shadow Engine + Sun/Earth Vectors | [Module 4](plan/04-3d-terrain-and-visualizations.md#f42--grazing-angle-solar-ray--real-time-crater-shadow-engine) | 3D / Viz Lead | `F4.1`, `F3.5` | `P0` | 4h |
| `F4.3` | 360° Panoramic Horizon Silhouette Chart | [Module 4](plan/04-3d-terrain-and-visualizations.md#f43--360-panoramic-horizon-silhouette-chart) | 3D / Viz Lead | `F3.2`, `F3.5` | `P0` | 3h |
| `F4.4` | Polar Sky-Dome Radar Plot (with Rim Magnification & Libration Loop) | [Module 4](plan/04-3d-terrain-and-visualizations.md#f44--polar-sky-dome-radar-plot-sun-arcs--earth-libration) | 3D / Viz Lead | `F3.2`, `F3.5` | `P1` | 3h |
| `F4.5` | Synchronized Multi-Day Power & DTE Comms Gantt Timeline | [Module 4](plan/04-3d-terrain-and-visualizations.md#f45--synchronized-multi-day-power--dte-comms-timeline) | 3D / Viz Lead | `F3.2`, `F3.5` | `P0` | 3h |
| `F4.6` | Solar Array Orientation & Mast Height (`2m` vs. `10m`) Simulator | [Module 4](plan/04-3d-terrain-and-visualizations.md#f46--solar-array-orientation--mast-height-simulator) | 3D / Viz Lead | `F4.5`, `F2.2` | `P1` | 2h |
| `F4.7` | Earth-vs-Moon Environmental Contrast Card | [Module 4](plan/04-3d-terrain-and-visualizations.md#f47--earth-vs-moon-environmental-contrast-panel) | 3D / UX | `F3.6` | `P2` | 2h |

### Module 5 — Comparison, Window Finder, QA & Pitch (`F5.x`)
| ID | Feature | Spec | Suggested Owner | Depends On | Priority | Est. |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F5.1` | Side-by-Side Scenario Comparison Matrix (KPIs, Gantt, Horizon & Radar) | [Module 5](plan/05-comparison-qa-and-delivery.md#f51--side-by-side-scenario-comparison-matrix) | Full-Stack / QA | `F2.6`, `F3.2` | `P1` | 4h |
| `F5.2` | Launch Delay / Reschedule Sensitivity Explorer (`+14d/+30d/+90d`) | [Module 5](plan/05-comparison-qa-and-delivery.md#f52--launch-delay--schedule-shift-sensitivity-explorer) | Full-Stack / QA | `F5.1` | `P1` | 3h |
| `F5.3` | 12-Month Optimal Landing Window Heatmap Calendar | [Module 5](plan/05-comparison-qa-and-delivery.md#f53--12-month-optimal-landing-window-heatmap) | Full-Stack / QA | `F2.7`, `F3.2` | `P1` | 3h |
| `F5.4` | Mission Briefing Exporter (CSV, JSON, Shareable Link & Printable Sheet) | [Module 5](plan/05-comparison-qa-and-delivery.md#f54--mission-briefing-exporter-planner--educator-output) | Full-Stack / QA | `F3.2` | `P2` | 2h |
| `F5.5` | End-to-End Integration, Polar Edge-Case (`-90°S`) & File-Size Gate QA | [Module 5](plan/05-comparison-qa-and-delivery.md#f55--end-to-end-integration-edge-case--file-size-gate-qa) | QA / Backend | All P0/P1 | `P1` | 3h |
| `F5.6` | Docker/Cloud Deployment, Offline Demo Mode & 3-Min Pitch Deck | [Module 5](plan/05-comparison-qa-and-delivery.md#f56--deployment-offline-fail-safe--space-apps-pitch-package) | All / PM | `F5.5` | `P0` | 3h |

---

## 4. Team Assignment Playbooks (2 to 5 Members)

### 5-Person Team (Ideal Clean Split)
* **Member A — Data & Astrodynamics:** `F1.1` → `F1.7` (LOLA `local_enu` DEMs, Vectorized Raycaster, SPICE/Horizons validation)
* **Member B — Backend Architect:** `ARCH-01`, `ARCH-02`, `F2.1` → `F2.7` (Clean domain engine & FastAPI)
* **Member C — Frontend Core & Maps:** `F3.1` → `F3.7` (Shell, Zustand + URL Sync, Site Picker, 2D South Pole Map, Dual Mode)
* **Member D — 3D & Data Visualization:** `F4.1` → `F4.7` (Three.js shadows, 360° Horizon, Sky-Dome, Gantt Timeline, Mast Simulator)
* **Member E — Comparison, QA & Pitch:** `ARCH-03`, `F5.1` → `F5.6` (Comparison board, Launch Slip tool, Window Heatmap, Export, Testing & Pitch)

### 4-Person Team
* **Member A:** Module 1 (`F1.1`–`F1.7`) + assists `F2.1`–`F2.3`
* **Member B:** Module 2 (`F2.1`–`F2.7`) + `F5.5` backend QA
* **Member C:** Module 3 (`F3.1`–`F3.7`) + `F5.1`–`F5.2` Comparison UI
* **Member D:** Module 4 (`F4.1`–`F4.7`) + `F5.3` Window Heatmap + `F5.6` Demo video

### 3-Person Team
* **Member A (Data + Backend):** `ARCH-01`, `ARCH-02`, Module 1 + Module 2
* **Member B (Frontend + Comparison):** Module 3 + `F5.1`, `F5.2`, `F5.3`, `F5.6`
* **Member C (3D + Scientific Charts):** Module 4 (`F4.1`–`F4.6`) + `F5.4`

### 2-Person Team
* **Person A (Python Full-Stack):** `ARCH-01`–`02`, Module 1 (`F1.1`–`F1.6`) + Module 2 (`F2.1`–`F2.7`)
* **Person B (TypeScript + 3D/Viz):** Module 3 (`F3.1`–`F3.5`, `F3.7`) + Module 4 (`F4.1`–`F4.3`, `F4.5`) + `F5.1`

---

## 5. 48-Hour Hackathon Execution Roadmap

| Phase | Time Window | Critical Milestones (Definition of Done) |
| :--- | :--- | :--- |
| **Phase 1: Contracts & Skeletons** | **Hours 0 – 4** | `ARCH-01`–`03` merged. All 5 JSON fixtures (`Contracts A–E`) committed in `contracts/fixtures/`. Backend returns mock fixtures; Frontend renders shell with mocked data; Data lead verifies LOLA download + SPICE kernels working locally. |
| **Phase 2: Core Engines in Parallel** | **Hours 4 – 20** | **Integration Checkpoint #1 at Hour 20:** Real `local_enu` site packs (`F1.6`) generated for at least 6 sites; Backend `/sites`, `/terrain`, and `/evaluate` serve real NASA physics (`F2.1`–`F2.5`); Frontend renders 3D terrain shadows (`F4.1`–`F4.2`), Horizon Silhouette (`F4.3`), and Timeline (`F4.5`) synced to playback (`F3.5`). |
| **Phase 3: Winning Differentiators** | **Hours 20 – 36** | **Integration Checkpoint #2 at Hour 36:** `<12ms` custom coordinates (`F3.3`), 2D South Pole Map (`F3.4`), Polar Sky-Dome with Earth libration (`F4.4`), Side-by-Side & Launch Delay Comparison (`F5.1`–`F5.2`), 12-Month Window Heatmap (`F5.3`), and Planner/Explorer mode toggle (`F3.6`) all functional end-to-end. |
| **Phase 4: Accuracy, Polish & Pitch** | **Hours 36 – 48** | **Feature Freeze at Hour 40.** Run JPL Horizons accuracy proof (`F1.7`), polar edge-case + file-length checks (`F5.5`), deploy + verify offline demo cache (`F5.6`), record 3-minute demo video and practice live Q&A. |

---

## 6. First 3 Actions to Kick Off Right Now
1. Review [00-architecture-and-standards.md](plan/00-architecture-and-standards.md) with the whole team and assign Feature IDs from Section 3.
2. Create the directory skeleton (`ARCH-01`) and commit all 5 JSON fixtures (`ARCH-02`) before anyone writes feature logic.
3. Have **Module 1** validate one South Pole site (`Shackleton Connecting Ridge`) against **JPL Horizons** early so `local_enu` coordinate axes (`0°=N, 90°=E`) are locked identically across Python and Three.js.
