/** Central re-export of typed API service wrappers and HTTP client utilities (F3.2). */

export {
  API_BASE_URL,
  FORCE_OFFLINE_FALLBACK,
  cancelPendingRequest,
  isAbortError,
  isOfflineFallbackActive,
  requestJson,
  subscribeOfflineStatus,
  type RequestJsonOptions,
} from "./httpClient";
export {
  fetchCustomTerrain,
  fetchSiteTerrain,
  fetchSites,
} from "./siteService";
export {
  compareScenarios,
  evaluateScenario,
  scanWindows,
} from "./evaluationService";
