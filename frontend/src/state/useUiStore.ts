/** UI presentation state for theme versatility, site picker drawer, and screen subviews. */

import { create } from "zustand";

export type AppTheme = "daylight" | "orbital" | "contrast";
export type SkyViewMode = "panorama" | "dome" | "both";

export interface ThemeOption {
  id: AppTheme;
  label: string;
  shortLabel: string;
  description: string;
}

export const APP_THEMES: readonly ThemeOption[] = [
  {
    id: "daylight",
    label: "Mission Daylight",
    shortLabel: "Daylight",
    description: "Bright, airy workspace designed for daylight legibility and low visual fatigue.",
  },
  {
    id: "orbital",
    label: "Lunar Orbit",
    shortLabel: "Orbit Dark",
    description: "Refined slate night theme suited for darkened control rooms and 3D lighting contrast.",
  },
  {
    id: "contrast",
    label: "High Contrast",
    shortLabel: "Contrast",
    description: "Crisp high-contrast borders and typography for maximum legibility.",
  },
] as const;

const THEME_STORAGE_KEY = "lunar-nav-theme";

function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "daylight";
  }
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "daylight" || raw === "orbital" || raw === "contrast") {
      return raw;
    }
  } catch {
    // Ignore storage errors in sandboxed/private browsers
  }
  return "daylight";
}

export function applyThemeAttribute(theme: AppTheme): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
}

export function getNextTheme(current: AppTheme): AppTheme {
  const idx = APP_THEMES.findIndex((option) => option.id === current);
  const next = APP_THEMES[(idx + 1) % APP_THEMES.length];
  return next.id;
}

export interface UiState {
  theme: AppTheme;
  sitePickerOpen: boolean;
  skyViewMode: SkyViewMode;
  setTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
  setSitePickerOpen: (open: boolean) => void;
  setSkyViewMode: (mode: SkyViewMode) => void;
  initUiTheme: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readStoredTheme(),
  sitePickerOpen: false,
  skyViewMode: "panorama",

  initUiTheme: () => {
    const current = get().theme;
    applyThemeAttribute(current);
  },

  setTheme: (theme) => {
    applyThemeAttribute(theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Ignore storage write errors
      }
    }
    set({ theme });
  },

  cycleTheme: () => {
    const next = getNextTheme(get().theme);
    get().setTheme(next);
  },

  setSitePickerOpen: (sitePickerOpen) => set({ sitePickerOpen }),
  setSkyViewMode: (skyViewMode) => set({ skyViewMode }),
}));
