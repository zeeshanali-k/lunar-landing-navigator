/** Central re-export of locked Track 0 API contracts (Contracts A-E) and coordinate utils. */

export type {
  CustomTerrainRequest,
  ExternalLinks,
  SiteCategory,
  SiteSummary,
  TerrainPatch,
} from "./site";
export type {
  CustomCoords,
  EvaluateRequest,
  EvaluateResponse,
  EvaluatedSite,
  EvaluationSummary,
  HorizonProfilePoint,
  NextEventsFromStart,
  SolarArrayType,
  SubScores,
  TimeseriesPoint,
} from "./evaluation";
export type {
  ComparedScenario,
  CompareRequest,
  CompareResponse,
  CompareScenarioInput,
  ScenarioDeltas,
} from "./comparison";
export type {
  TopWindow,
  WindowCandidate,
  WindowsRequest,
  WindowsResponse,
} from "./windows";
export {
  MOON_RADIUS_KM,
  POLE_LAT_CLAMP_DEG,
  azElevToThreeXYZ,
  clampLunarLatitude,
  degToRad,
  normalizeAzimuthDeg,
  radToDeg,
} from "./coordinates";
