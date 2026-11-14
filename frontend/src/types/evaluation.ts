/** Contract B (EvaluateRequest and EvaluateResponse) TypeScript types. */

export type SolarArrayType =
  | "horizontal_fixed"
  | "vertical_fixed"
  | "vertical_tracking";

export interface CustomCoords {
  lat_deg: number;
  lon_deg: number;
  label?: string | null;
}

export interface EvaluateRequest {
  site_id?: string | null;
  custom_coords?: CustomCoords | null;
  start_utc: string;
  duration_days: number;
  step_minutes?: number;
  solar_array_type?: SolarArrayType;
  observer_height_m?: number;
  min_comms_elev_deg?: number;
}

export interface EvaluatedSite {
  id: string;
  name: string;
  lat_deg: number;
  lon_deg: number;
  elevation_m: number;
  mean_slope_deg: number;
}

export interface SubScores {
  power_score: number;
  thermal_score: number;
  comms_score: number;
  terrain_score: number;
}

export interface NextEventsFromStart {
  hours_to_sunset: number | null;
  hours_to_sunrise: number | null;
  hours_to_earthset: number | null;
  hours_to_earthrise: number | null;
}

export interface EvaluationSummary {
  feasibility_score: number;
  sub_scores: SubScores;
  sunlit_hours: number;
  sunlit_fraction: number;
  longest_dark_streak_hours: number;
  dte_comms_hours: number;
  dte_fraction: number;
  overlap_sun_and_dte_hours: number;
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
  horizon_profile: HorizonProfilePoint[];
  timeseries: TimeseriesPoint[];
}
