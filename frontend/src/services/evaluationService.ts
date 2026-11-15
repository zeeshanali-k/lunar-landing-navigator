/** Typed REST wrappers for Contracts B (Evaluate), D (Compare), and E (Windows) (F3.2).
 *
 * This module performs no computation on the response. Every number a user sees
 * is produced by the backend and displayed as received; see REQ-06, "the frontend
 * computes no physics". In particular there is no client-side rescaling of power,
 * irradiance, clearance, countdowns, or feasibility, and no site-specific special
 * case. If a value looks wrong, the fix belongs in `backend/src/domain/`.
 */

import {
  type CompareRequest,
  type CompareResponse,
  type EvaluateRequest,
  type EvaluateResponse,
  type WindowsRequest,
  type WindowsResponse,
} from "../types";
import { requestJson } from "./httpClient";

/** Evaluate solar power, DTE comms, countdowns, and score for a scenario (Contract B). */
export async function evaluateScenario(payload: EvaluateRequest, scenarioKey: string, signal?: AbortSignal): Promise<EvaluateResponse> {
  return requestJson<EvaluateResponse>({
    path: "/evaluate",
    method: "POST",
    body: payload,
    requestKey: "evaluate:active",
    signal,
    scenarioKey,
  });
}

/** Compare up to 4 pinned scenarios or schedule shifts side-by-side (Contract D). */
export async function compareScenarios(payload: CompareRequest, scenarioKey: string, signal?: AbortSignal): Promise<CompareResponse> {
  return requestJson<CompareResponse>({
    path: "/compare",
    method: "POST",
    body: payload,
    requestKey: "compare:active",
    signal,
    scenarioKey,
  });
}

/** Scan 12 months of candidate launch dates for optimal landing windows (Contract E). */
export async function scanWindows(payload: WindowsRequest, scenarioKey: string, signal?: AbortSignal): Promise<WindowsResponse> {
  return requestJson<WindowsResponse>({
    path: "/windows",
    method: "POST",
    body: payload,
    requestKey: "windows:active",
    signal,
    scenarioKey,
  });
}
