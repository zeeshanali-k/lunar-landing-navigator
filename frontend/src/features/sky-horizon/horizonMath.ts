/** Pure SVG geometry and azimuth-lookup helpers for the 360° Horizon Silhouette (FE-002). */

import { normalizeAzimuthDeg, type HorizonProfilePoint } from "../../types";

export interface HorizonBounds {
  minElev: number;
  maxElev: number;
}

export interface SvgPoint {
  x: number;
  y: number;
}

export const HORIZON_PAD_X = 36;
export const HORIZON_PAD_TOP = 16;
export const HORIZON_PAD_BOTTOM = 24;

export function computeHorizonBounds(
  profile: readonly HorizonProfilePoint[],
  extraElevs: readonly (number | null | undefined)[] = [],
): HorizonBounds {
  let minVal = -4;
  let maxVal = 12;
  for (const pt of profile) {
    if (pt.terrain_elev_deg < minVal) minVal = pt.terrain_elev_deg;
    if (pt.geometric_limb_deg < minVal) minVal = pt.geometric_limb_deg;
    if (pt.terrain_elev_deg > maxVal) maxVal = pt.terrain_elev_deg;
    if (pt.geometric_limb_deg > maxVal) maxVal = pt.geometric_limb_deg;
  }
  for (const elev of extraElevs) {
    if (elev !== null && elev !== undefined && Number.isFinite(elev)) {
      if (elev < minVal) minVal = elev;
      if (elev > maxVal) maxVal = elev;
    }
  }
  return {
    minElev: Math.floor(minVal - 2),
    maxElev: Math.ceil(maxVal + 2),
  };
}

export function azElevToSvgCoord(
  azDeg: number,
  elevDeg: number,
  width: number,
  height: number,
  minElev: number,
  maxElev: number,
): SvgPoint {
  const usableW = Math.max(1, width - HORIZON_PAD_X - 12);
  const usableH = Math.max(1, height - HORIZON_PAD_TOP - HORIZON_PAD_BOTTOM);
  const az = normalizeAzimuthDeg(azDeg);
  const span = Math.max(1, maxElev - minElev);
  const clampedElev = Math.max(minElev, Math.min(maxElev, elevDeg));
  const x = HORIZON_PAD_X + (az / 360) * usableW;
  const y = HORIZON_PAD_TOP + (1 - (clampedElev - minElev) / span) * usableH;
  return { x, y };
}

export function xCoordToAzimuthDeg(svgX: number, width: number): number {
  const usableW = Math.max(1, width - HORIZON_PAD_X - 12);
  const norm = Math.max(0, Math.min(1, (svgX - HORIZON_PAD_X) / usableW));
  return norm * 360;
}

export function buildTerrainAreaPath(
  profile: readonly HorizonProfilePoint[],
  width: number,
  height: number,
  minElev: number,
  maxElev: number,
): { areaPath: string; strokePath: string } {
  if (profile.length === 0) {
    return { areaPath: "", strokePath: "" };
  }
  const sorted = [...profile].sort((a, b) => a.azimuth_deg - b.azimuth_deg);
  const coords = sorted.map((p) => azElevToSvgCoord(p.azimuth_deg, p.terrain_elev_deg, width, height, minElev, maxElev));
  const lastWrap = azElevToSvgCoord(360, sorted[0].terrain_elev_deg, width, height, minElev, maxElev);
  // Treat az=360 identically to az=0 so the polar silhouette wraps continuously.
  const pts = sorted[sorted.length - 1].azimuth_deg < 360
    ? [...coords, { x: HORIZON_PAD_X + Math.max(1, width - HORIZON_PAD_X - 12), y: lastWrap.y }]
    : coords;

  const strokePath = pts.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const yBase = (height - HORIZON_PAD_BOTTOM).toFixed(1);
  const areaPath = `${strokePath} L${pts[pts.length - 1].x.toFixed(1)},${yBase} L${pts[0].x.toFixed(1)},${yBase} Z`;
  return { areaPath, strokePath };
}

export function buildLimbLinePath(
  profile: readonly HorizonProfilePoint[],
  width: number,
  height: number,
  minElev: number,
  maxElev: number,
  fallbackLimbDeg: number = 0,
): string {
  const xEnd = HORIZON_PAD_X + Math.max(1, width - HORIZON_PAD_X - 12);
  if (profile.length === 0) {
    const start = azElevToSvgCoord(0, fallbackLimbDeg, width, height, minElev, maxElev);
    return `M${start.x.toFixed(1)},${start.y.toFixed(1)} L${xEnd.toFixed(1)},${start.y.toFixed(1)}`;
  }
  const sorted = [...profile].sort((a, b) => a.azimuth_deg - b.azimuth_deg);
  const pts = sorted.map((p) => azElevToSvgCoord(p.azimuth_deg, p.geometric_limb_deg, width, height, minElev, maxElev));
  if (sorted[sorted.length - 1].azimuth_deg < 360) {
    pts.push({ x: xEnd, y: pts[0].y });
  }
  return pts.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function findNearestHorizonPoint(
  profile: readonly HorizonProfilePoint[],
  azDeg: number,
): HorizonProfilePoint | null {
  if (profile.length === 0) return null;
  const target = normalizeAzimuthDeg(azDeg);
  let best = profile[0];
  let bestDelta = 360;
  for (const pt of profile) {
    const raw = Math.abs(normalizeAzimuthDeg(pt.azimuth_deg) - target);
    const delta = Math.min(raw, 360 - raw);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = pt;
    }
  }
  return best;
}
