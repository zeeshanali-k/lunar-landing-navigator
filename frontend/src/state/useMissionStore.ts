/** Core mission state store coordinating site selection, evaluation, terrain, and URL sync (F3.1). */

import { create } from "zustand";
import {
  evaluateScenario,
  fetchCustomTerrain,
  fetchSites,
  fetchSiteTerrain,
  isAbortError,
  isOfflineFallbackActive,
  subscribeOfflineStatus,
} from "../services";
import {
  clampLunarLatitude,
  type CustomCoords,
  type EvaluateResponse,
  type SiteSummary,
  type SolarArrayType,
  type TerrainPatch,
} from "../types";
import {
  parseScenarioFromUrl,
  syncScenarioToUrl,
  type PersonaMode,
  type ScenarioUrlParams,
  type WorkspaceTab,
} from "./urlSync";
import { usePlaybackStore } from "./usePlaybackStore";

const DEFAULT_SITE_ID = "artemis-shackleton-ridge";
let offlineSubscribed = false;
let activeRefreshSeq = 0;

export interface MissionState {
  sites: SiteSummary[];
  selectedSiteId: string | null;
  selectedSite: SiteSummary | null;
  customCoords: CustomCoords | null;
  startUtc: string;
  durationDays: number;
  solarArrayType: SolarArrayType;
  observerHeightM: number;
  personaMode: PersonaMode;
  activeTab: WorkspaceTab;
  evaluationData: EvaluateResponse | null;
  terrainPatch: TerrainPatch | null;
  isOfflineFallback: boolean;
  loading: boolean;
  error: string | null;
  initializeMission: () => Promise<void>;
  refreshScenario: () => Promise<void>;
  selectSite: (siteId: string) => Promise<void>;
  setCustomCoordinates: (coords: CustomCoords) => Promise<void>;
  setSchedule: (startUtc: string, durationDays?: number) => Promise<void>;
  setHardwareConfig: (solarArrayType: SolarArrayType, observerHeightM: number) => Promise<void>;
  setPersonaMode: (mode: PersonaMode) => void;
  setActiveTab: (tab: WorkspaceTab) => void;
  getScenarioUrlParams: () => ScenarioUrlParams;
}

function toUrlParams(s: MissionState): ScenarioUrlParams {
  return {
    siteId: s.selectedSiteId,
    customCoords: s.customCoords,
    startUtc: s.startUtc,
    durationDays: s.durationDays,
    solarArrayType: s.solarArrayType,
    observerHeightM: s.observerHeightM,
    personaMode: s.personaMode,
  };
}

export const useMissionStore = create<MissionState>((set, get) => ({
  sites: [],
  selectedSiteId: DEFAULT_SITE_ID,
  selectedSite: null,
  customCoords: null,
  startUtc: "2027-11-01T00:00:00Z",
  durationDays: 14,
  solarArrayType: "vertical_tracking",
  observerHeightM: 2.0,
  personaMode: "planner",
  activeTab: "cockpit",
  evaluationData: null,
  terrainPatch: null,
  isOfflineFallback: isOfflineFallbackActive(),
  loading: false,
  error: null,
  getScenarioUrlParams: () => toUrlParams(get()),

  initializeMission: async () => {
    if (!offlineSubscribed) {
      offlineSubscribed = true;
      subscribeOfflineStatus((offline) => set({ isOfflineFallback: offline }));
    }
    const parsed = parseScenarioFromUrl();
    set((s) => ({
      selectedSiteId: parsed.customCoords ? null : (parsed.siteId ?? s.selectedSiteId),
      customCoords: parsed.customCoords ?? null,
      startUtc: parsed.startUtc ?? s.startUtc,
      durationDays: parsed.durationDays ?? s.durationDays,
      solarArrayType: parsed.solarArrayType ?? s.solarArrayType,
      observerHeightM: parsed.observerHeightM ?? s.observerHeightM,
      personaMode: parsed.personaMode ?? s.personaMode,
      loading: true,
      error: null,
    }));
    try {
      const sites = await fetchSites();
      const { customCoords, selectedSiteId } = get();
      const matched = customCoords ? null : (sites.find((s) => s.id === selectedSiteId) ?? sites[0] ?? null);
      set({
        sites,
        selectedSite: matched,
        selectedSiteId: customCoords ? null : (matched?.id ?? DEFAULT_SITE_ID),
        isOfflineFallback: isOfflineFallbackActive(),
      });
      await get().refreshScenario();
    } catch (err: unknown) {
      if (!isAbortError(err)) {
        set({ loading: false, error: err instanceof Error ? err.message : "Failed to initialize sites." });
      }
    }
  },

  refreshScenario: async () => {
    const seq = ++activeRefreshSeq;
    const state = get();
    const { customCoords, selectedSiteId, startUtc, durationDays, solarArrayType, observerHeightM } = state;
    if (!customCoords && !selectedSiteId) return;

    syncScenarioToUrl(toUrlParams(state));
    set({ loading: true, error: null });
    try {
      const [evaluationData, terrainPatch] = await Promise.all([
        evaluateScenario({
          site_id: customCoords ? null : selectedSiteId,
          custom_coords: customCoords,
          start_utc: startUtc,
          duration_days: durationDays,
          step_minutes: 60,
          solar_array_type: solarArrayType,
          observer_height_m: observerHeightM,
        }),
        customCoords ? fetchCustomTerrain(customCoords) : fetchSiteTerrain(selectedSiteId ?? DEFAULT_SITE_ID),
      ]);
      if (seq !== activeRefreshSeq) return;

      usePlaybackStore.getState().setTotalSteps(evaluationData.timeseries.length);
      set({
        evaluationData,
        terrainPatch,
        isOfflineFallback: isOfflineFallbackActive(),
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      if (isAbortError(err) || seq !== activeRefreshSeq) return;
      set({ loading: false, error: err instanceof Error ? err.message : "Scenario evaluation failed." });
    }
  },

  selectSite: async (siteId) => {
    const matched = get().sites.find((s) => s.id === siteId) ?? null;
    set({ selectedSiteId: siteId, selectedSite: matched, customCoords: null });
    usePlaybackStore.getState().jumpToIndex(0);
    await get().refreshScenario();
  },

  setCustomCoordinates: async (coords) => {
    const clamped: CustomCoords = { ...coords, lat_deg: clampLunarLatitude(coords.lat_deg) };
    set({ selectedSiteId: null, selectedSite: null, customCoords: clamped });
    usePlaybackStore.getState().jumpToIndex(0);
    await get().refreshScenario();
  },

  setSchedule: async (startUtc, durationDays) => {
    set((s) => ({ startUtc, durationDays: durationDays ?? s.durationDays }));
    await get().refreshScenario();
  },

  setHardwareConfig: async (solarArrayType, observerHeightM) => {
    set({ solarArrayType, observerHeightM });
    await get().refreshScenario();
  },

  setPersonaMode: (personaMode) => {
    set({ personaMode });
    syncScenarioToUrl(toUrlParams(get()));
  },

  setActiveTab: (activeTab) => set({ activeTab }),
}));
