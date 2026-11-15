/** Timeline Gantt segment builder over API-computed illumination and DTE series (F4.5). */

import type { TimeseriesPoint } from "../../types";

export type PowerSegmentState = "sunlit" | "grazing" | "dark";
export type CommsSegmentState = "dte_active" | "dte_blocked";

export interface TimelineSegment<T extends string> {
  state: T;
  startIndex: number;
  endIndex: number;
  durationHours: number;
  label: string;
}

/** Infer timestep spacing in hours from consecutive UTC timestamps. */
export function inferStepHours(timeseries: TimeseriesPoint[]): number {
  if (timeseries.length < 2) {
    return 1.0;
  }
  const t0 = Date.parse(timeseries[0].timestamp_utc);
  const t1 = Date.parse(timeseries[1].timestamp_utc);
  const diffH = (t1 - t0) / 3_600_000;
  return Number.isFinite(diffH) && diffH > 0 ? diffH : 1.0;
}

export function classifyPowerState(pt: TimeseriesPoint): PowerSegmentState {
  if (!pt.is_sunlit || pt.sun_visible_fraction <= 0.05) return "dark";
  return pt.sun_visible_fraction < 0.95 ? "grazing" : "sunlit";
}

function groupSegments<T extends string>(
  timeseries: TimeseriesPoint[],
  stepHours: number,
  classify: (pt: TimeseriesPoint) => T,
  formatLabel: (state: T, hours: number) => string,
): TimelineSegment<T>[] {
  if (timeseries.length === 0) return [];
  const result: TimelineSegment<T>[] = [];
  let startIndex = 0;
  let currentState = classify(timeseries[0]);

  for (let i = 1; i <= timeseries.length; i += 1) {
    const nextState = i < timeseries.length ? classify(timeseries[i]) : null;
    if (nextState !== currentState) {
      const endIndex = i - 1;
      const durationHours = Number(((endIndex - startIndex + 1) * stepHours).toFixed(1));
      result.push({
        state: currentState,
        startIndex,
        endIndex,
        durationHours,
        label: formatLabel(currentState, durationHours),
      });
      if (nextState !== null) {
        startIndex = i;
        currentState = nextState;
      }
    }
  }
  return result;
}

/** Merge consecutive timesteps into contiguous Sunlit / Grazing / Dark Gantt segments. */
export function buildPowerSegments(
  timeseries: TimeseriesPoint[],
  stepHours = inferStepHours(timeseries),
): TimelineSegment<PowerSegmentState>[] {
  return groupSegments(timeseries, stepHours, classifyPowerState, (state, hours) =>
    state === "dark" ? `${hours}h Dark` : state === "grazing" ? `${hours}h Grazing` : `${hours}h Sun`,
  );
}

/** Merge consecutive timesteps into contiguous DTE Active / Terrain Blocked Gantt segments. */
export function buildCommsSegments(
  timeseries: TimeseriesPoint[],
  stepHours = inferStepHours(timeseries),
): TimelineSegment<CommsSegmentState>[] {
  return groupSegments(
    timeseries,
    stepHours,
    (pt) => (pt.is_dte_visible ? "dte_active" : "dte_blocked"),
    (state, hours) => (state === "dte_active" ? `${hours}h DTE` : `${hours}h Blocked`),
  );
}
