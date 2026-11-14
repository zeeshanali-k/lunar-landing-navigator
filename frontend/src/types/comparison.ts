/** Contract D (CompareRequest and CompareResponse) TypeScript types. */

import type { EvaluateRequest, EvaluateResponse } from "./evaluation";

export interface CompareScenarioInput {
  scenario_id: string;
  label: string;
  request: EvaluateRequest;
}

export interface CompareRequest {
  baseline_index: number;
  scenarios: CompareScenarioInput[];
}

export interface ScenarioDeltas {
  feasibility_score_delta: number;
  sunlit_hours_delta: number;
  longest_dark_streak_hours_delta: number;
  dte_comms_hours_delta: number;
}

export interface ComparedScenario {
  scenario_id: string;
  label: string;
  evaluation: EvaluateResponse;
  deltas_vs_baseline: ScenarioDeltas;
}

export interface CompareResponse {
  baseline_index: number;
  scenarios: ComparedScenario[];
  recommended_scenario_id: string;
}
