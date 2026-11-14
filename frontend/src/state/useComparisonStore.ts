/** Multi-scenario comparison Zustand store supporting up to 4 pinned scenarios (F3.1). */

import { create } from "zustand";
import { compareScenarios, isAbortError } from "../services";
import type { CompareResponse, CompareScenarioInput } from "../types";

const MAX_PINNED_SCENARIOS = 4;

export interface ComparisonState {
  pinnedScenarios: CompareScenarioInput[];
  baselineIndex: number;
  comparisonData: CompareResponse | null;
  loading: boolean;
  error: string | null;
  pinScenario: (scenario: CompareScenarioInput) => Promise<void>;
  unpinScenario: (scenarioId: string) => Promise<void>;
  setBaselineIndex: (index: number) => Promise<void>;
  runComparison: () => Promise<void>;
  clearComparison: () => void;
}

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  pinnedScenarios: [],
  baselineIndex: 0,
  comparisonData: null,
  loading: false,
  error: null,

  pinScenario: async (scenario) => {
    const { pinnedScenarios } = get();
    const existingIdx = pinnedScenarios.findIndex(
      (item) => item.scenario_id === scenario.scenario_id,
    );
    let updated: CompareScenarioInput[];
    if (existingIdx >= 0) {
      updated = pinnedScenarios.map((item, idx) =>
        idx === existingIdx ? scenario : item,
      );
    } else if (pinnedScenarios.length >= MAX_PINNED_SCENARIOS) {
      updated = [...pinnedScenarios.slice(1), scenario];
    } else {
      updated = [...pinnedScenarios, scenario];
    }
    set({ pinnedScenarios: updated, error: null });
    await get().runComparison();
  },

  unpinScenario: async (scenarioId) => {
    const { pinnedScenarios, baselineIndex } = get();
    const updated = pinnedScenarios.filter((item) => item.scenario_id !== scenarioId);
    const nextBaseline =
      updated.length === 0 ? 0 : Math.min(baselineIndex, updated.length - 1);
    set({ pinnedScenarios: updated, baselineIndex: nextBaseline });
    if (updated.length > 0) {
      await get().runComparison();
    } else {
      set({ comparisonData: null, error: null });
    }
  },

  setBaselineIndex: async (index) => {
    const { pinnedScenarios } = get();
    if (index < 0 || index >= pinnedScenarios.length) {
      return;
    }
    set({ baselineIndex: index });
    await get().runComparison();
  },

  runComparison: async () => {
    const { pinnedScenarios, baselineIndex } = get();
    if (pinnedScenarios.length === 0) {
      set({ comparisonData: null, loading: false, error: null });
      return;
    }
    const safeBaseline = Math.min(baselineIndex, pinnedScenarios.length - 1);
    set({ loading: true, error: null });
    try {
      const response = await compareScenarios({
        baseline_index: safeBaseline,
        scenarios: pinnedScenarios,
      });
      set({ comparisonData: response, loading: false });
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to compare scenarios.",
      });
    }
  },

  clearComparison: () =>
    set({
      pinnedScenarios: [],
      baselineIndex: 0,
      comparisonData: null,
      loading: false,
      error: null,
    }),
}));
