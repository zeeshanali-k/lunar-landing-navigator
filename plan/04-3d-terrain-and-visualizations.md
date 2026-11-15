# Module 4: 3D Lunar Terrain, Sky-Dome & Operational Visualizations

<!-- STATUS: HISTORICAL | REASON: HACKATHON_BUILD_PLAN.md and plan/task-ledger.json are now the only operative authorities; this document is design context only | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-01 | TASKS: DOC-001 -->

**Parent Plan:** [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md)
**Architecture Spec:** [00-architecture-and-standards.md](00-architecture-and-standards.md)
**Assigned Role:** 3D Graphics & Scientific Visualization Lead
**Feature IDs:** `F4.1` – `F4.7`

---

<!-- STATUS: SUPERSEDED | REASON: the entire 3D module is post-P1 and requires a new human-approved revision | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-02 | TASKS: P1-GATE -->
## Module Objective
Deliver the high-impact visual heart of the application—translating NASA elevation grids (`local_enu` frame) and ephemeris angles into **four synchronized, unmistakable visual perspectives**:
1. Real-time **3D Lunar Terrain & Sharp Zero-Atmosphere Shadows** (`F4.1`–`F4.2`)
2. **360° Panoramic Horizon Silhouette** (`F4.3`)
3. **Polar Sky-Dome Radar** showing Sun arcs & Earth libration figure-8 loops (`F4.4`)
4. **Multi-Day Power & Direct-to-Earth Comms Timeline** + Solar Array & Mast Height Simulator (`F4.5`–`F4.7`)

**Strict Clean-Code Rule:** Keep Three.js geometry builders, coordinate vector math, and SVG scaling math inside pure `.ts` helper modules—never embed 500 lines of Three.js boilerplate inside React JSX components!

---

## Feature Breakdown

### `F4.1` — 3D Local-ENU Lunar Terrain Mesh Builder & Surface Modes
* **Target Files:**
  * `frontend/src/features/terrain-3d/meshBuilder.ts` (~135 lines — pure Three.js `BufferGeometry` builder)
  * `frontend/src/features/terrain-3d/terrainColors.ts` (~85 lines — elevation, slope & PSR colormaps)
  * `frontend/src/features/terrain-3d/LunarTerrainCanvas.tsx` (~145 lines — R3F `<Canvas>`, camera & OrbitControls)
* **What to Build:**
  * Convert `TerrainPatch` (`128 × 128` local ENU LOLA heightmap from `Contract C`) into an indexed `THREE.BufferGeometry` mesh where:
    * `+X = Local East (Azimuth 90°)`
    * `+Y = Elevation (Up)` with configurable vertical exaggeration (`1x` true scale, `2x`, `3x`)
    * `-Z = Local North (Azimuth 0°)`
  * Provide 4 selectable surface shader/vertex-color modes:
    * **Lunar Regolith (Realistic Albedo + Razor-Sharp Shadows)**
    * **Elevation Hypsometric Tint** (deep crater blue → bright ridge gold)
    * **Slope Hazard Overlay** (green `<7°`, amber `7°–15°`, crimson `>15°`)
    * **PSR Highlight Overlay** (cyan frost tint on Permanently Shadowed Regions from `psr_mask_flat`)
  * Render a stylized 3D lander + adjustable solar mast at `(0, centerElevation, 0)` with `5 km / 10 km / 20 km` range rings and cardinal `N / E / S / W` compass markers.
* **Acceptance Criteria:** Smooth 60fps orbit/zoom/pan; geometry disposes cleanly on site switch with zero WebGL memory leaks.

---

<!-- STATUS: SUPERSEDED | REASON: the 3D grazing-angle shadow engine is the highest-cost, highest-risk item and is not in P0 or P1 | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-02 | TASKS: P1-GATE -->
### `F4.2` — Grazing-Angle Solar Ray & Real-Time Crater Shadow Engine
* **Target Files:**
  * `frontend/src/features/terrain-3d/celestialVectors.ts` (~95 lines — pure `(az, elev) → (x, y, z)` vector math)
  * `frontend/src/features/terrain-3d/CelestialLighting.tsx` (~115 lines)
* **What to Build:**
  * Convert active `timeseries[currentIndex]` `(sun_az_deg, sun_elev_deg)` into Three.js direction vector:
    $$x = \cos(\text{elev})\sin(\text{az}), \quad y = \sin(\text{elev}), \quad z = -\cos(\text{elev})\cos(\text{az})$$
  * **Grazing-Angle Shadow Tuning (Critical for `1°–5°` South Pole Sun):**
    * Fit `DirectionalLight.shadow.camera` tightly to the `40 km × 40 km` mesh (`left/right/top/bottom = ±22`), `mapSize = 2048 × 2048`, `shadow.bias = -0.0005`, `shadow.normalBias = 0.02` to prevent shadow acne or detached shadows at low Sun angles.
    * Keep ambient light near zero (`0.04` earthshine/starlight only) to showcase **zero atmospheric scattering**—producing stark, high-contrast lunar shadows!
> **Correction:** shadows are sharp-edged but not perfectly sharp: the Sun's finite angular diameter still produces a penumbra. See REQ-08.

  * Render visible 3D line-of-sight rays from the lander mast to the **Sun** (gold ray, dimming when blocked) and **Earth** (cyan DTE beam, turning dashed-red when blocked by a ridge).
* **Acceptance Criteria:** As `F3.5` plays through a lunar day, crater shadows sweep 360° around South Pole ridges and match `is_sunlit` at the lander pin.

---

<!-- STATUS: SUPERSEDED | REASON: the horizon silhouette is promoted into P0 as an SVG component | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-11 | TASKS: FE-002 -->
### `F4.3` — 360° Panoramic Horizon Silhouette Chart
* **Target Files:**
  * `frontend/src/features/sky-horizon/PanoramaHorizonChart.tsx` (~165 lines)
  * `frontend/src/features/sky-horizon/horizonMath.ts` (~75 lines)
* **What to Build:**
  * Unwrapped `0° (N) → 90° (E) → 180° (S) → 270° (W) → 360° (N)` landscape profile:
    * **Solid shaded silhouette:** Real LOLA topographic mountain skyline (`terrain_elev_deg`).
    * **Dashed horizontal reference line:** Smooth lunar sphere geometric limb (`geometric_limb_deg`)—visually proving how local topography shapes visibility!
    * **Dotted trajectory curves** for Sun and Earth across the mission window + glowing **live Sun (`0.53°` scaled disk) & Earth orbs** at `currentIndex`.
    * Hover tooltip showing `Azimuth`, `Body Elevation`, `Terrain Horizon`, and `Clearance Margin`.
* **Acceptance Criteria:** Clicking any point along the Sun or Earth trajectory jumps `usePlaybackStore` directly to that timestamp.

---

### `F4.4` — Polar Sky-Dome Radar Plot (Sun Arcs & Earth Libration)
* **Target Files:**
  * `frontend/src/features/sky-horizon/PolarSkyDome.tsx` (~165 lines)
* **What to Build:**
  * Zenith-centered fisheye compass plot (`90° Zenith` at center, `0° Horizon` at outer perimeter, zoomed `0°–20°` horizon band toggle for South Pole sites!):
    * Shaded outer ring polygon showing the **360° Terrain Blockage Mask**.
    * **Sun path** circling 360° around the horizon at the South Pole (vs. arcing overhead E→W at Apollo 11).
    * **Earth libration figure-8 / loop path** clearly plotted—visually demonstrating why Earth wobbles `±7°` and periodically dips behind a mountain peak (`Earthset`).
* **Acceptance Criteria:** Zoomable "Horizon Rim Magnification (`-5° to +25°`)" toggle makes South Pole grazing geometry crystal clear.

---

<!-- STATUS: SUPERSEDED | REASON: the timeline is promoted into P0 as an SVG component | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-11 | TASKS: FE-002 -->
### `F4.5` — Synchronized Multi-Day Power & DTE Comms Timeline
* **Target Files:**
  * `frontend/src/features/mission-timeline/MissionTimelinePanel.tsx` (~160 lines)
  * `frontend/src/features/mission-timeline/timelineSegments.ts` (~85 lines — converts timesteps into contiguous ON/OFF Gantt spans)
* **What to Build:**
  * Synchronized horizontal timeline with 3 stacked tracks:
    1. **Solar Power Strip:** Gold (`Sunlit`), Amber (`Partial Disk Grazing`), Charcoal (`Dark Streak — with duration label e.g. "38h Dark"`).
    2. **Direct-to-Earth Comms Strip:** Cyan (`DTE Active`), Crimson (`Terrain Blocked`).
    3. **Elevation & Clearance Chart:** Plots `sun_elev_deg`, `earth_elev_deg`, and `solar_power_factor (%)` over time.
  * Dragging the vertical playhead scrubs the 3D scene (`F4.2`), Horizon Panorama (`F4.3`), and Sky-Dome (`F4.4`) in real time.
* **Acceptance Criteria:** Renders 336–720 timesteps smoothly at 60fps.

---

### `F4.6` — Solar Array Orientation & Mast Height Simulator
* **Target Files:**
  * `frontend/src/features/mission-timeline/SolarArraySelector.tsx` (~105 lines)
* **What to Build:**
  * Interactive controls letting users switch:
    1. **Solar Array Architecture:** `Horizontal Deck Panel` vs. `Fixed Vertical Panel` vs. `Sun-Tracking Vertical Mast`.
    2. **Observer / Mast Height (`observer_height_m`):** `1.5m Rover` vs. `2.0m Lander` vs. `10.0m Tall Solar Tower`.
  * Displays live before/after delta badge showing how switching from a flat deck panel (`< 8%` power) to a 10m vertical tracking mast (`> 98%` power, shorter shadow dropouts) transforms South Pole mission viability!
* **Acceptance Criteria:** Adjusting array type or mast height updates `useMissionStore` and refreshes power curves in `< 100 ms`.

---

### `F4.7` — Earth-vs-Moon Environmental Contrast Panel
* **Target Files:**
  * `frontend/src/features/earth-moon-contrast/EarthMoonContrastCard.tsx` (~115 lines)
* **What to Build:**
  * Side-by-side visual explainer card comparing terrestrial vs. lunar physics:
    * **Solar Day Length:** Earth `24.0 hrs` vs. Moon `708.7 hrs (29.53 Earth days)`.
    * **Atmospheric Refraction & Twilight:** Earth (`~0.57°` refraction + Rayleigh twilight sky glow) vs. Moon (`0.00°` refraction + zero air → razor-sharp shadows & instant thermal drop from `+50°C` to `-180°C`).
> **Correction:** thermal response is not instant and depends on regolith thermal inertia and location. Equatorial noon reaches roughly +127°C. See REQ-09.

    * **Earth Movement in Sky:** On the Moon, Earth stays within a `~15°` libration box rather than rising and setting daily—meaning local crater ridges dictate whether a base ever sees Earth!
* **Acceptance Criteria:** Dynamically injects the active site's real metrics into the comparison callouts.
