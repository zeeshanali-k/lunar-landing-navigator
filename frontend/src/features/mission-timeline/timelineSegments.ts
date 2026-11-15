/** Pure SVG track segmentation and elevation curve helpers for the 3-Track Timeline (FE-002). */

import type { TimeseriesPoint } from "../../types";

export type SolarTrackState = "sunlit" | "grazing" | "dark";
export type DteTrackState = "available" | "blocked";

export interface TrackSegment<T extends string> {
  state: T;
  startIndex: number;
  endIndex: number;
  startRatio: number;
  widthRatio: number;
}

export interface TimelineElevationBounds {
  minElev: number;
  maxElev: number;
}

export const TIMELINE_PAD_LEFT = 56;
export const TIMELINE_PAD_RIGHT = 14;

export function classifySolarState(pt: TimeseriesPoint): SolarTrackState {
  if (!pt.is_sunlit || pt.sun_visible_fraction <= 0) {
    return "dark";
  }
  return pt.sun_visible_fraction < 1 ? "grazing" : "sunlit";
}

export function classifyDteState(pt: TimeseriesPoint): DteTrackState {
  return pt.is_dte_visible ? "available" : "blocked";
}

export function buildTrackSegments<T extends string>(
  points: readonly TimeseriesPoint[],
  classify: (pt: TimeseriesPoint) => T,
): TrackSegment<T>[] {
  const n = points.length;
  if (n === 0) return [];
  const segments: TrackSegment<T>[] = [];
  let start = 0;
  let current = classify(points[0]);

  for (let i = 1; i < n; i++) {
    const next = classify(points[i]);
    if (next !== current) {
      segments.push({
        state: current,
        startIndex: start,
        endIndex: i - 1,
        startRatio: start / n,
        widthRatio: (i - start) / n,
      });
      start = i;
      current = next;
    }
  }
  segments.push({
    state: current,
    startIndex: start,
    endIndex: n - 1,
    startRatio: start / n,
    widthRatio: (n - start) / n,
  });
  return segments;
}

export function computeElevationBounds(points: readonly TimeseriesPoint[]): TimelineElevationBounds {
  if (points.length === 0) return { minElev: -10, maxElev: 15 };
  let minVal = 0;
  let maxVal = 5;
  for (const pt of points) {
    if (pt.sun_elev_deg < minVal) minVal = pt.sun_elev_deg;
    if (pt.earth_elev_deg < minVal) minVal = pt.earth_elev_deg;
    if (pt.sun_elev_deg > maxVal) maxVal = pt.sun_elev_deg;
    if (pt.earth_elev_deg > maxVal) maxVal = pt.earth_elev_deg;
  }
  return { minElev: Math.floor(minVal - 2), maxElev: Math.ceil(maxVal + 2) };
}

export function elevToSvgY(
  elevDeg: number,
  yTop: number,
  plotHeight: number,
  minElev: number,
  maxElev: number,
): number {
  const span = Math.max(1, maxElev - minElev);
  const clamped = Math.max(minElev, Math.min(maxElev, elevDeg));
  return yTop + (1 - (clamped - minElev) / span) * plotHeight;
}

export function buildElevationPolyline(
  points: readonly TimeseriesPoint[],
  pickElev: (pt: TimeseriesPoint) => number,
  xLeft: number,
  plotWidth: number,
  yTop: number,
  plotHeight: number,
  minElev: number,
  maxElev: number,
): string {
  const n = points.length;
  if (n === 0) return "";
  return points
    .map((pt, idx) => {
      const x = xLeft + (n === 1 ? plotWidth * 0.5 : (idx / (n - 1)) * plotWidth);
      const y = elevToSvgY(pickElev(pt), yTop, plotHeight, minElev, maxElev);
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function xCoordToSampleIndex(
  svgX: number,
  xLeft: number,
  plotWidth: number,
  count: number,
): number {
  if (count <= 1) return 0;
  const ratio = Math.max(0, Math.min(1, (svgX - xLeft) / Math.max(1, plotWidth)));
  return Math.round(ratio * (count - 1));
}
