/** Responsive aerospace command-center workspace shell connecting all modules (F3.1). */

import { Layers, Trash2 } from "lucide-react";
import { SouthPoleMap } from "../../features/lunar-map-2d";
import { OperationalKpiStrip } from "../../features/mission-kpis";
import { ExplorerCalloutBanner, GuidedChallengesView } from "../../features/persona-mode";
import { SiteExplorerDrawer } from "../../features/site-explorer";
import { DateAndDurationBar, PlaybackScrubber } from "../../features/time-controls";
import { useComparisonStore, useMissionStore } from "../../state";
import { TopCommandBar } from "./TopCommandBar";

export function AppShell() {
  const activeTab = useMissionStore((s) => s.activeTab);
  const selectedSiteId = useMissionStore((s) => s.selectedSiteId);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const terrainPatch = useMissionStore((s) => s.terrainPatch);
  const error = useMissionStore((s) => s.error);

  const pinnedScenarios = useComparisonStore((s) => s.pinnedScenarios);
  const unpinScenario = useComparisonStore((s) => s.unpinScenario);

  return (
    <div className="app-shell">
      <TopCommandBar />
      <main className="shell-main">
        {error && (
          <div className="panel-card" style={{ borderColor: "var(--accent-danger)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        {activeTab === "cockpit" ? (
          <>
            <OperationalKpiStrip />
            <ExplorerCalloutBanner />

            <div className="cockpit-layout">
              <SiteExplorerDrawer />

              <div className="cockpit-visual-grid">
                <SouthPoleMap />
                <section className="panel-card" style={{ minHeight: "230px" }}>
                  <h2 className="panel-title">
                    <span>
                      <Layers size={13} /> 3D local_enu Terrain Slot (F4.1–F4.2)
                    </span>
                  </h2>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem" }}>
                    Patch: {terrainPatch ? `${terrainPatch.grid_size}×${terrainPatch.grid_size} (${terrainPatch.frame})` : "Loading..."}
                  </p>
                </section>
                <section className="panel-card" style={{ minHeight: "200px" }}>
                  <h2 className="panel-title">
                    <span>360° Horizon &amp; Sky-Dome Slot (F4.3–F4.4)</span>
                  </h2>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem" }}>
                    Horizon samples: {evaluationData?.horizon_profile.length ?? 0}
                  </p>
                </section>
                <section className="panel-card" style={{ minHeight: "200px" }}>
                  <h2 className="panel-title">
                    <span>Power &amp; DTE Timeline Slot (F4.5–F4.6)</span>
                  </h2>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem" }}>
                    Sunlit: {evaluationData?.summary.sunlit_hours ?? "—"}h | DTE: {evaluationData?.summary.dte_comms_hours ?? "—"}h
                  </p>
                </section>
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
