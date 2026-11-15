import type { ObserverHeightM } from "../../types";
/** Plain-English Explorer glossary, physics callouts, and Mission Detective Challenges (F3.6). */

import type { SolarArrayType } from "../../types";

export interface EducationalCallout {
  id: string;
  title: string;
  tag: string;
  summary: string;
  whyItHappens: string;
  plannerMetricNote: string;
}

export interface MissionChallenge {
  id: string;
  title: string;
  question: string;
  hint: string;
  answer: string;
  siteId: string;
  solarArrayType: SolarArrayType;
  observerHeightM: ObserverHeightM;
}

export const EDUCATIONAL_CALLOUTS: EducationalCallout[] = [
  {
    id: "grazing-sunlight",
    title: "South Pole Grazing Sunlight & Vertical Masts",
    tag: "SOLAR PHYSICS",
    summary: "At the lunar poles, the Sun skims sideways around the horizon instead of climbing overhead.",
    whyItHappens:
      "The Moon's spin axis is tilted by only 1.54°, so sunlight arrives almost horizontally (-2° to +3.5° elevation) and sweeps 360° in azimuth every 29.5 days. A flat horizontal panel catches just sin(elev) ~ 5-14% of full sunlight, whereas a tall vertical tracking mast faces the sideways Sun head-on.",
    plannerMetricNote: "Planner metrics: Sun Elev (deg), Solar Power Factor (%), Mean Irradiance (W/m²).",
  },
  {
    id: "zero-atmosphere-shadows",
    title: "Zero Atmosphere & Razor-Sharp PSR Shadows",
    tag: "THERMAL & PSR",
    summary: "With no air to scatter sky light, sunlit crater rims sit inches from cryogenic darkness.",
    whyItHappens:
      "Because the Moon is in vacuum, crater walls block sunlight completely rather than creating soft twilight. Deep interiors stay near 40 K (-233 °C) as Permanently Shadowed Regions (PSRs) for billions of years, preserving trapped water-ice deposits vital for Artemis rocket propellant and life support.",
    plannerMetricNote: "Planner metrics: Sun Visible Disk (%), Longest Dark Streak (h), PSR Ice overlay.",
  },
  {
    id: "earth-libration-wobble",
    title: "Earth Libration Wobble & DTE Line-of-Sight",
    tag: "ORBITAL COMMS",
    summary: "Earth does not sit frozen in the polar sky—it slowly bobs above and behind crater rims.",
    whyItHappens:
      "Although the Moon is tidally locked around 0°E, its elliptical orbit and 6.7° axial tilt relative to Earth cause optical libration: Earth appears to nod by ±6.5° in elevation and ±7.9° in azimuth over 27.3 days. When Earth dips below local mountain ridges, Direct-to-Earth (DTE) radio drops out.",
    plannerMetricNote: "Planner metrics: Earth Clearance (deg), Countdown to Earthset/Earthrise, DTE Hours.",
  },
  {
    id: "csa-international-artemis",
    title: "CSA & International Artemis Contributions",
    tag: "ARTEMIS PARTNERS",
    summary: "Canada, Europe, Japan, and the US share polar surface infrastructure dependent on light & comms.",
    whyItHappens:
      "The Canadian Space Agency (CSA) is building the Lunar Utility Vehicle (LUV) and Gateway's AI-enabled Canadarm3 robotics to haul cargo across polar terrain. Alongside ESA's Argonaut lander and JAXA's Pressurized Rover, every partner vehicle schedules traverses around sunlit ridges and DTE comms windows.",
    plannerMetricNote: "Planner metrics: Slope Hazard (< 10 deg safe rover grade), Sun + DTE Overlap (h).",
  },
];

export const MISSION_CHALLENGES: MissionChallenge[] = [
  {
    id: "challenge-farside-comms",
    title: "Challenge 1: The Silent Far Side",
    question: "Why does Chang'e-4 have 0% Direct-to-Earth comms?",
    hint: "Load Chang'e-4 in the Cockpit, then switch the 2D Map to 'Global Moon' view and look at Earth clearance.",
    answer:
      "Von Karman Crater lies at 177.6°E on the lunar far side, permanently facing away from 0°E (Earth). Earth stays roughly 35° below the horizon at all times, forcing CNSA to communicate via the Queqiao relay satellite positioned at Earth–Moon L2.",
    siteId: "change-4-von-karman",
    solarArrayType: "horizontal_fixed",
    observerHeightM: 2.0,
  },
  {
    id: "challenge-mast-vs-flat",
    title: "Challenge 2: Height Wins at the Poles",
    question: "Why does a 10m vertical tracking solar mast beat a flat panel at Shackleton?",
    hint: "Try Shackleton Ridge with a 10m Vertical Tracking array, then compare Solar Power Factor against Horizontal Fixed at 2m.",
    answer:
      "Two effects combine: first, raising the receiver to 10m lifts it higher above nearby crater rim shadows, increasing sunlit hours; second, tilting panels vertically faces the 1°–5° grazing Sun directly (~100% power factor vs. ~14% on flat panels).",
    siteId: "artemis-shackleton-ridge",
    solarArrayType: "vertical_tracking",
    observerHeightM: 10.0,
  },
  {
    id: "challenge-malapert-peak",
    title: "Challenge 3: The Polar Radio Tower",
    question: "Why is Malapert Massif called the 'Peak of Eternal Light & Comms'?",
    hint: "Inspect Malapert Massif at 85.97°S, -2.7°E on the 2D Polar Map—notice its elevation and alignment toward 0°E EARTH.",
    answer:
      "Rising nearly +4,950 m high almost directly on the 0°E Earth-facing meridian (-2.7°E), Malapert Massif towers above surrounding craters and looks straight toward Earth across nearly all libration cycles, giving uninterrupted DTE comms clearance.",
    siteId: "artemis-malapert-massif",
    solarArrayType: "vertical_tracking",
    observerHeightM: 10.0,
  },
];

export function getLiveExplorerInsight(siteName: string, isSunlit: boolean, isDteVisible: boolean, solarArrayType: SolarArrayType): string {
  const lightMsg = isSunlit
    ? `${siteName} is currently catching low-angle polar sunlight above the crater rim.`
    : `${siteName} is in crisp lunar shadow right now because surrounding ridges block the grazing Sun.`;
  const commsMsg = isDteVisible
    ? "Earth sits clear above the terrain horizon, enabling direct radio contact."
    : "Earth is hidden behind terrain or the Moon's curvature here, so a relay link is needed.";
  const arrayMsg =
    solarArrayType === "horizontal_fixed"
      ? "Tip: Switching from Horizontal Fixed panels to Vertical Tracking dramatically boosts polar power!"
      : "Vertical arrays are well suited here to catch low-elevation polar sunlight.";
  return `${lightMsg} ${commsMsg} ${arrayMsg}`;
}
