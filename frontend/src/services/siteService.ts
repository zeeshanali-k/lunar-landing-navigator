/** Typed REST service wrappers for Contract A (Sites) and Contract C (Terrain) (F3.2). */

import {
  clampLunarLatitude,
  type CustomTerrainRequest,
  type SiteSummary,
  type TerrainPatch,
} from "../types";
import { requestJson } from "./httpClient";

/** Fetch all curated lunar landing sites (Contract A: GET /api/v1/sites). */
export async function fetchSites(signal?: AbortSignal): Promise<SiteSummary[]> {
  return requestJson<SiteSummary[]>({
    path: "/sites",
    method: "GET",
    requestKey: "sites:list",
    signal,
    fallbackFixture: "sites.sample.json",
  });
}

/** Fetch precomputed local_enu terrain patch for a curated site (Contract C). */
export async function fetchSiteTerrain(
  siteId: string,
  signal?: AbortSignal,
): Promise<TerrainPatch> {
  return requestJson<TerrainPatch>({
    path: `/sites/${encodeURIComponent(siteId)}/terrain`,
    method: "GET",
    requestKey: "terrain:active",
    signal,
    fallbackFixture: "terrain.sample.json",
    transformFallback: (patch) => ({
      ...patch,
      site_id: siteId,
    }),
  });
}

/** Generate or fetch local_enu terrain patch for custom coordinates (Contract C). */
export async function fetchCustomTerrain(
  payload: CustomTerrainRequest,
  signal?: AbortSignal,
): Promise<TerrainPatch> {
  const clampedLat = clampLunarLatitude(payload.lat_deg);
  const normalizedPayload: CustomTerrainRequest = {
    ...payload,
    lat_deg: clampedLat,
  };

  return requestJson<TerrainPatch>({
    path: "/terrain/custom",
    method: "POST",
    body: normalizedPayload,
    requestKey: "terrain:active",
    signal,
    fallbackFixture: "terrain.sample.json",
    transformFallback: (patch) => ({
      ...patch,
      site_id: `custom-${clampedLat.toFixed(4)}_${payload.lon_deg.toFixed(4)}`,
    }),
  });
}
