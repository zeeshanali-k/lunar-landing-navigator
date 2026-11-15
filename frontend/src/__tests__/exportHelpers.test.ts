/** Unit tests for deterministic CSV/JSON briefing export builders (F5.4). */

import {
  buildScenarioExportJson,
  buildTimeseriesCsv,
  PROVENANCE_CITATIONS,
} from "../features/briefing-export/exportHelpers";
import type { EvaluateResponse } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeEval(isClassB: boolean): EvaluateResponse {
  return {
    site: {
      id: isClassB ? "cnsa-change-4-von-karman" : "artemis-shackleton-ridge",
      name: isClassB ? "Chang'e-4 (Von Karman)" : "Shackleton Connecting Ridge",
      lat_deg: isClassB ? -45.45 : -89.45,
      lon_deg: isClassB ? 177.59 : 135.2,
      elevation_m: isClassB ? null : 1240,
      mean_slope_deg: isClassB ? null : 4.8,
      has_precomputed_terrain: !isClassB,
    },
    summary: {
      feasibility_score: isClassB ? null : 84.5,
      sub_scores: {
        power_score: 88,
        thermal_score: 82,
        comms_score: isClassB ? 0 : 79,
        terrain_score: isClassB ? null : 91,
      },
      sunlit_hours: 168,
      sunlit_fraction: 0.5,
      longest_dark_streak_hours: 168,
      dte_comms_hours: isClassB ? 0 : 212,
      dte_fraction: isClassB ? 0 : 0.631,
      overlap_sun_and_dte_hours: 0,
      longest_comms_blackout_hours: 336,
      mean_solar_power_factor: 0.45,
      mean_irradiance_w_m2: 612,
      risk_warnings: [],
      next_events_from_start: {
        hours_to_sunset: 114,
        hours_to_sunrise: null,
        hours_to_earthset: null,
        hours_to_earthrise: null,
      },
    },
    horizon_profile: [],
    timeseries: [
      {
        timestamp_utc: "2027-11-01T00:00:00Z",
        sun_az_deg: 20.1,
        sun_elev_deg: 2.05,
        sun_horizon_elev_deg: 1.0,
        sun_visible_fraction: 1.0,
        is_sunlit: true,
        solar_power_factor: 0.99,
        earth_az_deg: 230.4,
        earth_elev_deg: -6.17,
        earth_horizon_elev_deg: -0.08,
        earth_clearance_deg: -6.09,
        is_dte_geometric: false,
        is_solar_conjunction: false,
        is_dte_visible: false,
        sun_earth_sep_deg: 148,
        hours_to_next_sunset: 114,
        hours_to_next_sunrise: null,
        hours_to_next_earthset: null,
        hours_to_next_earthrise: null,
      },
    ],
  };
}

export function runExportHelpersTests(): void {
  const classAEval = makeEval(false);
  const csv = buildTimeseriesCsv(classAEval);
  const lines = csv.trim().split("\n");
  assert(lines.length === 2, `expected header + 1 row, got ${lines.length}`);
  assert(lines[0].startsWith("timestamp_utc,sun_az_deg,"), "CSV header mismatch");
  assert(lines[1].startsWith("2027-11-01T00:00:00Z,"), "CSV row must preserve UTC Z timestamp");

  const classAJson = JSON.parse(buildScenarioExportJson(classAEval, "https://example.local/?site=artemis", null));
  assert(classAJson.terrain_classification === "class_a_lola_80s_80m", "Class A classification mismatch");
  assert(classAJson.provenance_citations.length === PROVENANCE_CITATIONS.length, "citations length mismatch");

  const classBJson = JSON.parse(buildScenarioExportJson(makeEval(true), "https://example.local/?site=cnsa", null));
  assert(classBJson.terrain_classification === "class_b_spherical_limb_only", "Class B classification mismatch");
  assert(classBJson.evaluation.summary.feasibility_score === null, "Class B feasibility_score must remain null");
}

runExportHelpersTests();
