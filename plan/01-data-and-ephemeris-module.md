# Module 1: Data Pipeline, LOLA Topography & Ephemeris Engine

<!-- STATUS: HISTORICAL | REASON: HACKATHON_BUILD_PLAN.md and plan/task-ledger.json are now the only operative authorities; this document is design context only | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-01 | TASKS: DOC-001 -->

**Parent Plan:** [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md)
**Architecture Spec:** [00-architecture-and-standards.md](00-architecture-and-standards.md)
**Assigned Role:** Data & Astrodynamics Engineer
**Feature IDs:** `F1.1` – `F1.7`

---

## Module Objective
Produce scientifically accurate lunar topography patches, `< 12 ms` vectorized terrain horizon masks (accounting for **zero lunar atmosphere** and **observer mast height**), and Sun/Earth ephemeris data (including **lunar libration**) from official NASA sources (**LRO LOLA** and **JPL Horizons / SPICE**). All modules live in the shared `backend/src/` workspace so the live API (`Module 2`) and offline CLI (`Module 1`) execute the exact same code with zero duplication.

---

## Feature Breakdown

### `F1.1` — Curated Lunar Landing Site Registry
* **Target Files:**
  * `backend/config/curated_sites.yaml` (~110 lines)
  * `backend/src/infrastructure/site_registry_loader.py` (~95 lines)
* **What to Build:**
  * A curated YAML catalog of **14 iconic and planned landing sites** spanning all challenge categories:
    * **Artemis III Candidates (South Pole):** Shackleton Connecting Ridge, Faustini Rim A, Haworth, Malapert Massif, Mons Mouton (Leibnitz Beta Plateau), Nobile Rim 1, Peak near Cabeus.
    * **CLPS & Commercial Targets:** Mons Mouton (VIPER / Griffin target), Mare Crisium (Blue Ghost), Gruithuisen Domes, Lacus Mortis.
    * **Historic & International Landings:** Apollo 11 (Mare Tranquillitatis), Apollo 15 (Hadley Rille), Chandrayaan-3 (Shiv Shakti Point), Chang’e-4 (Von Kármán Crater — lunar far side!).
  * Each entry stores: `id`, `name`, `category`, `agency`, `lat_deg`, `lon_deg`, short educational/mission summary, and pre-formatted **NASA Quickmap** & **Moon Trek** deep-link URLs centered on `(lat_deg, lon_deg)`.
* **Acceptance Criteria:** YAML validates cleanly via Pydantic; coordinates strictly use selenographic East-positive degrees `[-180, +180]`.

---

<!-- STATUS: SUPERSEDED | REASON: the verified product is ldem_80s_80m IMG/LBL at 115520000 bytes, not GeoTIFF 120m or global grids | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-04 | TASKS: DATA-002 -->
### `F1.2` — NASA LOLA DEM Downloader & Local-ENU Tiler
* **Target Files:**
  * `backend/src/infrastructure/lola_downloader.py` (~130 lines)
  * `backend/src/infrastructure/dem_tiler.py` (~165 lines)
* **What to Build:**
  * Download/cache official NASA **LRO LOLA** South Polar Digital Elevation Model GeoTIFFs (e.g., `LDEM_80S_120M` / `60M` South Polar Stereographic grid from NASA PDS, plus a coarse global `LDEM_16` grid for equatorial Apollo/CLPS sites) into `backend/data/lola_grids/`.
  * **Critical Polar Alignment Fix (`local_enu` resampling):**
    * In a South Polar Stereographic grid, pixel `(X, Y)` axes rotate relative to local North by the site's longitude $\lambda$.
    * `dem_tiler.py` MUST sample each site's `128 × 128` `TerrainPatch` (`40 km × 40 km`) along **Local Topocentric East (`+col`) and Local Topocentric North (`+row`, toward the Equator along meridian $\lambda$)** using bilinear interpolation (`scipy.ndimage.map_coordinates`).
    * This guarantees the 3D terrain mesh (`F4.1`) and 360° horizon raycaster (`F1.3`) share the exact same `0° = North, 90° = East` orientation at every longitude!
* **Acceptance Criteria:** Outputs deterministic `.json`/`.npz` terrain patches matching `Contract C` (`frame: "local_enu"`) in `< 1 second` per site.

---

<!-- STATUS: SUPERSEDED | REASON: operative raycast range is 120 km, not 150 km; profiles are precomputed at build time for three observer heights | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-08 | TASKS: DATA-005 -->
### `F1.3` — Vectorized No-Atmosphere Terrain Horizon-Mask Raycaster
* **Target File:** `backend/src/infrastructure/vectorized_raycaster.py` (~175 lines)
* **What to Build:**
  * For any landing site `(lat_deg, lon_deg, observer_height_m=2.0)`, compute the **360° horizon elevation profile** in `1°` azimuth increments (`0°` to `359°`).
  * **Physics Requirements (No Atmosphere + Spherical Limb Drop):**
    * The Moon has **zero atmospheric refraction**, so light rays are straight geometric lines.
    * At surface arc-distance $d$ along azimuth $\alpha$ on a sphere of radius $R_{\text{moon}} = 1737.4\text{ km}$, a terrain sample at elevation $h(d, \alpha)$ viewed from observer elevation $h_0 = h_{\text{ground}} + h_{\text{mast}}$ subtends apparent elevation angle:
      $$\theta(d, \alpha) = \arctan2\!\left( (R + h)\cos\psi - (R + h_0),\; (R + h)\sin\psi \right), \quad \psi = \frac{d}{R_{\text{moon}}}$$
    * Also compute the smooth spherical geometric limb angle: $\theta_{\text{limb}} = -\arccos\!\left(\frac{R + h_{\text{ground}}}{R + h_0}\right)$.
  * **Vectorized Speed (`< 12 ms` for custom coordinates):**
    * Pre-build a `[360, 240]` polar sampling grid of `(az, dist_km)` (logarithmically spaced from `0.15 km` to `150 km`) and evaluate all `86,400` points in a **single vectorized NumPy `map_coordinates` call** against the in-memory `float32` LOLA array!
> **Correction:** the operative radial ceiling is 120 km. The DEM ends at 80°S and the lowest-latitude covered site has only ~141 km of margin, so 150 km rays would sample off-array. See REQ-08.

* **Acceptance Criteria:** Executes a full 360° raycast for any custom coordinate in `< 15 ms`; flat mare sites yield `~0°` horizon; South Pole craters yield accurate `3°–15°` ridge silhouettes.

---

<!-- STATUS: SUPERSEDED | REASON: runtime SPICE is replaced by precomputed JPL Horizons packs; SITE_COORD altitude is kilometres | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-07 | TASKS: DATA-003, DATA-004 -->
### `F1.4` — JPL Horizons & SPICE Ephemeris Engine (with Lunar Libration)
* **Target Files:**
  * `backend/src/infrastructure/spice_ephemeris.py` (~175 lines)
  * `backend/src/infrastructure/horizons_http_client.py` (~140 lines)
* **What to Build:**
  * **Primary Runtime Engine (`spice_ephemeris.py`):** Use `SpiceyPy` (or `Skyfield` with NASA NAIF kernels `de440s.bsp`, `moon_pa_de421_1900-2050.bpc`, `moon_080317.tf`, `naif0012.tls`) to compute topocentric **Sun** and **Earth** `(azimuth_deg, elevation_deg)` at any lunar `(lat_deg, lon_deg)` and UTC timestamp array.
  * **Captures Full Lunar Libration:** Using the high-precision Principal Axes / Mean Earth lunar body-fixed frame (`MOON_ME` / `MOON_PA`), Earth naturally exhibits its ~`±7.9°` longitude and ~`±6.7°` latitude libration wobble in the lunar sky!
  * **Pole Singularity Guard:** Clamp `abs(lat_deg) > 89.9999` to `±89.9999°` so local North/East unit vectors never divide by zero at the exact pole.
  * **JPL Horizons API Client (`horizons_http_client.py`):** Queries `https://ssd.jpl.nasa.gov/api/horizons.api` (`CENTER='coord@301'`, `QUANTITIES='4'`) for validation (`F1.7`).
* **Acceptance Criteria:** Computes 14 days at 1-hour steps (`336` timestamps) in `< 10 ms` and 1 full year (`8,760` steps) in `< 120 ms`.

---

<!-- STATUS: SUPERSEDED | REASON: PSR is deferred; a single peak-elevation check cannot establish permanent shadow | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-08 | TASKS: DATA-005 -->
### `F1.5` — Local Slope, Roughness & PSR Extractor
* **Target File:** `backend/src/infrastructure/terrain_metrics.py` (~125 lines)
* **What to Build:**
  * Compute per-pixel **terrain slope (degrees)** from the `128 × 128` local ENU heightmap using `np.gradient(elev_m, cell_size_m)`.
  * Compute a binary **Permanently Shadowed Region (PSR) mask** (`psr_mask_flat`) flagging crater floor pixels that remain shadowed even at peak southern summer solar elevation (`~1.54°` + local rim mask).
* **Acceptance Criteria:** Accurately flags steep crater walls (`> 15°`), safe landing flats (`< 7°`), and deep South Pole PSR crater floors (e.g., Shackleton interior).

---

### `F1.6` — Pre-Computation CLI Pipeline
* **Target File:** `backend/src/cli/build_site_packs.py` (~120 lines)
* **What to Build:**
  * Reproducible CLI (`python -m src.cli.build_site_packs --all`) running `F1.1`–`F1.5` and saving precomputed site packs into `backend/data/site_packs/{site_id}.json` plus a `256 × 256` `south_pole_overview.json` height/slope/PSR grid (`80°S–90°S`) for the frontend 2D map (`F3.4`).
  * Also generates the 5 static sample fixtures in `contracts/fixtures/*.sample.json` (`ARCH-02`).
* **Acceptance Criteria:** Single command builds all site packs and frontend sample fixtures cleanly in `< 60 seconds`.

---

<!-- STATUS: SUPERSEDED | REASON: replaced by frozen Horizons references plus interpolation and analytic-raycast tests | REPLACEMENT: HACKATHON_BUILD_PLAN.md#req-12 | TASKS: QA-001 -->
### `F1.7` — Ephemeris & Horizon Accuracy Validator
* **Target Files:**
  * `backend/src/cli/validate_horizons.py` (~110 lines)
  * `backend/tests/integration/test_ephemeris_accuracy.py` (~100 lines)
  * `backend/tests/unit/test_vectorized_raycaster.py` (~95 lines)
* **What to Build:**
  * Automated accuracy suite comparing `spice_ephemeris.py` Sun/Earth `(azimuth, elevation)` at 3 test sites (Apollo 11 equator, mid-latitude, and Shackleton Ridge `-89.45°S`) across 30 days directly against **JPL Horizons API** reference output.
  * Synthetic analytical crater-bowl test proving `vectorized_raycaster.py` recovers exact analytical horizon angles within `< 0.02°` and matches `local_enu` compass orientation.
* **Acceptance Criteria:** Max angular error vs. JPL Horizons is **< 0.05°**; 100% of unit and integration tests pass.
