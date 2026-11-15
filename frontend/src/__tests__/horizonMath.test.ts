/** Unit tests for 360-degree Horizon Silhouette geometry and lookup helpers (FE-002). */

import {
  azElevToSvgCoord,
  buildLimbLinePath,
  buildTerrainAreaPath,
  computeHorizonBounds,
  findNearestHorizonPoint,
  HORIZON_PAD_X,
  xCoordToAzimuthDeg,
} from "../features/sky-horizon/horizonMath";
import type { HorizonProfilePoint } from "../types";
import { describe, expect, it } from "./testHarness";

const SAMPLE_PROFILE: HorizonProfilePoint[] = [
  { azimuth_deg: 0, terrain_elev_deg: 1.5, geometric_limb_deg: 0 },
  { azimuth_deg: 90, terrain_elev_deg: 4.0, geometric_limb_deg: 0 },
  { azimuth_deg: 180, terrain_elev_deg: 2.0, geometric_limb_deg: 0 },
  { azimuth_deg: 270, terrain_elev_deg: 6.5, geometric_limb_deg: 0 },
];

describe("horizonMath SVG geometry and circular azimuth lookup", () => {
  it("computes bounds including extra Sun/Earth elevations", () => {
    const bounds = computeHorizonBounds(SAMPLE_PROFILE, [-8.2, 19.3]);
    expect.equal(bounds.minElev, -11);
    expect.equal(bounds.maxElev, 22);
  });

  it("maps azimuth and elevation cleanly between SVG space and degrees", () => {
    const pt = azElevToSvgCoord(180, 0, 640, 220, -10, 10);
    expect.closeTo(pt.x, HORIZON_PAD_X + 0.5 * (640 - HORIZON_PAD_X - 12), 1e-3);
    expect.closeTo(xCoordToAzimuthDeg(pt.x, 640), 180, 1e-3);
  });

  it("wraps circular azimuth distances across 0/360 seam", () => {
    const profile: HorizonProfilePoint[] = [
      { azimuth_deg: 5, terrain_elev_deg: 3.0, geometric_limb_deg: 0 },
      { azimuth_deg: 350, terrain_elev_deg: 1.0, geometric_limb_deg: 0 },
    ];
    expect.equal(findNearestHorizonPoint(profile, 359)?.azimuth_deg, 5);
    expect.equal(findNearestHorizonPoint(profile, 353)?.azimuth_deg, 350);
    expect.equal(findNearestHorizonPoint([], 90), null);
  });

  it("returns empty terrain path and fallback limb path for Class B empty profile", () => {
    const terrain = buildTerrainAreaPath([], 640, 220, -10, 10);
    const limb = buildLimbLinePath([], 640, 220, -10, 10, 0);
    expect.equal(terrain.areaPath, "");
    expect.equal(terrain.strokePath, "");
    expect.truthy(limb.startsWith("M") && limb.includes("L"));
  });

  it("wraps populated terrain silhouette through azimuth 360", () => {
    const terrain = buildTerrainAreaPath(SAMPLE_PROFILE, 640, 220, -10, 15);
    expect.truthy(terrain.strokePath.startsWith("M"));
    expect.truthy(terrain.areaPath.endsWith("Z"));
  });
});
