/** Centralized contextual instruction catalog for sections and primary buttons. */

export interface HelpEntry {
  title: string;
  summary: string;
  tips: readonly string[];
}

export const HELP_ENTRIES = {
  // Top bar & primary navigation actions
  changeSiteBtn: {
    title: "Switch Landing Site",
    summary: "Opens the Lunar South Pole site browser to pick a curated candidate site or pin custom coordinates.",
    tips: [
      "Curated sites use high-resolution NASA LOLA terrain elevation (Class A).",
      "Custom coordinates outside curated footprints use spherical-limb geometry only (Class B).",
    ],
  },
  modeSwitch: {
    title: "Planner vs Explorer Mode",
    summary: "Switches wording and guidance across every screen between technical mission planning and plain-language learning.",
    tips: [
      "Planner highlights operational hours, scores, and engineering risk flags.",
      "Explorer adds guided questions, analogies, and simpler labels.",
    ],
  },
  themeToggle: {
    title: "Switch Visual Theme",
    summary: "Cycles or chooses between Daylight, Orbit Dark, and High Contrast workspace palettes.",
    tips: [
      "Your theme preference is saved automatically in browser storage.",
      "High Contrast boosts border and text contrast for accessibility.",
    ],
  },
  copyLinkBtn: {
    title: "Copy Shareable Scenario Link",
    summary: "Copies a URL encoding the current site, start date, duration, array setup, and mode.",
    tips: [
      "Anyone opening the link restores the exact same mission evaluation.",
      "Custom coordinates are excluded from shareable links by contract.",
    ],
  },
  exportBriefingBtn: {
    title: "Export Mission Briefing",
    summary: "Opens the export dialog to download the current evaluation summary, telemetry CSV, or Markdown notes.",
    tips: ["Includes computed scores, active settings, and NASA/JPL provenance details."],
  },
  pinCompareBtn: {
    title: "Pin Site for Comparison",
    summary: "Saves the currently evaluated site and schedule into the Compare screen (up to 4 scenarios).",
    tips: ["Change start date or array settings and pin again to compare different configurations side-by-side."],
  },

  // Screen 1: Overview
  overviewScreen: {
    title: "Mission Overview Screen",
    summary: "Gives you the big-picture landing verdict first without burying you in raw numbers.",
    tips: [
      "Start by checking the 4 headline cards below for overall feasibility, sunlight, Earth radio link, and combined overlap.",
      "Expand 'Detailed Telemetry & Risk Breakdown' only when you want sub-scores or irradiance numbers.",
    ],
  },
  kpiHeadline: {
    title: "Headline Mission Indicators",
    summary: "Summarizes landing suitability into four fast readouts: Overall Score, Sunlight, Earth Comms, and Overlap.",
    tips: [
      "Green/Amber/Red pills show status at a glance without needing to interpret raw equations.",
      "Class B sites show N/A for overall score because measured crater relief is unavailable.",
    ],
  },
  kpiDetailed: {
    title: "Detailed Telemetry & Risk Breakdown",
    summary: "Reveals weighted Power, Thermal, Comms, and Terrain sub-scores plus specific operational risk warnings.",
    tips: [
      "Thermal and irradiance figures reflect your chosen date and solar array geometry.",
      "Darkness streaks and blackout durations help size lander batteries.",
    ],
  },
  scheduleSection: {
    title: "Mission Schedule & Solar Array",
    summary: "Pick your landing date preset (or exact UTC hour), mission length, and solar panel geometry.",
    tips: [
      "Lunar summer presets maximize sunlight at southern rims; winter tests worst-case shadow survival.",
      "Expand 'Advanced Hardware & Sampling' to tune array azimuth, mast height, or minimum comms elevation.",
    ],
  },
  advancedParams: {
    title: "Advanced Hardware & Sampling",
    summary: "Fine-tunes simulation time step, mast height, fixed solar panel azimuth, and minimum Earth link angle.",
    tips: [
      "10-minute step gives sharper horizon transition timing than 60-minute step.",
      "Increasing mast height clears nearby ground ridges earlier during sunrise and Earthrise.",
    ],
  },

  // Screen 2: Maps & 3D Terrain
  terrainScreen: {
    title: "Maps & 3D Terrain Screen",
    summary: "Inspects geographic context around the Lunar South Pole and real local crater relief in 3D.",
    tips: [
      "Use the 2D South Pole Map to spot permanently shadowed regions (PSRs) and nearby sites.",
      "Orbit and zoom the 3D Terrain model while scrubbing time to watch real shadows cross the landing zone.",
    ],
  },
  map2dSection: {
    title: "2D Lunar South Pole Map",
    summary: "Stereographic south polar projection showing candidate sites, latitude rings, Sun/Earth vectors, and hazards.",
    tips: ["Click any site marker to switch your active mission target.", "Toggle overlays cleanly in the toolbar above the map."],
  },
  terrain3dSection: {
    title: "Interactive 3D Terrain Viewer",
    summary: "Renders real LOLA heightfield relief around the selected site with live solar shadows and Earth vector.",
    tips: [
      "Left-drag to orbit, scroll to zoom, right-drag to pan, or click 'Reset View' to recenter.",
      "Scrub the timeline below to see terrain shadows move in real time.",
    ],
  },
  resetCameraBtn: {
    title: "Reset 3D Camera View",
    summary: "Recenters the 3D camera directly above the landing pin at the default inspection angle.",
    tips: ["Helpful after zooming deep into a crater floor or panning away from the lander."],
  },
  externalLinksBtn: {
    title: "Open External NASA Imagery",
    summary: "Launches NASA LRO QuickMap or NASA Moon Trek centered near the current coordinates in a new tab.",
    tips: ["Great for cross-checking boulder fields and high-resolution camera mosaics."],
  },

  // Screen 3: Sky & Timeline
  skyScreen: {
    title: "Sky, Horizon & Timeline Screen",
    summary: "Explores hour-by-hour illumination, Earth line-of-sight, and how surrounding crater ridges block the sky.",
    tips: [
      "Drag or play the Time Scrubber first, then inspect the Timeline and Horizon charts.",
      "Switch between Panorama and Polar Sky-Dome views to focus on one chart at a time.",
    ],
  },
  playbackBar: {
    title: "Mission Time Playback",
    summary: "Steps through every evaluated timestamp in your mission window or jumps straight to key events.",
    tips: [
      "Use 'Next Sunset' or 'Next Earthset' buttons to locate impending darkness or radio blackouts quickly.",
      "Keyboard shortcut: drag the slider smoothly to watch sky paths update live.",
    ],
  },
  jumpSunsetBtn: {
    title: "Jump to Next Sunset",
    summary: "Finds the next moment from the current playback step when the Sun dips behind the local terrain ridge.",
    tips: ["Useful for checking battery requirements ahead of lunar night."],
  },
  jumpEarthsetBtn: {
    title: "Jump to Next Earthset",
    summary: "Finds the next moment when Earth drops below the local horizon or comms elevation mask.",
    tips: ["Marks the start of the next Direct-to-Earth communication blackout."],
  },
  timelineSection: {
    title: "Multi-Track Mission Timeline",
    summary: "Plots simultaneous Sunlight, Earth Radio Link, and Combined Power+Comms availability across the mission.",
    tips: [
      "Click anywhere along the horizontal track to jump playback to that exact hour.",
      "Solar conjunction markers highlight rare alignment warnings.",
    ],
  },
  horizonSection: {
    title: "Horizon Clearance & Sky Path",
    summary: "Compares Sun and Earth arcs against the 360-degree terrain ridge height surrounding your lander.",
    tips: [
      "Toggle 'Rim Zoom' on the Panorama view to magnify subtle near-horizon solar grazing.",
      "Where a path dips below the shaded horizon line, terrain blocks light or radio signal.",
    ],
  },
  rimZoomBtn: {
    title: "Toggle Horizon Rim Zoom",
    summary: "Switches elevation scale between full vertical view (-10° to +35°) and zoomed rim view (-5° to +15°).",
    tips: ["Near the lunar south pole, the Sun stays within a few degrees of the horizon all month."],
  },

  // Screen 4: Compare Sites
  compareScreen: {
    title: "Compare Candidate Sites",
    summary: "Evaluates up to 4 pinned mission scenarios side-by-side across feasibility, power, communications, and timing.",
    tips: [
      "Use 'Pin Current' to add your active Overview site, or load the quick preset cohort.",
      "Expand 'Schedule Delay Sensitivity' to check how launching a few days late affects sunlight and comms.",
    ],
  },
  delayExplorer: {
    title: "Schedule Delay Explorer",
    summary: "Runs counterfactual evaluations (+/- 1, 3, or 7 days) to test how launch slip alters mission performance.",
    tips: ["Choose a baseline scenario and toggle which day offsets you want to simulate."],
  },

  // Screen 5: Windows Finder
  windowsScreen: {
    title: "Landing Window Finder",
    summary: "Scans candidate start dates across an entire lunar year to spot optimal launch timing.",
    tips: [
      "Set minimum acceptable Sun+Earth overlap hours to filter out poor windows.",
      "Click any highlighted day cell or top-ranked card to load that exact date directly into Overview.",
    ],
  },

  // Screen 6: Explorer / Learn
  explorerScreen: {
    title: "Explorer Guide & Interactive Missions",
    summary: "Guided challenges and Earth-vs-Moon comparisons that explain south pole science in plain language.",
    tips: [
      "Load any guided challenge to jump straight to a famous south pole location and test a hypothesis.",
      "Open glossary terms whenever you want intuition behind polar shadows or Earth libration.",
    ],
  },
  sitePickerSection: {
    title: "Landing Site Selector",
    summary: "Choose among curated Artemis and historical south pole targets or evaluate custom latitude/longitude.",
    tips: [
      "Curated sites include local topographic horizon profiles (Class A).",
      "Custom sites farther from curated patches evaluate spherical limb geometry with N/A terrain score.",
    ],
  },
} as const satisfies Record<string, HelpEntry>;

export type HelpKey = keyof typeof HELP_ENTRIES;
