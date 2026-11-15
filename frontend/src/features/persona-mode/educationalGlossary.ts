/** Conceptual Explorer glossary, mission context callouts, and guided challenges (F3.6). */

import type { ObserverHeightM, SolarArrayType } from "../../types";

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
    title: "Polar Grazing Sunlight & Array Orientation",
    tag: "SOLAR GEOMETRY",
    summary: "Near the lunar poles, the Sun travels near the local horizon and sweeps across azimuths.",
    whyItHappens:
      "Because solar elevation remains shallow at high latitudes, horizontal panels receive sunlight obliquely whereas vertical panels oriented toward or tracking the Sun intercept the beam closer to normal incidence. Elevation above surrounding crater rims also changes when sunlight is obstructed.",
    plannerMetricNote: "Planner metrics: Sun Elev (deg), Solar Power Factor (%), Mean Irradiance (W/m2).",
  },
  {
    id: "zero-atmosphere-shadows",
    title: "Airless Shadows & Permanently Shadowed Regions",
    tag: "TERRAIN MASKING",
    summary: "Without an atmosphere to scatter sunlight, sunlit ridges border deep terrain shadows.",
    whyItHappens:
      "In vacuum, any azimuth where the local topographic horizon exceeds solar elevation puts the surface in direct shadow. Elevated rim crests can stay illuminated across extended intervals while adjacent crater floors remain shielded from direct solar heating.",
    plannerMetricNote: "Planner metrics: Longest Sunlit Streak (h), Longest Dark Streak (h), Sunlit Hours.",
  },
  {
    id: "earth-libration-wobble",
    title: "Earth Libration & Direct-to-Earth Contact",
    tag: "COMMS GEOMETRY",
    summary: "From near-side polar sites, Earth appears low on the horizon and shifts position over time.",
    whyItHappens:
      "Orbital eccentricity and axial inclination cause Earth to trace an apparent libration path in both azimuth and elevation. When Earth's elevation drops below the local terrain mask plus the minimum communications threshold, Direct-to-Earth links require a relay asset.",
    plannerMetricNote: "Planner metrics: Earth Elev (deg), Earth Clearance (deg), DTE Comms Hours.",
  },
  {
    id: "csa-international-artemis",
    title: "CSA & International Artemis Operations",
    tag: "MISSION CONTEXT",
    summary: "International surface robotics rely on overlapping illumination and Earth visibility windows.",
    whyItHappens:
      "Surface assets such as the Canadian Space Agency (CSA) Lunar Utility Vehicle and partner landers schedule high-power operations when sunlit intervals and Direct-to-Earth line-of-sight coincide, using terrain horizon profiles and slope assessments from orbital datasets.",
    plannerMetricNote: "Planner metrics: Sun + DTE Overlap (h), Feasibility Score, Slope Hazard.",
  },
];

export const MISSION_CHALLENGES: MissionChallenge[] = [
  {
    id: "challenge-farside-comms",
    title: "Challenge 1: Far-Side Direct-to-Earth Geometry",
    question: "Why does Chang'e-4 show no Direct-to-Earth communication intervals?",
    hint: "Select Chang'e-4 in the Mission Cockpit and inspect the Horizon Profile and Comms timeline track.",
    answer:
      "Von Karman Crater lies on the lunar far side, where the spherical lunar limb permanently blocks direct line-of-sight to Earth. Missions on the far side rely on an orbital relay satellite rather than direct Earth visibility.",
    siteId: "change-4-von-karman",
    solarArrayType: "horizontal_fixed",
    observerHeightM: 2.0,
  },
  {
    id: "challenge-mast-vs-flat",
    title: "Challenge 2: Mast Height & Vertical Tracking",
    question: "How do mast height and array orientation affect Shackleton Ridge power availability?",
    hint: "Compare Horizontal Fixed at 2.0m against Vertical Tracking at 10.0m in the Mission Cockpit controls.",
    answer:
      "Vertical tracking aligns the collecting surface toward the low-angle polar Sun instead of receiving grazing horizontal incidence, while raising the mast increases clearance above foreground terrain ridges in the computed LOLA profile.",
    siteId: "artemis-shackleton-ridge",
    solarArrayType: "vertical_tracking",
    observerHeightM: 10.0,
  },
  {
    id: "challenge-malapert-peak",
    title: "Challenge 3: Polar Earth-Facing Ridges",
    question: "Why do elevated near-side peaks like Malapert Massif support strong DTE clearance?",
    hint: "Load Malapert Massif and inspect the Earth Clearance values across a 14-day or 29.5-day scenario.",
    answer:
      "Malapert Massif sits on an elevated near-side ridge facing the Earthward meridian, placing Earth above local foreground relief for extended portions of the libration cycle as computed in the mission telemetry.",
    siteId: "artemis-malapert-massif",
    solarArrayType: "vertical_tracking",
    observerHeightM: 10.0,
  },
];

export function getLiveExplorerInsight(
  siteName: string,
  isSunlit: boolean,
  isDteVisible: boolean,
  solarArrayType: SolarArrayType,
): string {
  const lightMsg = isSunlit
    ? `${siteName} has direct solar illumination above the active horizon profile at this step.`
    : `${siteName} is currently shadowed below the active horizon profile at this step.`;
  const commsMsg = isDteVisible
    ? "Earth meets the minimum elevation clearance for Direct-to-Earth contact."
    : "Earth is below the required terrain or limb clearance at this step.";
  const arrayMsg = `Configured array mode: ${solarArrayType.replace("_", " ")}.`;
  return `${lightMsg} ${commsMsg} ${arrayMsg}`;
}
