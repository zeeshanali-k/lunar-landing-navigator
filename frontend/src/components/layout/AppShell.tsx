/** Responsive aerospace command-center workspace shell connecting all modules (F3.1). */

import { Trash2 } from "lucide-react";
import { EarthMoonContrastCard } from "../../features/earth-moon-contrast";
import { SouthPoleMap } from "../../features/lunar-map-2d";
import { OperationalKpiStrip } from "../../features/mission-kpis";
import { MissionTimelinePanel, SolarArraySelector } from "../../features/mission-timeline";
import { ExplorerCalloutBanner, GuidedChallengesView } from "../../features/persona-mode";
import { SiteExplorerDrawer } from "../../features/site-explorer";
import { PanoramaHorizonChart, PolarSkyDome } from "../../features/sky-horizon";
import { DateAndDurationBar, PlaybackScrubber } from "../../features/time-controls";
import { useComparisonStore, useMissionStore } from "../../state";
import { TopCommandBar } from "./TopCommandBar";

export function AppShell() {
  const activeTab = useMissionStore((s) => s.activeTab);
  const selectedSiteId = useMissionStore((s) => s.selectedSiteId);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const terrainUnavailable = useMissionStore((s) => s.terrainUnavailable);
  const solarArrayType = useMissionStore((s) => s.solarArrayType);
  const observerHeightM = useMissionStore((s) => s.observerHeightM);
  const personaMode = useMissionStore((s) => s.personaMode);
  const loading = useMissionStore((s) => s.loading);
  const notices = useMissionStore((s) => s.notices);
  const error = useMissionStore((s) => s.error);
  const setHardwareConfig = useMissionStore((s) => s.setHardwareConfig);

  const pinnedScenarios = useComparisonStore((s) => s.pinnedScenarios);
  const unpinScenario = useComparisonStore((s) => s.unpinScenario);

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
        ) : (
          <section className="panel-card">
            <h2 className="panel-title">
              <span>{activeTab.toUpperCase()} Workspace</span>
            </h2>
            {activeTab === "compare" && (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Pinned Scenarios ({pinnedScenarios.length}/4) — Module 5 Comparison Board connects here:
                </p>
                {pinnedScenarios.map((scen) => (
                  <div key={scen.scenario_id} className="btn-surface" style={{ justifyContent: "space-between" }}>
                    <span>{scen.label}</span>
                    <button type="button" onClick={() => void unpinScenario(scen.scenario_id)} className="btn-surface">
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "windows" && (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                12-Month Optimal Landing Window Heatmap (Module 5) for {evaluationData?.site.name ?? selectedSiteId}.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
