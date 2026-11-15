/** Responsive aerospace command-center workspace shell connecting all modules (F3.1). */

import { ComparisonBoardView } from "../../features/comparison-board";
import { EarthMoonContrastCard } from "../../features/earth-moon-contrast";
import { SouthPoleMap } from "../../features/lunar-map-2d";
import { OperationalKpiStrip } from "../../features/mission-kpis";
import { MissionTimelinePanel, SolarArraySelector } from "../../features/mission-timeline";
import { ExplorerCalloutBanner, GuidedChallengesView } from "../../features/persona-mode";
import { SiteExplorerDrawer } from "../../features/site-explorer";
import { PanoramaHorizonChart, PolarSkyDome } from "../../features/sky-horizon";
import { LunarTerrainCanvas } from "../../features/terrain-3d";
import { DateAndDurationBar, PlaybackScrubber } from "../../features/time-controls";
import { WindowHeatmapView } from "../../features/window-finder";
import { useMissionStore } from "../../state";
import { TopCommandBar } from "./TopCommandBar";

export function AppShell() {
  const activeTab = useMissionStore((s) => s.activeTab);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const terrainPatch = useMissionStore((s) => s.terrainPatch);
  const terrainUnavailable = useMissionStore((s) => s.terrainUnavailable);
  const solarArrayType = useMissionStore((s) => s.solarArrayType);
  const observerHeightM = useMissionStore((s) => s.observerHeightM);
  const personaMode = useMissionStore((s) => s.personaMode);
  const loading = useMissionStore((s) => s.loading);
  const notices = useMissionStore((s) => s.notices);
  const error = useMissionStore((s) => s.error);
  const setHardwareConfig = useMissionStore((s) => s.setHardwareConfig);

  const isSphericalLimbOnly = terrainUnavailable || evaluationData?.site.has_precomputed_terrain === false;
  const horizonProfile = evaluationData?.horizon_profile ?? [];
  const timeseries = evaluationData?.timeseries ?? [];

  return (
    <div className="app-shell">
      <TopCommandBar />
      <main className="shell-main">
        {error && (
          <div className="panel-card" style={{ borderColor: "var(--accent-danger)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        {notices.length > 0 && (
          <div className="panel-card" style={{ borderColor: "var(--accent-warn)", color: "#fde68a", gap: "0.35rem" }}>
            {notices.map((notice) => (
              <div key={notice} style={{ fontSize: "0.82rem" }}>
                {notice}
              </div>
            ))}
          </div>
        )}

        {activeTab === "cockpit" ? (
          <>
            <OperationalKpiStrip />
            <ExplorerCalloutBanner />

            {isSphericalLimbOnly && (
              <div className="panel-card" style={{ borderColor: "var(--accent-warn)", color: "#fde68a", padding: "0.65rem 1rem" }}>
                <strong style={{ fontSize: "0.82rem" }}>Terrain model unavailable — spherical limb only</strong>
              </div>
            )}

            <div className="cockpit-layout">
              <SiteExplorerDrawer />

              <div className="cockpit-visual-grid">
                <SouthPoleMap />
                <PolarSkyDome horizonProfile={horizonProfile} timeseries={timeseries} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <LunarTerrainCanvas
                    terrainPatch={terrainPatch}
                    terrainUnavailable={isSphericalLimbOnly}
                    timeseries={timeseries}
                    observerHeightM={observerHeightM}
                    solarArrayType={solarArrayType}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <PanoramaHorizonChart horizonProfile={horizonProfile} timeseries={timeseries} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <MissionTimelinePanel timeseries={timeseries} />
                </div>
                {evaluationData && (
                  <>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <SolarArraySelector
                        summary={evaluationData.summary}
                        timeseries={timeseries}
                        solarArrayType={solarArrayType}
                        observerHeightM={observerHeightM}
                        loading={loading}
                        onChangeArrayType={(nextType) => void setHardwareConfig(nextType, observerHeightM)}
                        onChangeObserverHeight={(nextHeight) => void setHardwareConfig(solarArrayType, nextHeight)}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <EarthMoonContrastCard evaluation={evaluationData} personaMode={personaMode} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <DateAndDurationBar />
            <PlaybackScrubber />
          </>
        ) : activeTab === "explorer" ? (
          <GuidedChallengesView />
        ) : activeTab === "compare" ? (
          <ComparisonBoardView />
        ) : (
          <WindowHeatmapView />
        )}
      </main>
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "0.7rem 1.25rem",
          fontSize: "0.74rem",
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          background: "rgba(16, 23, 38, 0.85)",
        }}
      >
        <span>Data Sources: NASA LRO LOLA (`ldem_80s_80m`) · JPL Horizons (`MOON_ME`) · LRO QuickMap · NASA Moon Trek · CSA</span>
        <span>
          Active Site Model:{" "}
          <strong style={{ color: isSphericalLimbOnly ? "var(--accent-warn)" : "var(--accent-ok)" }}>
            {isSphericalLimbOnly
              ? "Class B — Spherical limb only (terrain model unavailable)"
              : "Class A — Measured LOLA south-polar topography"}
          </strong>
        </span>
      </footer>
    </div>
  );
}
