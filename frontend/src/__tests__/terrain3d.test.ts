/** Unit tests for 3D local_enu terrain geometry, vertex colors, and celestial vectors (F4.1 & F4.2). */

import { it } from "vitest";

import {
  azElevToThreeXYZ,
  buildTerrainColorBuffer,
  buildTerrainGeometry,
  computeCelestialSceneVectors,
  computeMastVisualOffsetKm,
  prepareTerrainPatch,
  sampleCenterSurfaceYKm,
  sampleTerrainVertexRGB,
} from "../features/terrain-3d";
import type { TerrainPatch, TimeseriesPoint } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertApprox(actual: number, expected: number, eps: number, label: string): void {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`${label}: expected ${expected} ± ${eps}, got ${actual}`);
  }
}

export function runTerrain3dTests(): void {
  // 1. Cardinal azimuth/elevation conversions in local_enu (+X East, +Y Up, -Z North)
  const north = azElevToThreeXYZ(0, 0);
  assertApprox(north[0], 0, 1e-6, "North x");
  assertApprox(north[1], 0, 1e-6, "North y");
  assertApprox(north[2], -1, 1e-6, "North z");

  const east = azElevToThreeXYZ(90, 0);
  assertApprox(east[0], 1, 1e-6, "East x");
  assertApprox(east[1], 0, 1e-6, "East y");
  assertApprox(east[2], 0, 1e-6, "East z");

  const zenith = azElevToThreeXYZ(135, 90);
  assertApprox(zenith[0], 0, 1e-6, "Zenith x");
  assertApprox(zenith[1], 1, 1e-6, "Zenith y");
  assertApprox(zenith[2], 0, 1e-6, "Zenith z");

  // 2. Celestial scene vectors, grazing state, and mast endpoints
  const point: TimeseriesPoint = {
    timestamp_utc: "2027-11-06T00:00:00Z",
    sun_az_deg: 90,
    sun_elev_deg: 0,
    sun_horizon_elev_deg: -0.5,
    sun_visible_fraction: 0.5,
    is_sunlit: true,
    solar_power_factor: 0.5,
    earth_az_deg: 0,
    earth_elev_deg: 0,
    earth_horizon_elev_deg: 1.0,
    earth_clearance_deg: -1.0,
    is_dte_geometric: false,
    is_solar_conjunction: false,
    is_dte_visible: false,
    sun_earth_sep_deg: 90,
    hours_to_next_sunset: 4,
    hours_to_next_sunrise: null,
    hours_to_next_earthset: null,
    hours_to_next_earthrise: 12,
  };
  const mastY = computeMastVisualOffsetKm(10.0);
  const vecs = computeCelestialSceneVectors(point, 0.25, 10.0, 20.0);
  assert(vecs.isGrazing && vecs.isSunlit && !vecs.isDteVisible, "grazing sunlit + blocked DTE state mismatch");
  assertApprox(vecs.mastOrigin[1], 0.25 + mastY, 1e-6, "mastOrigin y");
  assertApprox(vecs.sunRayEnd[0], 20.0, 1e-6, "sunRayEnd East x");
  assertApprox(vecs.earthRayEnd[2], -20.0, 1e-6, "earthRayEnd North z");

  // 3. Vertex colors across regolith, elevation, and slope modes
  const lowSlopeRgb = sampleTerrainVertexRGB("slope", 100, 0, 200, 3.5);
  assert(lowSlopeRgb[1] > lowSlopeRgb[0] && lowSlopeRgb[1] > lowSlopeRgb[2], "low slope should map to green");
  const steepSlopeRgb = sampleTerrainVertexRGB("slope", 100, 0, 200, 22.0);
  assert(steepSlopeRgb[0] > steepSlopeRgb[1], "steep slope should map to red");

  const patch: TerrainPatch = {
    site_id: "test-site",
    frame: "local_enu",
    grid_size: 2,
    patch_radius_km: 10.0,
    center_elevation_m: 150.0,
    min_elevation_m: 0.0,
    max_elevation_m: 300.0,
    elevations_m_flat: [0.0, 100.0, 200.0, 300.0],
    slopes_deg_flat: [2.0, 10.0, 18.0, 5.0],
    psr_mask_flat: [0, 0, 0, 0],
  };

  for (const mode of ["regolith", "elevation", "slope", "psr"] as const) {
    const buf = buildTerrainColorBuffer(patch, mode);
    assert(buf.length === 12, `expected 4*3 color floats for ${mode}, got ${buf.length}`);
  }
  const psrCyan = sampleTerrainVertexRGB("psr", -800, -1000, 500, 5.0, 1);
  assert(psrCyan[2] > psrCyan[0] && psrCyan[1] > 0.7, "PSR frost vertex should render cyan");

  // 4. 2x2 terrain geometry and center surface sampling
  const geom = buildTerrainGeometry(patch, "elevation", 2);
  const posAttr = geom.getAttribute("position");
  assert(posAttr.count === 4, `expected 4 vertices for 2x2 grid, got ${posAttr.count}`);
  assert(geom.getIndex()?.count === 6, `expected 6 indices for 2x2 grid, got ${geom.getIndex()?.count}`);
  const centerYKm = sampleCenterSurfaceYKm(patch, 2);
  assertApprox(centerYKm, 0.0, 1e-6, "2x2 symmetric center sample should match center_elevation_m");
  geom.dispose();

  // 5. Coarse (<64x64) terrain upsampling vs 64x64 passthrough
  const coarsePatch: TerrainPatch = { ...patch, grid_size: 16, patch_radius_km: 20.0, center_elevation_m: 1200.0 };
  const upsampled = prepareTerrainPatch(coarsePatch);
  assert(upsampled.grid_size === 64, `expected upsampled grid_size=64, got ${upsampled.grid_size}`);
  assert(upsampled.elevations_m_flat.length === 4096, "expected 4096 upsampled elevations");
  assert(upsampled.slopes_deg_flat.length === 4096, "expected 4096 upsampled slopes");
  assert(upsampled.max_elevation_m > upsampled.min_elevation_m, "upsampled terrain should have crater relief");

  const alreadyHiRes: TerrainPatch = { ...coarsePatch, grid_size: 64 };
  assert(prepareTerrainPatch(alreadyHiRes) === alreadyHiRes, "64x64 terrain patch must pass through unchanged");
}

it("3D local_enu terrain geometry, vertex colors, and celestial vectors", () => {
  runTerrain3dTests();
});
