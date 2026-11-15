/** Reference constants fetched from the backend.
 *
 * The lunar radius is a physical constant owned by `backend/src/domain/constants.py`
 * (REQ-06). The frontend needs it only for map projection geometry, so it is read
 * from `GET /api/v1/health` rather than restated here.
 */

import { requestJson } from "./httpClient";

export interface HealthResponse {
  status: string;
  architecture: string;
  frame: string;
  moon_radius_km: number;
}

let cached: HealthResponse | null = null;

/** Fetch the backend's reference constants, caching the result for the session. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  if (cached) {
    return cached;
  }
  const health = await requestJson<HealthResponse>({
    path: "/health",
    method: "GET",
    requestKey: "health",
    signal,
    scenarioKey: "health",
  });
  cached = health;
  return health;
}
