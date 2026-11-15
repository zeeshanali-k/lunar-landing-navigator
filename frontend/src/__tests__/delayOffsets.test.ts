/** Unit tests for launch-delay offsets, coverage bounds, and baseline deltas (P1-DELAYS). */

import {
  buildDelaySensitivityCandidates,
  checkEphemerisCoverage,
  computeClientDeltasVsBaseline,
  LAUNCH_DELAY_OFFSETS_DAYS,
  shiftIsoUtcByDays,
} from "../features/comparison-board/delayOffsets";
import type { ComparedScenario, EvaluateRequest } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeMockScenario(id: string, score: number, sunH: number, darkH: number, dteH: number): ComparedScenario {
  return {
    scenario_id: id,
    label: id,
    deltas_vs_baseline: {
      feasibility_score_delta: 0,
      sunlit_hours_delta: 0,
      longest_dark_streak_hours_delta: 0,
      dte_comms_hours_delta: 0,
    },
    evaluation: {
      site: {
        id: "artemis-shackleton-ridge",
        name: "Shackleton",
        lat_deg: -89.45,
        lon_deg: 135.2,
        elevation_m: 1200,
        mean_slope_deg: 5.0,
        has_precomputed_terrain: true,
      },
      summary: {
        feasibility_score: score,
        sub_scores: { power_score: 80, thermal_score: 80, comms_score: 80, terrain_score: 90 },
        sunlit_hours: sunH,
        sunlit_fraction: 0.7,
        longest_dark_streak_hours: darkH,
        dte_comms_hours: dteH,
        dte_fraction: 0.6,
        overlap_sun_and_dte_hours: 100,
        longest_comms_blackout_hours: 40,
        mean_solar_power_factor: 0.7,
        mean_irradiance_w_m2: 950,
        risk_warnings: [],
        next_events_from_start: {
          hours_to_sunset: 10,
          hours_to_sunrise: null,
          hours_to_earthset: 20,
          hours_to_earthrise: null,
        },
      },
      horizon_profile: [],
      timeseries: [],
    },
  };
}

export function runDelayOffsetsTests(): void {
  // 1. Fixed launch-delay offsets
  assert(
    LAUNCH_DELAY_OFFSETS_DAYS.length === 4 &&
      LAUNCH_DELAY_OFFSETS_DAYS[0] === 14 &&
      LAUNCH_DELAY_OFFSETS_DAYS[1] === 29.5 &&
      LAUNCH_DELAY_OFFSETS_DAYS[2] === 90 &&
      LAUNCH_DELAY_OFFSETS_DAYS[3] === 180,
    `unexpected offsets: ${JSON.stringify(LAUNCH_DELAY_OFFSETS_DAYS)}`,
  );

  // 2. Exact UTC day shifting including fractional +29.5 days (+708 hours)
  assert(shiftIsoUtcByDays("2027-11-01T00:00:00Z", 14) === "2027-11-15T00:00:00Z", "+14d shift");
  assert(shiftIsoUtcByDays("2027-11-01T00:00:00Z", 29.5) === "2027-11-30T12:00:00Z", "+29.5d shift");
  assert(shiftIsoUtcByDays("2027-11-01T00:00:00Z", 90) === "2028-01-30T00:00:00Z", "+90d shift");
  assert(shiftIsoUtcByDays("2027-11-01T00:00:00Z", 180) === "2028-04-29T00:00:00Z", "+180d shift");

  // 3. Naive timestamp rejection
  let threwNaive = false;
  try {
    shiftIsoUtcByDays("2027-11-01T00:00:00", 14);
  } catch {
    threwNaive = true;
  }
  assert(threwNaive, "naive timestamp without UTC offset must fail");

  // 4. Coverage check including 15-day lookahead
  const ok = checkEphemerisCoverage("2027-11-01T00:00:00Z", 14);
  assert(ok.valid && ok.errorCode === null, "2027-11-01 + 14d + 15d lookahead should be covered");

  const late = checkEphemerisCoverage("2028-06-10T00:00:00Z", 14);
  assert(!late.valid && late.errorCode === "EPHEMERIS_RANGE_EXCEEDED", "2028-06-10 + 14d + 15d must exceed 2028-07-01");

  const early = checkEphemerisCoverage("2026-12-31T00:00:00Z", 7);
  assert(!early.valid && early.errorCode === "EPHEMERIS_RANGE_EXCEEDED", "2026-12-31 must precede coverage");

  // 5. Delay sensitivity candidate batch when +180d exceeds coverage
  const req: EvaluateRequest = {
    site_id: "artemis-shackleton-ridge",
    start_utc: "2028-02-01T00:00:00Z",
    duration_days: 14,
  };
  const candidates = buildDelaySensitivityCandidates(req, "Shackleton");
  assert(candidates.length === 4, "must build 4 delay candidates");
  assert(candidates[0].coverage.valid && candidates[1].coverage.valid && candidates[2].coverage.valid, "+14/+29.5/+90 must fit");
  assert(!candidates[3].coverage.valid && candidates[3].coverage.errorCode === "EPHEMERIS_RANGE_EXCEEDED", "+180d from Feb 2028 exceeds July 2028");

  // 6. Baseline-relative deltas
  const adjusted = computeClientDeltasVsBaseline(
    [makeMockScenario("a", 80, 200, 40, 150), makeMockScenario("b", 88.5, 224, 28, 170)],
    0,
  );
  assert(adjusted[0].deltas_vs_baseline.feasibility_score_delta === 0, "baseline delta must be 0");
  assert(adjusted[1].deltas_vs_baseline.feasibility_score_delta === 8.5, "score delta must be +8.5");
  assert(adjusted[1].deltas_vs_baseline.longest_dark_streak_hours_delta === -12, "dark streak delta must be -12");
}

runDelayOffsetsTests();
