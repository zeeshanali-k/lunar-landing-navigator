/** Launch-delay offset helpers and ephemeris coverage guardrails (P1-DELAYS, REQ-07). */

import type { ComparedScenario, CompareScenarioInput, DurationDays, EvaluateRequest } from "../../types";

export const LAUNCH_DELAY_OFFSETS_DAYS = [14, 29.5, 90, 180] as const;
export type LaunchDelayOffsetDays = (typeof LAUNCH_DELAY_OFFSETS_DAYS)[number];

export const EPHEMERIS_COVERAGE_START_UTC = "2026-01-01T00:00:00Z";
export const EPHEMERIS_COVERAGE_STOP_UTC = "2029-01-01T00:00:00Z";
export const LOOKAHEAD_DAYS = 15;

const MS_PER_DAY = 86_400_000;

export interface EphemerisCoverageResult {
  valid: boolean;
  errorCode: "EPHEMERIS_RANGE_EXCEEDED" | null;
  endUtc: string;
  lookaheadEndUtc: string;
  message: string | null;
}

export interface DelayCandidate {
  offsetDays: LaunchDelayOffsetDays;
  shiftedStartUtc: string;
  coverage: EphemerisCoverageResult;
  scenarioInput: CompareScenarioInput;
}

function parseUtcMs(isoUtc: string): number {
  const trimmed = isoUtc.trim();
  if (!trimmed.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(trimmed)) {
    throw new Error(`Timestamp "${isoUtc}" must be timezone-aware UTC.`);
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid UTC timestamp "${isoUtc}".`);
  }
  return ms;
}

function formatUtcIso(ms: number): string {
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

/** Shift a timezone-aware UTC timestamp forward by an exact number of Earth days. */
export function shiftIsoUtcByDays(startUtc: string, offsetDays: number): string {
  const startMs = parseUtcMs(startUtc);
  const deltaMs = Math.round(offsetDays * MS_PER_DAY);
  return formatUtcIso(startMs + deltaMs);
}

/** Verify mission start + duration + 15-day lookahead fits within precomputed pack bounds. */
export function checkEphemerisCoverage(startUtc: string, durationDays: DurationDays): EphemerisCoverageResult {
  const startMs = parseUtcMs(startUtc);
  const endMs = startMs + Math.round(durationDays * MS_PER_DAY);
  const lookaheadEndMs = startMs + Math.round((durationDays + LOOKAHEAD_DAYS) * MS_PER_DAY);
  const endUtc = formatUtcIso(endMs);
  const lookaheadEndUtc = formatUtcIso(lookaheadEndMs);

  const covStartMs = parseUtcMs(EPHEMERIS_COVERAGE_START_UTC);
  const covStopMs = parseUtcMs(EPHEMERIS_COVERAGE_STOP_UTC);

  if (startMs < covStartMs) {
    return {
      valid: false,
      errorCode: "EPHEMERIS_RANGE_EXCEEDED",
      endUtc,
      lookaheadEndUtc,
      message: `Start ${formatUtcIso(startMs)} precedes pack coverage (${EPHEMERIS_COVERAGE_START_UTC}).`,
    };
  }

  if (lookaheadEndMs > covStopMs) {
    return {
      valid: false,
      errorCode: "EPHEMERIS_RANGE_EXCEEDED",
      endUtc,
      lookaheadEndUtc,
      message: `Mission + ${LOOKAHEAD_DAYS}d lookahead (${lookaheadEndUtc}) exceeds ${EPHEMERIS_COVERAGE_STOP_UTC}.`,
    };
  }

  return {
    valid: true,
    errorCode: null,
    endUtc,
    lookaheadEndUtc,
    message: null,
  };
}

/** Build the four fixed launch-delay sensitivity candidates (+14, +29.5, +90, +180 days). */
export function buildDelaySensitivityCandidates(baseRequest: EvaluateRequest, siteName: string): DelayCandidate[] {
  const siteId = baseRequest.site_id ?? "site";
  return LAUNCH_DELAY_OFFSETS_DAYS.map((offsetDays) => {
    const shiftedStartUtc = shiftIsoUtcByDays(baseRequest.start_utc, offsetDays);
    const coverage = checkEphemerisCoverage(shiftedStartUtc, baseRequest.duration_days);
    return {
      offsetDays,
      shiftedStartUtc,
      coverage,
      scenarioInput: {
        scenario_id: `${siteId}-delay-${offsetDays}d`,
        label: `${siteName} (+${offsetDays}d · ${shiftedStartUtc.slice(0, 10)})`,
        request: {
          ...baseRequest,
          start_utc: shiftedStartUtc,
        },
      },
    };
  });
}

function safeDiff(a: number | null | undefined, b: number | null | undefined): number {
  if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) {
    return 0;
  }
  return Number((a - b).toFixed(4));
}

/** Recompute baseline-relative summary deltas so baseline deltas are exact zero. */
export function computeClientDeltasVsBaseline(scenarios: ComparedScenario[], baselineIndex: number): ComparedScenario[] {
  const base = scenarios[baselineIndex];
  if (!base) {
    return scenarios;
  }
  const baseSum = base.evaluation.summary;
  return scenarios.map((item, idx) => {
    if (idx === baselineIndex) {
      return {
        ...item,
        deltas_vs_baseline: {
          feasibility_score_delta: 0,
          sunlit_hours_delta: 0,
          longest_dark_streak_hours_delta: 0,
          dte_comms_hours_delta: 0,
        },
      };
    }
    const curSum = item.evaluation.summary;
    return {
      ...item,
      deltas_vs_baseline: {
        feasibility_score_delta: safeDiff(curSum.feasibility_score, baseSum.feasibility_score),
        sunlit_hours_delta: safeDiff(curSum.sunlit_hours, baseSum.sunlit_hours),
        longest_dark_streak_hours_delta: safeDiff(curSum.longest_dark_streak_hours, baseSum.longest_dark_streak_hours),
        dte_comms_hours_delta: safeDiff(curSum.dte_comms_hours, baseSum.dte_comms_hours),
      },
    };
  });
}
