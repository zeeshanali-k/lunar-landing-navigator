/** Typed REST service wrappers for Contract A (Sites) and Contract C (Terrain) (F3.2). */

import { type CustomTerrainRequest, type SiteSummary, type TerrainPatch } from "../types";
import { requestJson } from "./httpClient";

/** Fetch all curated lunar landing sites (Contract A: GET /api/v1/sites). */
export async function fetchSites(signal?: AbortSignal): Promise<SiteSummary[]> {
  return requestJson<SiteSummary[]>({
    path: "/sites",
    method: "GET",
    requestKey: "sites:list",
    signal,
    scenarioKey: "sites",
  });
}

/**
 * Fetch the precomputed local_enu terrain patch for a curated site (Contract C).
 *
 * A 409 `TERRAIN_NOT_AVAILABLE` means the site is spherical-limb-only and has no
 * measured terrain. That is surfaced to the caller rather than replaced with
 * another site's patch; see REQ-05 and REQ-10.
 */
export async function fetchSiteTerrain(siteId: string, signal?: AbortSignal): Promise<TerrainPatch> {
  return requestJson<TerrainPatch>({
    path: `/sites/${encodeURIComponent(siteId)}/terrain`,
    method: "GET",
    requestKey: "terrain:active",
    signal,
    scenarioKey: `terrain:${siteId}`,
  });
}

/** Fetch a terrain patch for custom coordinates (Contract C). P1 only; not routed in P0. */
export async function fetchCustomTerrain(payload: CustomTerrainRequest, signal?: AbortSignal): Promise<TerrainPatch> {
  return requestJson<TerrainPatch>({
    path: "/terrain/custom",
    method: "POST",
    body: payload,
    requestKey: "terrain:active",
    signal,
    scenarioKey: `terrain:custom:${payload.lat_deg},${payload.lon_deg}`,
  });
}
