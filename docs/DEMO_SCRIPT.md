# Lunar Landing Site Navigator — 3-Minute Demo Script (`DELIVERY-001`)

**Target Runtime:** 2 min 45 sec (< 3 min limit).
**Demo Guarantee:** Runs locally against committed `backend/data/site_packs/` (or exact-match offline fixtures in `frontend/public/data/fixtures/`) with outbound network access disabled.

---

## Beat 0 — Hook & Problem Statement (`0:00 – 0:30`)

- **Narrative:** At the lunar South Pole, the Sun skims within a few degrees of the horizon across an ~29.5-day synodic cycle with zero atmosphere to scatter light, while Earth stays low inside a ~15° libration corridor. Mission planners currently jump across disconnected tools (LRO QuickMap for topography, JPL Horizons for ephemeris, spreadsheets for mast heights) whenever a launch slips or a crater rim blocks comms.
- **On Screen:** Open the **Mission Cockpit** with `artemis-cabeus-peak` (`Peak near Cabeus B`, `2027-11-01T00:00:00Z`, `14` days, `vertical_tracking`, `2.0 m` mast). Point out the top badge (`LIVE API` or persistent `OFFLINE FIXTURE` badge when network is disconnected) and the bottom **Data Provenance Footer** citing NASA LRO LOLA (`ldem_80s_80m`), JPL Horizons (`MOON_ME`), LRO QuickMap, NASA Moon Trek, and CSA.

## Beat 1 — Class A Measured Terrain & Mast Trade-Off (`0:30 – 1:10`)

- **On Screen:**
  1. Scrub the **Multi-Day Timeline** playhead and point to the synchronized **360° Panoramic Horizon Silhouette** (solid LOLA terrain profile vs. dashed geometric limb) and **Polar Sky-Dome**.
  2. Hover over a Sun or Earth trajectory marker to read exact azimuth, body elevation, horizon elevation, and clearance.
  3. Switch the solar array from `Horizontal Fixed` to `Vertical Tracking (10 m mast)` to show how raising the receiver above ridge grazing angles shifts illumination and countdowns (`Hours to Sunset` / `Hours to Earthset`).

## Beat 2 — Honest Class B & Far-Side Zero-DTE Beat (`1:10 – 1:45`)

- **On Screen:** Select **`cnsa-change-4-von-karman`** (Chang'e-4, Von Kármán Crater).
- **Talking Points:**
  - Because `ldem_80s_80m` covers `80°S–90°S` only, non-polar sites are classified honestly as **Class B (`Spherical limb only`)** — the UI displays `"Terrain model unavailable — spherical limb only"`, sets terrain and feasibility scores to `N/A` (`null`), and never fabricates topography.
  - Because Von Kármán sits on the lunar far side, Direct-to-Earth (DTE) geometry produces **0.0 hours (`0%`) DTE availability** automatically from the closed physics model with no site-specific hardcoding.

## Beat 3 — Side-by-Side Scenario Comparison (`1:45 – 2:15`, `P1-COMPARE`)

- **On Screen:** Open the **Compare Scenarios** tab and click **Load Artemis III Preset** (comparing `Peak near Cabeus B` vs. `Mons Mouton`).
- **Talking Points:**
  - Review the side-by-side KPI column cards and signed baseline deltas (`+sunlit_hours`, `-longest_dark_streak_hours`, `+dte_comms_hours`), the **Recommended** badge, the **Overlaid Multi-Scenario Power & DTE Timeline Strips**, the **4-Axis Trade-Off Radar**, and the **Overlaid 360° Horizon Profiles**.

## Beat 4 — Launch-Delay Sensitivity, Window Heatmap & Briefing Export (`2:15 – 2:50`, `P1-DELAYS`, `P1-WINDOWS`)

- **On Screen:**
  1. In **Compare Scenarios**, scroll to **Launch-Delay Sensitivity (`+14 / +29.5 / +90 / +180 Days`)** and click **Compare Baseline + Delay Shifts**. Show the `EPHEMERIS_RANGE_EXCEEDED` guard blocking out-of-coverage shifts past `2029-01-01T00:00:00Z` (including the 15-day lookahead) with zero extrapolation.
  2. Switch to **Landing Window Finder**, show the **180-minute screening heatmap** across `2026–2028` (noting the ~365-day annual polar cycle with ~18.6-year nodal modulation), and click **Load in Cockpit** on Rank #1.
  3. Click **Export Briefing** in the top bar to download the reproducible CSV timeseries / JSON bundle or print the briefing sheet, and click **Copy Scenario Link** to share the canonical URL (`site,start,days,step,array,array_az,mast,min_comms`).
