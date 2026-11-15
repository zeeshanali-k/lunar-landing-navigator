/** Deep-link URL query synchronization for shareable lunar scenarios (F3.1).
 *
 * Canonical P0 key set (REQ-11), in this order:
 *   site, start, days, step, array, array_az, mast, min_comms
 *
 * Custom-coordinate keys are not part of P0 and are rejected on parse. Parsing
 * validates against the same allowlists the backend enforces; an invalid value
 * falls back to the documented default and sets `notices` so the UI can tell the
 * user what was ignored.
 */

import { type DurationDays, type ObserverHeightM, type SolarArrayType, type StepMinutes } from "../types";

export type PersonaMode = "planner" | "explorer";
export type WorkspaceTab = "cockpit" | "compare" | "windows" | "explorer";

export interface ScenarioUrlParams {
  siteId: string | null;
  startUtc: string;
  durationDays: DurationDays;
  stepMinutes: StepMinutes;
  solarArrayType: SolarArrayType;
  fixedArrayAzimuthDeg: number;
  observerHeightM: ObserverHeightM;
  minCommsElevDeg: number;
  personaMode: PersonaMode;
}

export interface ParsedScenario {
  params: Partial<ScenarioUrlParams>;
  notices: string[];
}

export const ALLOWED_DURATIONS = [7, 14, 29.5] as const;
export const ALLOWED_STEPS = [10, 60] as const;
export const ALLOWED_MASTS = [1.5, 2.0, 10.0] as const;
const VALID_ARRAY_TYPES = new Set<SolarArrayType>([
  "horizontal_fixed",
  "vertical_fixed",
  "vertical_tracking",
]);

const REJECTED_KEYS = ["lat", "lon", "label", "custom_coords", "array_azimuth"] as const;

function parseFiniteNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAllowedNumber(value: number, allowed: readonly number[]): boolean {
  return allowed.some((candidate) => Math.abs(candidate - value) < 1e-9);
}

/** Parse and validate scenario parameters from a URL query string. */
export function parseScenarioFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): ParsedScenario {
  const params = new URLSearchParams(search);
  const result: Partial<ScenarioUrlParams> = {};
  const notices: string[] = [];

  for (const key of REJECTED_KEYS) {
    if (params.has(key)) {
      notices.push(`Ignored unsupported parameter "${key}".`);
    }
  }

  const site = params.get("site");
  if (site && site.trim().length > 0) {
    result.siteId = site.trim();
  }

  const start = params.get("start");
  if (start) {
    if (!Number.isNaN(Date.parse(start))) {
      result.startUtc = start;
    } else {
      notices.push("Ignored unparseable start date.");
    }
  }

  const days = parseFiniteNumber(params.get("days"));
  if (days !== null) {
    if (isAllowedNumber(days, ALLOWED_DURATIONS)) {
      result.durationDays = days as DurationDays;
    } else {
      notices.push(`Duration must be one of ${ALLOWED_DURATIONS.join(", ")} days.`);
    }
  }

  const step = parseFiniteNumber(params.get("step"));
  if (step !== null) {
    if (isAllowedNumber(step, ALLOWED_STEPS)) {
      result.stepMinutes = step as StepMinutes;
    } else {
      notices.push(`Step must be one of ${ALLOWED_STEPS.join(", ")} minutes.`);
    }
  }

  const arrayParam = params.get("array") as SolarArrayType | null;
  if (arrayParam) {
    if (VALID_ARRAY_TYPES.has(arrayParam)) {
      result.solarArrayType = arrayParam;
    } else {
      notices.push("Ignored unknown solar array type.");
    }
  }

  const azimuth = parseFiniteNumber(params.get("array_az"));
  if (azimuth !== null) {
    if (azimuth >= 0 && azimuth < 360) {
      result.fixedArrayAzimuthDeg = azimuth;
    } else {
      notices.push("Array azimuth must be in [0, 360).");
    }
  }

  const mast = parseFiniteNumber(params.get("mast"));
  if (mast !== null) {
    if (isAllowedNumber(mast, ALLOWED_MASTS)) {
      result.observerHeightM = mast as ObserverHeightM;
    } else {
      notices.push(`Observer height must be one of ${ALLOWED_MASTS.join(", ")} m.`);
    }
  }

  const minComms = parseFiniteNumber(params.get("min_comms"));
  if (minComms !== null) {
    if (minComms >= -5 && minComms <= 45) {
      result.minCommsElevDeg = minComms;
    } else {
      notices.push("Minimum comms elevation must be in [-5, 45] degrees.");
    }
  }

  const mode = params.get("mode");
  if (mode === "planner" || mode === "explorer") {
    result.personaMode = mode;
  }

  return { params: result, notices };
}

function buildSearchParams(params: ScenarioUrlParams): URLSearchParams {
  const query = new URLSearchParams();
  if (params.siteId) {
    query.set("site", params.siteId);
  }
  query.set("start", params.startUtc);
  query.set("days", String(params.durationDays));
  query.set("step", String(params.stepMinutes));
  query.set("array", params.solarArrayType);
  query.set("array_az", String(params.fixedArrayAzimuthDeg));
  query.set("mast", String(params.observerHeightM));
  query.set("min_comms", String(params.minCommsElevDeg));
  return query;
}

/** The canonical scenario key used for fixture lookups and comparison. */
export function scenarioKey(params: ScenarioUrlParams): string {
  const query = new URLSearchParams();
  if (params.siteId) {
    query.set("site", params.siteId);
  }
  query.set("start", params.startUtc);
  query.set("days", String(params.durationDays));
  query.set("step", String(params.stepMinutes));
  query.set("array", params.solarArrayType);
  query.set("array_az", String(params.fixedArrayAzimuthDeg));
  query.set("mast", String(params.observerHeightM));
  query.set("min_comms", String(params.minCommsElevDeg));
  return query.toString();
}

/** Update browser URL query params in-place without triggering a reload. */
export function syncScenarioToUrl(params: ScenarioUrlParams): void {
  if (typeof window === "undefined") {
    return;
  }
  const query = buildSearchParams(params).toString();
  const nextUrl = `${window.location.pathname}?${query}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

/** Build a complete shareable URL for the current mission scenario. */
export function buildShareableScenarioUrl(params: ScenarioUrlParams): string {
  if (typeof window === "undefined") {
    return `?${buildSearchParams(params).toString()}`;
  }
  return `${window.location.origin}${window.location.pathname}?${buildSearchParams(params).toString()}`;
}

/** Copy the shareable scenario URL to clipboard; returns true on success. */
export async function copyScenarioLinkToClipboard(
  params: ScenarioUrlParams,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(buildShareableScenarioUrl(params));
    return true;
  } catch {
    return false;
  }
}
