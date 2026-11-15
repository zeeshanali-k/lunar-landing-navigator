/** Operational KPI & Countdown Summary Strip displaying live feasibility and event countdowns (F3.7). */

import { useState, type CSSProperties } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Gauge, Radio, Sun } from "lucide-react";
import { useMissionStore, usePlaybackStore } from "../../state";
import type { TimeseriesPoint } from "../../types";
import { CountdownBadge } from "./CountdownBadge";

const CARD_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "0.35rem",
  padding: "0.65rem 0.75rem",
  borderRadius: "0.6rem",
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-panel-elevated)",
};

const HEADER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.4rem",
  fontSize: "0.73rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-muted)",
};

function scoreColor(score: number): string {
  if (score >= 75) return "var(--accent-ok)";
  if (score >= 50) return "var(--accent-warn)";
  return "var(--accent-danger)";
}

function formatSignedDeg(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}°`;
}

function resolveSunStatus(pt: TimeseriesPoint | null): { text: string; color: string } {
  if (!pt) return { text: "—", color: "var(--text-muted)" };
  const pct = Math.round(pt.sun_visible_fraction * 100);
  if (pt.is_sunlit && pt.sun_visible_fraction < 0.99) return { text: `GRAZING SUN (${pct}% disk)`, color: "var(--accent-warn)" };
  if (pt.is_sunlit) return { text: `SUNLIT (${pct}% disk)`, color: "var(--accent-ok)" };
  return { text: "IN SHADOW (0% disk)", color: "var(--accent-danger)" };
}

function resolveCountdownHours(
  currentPoint: TimeseriesPoint | null,
  currentIndex: number,
  pointHours: number | null | undefined,
  startHours: number | null | undefined,
): number | null {
  if (!currentPoint) return startHours ?? null;
  if (pointHours !== null && pointHours !== undefined) return pointHours;
  return currentIndex === 0 ? (startHours ?? null) : null;
}

export function OperationalKpiStrip() {
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const personaMode = useMissionStore((s) => s.personaMode);
  const loading = useMissionStore((s) => s.loading);
  const currentIndex = usePlaybackStore((s) => s.currentIndex);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const summary = evaluationData?.summary ?? null;
  const currentPoint = evaluationData?.timeseries[currentIndex] ?? null;
  const isBreakdownVisible = showBreakdown || personaMode === "explorer";
  const isSunlit = currentPoint?.is_sunlit ?? true;
  const isDteVisible = currentPoint?.is_dte_visible ?? false;
  const sunStatus = resolveSunStatus(currentPoint);
  const dteColor = !currentPoint ? "var(--text-muted)" : isDteVisible ? "var(--accent-dte)" : "var(--accent-danger)";
  const dteText = !currentPoint
    ? "—"
    : `${isDteVisible ? "LINK ACTIVE" : "TERRAIN BLOCKED"} (${formatSignedDeg(currentPoint.earth_clearance_deg)} margin)`;

  const startEvents = summary?.next_events_from_start;
  const solarCountdown = isSunlit
    ? resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_sunset, startEvents?.hours_to_sunset)
    : resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_sunrise, startEvents?.hours_to_sunrise);
  const dteCountdown = isDteVisible
    ? resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_earthset, startEvents?.hours_to_earthset)
    : resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_earthrise, startEvents?.hours_to_earthrise);

  const subScoreItems = summary
    ? [
        { label: "Power Score (35%)", value: summary.sub_scores.power_score },
        { label: "Thermal Score (20%)", value: summary.sub_scores.thermal_score },
        { label: "DTE Comms Score (25%)", value: summary.sub_scores.comms_score },
        { label: "Terrain Score (20%)", value: summary.sub_scores.terrain_score },
      ]
    : [];

  return (
    <section className="panel-card" aria-label="Operational KPI and Countdown Strip">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "0.55rem" }}>
        <div style={CARD_STYLE}>
          <div style={HEADER_STYLE}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Gauge size={12} color="var(--accent-ok)" /> Feasibility Score</span>
            {personaMode === "explorer" ? (
              <span style={{ fontSize: "0.68rem", color: "var(--accent-dte)" }}>Explorer Detail</span>
            ) : (
              <button type="button" onClick={() => setShowBreakdown((v) => !v)} className="category-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", padding: "0.15rem 0.45rem" }}>
                Sub-Scores {showBreakdown ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
            <strong style={{ fontSize: "1.25rem", fontVariantNumeric: "tabular-nums", color: summary?.feasibility_score != null ? scoreColor(summary.feasibility_score) : "var(--text-muted)" }}>
              {summary?.feasibility_score != null ? summary.feasibility_score.toFixed(1) : "N/A"}
            </strong>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{summary?.feasibility_score != null ? `/ 100 ${loading ? "• Updating..." : ""}` : "terrain unavailable"}</span>
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {summary ? `Sunlit: ${summary.sunlit_hours.toFixed(0)}h (${Math.round(summary.sunlit_fraction * 100)}%) | DTE: ${summary.dte_comms_hours.toFixed(0)}h` : "Awaiting telemetry..."}
          </div>
        </div>

        <div style={CARD_STYLE}>
          <div style={HEADER_STYLE}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Sun size={12} color="var(--accent-sun)" /> Sun Status</span>
            {currentPoint && <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{Math.round(currentPoint.solar_power_factor * 100)}% array</span>}
          </div>
          <div style={{ fontSize: "0.96rem", fontWeight: 700, color: sunStatus.color, fontVariantNumeric: "tabular-nums" }}>{sunStatus.text}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {currentPoint ? `Elev: ${formatSignedDeg(currentPoint.sun_elev_deg)} (Horiz ${currentPoint.sun_horizon_elev_deg.toFixed(1)}°)${summary ? ` • ${summary.mean_irradiance_w_m2.toFixed(0)} W/m² mean` : ""}` : "Select a step to inspect solar flux"}
          </div>
        </div>

        <CountdownBadge
          label={isSunlit ? "Countdown to Sunset" : "Countdown to Sunrise"}
          hoursRemaining={solarCountdown}
          fallbackText={isSunlit ? "Continuous sunlight in window" : "Remains in shadow in window"}
          accentColor="var(--accent-sun)"
        />

        <div style={CARD_STYLE}>
          <div style={HEADER_STYLE}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Radio size={12} color="var(--accent-dte)" /> DTE Comms Status</span>
          </div>
          <div style={{ fontSize: "0.94rem", fontWeight: 700, color: dteColor, fontVariantNumeric: "tabular-nums" }}>{dteText}</div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {currentPoint ? `Earth Elev: ${currentPoint.earth_elev_deg.toFixed(1)}° | Sep: ${currentPoint.sun_earth_sep_deg.toFixed(1)}°` : "Awaiting Earth line-of-sight..."}
          </div>
        </div>

        <CountdownBadge
          label={isDteVisible ? "Countdown to Earthset" : "Countdown to Earthrise"}
          hoursRemaining={dteCountdown}
          fallbackText={isDteVisible ? "Continuous DTE link in window" : "No DTE link in window (Relay Req.)"}
          accentColor="var(--accent-dte)"
        />
      </div>

      {isBreakdownVisible && summary && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.55rem", paddingTop: "0.55rem", borderTop: "1px solid var(--border-subtle)" }}>
          {subScoreItems.map((item) => (
            <span key={item.label} className="status-pill" style={{ fontSize: "0.74rem", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: "var(--text-muted)" }}>{item.label}:</span>
              <strong style={{ color: item.value == null ? "var(--text-muted)" : scoreColor(item.value) }}>{item.value == null ? "N/A" : item.value.toFixed(1)}</strong>
            </span>
          ))}
          {summary.risk_warnings.map((warning) => (
            <span key={warning} className="status-pill" style={{ borderColor: "rgba(245, 158, 11, 0.45)", background: "rgba(245, 158, 11, 0.12)", color: "#fcd34d", fontSize: "0.73rem" }}>
              <AlertTriangle size={12} /> {warning}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
