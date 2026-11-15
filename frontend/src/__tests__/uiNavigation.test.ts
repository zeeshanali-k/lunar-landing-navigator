/** Automated checks for multi-screen navigation metadata, theme versatility, and contextual help registry (UI-001). */

import { describe, expect, it } from "vitest";
import { getScreenMeta, WORKSPACE_SCREENS } from "../components/layout/navigationConfig";
import { HELP_ENTRIES, resolveHelpEntry, type HelpKey } from "../components/ui";
import { APP_THEMES, getNextTheme } from "../state";

describe("workspace screens and navigation metadata", () => {
  it("defines 6 distinct workspace screens including terrain and sky", () => {
    const ids = WORKSPACE_SCREENS.map((s) => s.id);
    expect(ids).toEqual(["cockpit", "terrain", "sky", "compare", "windows", "explorer"]);
    expect(new Set(ids).size).toBe(6);
    for (const screen of WORKSPACE_SCREENS) {
      expect(screen.label.trim().length).toBeGreaterThan(0);
      expect(screen.shortDescription.trim().length).toBeGreaterThan(10);
      expect(screen.eyebrow).toContain("of 6");
    }
  });

  it("resolves screen metadata by tab id and falls back cleanly", () => {
    expect(getScreenMeta("terrain").label).toBe("Maps & 3D");
    expect(getScreenMeta("sky").label).toBe("Sky & Timeline");
    expect(getScreenMeta("cockpit").id).toBe("cockpit");
  });
});

describe("theme system and cycling helpers", () => {
  it("exposes Daylight, Lunar Orbit, and High Contrast palettes", () => {
    expect(APP_THEMES.map((t) => t.id)).toEqual(["daylight", "orbital", "contrast"]);
    for (const option of APP_THEMES) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(10);
    }
  });

  it("cycles smoothly across all available themes", () => {
    expect(getNextTheme("daylight")).toBe("orbital");
    expect(getNextTheme("orbital")).toBe("contrast");
    expect(getNextTheme("contrast")).toBe("daylight");
  });
});

describe("contextual popup help catalog", () => {
  const requiredKeys: HelpKey[] = [
    "changeSiteBtn",
    "modeSwitch",
    "themeToggle",
    "copyLinkBtn",
    "exportBriefingBtn",
    "pinCompareBtn",
    "overviewScreen",
    "kpiHeadline",
    "kpiDetailed",
    "scheduleSection",
    "advancedParams",
    "terrainScreen",
    "map2dSection",
    "terrain3dSection",
    "resetCameraBtn",
    "skyScreen",
    "playbackBar",
    "jumpSunsetBtn",
    "jumpEarthsetBtn",
    "timelineSection",
    "horizonSection",
    "rimZoomBtn",
    "compareScreen",
    "delayExplorer",
    "windowsScreen",
    "explorerScreen",
    "sitePickerSection",
  ];

  it("provides plain-language titles, summaries, and tips for every section and primary button", () => {
    for (const key of requiredKeys) {
      const entry = resolveHelpEntry(key);
      expect(entry.title.trim().length).toBeGreaterThan(3);
      expect(entry.summary.trim().length).toBeGreaterThan(15);
      expect(entry.tips.length).toBeGreaterThan(0);
    }
    expect(Object.keys(HELP_ENTRIES).length).toBeGreaterThanOrEqual(requiredKeys.length);
  });

  it("allows custom per-control help overrides cleanly", () => {
    const custom = resolveHelpEntry("overviewScreen", {
      title: "Custom Control",
      summary: "Overrides default guidance.",
      tips: ["Tip one"],
    });
    expect(custom.title).toBe("Custom Control");
    expect(custom.tips).toEqual(["Tip one"]);
  });
});
