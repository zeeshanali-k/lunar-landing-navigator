/** Contract B (EvaluateRequest and EvaluateResponse) TypeScript types.
 *
 * Hand-maintained for now; `ARCH-002` replaces this file with generated types
 * derived from the Pydantic models. Until then it must mirror REQ-06 exactly.
 */

export type SolarArrayType = "horizontal_fixed" | "vertical_fixed" | "vertical_tracking";

/** REQ-06 allowlists. Values outside these are a 422. */
export type DurationDays = 7 | 14 | 29.5;
export type StepMinutes = 10 | 60;
export type ObserverHeightM = 1.5 | 2.0 | 10.0;

export interface CustomCoords {
  lat_deg: number;
  lon_deg: number;
  label?: string | null;
}

export interface EvaluateRequest {
  site_id?: string | null;
  custom_coords?: CustomCoords | null;
  start_utc: string;
  duration_days: DurationDays;
  step_minutes?: StepMinutes;
  solar_array_type?: SolarArrayType;
  fixed_array_azimuth_deg?: number;
  observer_height_m?: ObserverHeightM;
  min_comms_elev_deg?: number;
}

export interface EvaluatedSite {
  id: string;
  name: string;
  lat_deg: number;
  lon_deg: number;
  /** Null for a spherical-limb-only site, which has no measured elevation. */
  elevation_m: number | null;
  /** Null for a spherical-limb-only site. */
  mean_slope_deg: number | null;
  /** False means the site is evaluated against the spherical limb only. */
  has_precomputed_terrain: boolean;
}

export interface SubScores {
  power_score: number;
  thermal_score: number;
  comms_score: number;
  /** Null when terrain is unavailable. */
  terrain_score: number | null;
}

export interface NextEventsFromStart {
  hours_to_sunset: number | null;
  hours_to_sunrise: number | null;
  hours_to_earthset: number | null;
  hours_to_earthrise: number | null;
}

export interface EvaluationSummary {
  /** Null for a spherical-limb-only site; sub-scores are not renormalised. */
  feasibility_score: number | null;
  sub_scores: SubScores;
  sunlit_hours: number;
  sunlit_fraction: number;
  longest_dark_streak_hours: number;
  dte_comms_hours: number;
  dte_fraction: number;
  overlap_sun_and_dte_hours: number;
  longest_comms_blackout_hours: number;
  mean_solar_power_factor: number;
  mean_irradiance_w_m2: number;
  risk_warnings: string[];
  next_events_from_start: NextEventsFromStart;
}

export interface HorizonProfilePoint {
  azimuth_deg: number;
  terrain_elev_deg: number;
  geometric_limb_deg: number;
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

export interface EvaluateResponse {
  site: EvaluatedSite;
  summary: EvaluationSummary;
  /** Empty for a spherical-limb-only site. */
  horizon_profile: HorizonProfilePoint[];
  timeseries: TimeseriesPoint[];
}
