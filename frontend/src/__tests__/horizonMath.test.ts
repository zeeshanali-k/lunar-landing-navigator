/** Unit tests for horizon interpolation, panoramic projection, and sky-dome math. */

import { it } from "vitest";

import {
  azElevToPanoramaSVG,
  azElevToSkyDomeSVG,
  buildPanoramaHorizonPaths,
  interpolateHorizonElevDeg,
  splitWrappedTrajectorySegments,
} from "../features/sky-horizon/horizonMath";
import type { HorizonProfilePoint } from "../types";

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

export function runHorizonMathTests(): void {
  // 1. Empty horizon_profile (Class B spherical-limb site) renders only limb
  const emptyPaths = buildPanoramaHorizonPaths([], 720, 240, -10, 20);
  assert(emptyPaths.areaPath === "", "empty profile should yield empty areaPath");
  assert(emptyPaths.ridgeLinePath === "", "empty profile should yield empty ridgeLinePath");
  assert(
    emptyPaths.limbLinePath.startsWith("M0.0,160.0"),
    `empty profile limbLinePath should start at M0.0,160.0, got ${emptyPaths.limbLinePath.slice(0, 20)}`,
  );

  // 2. Non-empty profile builds area, ridge, and limb paths
  const sampleProfile: HorizonProfilePoint[] = [
    { azimuth_deg: 0, terrain_elev_deg: 4.0, geometric_limb_deg: -0.5 },
    { azimuth_deg: 90, terrain_elev_deg: 2.0, geometric_limb_deg: -0.5 },
    { azimuth_deg: 180, terrain_elev_deg: 5.0, geometric_limb_deg: -0.5 },
    { azimuth_deg: 270, terrain_elev_deg: 1.0, geometric_limb_deg: -0.5 },
  ];
  const fullPaths = buildPanoramaHorizonPaths(sampleProfile, 720, 240, -10, 20);
  assert(fullPaths.areaPath.endsWith("Z"), "non-empty areaPath must close with Z");
  assert(fullPaths.ridgeLinePath.startsWith("M0.0,"), "ridgeLinePath must start at x=0.0");
  assert(fullPaths.limbLinePath.startsWith("M0.0,"), "limbLinePath must start at x=0.0");

  // 3. Wrap-around interpolation across 350 -> 10 deg
  const wrapProfile: HorizonProfilePoint[] = [
    { azimuth_deg: 10, terrain_elev_deg: 6.0, geometric_limb_deg: 0.0 },
    { azimuth_deg: 350, terrain_elev_deg: 2.0, geometric_limb_deg: 0.0 },
  ];
  const interp = interpolateHorizonElevDeg(wrapProfile, 0);
  assertApprox(interp.terrainElevDeg, 4.0, 1e-6, "wrap-around terrainElevDeg at 0 deg");

  // 4. Panoramic projection midpoint check
  const panoPt = azElevToPanoramaSVG(180, 5, 720, 240, -10, 20);
  assertApprox(panoPt.x, 360, 1e-6, "panorama midpoint x");
  assertApprox(panoPt.y, 120, 1e-6, "panorama midpoint y");

  // 5. Azimuth wrap splitting across 355 -> 5 deg
  const segments = splitWrappedTrajectorySegments([
    { azDeg: 350, elevDeg: 2, index: 0 },
    { azDeg: 355, elevDeg: 3, index: 1 },
    { azDeg: 5, elevDeg: 4, index: 2 },
    { azDeg: 10, elevDeg: 5, index: 3 },
  ]);
  assert(segments.length === 2, `expected 2 split segments, got ${segments.length}`);
  assert(segments[0].length === 2 && segments[1].length === 2, "each segment should have 2 points");

  // 6. Sky-dome zenith projections in full-dome and rim-magnified modes
  const zenithFull = azElevToSkyDomeSVG(0, 90, 150, 150, 120, false);
  assertApprox(zenithFull.x, 150, 1e-6, "full dome zenith x");
  assertApprox(zenithFull.y, 150, 1e-6, "full dome zenith y");

  const centerRim = azElevToSkyDomeSVG(0, 25, 150, 150, 120, true);
  assertApprox(centerRim.x, 150, 1e-6, "rim magnified center x");
  assertApprox(centerRim.y, 150, 1e-6, "rim magnified center y");

  const eastRim = azElevToSkyDomeSVG(90, -5, 150, 150, 120, true);
  assertApprox(eastRim.x, 270, 1e-6, "east rim x");
  assertApprox(eastRim.y, 150, 1e-6, "east rim y");
}

it("horizon interpolation, panoramic projection, and sky-dome math", () => {
  runHorizonMathTests();
});
