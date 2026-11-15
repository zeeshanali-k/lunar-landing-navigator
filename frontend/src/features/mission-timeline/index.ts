/** Barrel exports for synchronized mission timeline & solar array selector (F4.5–F4.6). */

export {
  MissionTimelinePanel,
  type MissionTimelinePanelProps,
} from "./MissionTimelinePanel";
export {
  SolarArraySelector,
  type SolarArraySelectorProps,
} from "./SolarArraySelector";
export {
  buildCommsSegments,
  buildPowerSegments,
  classifyPowerState,
  inferStepHours,
  type CommsSegmentState,
  type PowerSegmentState,
  type TimelineSegment,
} from "./timelineSegments";
