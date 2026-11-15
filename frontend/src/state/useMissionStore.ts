/** Core mission state store coordinating site selection, evaluation, terrain, and URL sync (F3.1).
 *
 * Delegates every computation to the backend API without clamping or rescaling (REQ-06, REQ-10).
 */

import { create } from "zustand";
import {
  evaluateScenario, fetchCustomTerrain, fetchHealth, fetchSites, fetchSiteTerrain,
  isAbortError, isOfflineFallbackActive, subscribeOfflineStatus,
} from "../services";
import type {
  CustomCoords, DurationDays, EvaluateRequest, EvaluateResponse, ObserverHeightM,
  SiteSummary, SolarArrayType, StepMinutes, TerrainPatch,
} from "../types";
import {
  parseScenarioFromUrl, scenarioKey, syncScenarioToUrl,
  type PersonaMode, type ScenarioUrlParams, type WorkspaceTab,
} from "./urlSync";
import { usePlaybackStore } from "./usePlaybackStore";

const DEFAULT_SITE_ID = "artemis-shackleton-ridge";
let offlineSubscribed = false;
let activeRefreshSeq = 0;

export interface MissionState {
  sites: SiteSummary[];
  moonRadiusKm: number | null;
  selectedSiteId: string | null;
  selectedSite: SiteSummary | null;
  customCoords: CustomCoords | null;
  startUtc: string;
  durationDays: DurationDays;
  stepMinutes: StepMinutes;
  solarArrayType: SolarArrayType;
  fixedArrayAzimuthDeg: number;
  observerHeightM: ObserverHeightM;
  minCommsElevDeg: number;
  personaMode: PersonaMode;
  activeTab: WorkspaceTab;
  evaluationData: EvaluateResponse | null;
  terrainPatch: TerrainPatch | null;
  terrainUnavailable: boolean;
  isOfflineFallback: boolean;
  notices: string[];
  loading: boolean;
  error: string | null;
  initializeMission: () => Promise<void>;
  refreshScenario: () => Promise<void>;
  selectSite: (siteId: string) => Promise<void>;
  setCustomCoordinates: (coords: CustomCoords) => Promise<void>;
  setSchedule: (startUtc: string, durationDays?: DurationDays) => Promise<void>;
  setStepMinutes: (stepMinutes: StepMinutes) => Promise<void>;
  setHardwareConfig: (solarArrayType: SolarArrayType, observerHeightM: ObserverHeightM, fixedArrayAzimuthDeg?: number, minCommsElevDeg?: number) => Promise<void>;
  setPersonaMode: (mode: PersonaMode) => void;
  setActiveTab: (tab: WorkspaceTab) => void;
  dismissNotices: () => void;
  getScenarioUrlParams: () => ScenarioUrlParams;
}

function toUrlParams(s: MissionState): ScenarioUrlParams {
  return { siteId: s.selectedSiteId, startUtc: s.startUtc, durationDays: s.durationDays, stepMinutes: s.stepMinutes, solarArrayType: s.solarArrayType, fixedArrayAzimuthDeg: s.fixedArrayAzimuthDeg, observerHeightM: s.observerHeightM, minCommsElevDeg: s.minCommsElevDeg, personaMode: s.personaMode };
}

function toEvaluateRequest(s: MissionState): EvaluateRequest {
  return { site_id: s.customCoords ? null : s.selectedSiteId, custom_coords: s.customCoords, start_utc: s.startUtc, duration_days: s.durationDays, step_minutes: s.stepMinutes, solar_array_type: s.solarArrayType, fixed_array_azimuth_deg: s.fixedArrayAzimuthDeg, observer_height_m: s.observerHeightM, min_comms_elev_deg: s.minCommsElevDeg };
}

export const useMissionStore = create<MissionState>((set, get) => ({
  sites: [],
  moonRadiusKm: null,
  selectedSiteId: DEFAULT_SITE_ID,
  selectedSite: null,
  customCoords: null,
  startUtc: "2027-11-01T00:00:00Z",
  durationDays: 14,
  stepMinutes: 60,
  solarArrayType: "vertical_tracking",
  fixedArrayAzimuthDeg: 0,
  observerHeightM: 2.0,
  minCommsElevDeg: 5.0,
  personaMode: "planner",
  activeTab: "cockpit",
  evaluationData: null,
  terrainPatch: null,
  terrainUnavailable: false,
  isOfflineFallback: isOfflineFallbackActive(),
  notices: [],
  loading: false,
  error: null,
  getScenarioUrlParams: () => toUrlParams(get()),
  dismissNotices: () => set({ notices: [] }),

  initializeMission: async () => {
    if (!offlineSubscribed) {
      offlineSubscribed = true;
      subscribeOfflineStatus((offline) => set({ isOfflineFallback: offline }));
    }
    const { params: parsed, notices } = parseScenarioFromUrl();
    set((s) => ({
      selectedSiteId: parsed.siteId ?? s.selectedSiteId,
      startUtc: parsed.startUtc ?? s.startUtc,
      durationDays: parsed.durationDays ?? s.durationDays,
      stepMinutes: parsed.stepMinutes ?? s.stepMinutes,
      solarArrayType: parsed.solarArrayType ?? s.solarArrayType,
      fixedArrayAzimuthDeg: parsed.fixedArrayAzimuthDeg ?? s.fixedArrayAzimuthDeg,
      observerHeightM: parsed.observerHeightM ?? s.observerHeightM,
      minCommsElevDeg: parsed.minCommsElevDeg ?? s.minCommsElevDeg,
      personaMode: parsed.personaMode ?? s.personaMode,
      notices,
      loading: true,
      error: null,
    }));
    try {
      const [sites, health] = await Promise.all([fetchSites(), fetchHealth()]);
      const requestedId = parsed.siteId;
      const matched = sites.find((s) => s.id === get().selectedSiteId) ?? sites[0] ?? null;
      const extraNotice = requestedId && !sites.some((s) => s.id === requestedId)
        ? [`Unknown site "${requestedId}"; fell back to ${matched?.id ?? DEFAULT_SITE_ID}.`]
        : [];
      set((s) => ({
        moonRadiusKm: health.moon_radius_km,
        sites,
        selectedSite: matched,
        selectedSiteId: matched?.id ?? DEFAULT_SITE_ID,
        notices: [...s.notices, ...extraNotice],
        isOfflineFallback: isOfflineFallbackActive(),
      }));
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
    if (!state.customCoords && !state.selectedSiteId) return;
    const urlParams = toUrlParams(state);
    syncScenarioToUrl(urlParams);
    set({ loading: true, error: null });
    try {
      const evaluationData = await evaluateScenario(toEvaluateRequest(state), scenarioKey(urlParams));
      if (seq !== activeRefreshSeq) return;
      let terrainPatch: TerrainPatch | null = null;
      let terrainUnavailable = false;
      try {
        terrainPatch = state.customCoords
          ? await fetchCustomTerrain(state.customCoords)
          : await fetchSiteTerrain(state.selectedSiteId ?? DEFAULT_SITE_ID);
      } catch (terrainErr: unknown) {
        const message = terrainErr instanceof Error ? terrainErr.message : "";
        if (message.includes("TERRAIN_NOT_AVAILABLE") || message.includes("409")) {
          terrainUnavailable = true;
        } else {
          throw terrainErr;
        }
      }
      if (seq !== activeRefreshSeq) return;
      usePlaybackStore.getState().setTotalSteps(evaluationData.timeseries.length);
      set({ evaluationData, terrainPatch, terrainUnavailable, isOfflineFallback: isOfflineFallbackActive(), loading: false, error: null });
    } catch (err: unknown) {
      if (isAbortError(err) || seq !== activeRefreshSeq) return;
      set({ loading: false, error: err instanceof Error ? err.message : "Scenario evaluation failed." });
    }
  },
  selectSite: async (siteId) => {
    set({ selectedSiteId: siteId, selectedSite: get().sites.find((s) => s.id === siteId) ?? null, customCoords: null });
    usePlaybackStore.getState().jumpToIndex(0);
    await get().refreshScenario();
  },
  setCustomCoordinates: async (coords) => {
    set({ selectedSiteId: null, selectedSite: null, customCoords: coords });
    usePlaybackStore.getState().jumpToIndex(0);
    await get().refreshScenario();
  },
  setSchedule: async (startUtc, durationDays) => { set((s) => ({ startUtc, durationDays: durationDays ?? s.durationDays })); await get().refreshScenario(); },
  setStepMinutes: async (stepMinutes) => { set({ stepMinutes }); await get().refreshScenario(); },
  setHardwareConfig: async (solarArrayType, observerHeightM, fixedArrayAzimuthDeg, minCommsElevDeg) => {
    set((s) => ({ solarArrayType, observerHeightM, fixedArrayAzimuthDeg: fixedArrayAzimuthDeg ?? s.fixedArrayAzimuthDeg, minCommsElevDeg: minCommsElevDeg ?? s.minCommsElevDeg }));
    await get().refreshScenario();
  },
  setPersonaMode: (personaMode) => { set({ personaMode }); syncScenarioToUrl(toUrlParams(get())); },
  setActiveTab: (activeTab) => set({ activeTab }),
}));
