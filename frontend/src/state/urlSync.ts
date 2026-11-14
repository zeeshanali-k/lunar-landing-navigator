/** Deep-link URL query synchronization for shareable lunar scenarios (F3.1). */

import {
  clampLunarLatitude,
  type CustomCoords,
  type SolarArrayType,
} from "../types";

export type PersonaMode = "planner" | "explorer";
export type WorkspaceTab = "cockpit" | "compare" | "windows" | "explorer";

export interface ScenarioUrlParams {
  siteId: string | null;
  customCoords: CustomCoords | null;
  startUtc: string;
  durationDays: number;
  solarArrayType: SolarArrayType;
  observerHeightM: number;
  personaMode: PersonaMode;
}

const VALID_ARRAY_TYPES = new Set<SolarArrayType>([
  "horizontal_fixed",
  "vertical_fixed",
  "vertical_tracking",
]);

function parseFiniteNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse and validate scenario parameters from URL query string. */
export function parseScenarioFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): Partial<ScenarioUrlParams> {
  const params = new URLSearchParams(search);
  const result: Partial<ScenarioUrlParams> = {};

  const lat = parseFiniteNumber(params.get("lat"));
  const lon = parseFiniteNumber(params.get("lon"));
  const label = params.get("label");
  const site = params.get("site");

  if (lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    result.customCoords = {
      lat_deg: clampLunarLatitude(lat),
      lon_deg: lon,
      label: label ? label.trim() : null,
    };
    result.siteId = null;
  } else if (site && site.trim().length > 0) {
    result.siteId = site.trim();
    result.customCoords = null;
  }

  const start = params.get("start");
  if (start && !Number.isNaN(Date.parse(start))) {
    result.startUtc = start;
  }

  const days = parseFiniteNumber(params.get("days"));
  if (days !== null && days >= 1 && days <= 60) {
    result.durationDays = days;
  }

  const arrayParam = params.get("array") as SolarArrayType | null;
  if (arrayParam && VALID_ARRAY_TYPES.has(arrayParam)) {
    result.solarArrayType = arrayParam;
  }

  const mast = parseFiniteNumber(params.get("mast"));
  if (mast !== null && mast >= 0.5 && mast <= 50) {
    result.observerHeightM = mast;
  }

  const mode = params.get("mode");
  if (mode === "planner" || mode === "explorer") {
    result.personaMode = mode;
  }

  return result;
}

function buildSearchParams(params: ScenarioUrlParams): URLSearchParams {
  const query = new URLSearchParams();
  if (params.customCoords) {
    query.set("lat", params.customCoords.lat_deg.toFixed(4));
    query.set("lon", params.customCoords.lon_deg.toFixed(4));
    if (params.customCoords.label) {
      query.set("label", params.customCoords.label);
    }
  } else if (params.siteId) {
    query.set("site", params.siteId);
  }
  query.set("start", params.startUtc);
  query.set("days", String(params.durationDays));
  query.set("array", params.solarArrayType);
  query.set("mast", String(params.observerHeightM));
  query.set("mode", params.personaMode);
  return query;
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
