/** Pure horizon interpolation, panoramic projection, and polar sky-dome math (F4.3 & F4.4). */

import {
  degToRad,
  normalizeAzimuthDeg,
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

/** Linearly interpolate terrain & limb elevation at any azimuth with 360->0 wrap-around. */
export function interpolateHorizonElevDeg(
  profile: HorizonProfilePoint[],
  azDeg: number,
): { terrainElevDeg: number; geometricLimbDeg: number } {
  if (profile.length === 0) {
    return { terrainElevDeg: 0, geometricLimbDeg: 0 };
  }
  const sorted = [...profile].sort((a, b) => a.azimuth_deg - b.azimuth_deg);
  const az = normalizeAzimuthDeg(azDeg);

  if (sorted.length === 1) {
    return {
      terrainElevDeg: sorted[0].terrain_elev_deg,
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
      return {
        terrainElevDeg: curr.terrain_elev_deg + (next.terrain_elev_deg - curr.terrain_elev_deg) * t,
        geometricLimbDeg:
          curr.geometric_limb_deg + (next.geometric_limb_deg - curr.geometric_limb_deg) * t,
      };
    }
  }

  return {
    terrainElevDeg: sorted[0].terrain_elev_deg,
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
): { areaPath: string; ridgeLinePath: string; limbLinePath: string } {
  const samples = 73;
  const limbPts: SVGPoint[] = [];

  if (profile.length === 0) {
    for (let i = 0; i < samples; i += 1) {
      const az = (i / (samples - 1)) * 360.0;
      limbPts.push(azElevToPanoramaSVG(az, 0, width, height, minElev, maxElev));
    }
    const limbLinePath = limbPts
      .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    return { areaPath: "", ridgeLinePath: "", limbLinePath };
  }

  const ridgePts: SVGPoint[] = [];
  for (let i = 0; i < samples; i += 1) {
    const az = (i / (samples - 1)) * 360.0;
    const { terrainElevDeg, geometricLimbDeg } = interpolateHorizonElevDeg(
      profile,
      az === 360.0 ? 0.0 : az,
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
