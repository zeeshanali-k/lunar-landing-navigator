/** Contract E (WindowsRequest and WindowsResponse) TypeScript types. */

import type { SolarArrayType } from "./evaluation";

export interface WindowsRequest {
  site_id: string;
  year?: number;
  mission_duration_days: number;
  solar_array_type: SolarArrayType;
}

export interface WindowCandidate {
  start_utc: string;
  feasibility_score: number;
  sunlit_fraction: number;
  dte_fraction: number;
  longest_dark_streak_hours: number;
}

export interface TopWindow {
  rank: number;
  start_utc: string;
  feasibility_score: number;
  sunlit_fraction: number;
  dte_fraction: number;
}

export interface WindowsResponse {
  site_id: string;
  mission_duration_days: number;
  solar_array_type: SolarArrayType;
  windows: WindowCandidate[];
  top_windows: TopWindow[];
}
