/** Unit tests for mission timeline step inference and Gantt segment grouping. */

import { it } from "vitest";

import { buildCommsSegments, buildPowerSegments, classifyPowerState, inferStepHours } from "../features/mission-timeline/timelineSegments";
import type { TimeseriesPoint } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertApprox(actual: number, expected: number, eps: number, label: string): void {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`${label}: expected ${expected} ± ${eps}, got ${actual}`);
  }
}

function makePoint(timestamp_utc: string, sun_visible_fraction: number, is_sunlit: boolean, is_dte_visible: boolean): TimeseriesPoint {
  return {
    timestamp_utc,
    sun_az_deg: 0,
    sun_elev_deg: 0,
    sun_horizon_elev_deg: 0,
    sun_visible_fraction,
    is_sunlit,
    solar_power_factor: sun_visible_fraction,
    earth_az_deg: 0,
    earth_elev_deg: 0,
    earth_horizon_elev_deg: 0,
    earth_clearance_deg: 0,
    is_dte_geometric: is_dte_visible,
    is_solar_conjunction: false,
    is_dte_visible,
    sun_earth_sep_deg: 45,
    hours_to_next_sunset: null,
    hours_to_next_sunrise: null,
    hours_to_next_earthset: null,
    hours_to_next_earthrise: null,
  };
}

export function runTimelineSegmentsTests(): void {
  // 1. Step inference for 1-hour and 30-minute spacing
  const hourly = [
    makePoint("2027-11-06T00:00:00Z", 1.0, true, true),
    makePoint("2027-11-06T01:00:00Z", 1.0, true, true),
    makePoint("2027-11-06T02:00:00Z", 0.5, true, true),
    makePoint("2027-11-06T03:00:00Z", 0.0, false, false),
    makePoint("2027-11-06T04:00:00Z", 0.02, true, false),
  ];
  assertApprox(inferStepHours(hourly), 1.0, 1e-6, "hourly inferStepHours");

  const halfHourly = [makePoint("2027-11-06T00:00:00Z", 1.0, true, true), makePoint("2027-11-06T00:30:00Z", 1.0, true, true)];
  assertApprox(inferStepHours(halfHourly), 0.5, 1e-6, "30-min inferStepHours");

  // 2. Power state classification
  assert(classifyPowerState(makePoint("2027-11-06T00:00:00Z", 0.9, false, false)) === "dark", "is_sunlit=false must classify as dark");
  assert(
    classifyPowerState(makePoint("2027-11-06T00:00:00Z", 0.02, true, false)) === "dark",
    "sun_visible_fraction<=0.05 must classify as dark",
  );
  assert(
    classifyPowerState(makePoint("2027-11-06T00:00:00Z", 0.5, true, false)) === "grazing",
    "sun_visible_fraction=0.5 must classify as grazing",
  );
  assert(
    classifyPowerState(makePoint("2027-11-06T00:00:00Z", 0.98, true, false)) === "sunlit",
    "sun_visible_fraction=0.98 must classify as sunlit",
  );

  // 3. Power Gantt segment merging
  const powerSegs = buildPowerSegments(hourly);
  assert(powerSegs.length === 3, `expected 3 power segments, got ${powerSegs.length}`);
  assert(
    powerSegs[0].state === "sunlit" &&
      powerSegs[0].startIndex === 0 &&
      powerSegs[0].endIndex === 1 &&
      powerSegs[0].durationHours === 2 &&
      powerSegs[0].label === "2h Sun",
    `unexpected powerSegs[0]: ${JSON.stringify(powerSegs[0])}`,
  );
  assert(
    powerSegs[1].state === "grazing" &&
      powerSegs[1].startIndex === 2 &&
      powerSegs[1].endIndex === 2 &&
      powerSegs[1].durationHours === 1 &&
      powerSegs[1].label === "1h Grazing",
    `unexpected powerSegs[1]: ${JSON.stringify(powerSegs[1])}`,
  );
  assert(
    powerSegs[2].state === "dark" &&
      powerSegs[2].startIndex === 3 &&
      powerSegs[2].endIndex === 4 &&
      powerSegs[2].durationHours === 2 &&
      powerSegs[2].label === "2h Dark",
    `unexpected powerSegs[2]: ${JSON.stringify(powerSegs[2])}`,
  );

  // 4. Comms Gantt segment merging
  const commsSegs = buildCommsSegments(hourly);
  assert(commsSegs.length === 2, `expected 2 comms segments, got ${commsSegs.length}`);
  assert(
    commsSegs[0].state === "dte_active" &&
      commsSegs[0].startIndex === 0 &&
      commsSegs[0].endIndex === 2 &&
      commsSegs[0].durationHours === 3 &&
      commsSegs[0].label === "3h DTE",
    `unexpected commsSegs[0]: ${JSON.stringify(commsSegs[0])}`,
  );
  assert(
    commsSegs[1].state === "dte_blocked" &&
      commsSegs[1].startIndex === 3 &&
      commsSegs[1].endIndex === 4 &&
      commsSegs[1].durationHours === 2 &&
      commsSegs[1].label === "2h Blocked",
    `unexpected commsSegs[1]: ${JSON.stringify(commsSegs[1])}`,
  );
}

it("mission timeline step inference and Gantt segment grouping", () => {
  runTimelineSegmentsTests();
});

it("covers all three timeline tracks: solar states, DTE states, and elevation curves", () => {
  const series: TimeseriesPoint[] = [
    { ...makePoint("2027-11-06T00:00:00Z", 1.0, true, true), sun_elev_deg: 2.5, earth_elev_deg: 4.0 },
    { ...makePoint("2027-11-06T01:00:00Z", 0.5, true, false), sun_elev_deg: 0.4, earth_elev_deg: -1.5 },
    { ...makePoint("2027-11-06T02:00:00Z", 0.0, false, false), sun_elev_deg: -2.0, earth_elev_deg: -3.2 },
  ];
  const powerTracks = buildPowerSegments(series);
  const commsTracks = buildCommsSegments(series);
  const elevationValues = series.map((pt) => [pt.sun_elev_deg, pt.earth_elev_deg]);

  assert(
    JSON.stringify(powerTracks.map((seg) => seg.state)) === JSON.stringify(["sunlit", "grazing", "dark"]),
    "solar track must distinguish sunlit, grazing, and dark intervals",
  );
  assert(
    JSON.stringify(commsTracks.map((seg) => seg.state)) === JSON.stringify(["dte_active", "dte_blocked"]),
    "DTE track must distinguish dte_active and dte_blocked intervals",
  );
  assert(
    elevationValues.length === 3 && elevationValues[0][0] === 2.5 && elevationValues[2][1] === -3.2,
    "elevation track must preserve sun_elev_deg and earth_elev_deg series values",
  );
});
