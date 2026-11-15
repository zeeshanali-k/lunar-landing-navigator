/* GENERATED FILE — do not edit by hand.
 * Source: backend/src/api/schemas/*.py via `python -m src.cli.export_openapi`.
 * Regenerate instead of patching: the parity test fails on any drift.
 */

export interface CandidateWindow {
  start_utc: string;
  feasibility_score: number;
  sunlit_fraction: number;
  dte_fraction: number;
  longest_dark_streak_hours: number;
}

export interface CompareRequest {
  baseline_index?: number;
  scenarios: CompareScenarioInput[];
}

export interface CompareResponse {
  baseline_index: number;
  scenarios: ComparedScenario[];
  recommended_scenario_id: string;
}

export interface CompareScenarioInput {
  scenario_id: string;
  label: string;
  request: EvaluateRequest;
}

export interface ComparedScenario {
  scenario_id: string;
  label: string;
  evaluation: EvaluateResponse;
  deltas_vs_baseline: ScenarioDeltas;
}

export interface CustomTerrainRequest {
  lat_deg: number;
  lon_deg: number;
  label?: string | null;
}

export type DurationDays = 7.0 | 14.0 | 29.5;

export interface EvaluateRequest {
  site_id: string;
  start_utc: string;
  duration_days?: DurationDays;
  step_minutes?: StepMinutes;
  solar_array_type?: SolarArrayType;
  fixed_array_azimuth_deg?: number;
  observer_height_m?: ObserverHeightM;
  min_comms_elev_deg?: number;
}

export interface EvaluateResponse {
  site: EvaluatedSite;
  summary: EvaluationSummary;
  horizon_profile: HorizonProfilePoint[];
  timeseries: TimeseriesPoint[];
}

export interface EvaluatedSite {
  id: string;
  name: string;
  category: SiteCategory;
  lat_deg: number;
  lon_deg: number;
  elevation_m: number | null;
  mean_slope_deg: number | null;
  has_precomputed_terrain: boolean;
}

export interface EvaluationSummary {
  feasibility_score: number | null;
  sub_scores: SubScores;
  sunlit_hours: number;
  sunlit_fraction: number;
  longest_dark_streak_hours: number;
  dte_comms_hours: number;
  dte_fraction: number;
  overlap_sun_and_dte_hours: number;
  overlap_fraction: number;
  longest_comms_blackout_hours: number;
  mean_solar_power_factor: number;
  mean_irradiance_w_m2: number;
  risk_warnings: string[];
  next_events_from_start: NextEvents;
}

export interface ExternalLinks {
  quickmap_url: string;
  moon_trek_url: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

export interface HealthResponse {
  status: string;
  architecture: string;
  frame: string;
  moon_radius_km: number;
}

export interface HorizonProfilePoint {
  azimuth_deg: number;
  terrain_elev_deg: number;
  geometric_limb_deg: number;
}

export interface HorizonProfile {
  observer_height_m: ObserverHeightM;
  azimuth_deg: number[];
  terrain_elev_deg: number[];
  geometric_limb_deg: number[];
}

export interface NextEvents {
  hours_to_sunset: number | null;
  hours_to_sunrise: number | null;
  hours_to_earthset: number | null;
  hours_to_earthrise: number | null;
}

export type ObserverHeightM = 1.5 | 2.0 | 10.0;

export interface ScenarioDeltas {
  feasibility_score_delta: number;
  sunlit_hours_delta: number;
  longest_dark_streak_hours_delta: number;
  dte_comms_hours_delta: number;
}

export type SiteCategory = "artemis_iii" | "clps_commercial" | "apollo_historic" | "international";

export interface SiteSummary {
  id: string;
  name: string;
  category: SiteCategory;
  agency: string;
  lat_deg: number;
  lon_deg: number;
  elevation_m: number | null;
  mean_slope_deg: number | null;
  has_precomputed_terrain: boolean;
  summary: string;
  external_links: ExternalLinks;
}

export type SolarArrayType = "horizontal_fixed" | "vertical_fixed" | "vertical_tracking";

export type StepMinutes = 10 | 60;

export interface SubScores {
  power_score: number;
  thermal_score: number;
  comms_score: number;
  terrain_score: number | null;
}

export interface TerrainPatch {
  site_id: string;
  model: "lola_80s_80m";
  frame: "local_enu";
  grid_size: 128;
  extent_m: number;
  spacing_m: number;
  row_direction: "south_to_north";
  column_direction: "west_to_east";
  center_elevation_m: number;
  min_elevation_m: number;
  max_elevation_m: number;
  elevations_m_flat: number[];
  slopes_deg_flat: number[];
  horizons: HorizonProfile[];
  psr_mask: null;
}

export interface TimeseriesPoint {
  timestamp_utc: string;
  sun_az_deg: number;
  sun_elev_deg: number;
  sun_horizon_elev_deg: number;
  sun_visible_fraction: number;
  is_sunlit: boolean;
  solar_power_factor: number;
  earth_az_deg: number;
  earth_elev_deg: number;
  earth_horizon_elev_deg: number;
  earth_clearance_deg: number;
  is_dte_geometric: boolean;
  is_solar_conjunction: boolean;
  is_dte_visible: boolean;
  sun_earth_sep_deg: number;
  hours_to_next_sunset: number | null;
  hours_to_next_sunrise: number | null;
  hours_to_next_earthset: number | null;
  hours_to_next_earthrise: number | null;
}

export interface TopWindow {
  rank: number;
  start_utc: string;
  feasibility_score: number;
  sunlit_fraction: number;
  dte_fraction: number;
}

export interface ValidationError {
  loc: string | number[];
  msg: string;
  type: string;
  input: unknown;
  ctx: Record<string, unknown>;
}

export interface WindowsRequest {
  site_id: string;
  year?: number;
  mission_duration_days?: number;
  solar_array_type?: SolarArrayType;
}

export interface WindowsResponse {
  site_id: string;
  mission_duration_days: number;
  solar_array_type: SolarArrayType;
  windows: CandidateWindow[];
  top_windows: TopWindow[];
}
