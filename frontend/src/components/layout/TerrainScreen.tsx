/** Screen 2: Dedicated spatial view pairing the 2D South Pole Map with 3D Lunar Terrain. */

import { Compass, Sun } from "lucide-react";
import { SouthPoleMap } from "../../features/lunar-map-2d";
import { LunarTerrainCanvas } from "../../features/terrain-3d";
import { PlaybackScrubber } from "../../features/time-controls";
import { useMissionStore } from "../../state";
import { CollapsibleSection, ScreenHeader } from "../ui";

interface TerrainScreenProps {
  isSphericalLimbOnly: boolean;
}

export function TerrainScreen({ isSphericalLimbOnly }: TerrainScreenProps) {
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const terrainPatch = useMissionStore((s) => s.terrainPatch);
  const terrainUnavailable = useMissionStore((s) => s.terrainUnavailable);
  const solarArrayType = useMissionStore((s) => s.solarArrayType);
  const observerHeightM = useMissionStore((s) => s.observerHeightM);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ScreenHeader
        eyebrow="Screen 2 of 6"
        title="Maps & 3D Terrain"
        description="Explore regional south-polar geography alongside an interactive 3D heightfield model of your landing zone."
        helpKey="terrainScreen"
        actions={
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setActiveTab("cockpit")} className="btn-surface">
              <Compass size={14} aria-hidden="true" />
              <span>Back to Overview</span>
            </button>
            <button type="button" onClick={() => setActiveTab("sky")} className="btn-primary">
              <Sun size={14} aria-hidden="true" />
              <span>Sky &amp; Timeline</span>
            </button>
          </div>
        }
      />

      {isSphericalLimbOnly && (
        <div
          className="panel-card"
          style={{
            borderColor: "var(--accent-warn)",
            background: "var(--surface-warn-soft)",
            color: "var(--accent-warn)",
            padding: "0.7rem 1rem",
          }}
        >
          <strong style={{ fontSize: "0.84rem" }}>Terrain model unavailable — spherical limb only</strong>
        </div>
      )}

      <div className="screen-grid-two">
        <SouthPoleMap />
        <LunarTerrainCanvas
          terrainPatch={terrainPatch}
          terrainUnavailable={terrainUnavailable}
          timeseries={evaluationData?.timeseries ?? []}
          solarArrayType={solarArrayType}
          observerHeightM={observerHeightM}
        />
      </div>

      <CollapsibleSection
        title="Time Playback for 3D Shadow Study"
        subtitle="Scrub timestamps here to watch real solar shadows cross crater walls in 3D"
        helpKey="playbackBar"
        defaultOpen={true}
      >
        <PlaybackScrubber embedded />
      </CollapsibleSection>
    </div>
  );
}
