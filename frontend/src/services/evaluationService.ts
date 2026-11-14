/** Typed REST wrappers for Contracts B (Evaluate), D (Compare), and E (Windows) (F3.2). */

import {
  clampLunarLatitude,
  type CompareRequest,
  type CompareResponse,
  type EvaluateRequest,
  type EvaluateResponse,
  type EvaluatedSite,
  type WindowsRequest,
  type WindowsResponse,
} from "../types";
import { requestJson } from "./httpClient";

const SOLAR_CONSTANT_W_M2 = 1361.0;

const CURATED_SITE_META: Record<string, EvaluatedSite> = {
  "artemis-shackleton-ridge": {
    id: "artemis-shackleton-ridge",
    name: "Shackleton Connecting Ridge",
    lat_deg: -89.45,
    lon_deg: 135.2,
    elevation_m: 1240.0,
    mean_slope_deg: 4.8,
  },
  "artemis-mons-mouton": {
    id: "artemis-mons-mouton",
    name: "Mons Mouton (Leibnitz Beta Plateau)",
    lat_deg: -84.65,
    lon_deg: 31.2,
    elevation_m: 5320.0,
    mean_slope_deg: 3.9,
  },
  "artemis-malapert-massif": {
    id: "artemis-malapert-massif",
    name: "Malapert Massif",
    lat_deg: -85.97,
    lon_deg: -2.7,
    elevation_m: 4950.0,
    mean_slope_deg: 6.4,
  },
  "clps-mare-crisium": {
    id: "clps-mare-crisium",
    name: "Mare Crisium (Blue Ghost)",
    lat_deg: 18.56,
    lon_deg: 61.81,
    elevation_m: -3450.0,
    mean_slope_deg: 2.1,
  },
  "apollo-11-tranquillitatis": {
    id: "apollo-11-tranquillitatis",
    name: "Apollo 11 (Mare Tranquillitatis)",
    lat_deg: 0.674,
    lon_deg: 23.473,
    elevation_m: -1860.0,
    mean_slope_deg: 1.6,
  },
  "change-4-von-karman": {
    id: "change-4-von-karman",
    name: "Chang'e-4 (Von Karman Crater)",
    lat_deg: -45.457,
    lon_deg: 177.588,
    elevation_m: -5930.0,
    mean_slope_deg: 2.9,
  },
};

function resolveFallbackSite(baseSite: EvaluatedSite, req: EvaluateRequest): EvaluatedSite {
  if (req.custom_coords) {
    const clampedLat = clampLunarLatitude(req.custom_coords.lat_deg);
    return {
      ...baseSite,
      id: `custom-${clampedLat.toFixed(4)}_${req.custom_coords.lon_deg.toFixed(4)}`,
      name: req.custom_coords.label?.trim() || "Custom Landing Coordinates",
      lat_deg: clampedLat,
      lon_deg: req.custom_coords.lon_deg,
    };
  }
  if (req.site_id && CURATED_SITE_META[req.site_id]) {
    return CURATED_SITE_META[req.site_id];
  }
  return baseSite;
}

function adaptOfflineEvaluation(base: EvaluateResponse, req: EvaluateRequest): EvaluateResponse {
  const site = resolveFallbackSite(base.site, req);
  const isFarSide =
    site.id === "change-4-von-karman" ||
    (Math.abs(site.lat_deg) < 80.0 && Math.abs(site.lon_deg) > 95.0);
  const arrayFactor =
    req.solar_array_type === "horizontal_fixed"
      ? 0.14
      : req.solar_array_type === "vertical_fixed"
        ? 0.72
        : 1.0;
  const mastBonus = (req.observer_height_m ?? 2.0) >= 10.0 ? 1.12 : 1.0;
  const powerScale = Math.min(1.25, arrayFactor * mastBonus);

  const scaledPower = Math.min(0.99, Number((base.summary.mean_solar_power_factor * powerScale).toFixed(2)));
  const scaledIrradiance = Number((SOLAR_CONSTANT_W_M2 * scaledPower).toFixed(1));
  const powerScore = Math.min(100, Number((base.summary.sub_scores.power_score * powerScale).toFixed(1)));
  const commsScore = isFarSide ? 0 : base.summary.sub_scores.comms_score;

  const riskWarnings = isFarSide
    ? [
        "Far-side location: 0% Direct-to-Earth visibility; requires a lunar relay satellite.",
        ...base.summary.risk_warnings,
      ]
    : base.summary.risk_warnings;

  return {
    ...base,
    site,
    summary: {
      ...base.summary,
      feasibility_score: isFarSide ? Math.max(40, Number((base.summary.feasibility_score - 22).toFixed(1))) : base.summary.feasibility_score,
      sub_scores: { ...base.summary.sub_scores, power_score: powerScore, comms_score: commsScore },
      dte_comms_hours: isFarSide ? 0 : base.summary.dte_comms_hours,
      dte_fraction: isFarSide ? 0 : base.summary.dte_fraction,
      overlap_sun_and_dte_hours: isFarSide ? 0 : base.summary.overlap_sun_and_dte_hours,
      mean_solar_power_factor: scaledPower,
      mean_irradiance_w_m2: scaledIrradiance,
      risk_warnings: riskWarnings,
      next_events_from_start: isFarSide
        ? { ...base.summary.next_events_from_start, hours_to_earthset: null, hours_to_earthrise: null }
        : base.summary.next_events_from_start,
    },
    timeseries: base.timeseries.map((pt) => ({
      ...pt,
      solar_power_factor: Math.min(1, Number((pt.solar_power_factor * powerScale).toFixed(3))),
      is_dte_visible: isFarSide ? false : pt.is_dte_visible,
      earth_elev_deg: isFarSide ? -35.0 : pt.earth_elev_deg,
      earth_clearance_deg: isFarSide ? -35.0 - pt.earth_horizon_elev_deg : pt.earth_clearance_deg,
      hours_to_next_earthset: isFarSide ? null : pt.hours_to_next_earthset,
      hours_to_next_earthrise: isFarSide ? null : pt.hours_to_next_earthrise,
    })),
  };
}

/** Evaluate solar power, DTE comms, countdowns, and score for a scenario (Contract B). */
export async function evaluateScenario(
  payload: EvaluateRequest,
  signal?: AbortSignal,
): Promise<EvaluateResponse> {
  const normalizedPayload: EvaluateRequest = payload.custom_coords
    ? {
        ...payload,
        custom_coords: {
          ...payload.custom_coords,
          lat_deg: clampLunarLatitude(payload.custom_coords.lat_deg),
        },
      }
    : payload;

  return requestJson<EvaluateResponse>({
    path: "/evaluate",
    method: "POST",
    body: normalizedPayload,
    requestKey: "evaluate:active",
    signal,
    fallbackFixture: "evaluate.sample.json",
    transformFallback: (base) => adaptOfflineEvaluation(base, normalizedPayload),
  });
}

/** Compare up to 4 pinned scenarios or schedule shifts side-by-side (Contract D). */
export async function compareScenarios(
  payload: CompareRequest,
  signal?: AbortSignal,
): Promise<CompareResponse> {
  return requestJson<CompareResponse>({
    path: "/compare",
    method: "POST",
    body: payload,
    requestKey: "compare:active",
    signal,
    fallbackFixture: "compare.sample.json",
  });
}

/** Scan 12 months of candidate launch dates for optimal landing windows (Contract E). */
export async function scanWindows(
  payload: WindowsRequest,
  signal?: AbortSignal,
): Promise<WindowsResponse> {
  return requestJson<WindowsResponse>({
    path: "/windows",
    method: "POST",
    body: payload,
    requestKey: "windows:active",
    signal,
    fallbackFixture: "windows.sample.json",
    transformFallback: (res) => ({
      ...res,
      site_id: payload.site_id,
      mission_duration_days: payload.mission_duration_days,
      solar_array_type: payload.solar_array_type,
    }),
  });
}
