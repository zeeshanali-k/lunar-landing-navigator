/** Unit tests for canonical P0 URL sync, parameter validation, and notices (FE-001). */

import {
  buildShareableScenarioUrl,
  parseScenarioFromUrl,
  scenarioKey,
  type ScenarioUrlParams,
} from "../state/urlSync";
import { describe, expect, it } from "./testHarness";

const VALID_PARAMS: ScenarioUrlParams = {
  siteId: "artemis-shackleton-ridge",
  startUtc: "2027-11-01T00:00:00Z",
  durationDays: 14,
  stepMinutes: 60,
  solarArrayType: "vertical_tracking",
  fixedArrayAzimuthDeg: 45,
  observerHeightM: 2,
  minCommsElevDeg: 5,
  personaMode: "planner",
};

describe("urlSync canonical keys and validation", () => {
  it("serializes all 8 P0 scenario keys in canonical order without mode", () => {
    const key = scenarioKey(VALID_PARAMS);
    const keys = [...new URLSearchParams(key).keys()];
    expect.deepEqual(keys, [
      "site",
      "start",
      "days",
      "step",
      "array",
      "array_az",
      "mast",
      "min_comms",
    ]);
    expect.truthy(buildShareableScenarioUrl(VALID_PARAMS).includes("array_az=45"));
  });

  it("parses valid query parameters cleanly with no notices", () => {
    const qs = `?${scenarioKey(VALID_PARAMS)}`;
    const parsed = parseScenarioFromUrl(qs);
    expect.equal(parsed.notices.length, 0);
    expect.equal(parsed.params.siteId, "artemis-shackleton-ridge");
    expect.equal(parsed.params.durationDays, 14);
    expect.equal(parsed.params.stepMinutes, 60);
    expect.equal(parsed.params.solarArrayType, "vertical_tracking");
    expect.equal(parsed.params.fixedArrayAzimuthDeg, 45);
    expect.equal(parsed.params.observerHeightM, 2);
    expect.equal(parsed.params.minCommsElevDeg, 5);
  });

  it("rejects out-of-range and legacy parameters with explicit notices", () => {
    const qs = "?lat=-89&lon=10&days=21&step=15&array=tilted&array_az=360&mast=5&min_comms=60";
    const parsed = parseScenarioFromUrl(qs);
    expect.equal(parsed.params.durationDays, undefined);
    expect.equal(parsed.params.stepMinutes, undefined);
    expect.equal(parsed.params.solarArrayType, undefined);
    expect.equal(parsed.params.fixedArrayAzimuthDeg, undefined);
    expect.equal(parsed.params.observerHeightM, undefined);
    expect.equal(parsed.params.minCommsElevDeg, undefined);
    expect.truthy(parsed.notices.length >= 8);
  });

  it("flags unparseable start date with notice and falls back", () => {
    const parsed = parseScenarioFromUrl("?start=not-a-timestamp");
    expect.equal(parsed.params.startUtc, undefined);
    expect.truthy(parsed.notices.some((msg) => msg.includes("start date")));
  });
});
