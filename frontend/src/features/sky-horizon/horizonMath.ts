/** Pure horizon interpolation, panoramic projection, and polar sky-dome math (F4.3 & F4.4). */

import {
  degToRad,
  normalizeAzimuthDeg,
  radToDeg,
  type HorizonProfilePoint,
} from "../../types";

export interface SVGPoint {
  x: number;
  y: number;
}

export interface TrajectoryPointInput {
  azDeg: number;
  elevDeg: number;
  index: number;
}

const DEFAULT_OBSERVER_M = 2.0;
const EFFECTIVE_RIDGE_DIST_M = 600.0;

/** Adjust terrain horizon angle for observer mast height relative to 2.0m baseline. */
export function adjustTerrainElevForMast(
  terrainElevDeg: number,
  observerHeightM: number,
): number {
  const deltaM = observerHeightM - DEFAULT_OBSERVER_M;
  const depressionDeg = radToDeg(Math.atan2(deltaM, EFFECTIVE_RIDGE_DIST_M));
  return terrainElevDeg - depressionDeg;
}

/** Linearly interpolate terrain & limb elevation at any azimuth with 360->0 wrap-around. */
export function interpolateHorizonElevDeg(
  profile: HorizonProfilePoint[],
  azDeg: number,
  observerHeightM = DEFAULT_OBSERVER_M,
): { terrainElevDeg: number; geometricLimbDeg: number } {
  if (profile.length === 0) {
    return { terrainElevDeg: 0, geometricLimbDeg: -0.08 };
  }
  const sorted = [...profile].sort((a, b) => a.azimuth_deg - b.azimuth_deg);
  const az = normalizeAzimuthDeg(azDeg);

  if (sorted.length === 1) {
    return {
      terrainElevDeg: adjustTerrainElevForMast(sorted[0].terrain_elev_deg, observerHeightM),
      geometricLimbDeg: sorted[0].geometric_limb_deg,
    };
  }

  for (let i = 0; i < sorted.length; i += 1) {
    const curr = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    const startAz = curr.azimuth_deg;
    const endAz = i === sorted.length - 1 ? next.azimuth_deg + 360.0 : next.azimuth_deg;
    const queryAz = az < sorted[0].azimuth_deg ? az + 360.0 : az;

    if (queryAz >= startAz && queryAz <= endAz) {
      const span = Math.max(1e-6, endAz - startAz);
      const t = (queryAz - startAz) / span;
      const rawTerrain = curr.terrain_elev_deg + (next.terrain_elev_deg - curr.terrain_elev_deg) * t;
      const limb = curr.geometric_limb_deg + (next.geometric_limb_deg - curr.geometric_limb_deg) * t;
      return {
        terrainElevDeg: adjustTerrainElevForMast(rawTerrain, observerHeightM),
        geometricLimbDeg: limb,
      };
    }
  }

  return {
    terrainElevDeg: adjustTerrainElevForMast(sorted[0].terrain_elev_deg, observerHeightM),
    geometricLimbDeg: sorted[0].geometric_limb_deg,
  };
}

/** Project (azimuthDeg, elevationDeg) into panoramic SVG coordinates. */
export function azElevToPanoramaSVG(
  azDeg: number,
  elevDeg: number,
  width: number,
  height: number,
  minElev: number,
  maxElev: number,
): SVGPoint {
  const x = (Math.max(0, Math.min(360, azDeg)) / 360.0) * width;
  const clampedElev = Math.max(minElev, Math.min(maxElev, elevDeg));
  const normY = (clampedElev - minElev) / Math.max(1e-6, maxElev - minElev);
  const y = height - normY * height;
  return { x, y };
}

/** Build SVG path strings for terrain silhouette polygon, ridge line, and geometric limb. */
export function buildPanoramaHorizonPaths(
  profile: HorizonProfilePoint[],
  width: number,
  height: number,
  minElev: number,
  maxElev: number,
  observerHeightM = DEFAULT_OBSERVER_M,
): { areaPath: string; ridgeLinePath: string; limbLinePath: string } {
  const samples = 73;
  const ridgePts: SVGPoint[] = [];
  const limbPts: SVGPoint[] = [];

  for (let i = 0; i < samples; i += 1) {
    const az = (i / (samples - 1)) * 360.0;
    const { terrainElevDeg, geometricLimbDeg } = interpolateHorizonElevDeg(
      profile,
      az === 360.0 ? 0.0 : az,
      observerHeightM,
    );
    ridgePts.push(azElevToPanoramaSVG(az, terrainElevDeg, width, height, minElev, maxElev));
    limbPts.push(azElevToPanoramaSVG(az, geometricLimbDeg, width, height, minElev, maxElev));
  }

  const ridgeLinePath = ridgePts
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const limbLinePath = limbPts
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${ridgeLinePath} L${width.toFixed(1)},${height.toFixed(1)} L0,${height.toFixed(1)} Z`;

  return { areaPath, ridgeLinePath, limbLinePath };
}

/** Split trajectory points into contiguous segments when azimuth wraps across 360 <-> 0 deg. */
export function splitWrappedTrajectorySegments<T extends TrajectoryPointInput>(
  points: T[],
): T[][] {
  if (points.length === 0) {
    return [];
  }
  const segments: T[][] = [[points[0]]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (Math.abs(curr.azDeg - prev.azDeg) > 180.0) {
      segments.push([curr]);
    } else {
      segments[segments.length - 1].push(curr);
    }
  }
  return segments;
}

/** Project (azDeg, elevDeg) to polar sky-dome SVG coords (0=N top, 90=E right). */
export function azElevToSkyDomeSVG(
  azDeg: number,
  elevDeg: number,
  cx: number,
  cy: number,
  maxR: number,
  rimMagnified: boolean,
): SVGPoint {
  const minElev = -5.0;
  const maxElev = rimMagnified ? 25.0 : 90.0;
  const clampedElev = Math.max(minElev, Math.min(maxElev, elevDeg));
  const rNorm = (maxElev - clampedElev) / (maxElev - minElev);
  const r = rNorm * maxR;
  const azRad = degToRad(azDeg);
  return {
    x: cx + r * Math.sin(azRad),
    y: cy - r * Math.cos(azRad),
  };
}
