/** Timeline Gantt segment builder and client-side Solar Array / Mast physics simulator (F4.5 & F4.6). */

import {
  degToRad,
  type HorizonProfilePoint,
  type SolarArrayType,
  type TimeseriesPoint,
} from "../../types";
import { interpolateHorizonElevDeg } from "../sky-horizon/horizonMath";

export type PowerSegmentState = "sunlit" | "grazing" | "dark";
export type CommsSegmentState = "dte_active" | "dte_blocked";

export interface TimelineSegment<T extends string> {
  state: T;
  startIndex: number;
  endIndex: number;
  durationHours: number;
  label: string;
}

export interface ArrayScenarioSummary {
  meanPowerFactor: number;
  meanIrradianceWm2: number;
  sunlitHours: number;
  longestDarkStreakHours: number;
}

export interface ArrayComparisonMetrics {
  baseline: ArrayScenarioSummary;
  active: ArrayScenarioSummary;
  powerGainPct: number;
}

const SUN_RADIUS_DEG = 0.267;
const SOLAR_CONSTANT_WM2 = 1361.0;
const MIN_COMMS_CLEARANCE_DEG = 5.0;

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

function classifyPowerState(pt: TimeseriesPoint): PowerSegmentState {
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
      const durationHours = Math.round((endIndex - startIndex + 1) * stepHours);
      result.push({ state: currentState, startIndex, endIndex, durationHours, label: formatLabel(currentState, durationHours) });
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

/** Recompute solar visibility & array power client-side for instant F4.6 trade-off exploration. */
export function simulateArrayAndMastTimeseries(
  baseTimeseries: TimeseriesPoint[],
  horizonProfile: HorizonProfilePoint[],
  arrayType: SolarArrayType,
  observerHeightM: number,
): TimeseriesPoint[] {
  return baseTimeseries.map((pt) => {
    const hasProfile = horizonProfile.length > 0;
    const sunHorizon = hasProfile ? interpolateHorizonElevDeg(horizonProfile, pt.sun_az_deg, observerHeightM).terrainElevDeg : pt.sun_horizon_elev_deg;
    const earthHorizon = hasProfile ? interpolateHorizonElevDeg(horizonProfile, pt.earth_az_deg, observerHeightM).terrainElevDeg : pt.earth_horizon_elev_deg;
    const sunVisibleFraction = Math.max(0, Math.min(1, (pt.sun_elev_deg - sunHorizon + SUN_RADIUS_DEG) / (2.0 * SUN_RADIUS_DEG)));
    const isSunlit = sunVisibleFraction > 0.05;

    const sunElevRad = degToRad(pt.sun_elev_deg);
    let arrayFactor = 0.0;
    if (isSunlit) {
      if (arrayType === "horizontal_fixed") {
        arrayFactor = sunVisibleFraction * Math.max(0, Math.sin(sunElevRad));
      } else if (arrayType === "vertical_fixed") {
        arrayFactor = sunVisibleFraction * Math.max(0, Math.cos(sunElevRad) * Math.cos(degToRad(pt.sun_az_deg - 180.0)));
      } else {
        arrayFactor = sunVisibleFraction * Math.max(0, Math.cos(sunElevRad));
      }
    }

    const earthClearance = pt.earth_elev_deg - earthHorizon;
    return {
      ...pt,
      sun_horizon_elev_deg: Number(sunHorizon.toFixed(3)),
      sun_visible_fraction: Number(sunVisibleFraction.toFixed(3)),
      is_sunlit: isSunlit,
      solar_power_factor: Number(arrayFactor.toFixed(3)),
      earth_horizon_elev_deg: Number(earthHorizon.toFixed(3)),
      earth_clearance_deg: Number(earthClearance.toFixed(3)),
      is_dte_visible: earthClearance >= MIN_COMMS_CLEARANCE_DEG,
    };
  });
}

function summarizeSeries(series: TimeseriesPoint[], stepHours: number): ArrayScenarioSummary {
  if (series.length === 0) {
    return { meanPowerFactor: 0, meanIrradianceWm2: 0, sunlitHours: 0, longestDarkStreakHours: 0 };
  }
  let powerSum = 0, sunlitSteps = 0, streak = 0, maxStreak = 0;
  for (const pt of series) {
    powerSum += pt.solar_power_factor;
    if (pt.is_sunlit) {
      sunlitSteps += 1;
      streak = 0;
    } else {
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    }
  }
  const meanPowerFactor = powerSum / series.length;
  return {
    meanPowerFactor,
    meanIrradianceWm2: meanPowerFactor * SOLAR_CONSTANT_WM2,
    sunlitHours: sunlitSteps * stepHours,
    longestDarkStreakHours: maxStreak * stepHours,
  };
}

/** Compare baseline Horizontal Deck (2.0m) against active array & mast configuration. */
export function computeArrayComparisonMetrics(
  baseTimeseries: TimeseriesPoint[],
  horizonProfile: HorizonProfilePoint[],
  activeArrayType: SolarArrayType,
  activeHeightM: number,
): ArrayComparisonMetrics {
  const stepHours = inferStepHours(baseTimeseries);
  const baselineSeries = simulateArrayAndMastTimeseries(baseTimeseries, horizonProfile, "horizontal_fixed", 2.0);
  const activeSeries = simulateArrayAndMastTimeseries(baseTimeseries, horizonProfile, activeArrayType, activeHeightM);
  const baseline = summarizeSeries(baselineSeries, stepHours);
  const active = summarizeSeries(activeSeries, stepHours);
  return {
    baseline,
    active,
    powerGainPct: (active.meanPowerFactor - baseline.meanPowerFactor) * 100.0,
  };
}
