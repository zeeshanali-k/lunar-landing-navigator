/** Multi-screen responsive workspace shell connecting all modules with reduced visual overload. */

import { ComparisonBoardView } from "../../features/comparison-board";
import { EarthMoonContrastCard } from "../../features/earth-moon-contrast";
import { GuidedChallengesView } from "../../features/persona-mode";
import { SiteExplorerDrawer } from "../../features/site-explorer";
import { WindowHeatmapView } from "../../features/window-finder";
import { useMissionStore } from "../../state";
import { OverviewScreen } from "./OverviewScreen";
import { SiteContextBar } from "./SiteContextBar";
import { SkyTimelineScreen } from "./SkyTimelineScreen";
import { TerrainScreen } from "./TerrainScreen";
import { TopCommandBar } from "./TopCommandBar";

export function AppShell() {
  const activeTab = useMissionStore((s) => s.activeTab);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const terrainUnavailable = useMissionStore((s) => s.terrainUnavailable);
  const personaMode = useMissionStore((s) => s.personaMode);
  const notices = useMissionStore((s) => s.notices);
  const error = useMissionStore((s) => s.error);

  const isSphericalLimbOnly = terrainUnavailable || evaluationData?.site.has_precomputed_terrain === false;

  return (
    <div className="app-shell">
      <TopCommandBar />
      <main className="shell-main">
        {error && (
          <div
            className="panel-card"
            style={{ borderColor: "var(--accent-danger)", background: "var(--surface-danger-soft)", color: "var(--accent-danger)" }}
          >
            {error}
          </div>
        )}

        {notices.length > 0 && (
          <div
            className="panel-card"
            style={{ borderColor: "var(--accent-warn)", background: "var(--surface-warn-soft)", color: "var(--accent-warn)" }}
          >
            {notices.map((notice) => (
              <div key={notice} style={{ fontSize: "0.82rem" }}>
                {notice}
              </div>
            ))}
          </div>
        )}

        <SiteContextBar />

        {activeTab === "cockpit" ? (
          <OverviewScreen isSphericalLimbOnly={isSphericalLimbOnly} />
        ) : activeTab === "terrain" ? (
          <TerrainScreen isSphericalLimbOnly={isSphericalLimbOnly} />
        ) : activeTab === "sky" ? (
          <SkyTimelineScreen />
        ) : activeTab === "compare" ? (
          <ComparisonBoardView />
        ) : activeTab === "windows" ? (
          <WindowHeatmapView />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <GuidedChallengesView />
            {evaluationData && <EarthMoonContrastCard evaluation={evaluationData} personaMode={personaMode} />}
          </div>
        )}
      </main>

      <SiteExplorerDrawer />

      <footer className="provenance-footer">
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
