/** Single source of truth for workspace screens and navigation metadata. */

import type { WorkspaceTab } from "../../state";

export interface ScreenNavItem {
  id: WorkspaceTab;
  label: string;
  shortDescription: string;
  eyebrow: string;
}

export const WORKSPACE_SCREENS: readonly ScreenNavItem[] = [
  {
    id: "cockpit",
    label: "Overview",
    shortDescription: "Headline mission verdict, key scores, and schedule setup.",
    eyebrow: "Screen 1 of 6",
  },
  {
    id: "terrain",
    label: "Maps & 3D",
    shortDescription: "2D south pole map and interactive 3D terrain shadows.",
    eyebrow: "Screen 2 of 6",
  },
  {
    id: "sky",
    label: "Sky & Timeline",
    shortDescription: "Live time scrubber, sunlit/Earth timeline, and horizon profile.",
    eyebrow: "Screen 3 of 6",
  },
  {
    id: "compare",
    label: "Compare",
    shortDescription: "Pin up to 4 scenarios and analyze schedule delay shifts.",
    eyebrow: "Screen 4 of 6",
  },
  {
    id: "windows",
    label: "Windows",
    shortDescription: "Scan the year to locate top illumination and comms windows.",
    eyebrow: "Screen 5 of 6",
  },
  {
    id: "explorer",
    label: "Learn",
    shortDescription: "Guided missions, glossary, and Earth-vs-Moon context.",
    eyebrow: "Screen 6 of 6",
  },
] as const;

export function getScreenMeta(tab: WorkspaceTab): ScreenNavItem {
  return WORKSPACE_SCREENS.find((screen) => screen.id === tab) ?? WORKSPACE_SCREENS[0];
}
