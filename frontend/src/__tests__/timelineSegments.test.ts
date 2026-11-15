/** Unit tests for 3-track mission timeline segmentation and scrubbing math (FE-002). */

import {
  buildElevationPolyline,
  buildTrackSegments,
  classifyDteState,
  classifySolarState,
  computeElevationBounds,
  xCoordToSampleIndex,
} from "../features/mission-timeline/timelineSegments";
import type { TimeseriesPoint } from "../types";
import { describe, expect, it } from "./testHarness";

function makePt(
  sunElev: number,
  earthElev: number,
  sunFrac: number,
  isSunlit: boolean,
  isDte: boolean,
): TimeseriesPoint {
  return {
    timestamp_utc: "2027-11-01T00:00:00Z",
    sun_az_deg: 0,
    sun_elev_deg: sunElev,
    sun_horizon_elev_deg: 0,
    sun_visible_fraction: sunFrac,
    is_sunlit: isSunlit,
    solar_power_factor: isSunlit ? 1 : 0,
    earth_az_deg: 0,
    earth_elev_deg: earthElev,
    earth_horizon_elev_deg: 0,
    earth_clearance_deg: earthElev,
    is_dte_geometric: isDte,
    is_solar_conjunction: false,
    is_dte_visible: isDte,
    sun_earth_sep_deg: 90,
    hours_to_next_sunset: null,
    hours_to_next_sunrise: null,
    hours_to_next_earthset: null,
    hours_to_next_earthrise: null,
  };
}

describe("timelineSegments classification and scrubbing", () => {
  const sampleSeries: TimeseriesPoint[] = [
    makePt(2.5, 4.0, 1.0, true, true),
    makePt(1.2, 3.5, 1.0, true, true),
    makePt(0.1, -1.0, 0.5, true, false),
    makePt(-2.0, -3.0, 0.0, false, false),
  ];

  it("classifies sunlit, grazing, dark solar tracks and available/blocked DTE tracks", () => {
    const solarSegs = buildTrackSegments(sampleSeries, classifySolarState);
    expect.deepEqual(
      solarSegs.map((s) => [s.state, s.startIndex, s.endIndex]),
      [["sunlit", 0, 1], ["grazing", 2, 2], ["dark", 3, 3]],
    );
    const dteSegs = buildTrackSegments(sampleSeries, classifyDteState);
    expect.deepEqual(
      dteSegs.map((s) => [s.state, s.startIndex, s.endIndex]),
      [["available", 0, 1], ["blocked", 2, 3]],
    );
  });

  it("computes elevation bounds and SVG polyline across points", () => {
    const bounds = computeElevationBounds(sampleSeries);
    expect.equal(bounds.minElev, -5);
    expect.equal(bounds.maxElev, 7);
    const poly = buildElevationPolyline(sampleSeries, (p) => p.sun_elev_deg, 56, 600, 10, 60, -5, 7);
    expect.equal(poly.split(" ").length, 4);
    expect.equal(buildElevationPolyline([], (p) => p.sun_elev_deg, 56, 600, 10, 60, -5, 7), "");
  });

  it("maps SVG pointer X position cleanly back to clamped sample index", () => {
    expect.equal(xCoordToSampleIndex(0, 56, 600, 10), 0);
    expect.equal(xCoordToSampleIndex(56, 56, 600, 10), 0);
    expect.equal(xCoordToSampleIndex(356, 56, 600, 10), 5);
    expect.equal(xCoordToSampleIndex(999, 56, 600, 10), 9);
    expect.equal(xCoordToSampleIndex(200, 56, 600, 1), 0);
  });
});
