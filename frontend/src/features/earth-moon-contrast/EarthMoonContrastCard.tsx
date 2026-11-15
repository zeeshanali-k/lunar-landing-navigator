/** Earth-vs-Moon Environmental Contrast Panel with live site metrics (F4.7). */

import { useMemo } from "react";
import { usePlaybackStore } from "../../state";
import type { EvaluateResponse } from "../../types";

export interface EarthMoonContrastCardProps {
  evaluation: EvaluateResponse;
  currentIndex?: number;
  personaMode?: "planner" | "explorer";
}

export function EarthMoonContrastCard({
  evaluation,
  currentIndex,
  personaMode = "planner",
}: EarthMoonContrastCardProps) {
  const storeIndex = usePlaybackStore((s) => s.currentIndex);
  const activeIdx = currentIndex ?? storeIndex;

  const { site, summary, horizon_profile, timeseries } = evaluation;
  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, timeseries.length - 1));
  const active = timeseries[safeIdx];
  const limbLabel =
    horizon_profile.length > 0
      ? `${horizon_profile[0].geometric_limb_deg.toFixed(2)}° limb`
      : "spherical limb";

  const librationBox = useMemo(() => {
    if (timeseries.length === 0) {
      return { azSpan: 0, elevSpan: 0 };
    }
    let minAz = 360;
    let maxAz = 0;
    let minEl = 90;
    let maxEl = -90;
    for (const pt of timeseries) {
      minAz = Math.min(minAz, pt.earth_az_deg);
      maxAz = Math.max(maxAz, pt.earth_az_deg);
      minEl = Math.min(minEl, pt.earth_elev_deg);
      maxEl = Math.max(maxEl, pt.earth_elev_deg);
    }
    return {
      azSpan: Math.max(0, maxAz - minAz),
      elevSpan: Math.max(0, maxEl - minEl),
    };
  }, [timeseries]);

  const cards = [
    {
      title: "1. Solar Day Length",
      earth: "24.0 hrs (1 day)",
      moon: "708.7 hrs (29.53 Earth days)",
      siteMetric: `${site.name}: ${(summary.sunlit_fraction * 100).toFixed(1)}% sunlit · Max dark streak ${summary.longest_dark_streak_hours.toFixed(0)}h`,
      explorerNote: "Slow lunar rotation makes crater ridges act like lighthouses, creating multi-day shadows.",
    },
    {
      title: "2. Atmosphere & Horizon Refraction",
      earth: "~0.57° refraction + Rayleigh twilight glow",
      moon: "0.00° refraction · Sharp shadows; regolith inertia governs cooling (~+127°C equatorial noon)",
      siteMetric: `Active Sun: ${active ? `${active.sun_elev_deg.toFixed(2)}°` : "—"} vs. ${limbLabel} (${active?.is_sunlit ? "Sunlit" : "Shadow"})`,
      explorerNote: "With zero air, no sky scatter softens crater shadows—the moment mountains block the disk, solar output drops.",
    },
    {
      title: "3. Earth Movement in Sky",
      earth: "Moon rises & sets daily across 360°",
      moon: "Earth remains within a ~15° libration box (±7° wobble)",
      siteMetric: `Measured span: ${librationBox.azSpan.toFixed(1)}° Az × ${librationBox.elevSpan.toFixed(1)}° El · DTE ${summary.dte_comms_hours.toFixed(0)}h`,
      explorerNote: "Earth never rises high overhead here—a single mountain ridge can decide if Direct-to-Earth comms survive.",
    },
  ];

  return (
    <section className="panel-card" style={{ padding: "0.85rem 1rem", gap: "0.65rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <strong style={{ fontSize: "0.88rem" }}>Earth vs. Moon Environmental Contrast</strong>
        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
          Mode: {personaMode === "explorer" ? "Explorer / Educator" : "Mission Planner"} · Site: {site.name}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
        {cards.map((card) => (
          <div key={card.title} style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: "0.55rem", padding: "0.7rem 0.8rem", display: "grid", gap: "0.35rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#e2e8f0" }}>{card.title}</div>
            <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
              <strong style={{ color: "#38bdf8" }}>Earth:</strong> {card.earth}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>
              <strong style={{ color: "#f59e0b" }}>Moon:</strong> {card.moon}
            </div>
            <div style={{ fontSize: "0.73rem", color: "#10b981", marginTop: "0.15rem" }}>{card.siteMetric}</div>
            {personaMode === "explorer" && (
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                {card.explorerNote}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
