/** Unit tests for canonical P0 URL sync, parameter validation, and notices. */

import { it } from "vitest";

import { buildShareableScenarioUrl, parseScenarioFromUrl, scenarioKey, type ScenarioUrlParams } from "../state/urlSync";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const VALID_PARAMS: ScenarioUrlParams = {
  siteId: "artemis-cabeus-peak",
  startUtc: "2027-11-01T00:00:00Z",
  durationDays: 14,
  stepMinutes: 60,
  solarArrayType: "vertical_tracking",
  fixedArrayAzimuthDeg: 45,
  observerHeightM: 2,
  minCommsElevDeg: 5,
};

export function runUrlSyncTests(): void {
  // 1. Canonical key ordering (8 P0 keys only)
  const key = scenarioKey(VALID_PARAMS);
  const keys = [...new URLSearchParams(key).keys()];
  const expectedKeys = ["site", "start", "days", "step", "array", "array_az", "mast", "min_comms"];
  assert(
    JSON.stringify(keys) === JSON.stringify(expectedKeys),
    `expected canonical key order ${expectedKeys.join(",")}, got ${keys.join(",")}`,
  );
  assert(buildShareableScenarioUrl(VALID_PARAMS).includes("array_az=45"), "shareable URL should include array_az=45");

  // 2. Round-trip parse of valid parameters produces zero notices
  const valid = parseScenarioFromUrl(`?${key}`);
  assert(valid.notices.length === 0, `expected 0 notices, got ${valid.notices.length}`);
  assert(valid.params.siteId === "artemis-cabeus-peak", "siteId mismatch");
  assert(valid.params.durationDays === 14, "durationDays mismatch");
  assert(valid.params.stepMinutes === 60, "stepMinutes mismatch");
  assert(valid.params.solarArrayType === "vertical_tracking", "solarArrayType mismatch");
  assert(valid.params.fixedArrayAzimuthDeg === 45, "fixedArrayAzimuthDeg mismatch");
  assert(valid.params.observerHeightM === 2, "observerHeightM mismatch");
  assert(valid.params.minCommsElevDeg === 5, "minCommsElevDeg mismatch");

  // 3. Invalid allowlist entries and custom coords emit explicit fallback notices
  const rejected = parseScenarioFromUrl("?lat=-89&lon=10&days=21&step=15&array=tilted&array_az=360&mast=5&min_comms=60");
  assert(rejected.params.durationDays === undefined, "invalid durationDays should be undefined");
  assert(rejected.params.stepMinutes === undefined, "invalid stepMinutes should be undefined");
  assert(rejected.params.solarArrayType === undefined, "invalid solarArrayType should be undefined");
  assert(rejected.params.fixedArrayAzimuthDeg === undefined, "out-of-range array_az should be undefined");
  assert(rejected.params.observerHeightM === undefined, "invalid mast should be undefined");
  assert(rejected.params.minCommsElevDeg === undefined, "out-of-range min_comms should be undefined");
  assert(rejected.notices.length >= 8, `expected >= 8 notices, got ${rejected.notices.length}`);

  // 4. Unparseable start timestamp emits notice
  const badStart = parseScenarioFromUrl("?start=not-a-timestamp");
  assert(badStart.params.startUtc === undefined, "unparseable startUtc should be undefined");
  assert(
    badStart.notices.some((msg) => msg.includes("start date")),
    "expected start date notice",
  );
}

it("canonical P0 URL sync, parameter validation, and notices", () => {
  runUrlSyncTests();
});
