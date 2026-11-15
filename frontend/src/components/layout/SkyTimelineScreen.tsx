/** Screen 3: Focused Sky Geometry, 360 Horizon & Multi-Track Timeline screen. */

import { Columns2, Eye, Map } from "lucide-react";
import { MissionTimelinePanel } from "../../features/mission-timeline";
import { PanoramaHorizonChart, PolarSkyDome } from "../../features/sky-horizon";
import { PlaybackScrubber } from "../../features/time-controls";
import { useMissionStore, useUiStore, type SkyViewMode } from "../../state";
import { HelpPopover, ScreenHeader } from "../ui";

const SKY_VIEW_OPTIONS: { id: SkyViewMode; label: string }[] = [
  { id: "panorama", label: "Horizon Panorama" },
  { id: "dome", label: "Polar Sky-Dome" },
  { id: "both", label: "Side by Side" },
];

export function SkyTimelineScreen() {
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);
  const skyViewMode = useUiStore((s) => s.skyViewMode);
  const setSkyViewMode = useUiStore((s) => s.setSkyViewMode);

  const horizonProfile = evaluationData?.horizon_profile ?? [];
  const timeseries = evaluationData?.timeseries ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ScreenHeader
        eyebrow="Screen 3 of 6"
        title="Sky, Horizon & Timeline"
        description="Track hour-by-hour illumination and Earth radio link, and see exactly where surrounding ridges block the sky."
        helpKey="skyScreen"
        actions={
          <button type="button" onClick={() => setActiveTab("terrain")} className="btn-surface">
            <Map size={14} aria-hidden="true" />
            <span>Open Maps &amp; 3D</span>
          </button>
        }
      />

      <PlaybackScrubber />

      <MissionTimelinePanel timeseries={timeseries} />

      <div className="panel-card">
        <div className="panel-row" style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Eye size={16} color="var(--accent-primary)" aria-hidden="true" />
            <h2 className="panel-title">Horizon &amp; Sky Geometry</h2>
            <HelpPopover helpKey="horizonSection" align="left" />
          </div>

          <div className="theme-segmented" role="group" aria-label="Horizon view mode">
            {SKY_VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`theme-pill ${skyViewMode === option.id ? "active" : ""}`}
                onClick={() => setSkyViewMode(option.id)}
              >
                {option.id === "both" && <Columns2 size={12} aria-hidden="true" />}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {skyViewMode === "both" ? (
          <div className="screen-grid-two">
            <PanoramaHorizonChart horizonProfile={horizonProfile} timeseries={timeseries} />
            <PolarSkyDome horizonProfile={horizonProfile} timeseries={timeseries} />
          </div>
        ) : skyViewMode === "panorama" ? (
          <PanoramaHorizonChart horizonProfile={horizonProfile} timeseries={timeseries} />
        ) : (
          <PolarSkyDome horizonProfile={horizonProfile} timeseries={timeseries} />
        )}
      </div>
    </div>
  );
}
