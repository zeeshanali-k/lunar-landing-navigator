/** Screen 1: High-level Mission Overview with headline metrics, schedule setup, and quick jumps. */

import { CalendarSearch, Compass, GitCompare, Map, Sun } from "lucide-react";
import { OperationalKpiStrip } from "../../features/mission-kpis";
import { ExplorerCalloutBanner } from "../../features/persona-mode";
import { DateAndDurationBar } from "../../features/time-controls";
import { useMissionStore } from "../../state";
import { ScreenHeader } from "../ui";

interface OverviewScreenProps {
  isSphericalLimbOnly: boolean;
}

export function OverviewScreen({ isSphericalLimbOnly }: OverviewScreenProps) {
  const setActiveTab = useMissionStore((s) => s.setActiveTab);
  const loading = useMissionStore((s) => s.loading);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ScreenHeader
        eyebrow="Screen 1 of 6"
        title="Mission Overview"
        description="See whether this lunar site works at a glance, adjust your landing dates, or expand detailed numbers when you need them."
        helpKey="overviewScreen"
        actions={
          <button type="button" onClick={() => setActiveTab("terrain")} className="btn-surface">
            <Map size={14} aria-hidden="true" />
            <span>Open Maps &amp; 3D</span>
          </button>
        }
      />

      <ExplorerCalloutBanner />

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

      {loading && (
        <div className="panel-inset" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          Updating solar illumination and Earth visibility calculations...
        </div>
      )}

      <OperationalKpiStrip />

      <DateAndDurationBar />

      <section className="panel-card" aria-label="Next screens">
        <div className="panel-row" style={{ marginBottom: "0.65rem" }}>
          <h2 className="panel-title">Where to go next</h2>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Explore spatial terrain, hourly timeline geometry, or multi-site comparisons
          </span>
        </div>

        <div className="quick-jump-grid">
          <button type="button" className="quick-jump-card" onClick={() => setActiveTab("terrain")}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.88rem" }}>
              <Map size={16} color="var(--accent-primary)" aria-hidden="true" />
              <span>Maps &amp; 3D Terrain</span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Inspect south polar context and real crater shadows in 3D.
            </span>
          </button>

          <button type="button" className="quick-jump-card" onClick={() => setActiveTab("sky")}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.88rem" }}>
              <Sun size={16} color="var(--accent-sun)" aria-hidden="true" />
              <span>Sky &amp; Timeline</span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Scrub hour-by-hour sunlight, Earth radio link, and horizon ridges.
            </span>
          </button>

          <button type="button" className="quick-jump-card" onClick={() => setActiveTab("compare")}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.88rem" }}>
              <GitCompare size={16} color="var(--accent-dte)" aria-hidden="true" />
              <span>Compare Sites</span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Compare up to 4 pinned configurations or test launch delays.
            </span>
          </button>

          <button type="button" className="quick-jump-card" onClick={() => setActiveTab("windows")}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.88rem" }}>
              <CalendarSearch size={16} color="var(--accent-ok)" aria-hidden="true" />
              <span>Landing Windows</span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Find the brightest 2027-2028 launch dates at this site.</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export { Compass };
