/** Clean headline KPI strip with progressive disclosure for detailed telemetry & risks (F3.7). */

import { AlertTriangle, BatteryCharging, Gauge, Radio, Sun } from "lucide-react";
import { CollapsibleSection, HelpPopover } from "../../components/ui";
import { useMissionStore, usePlaybackStore } from "../../state";
import type { TimeseriesPoint } from "../../types";
import { CountdownBadge, formatCountdown } from "./CountdownBadge";

function formatMetric(value: number | null | undefined, digits = 1, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function verdictForScore(score: number | null): { text: string; tone: "ok" | "warn" | "danger" | "neutral" } {
  if (score === null) return { text: "N/A (Class B)", tone: "warn" };
  if (score >= 75) return { text: "Strong Site", tone: "ok" };
  if (score >= 50) return { text: "Moderate", tone: "warn" };
  return { text: "Challenging", tone: "danger" };
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
  const currentIndex = usePlaybackStore((s) => s.currentIndex);

  const summary = evaluationData?.summary ?? null;
  const currentPoint = evaluationData?.timeseries[currentIndex] ?? null;
  const startEvents = summary?.next_events_from_start;

  const isSunlit = currentPoint?.is_sunlit ?? true;
  const isDteVisible = currentPoint?.is_dte_visible ?? false;
  const solarCountdown = isSunlit
    ? resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_sunset, startEvents?.hours_to_sunset)
    : resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_sunrise, startEvents?.hours_to_sunrise);
  const dteCountdown = isDteVisible
    ? resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_earthset, startEvents?.hours_to_earthset)
    : resolveCountdownHours(currentPoint, currentIndex, currentPoint?.hours_to_next_earthrise, startEvents?.hours_to_earthrise);

  const verdict = verdictForScore(summary?.feasibility_score ?? null);
  const warnCount = summary?.risk_warnings.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <section className="panel-card" aria-label="Headline mission metrics">
        <div className="panel-row" style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <h2 className="panel-title">Mission Verdict at a Glance</h2>
            <HelpPopover helpKey="kpiHeadline" align="left" />
          </div>
          {personaMode === "explorer" && <span className="tone-pill tone-info">Explorer Summary Active</span>}
        </div>

        <div className="kpi-headline-grid">
          <div className="panel-inset">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span
                style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
              >
                <Gauge size={13} color="var(--accent-ok)" aria-hidden="true" /> Feasibility
              </span>
              <span className={`tone-pill tone-${verdict.tone}`}>{verdict.text}</span>
            </div>
            <strong style={{ fontSize: "1.45rem", fontVariantNumeric: "tabular-nums" }}>
              {summary?.feasibility_score !== null && summary?.feasibility_score !== undefined
                ? `${summary.feasibility_score.toFixed(0)} / 100`
                : "N/A"}
            </strong>
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {summary?.feasibility_score === null ? "Terrain relief unavailable here" : "Combined power, comms & terrain"}
            </div>
          </div>

          <div className="panel-inset">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span
                style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
              >
                <Sun size={13} color="var(--accent-sun)" aria-hidden="true" /> Sunlight
              </span>
              <span className={`tone-pill ${isSunlit ? "tone-ok" : "tone-danger"}`}>{isSunlit ? "Sunlit Now" : "In Shadow"}</span>
            </div>
            <strong style={{ fontSize: "1.45rem", fontVariantNumeric: "tabular-nums" }}>
              {summary ? `${Math.round(summary.sunlit_fraction * 100)}%` : "—"}
            </strong>
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {isSunlit
                ? `Sunset: ${formatCountdown(solarCountdown, "None in window")}`
                : `Sunrise: ${formatCountdown(solarCountdown, "Dark window")}`}
            </div>
          </div>

          <div className="panel-inset">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span
                style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
              >
                <Radio size={13} color="var(--accent-dte)" aria-hidden="true" /> Earth Radio Link
              </span>
              <span className={`tone-pill ${isDteVisible ? "tone-info" : "tone-danger"}`}>
                {isDteVisible ? "Line of Sight" : "Blocked"}
              </span>
            </div>
            <strong style={{ fontSize: "1.45rem", fontVariantNumeric: "tabular-nums" }}>
              {summary ? `${Math.round(summary.dte_fraction * 100)}%` : "—"}
            </strong>
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              {isDteVisible
                ? `Earthset: ${formatCountdown(dteCountdown, "Continuous")}`
                : `Earthrise: ${formatCountdown(dteCountdown, "No link")}`}
            </div>
          </div>

          <div className="panel-inset">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span
                style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
              >
                <BatteryCharging size={13} color="var(--accent-ok)" aria-hidden="true" /> Sun + Link Overlap
              </span>
              <span className={`tone-pill ${warnCount > 0 ? "tone-warn" : "tone-ok"}`}>
                {warnCount > 0 ? `${warnCount} Risk${warnCount > 1 ? "s" : ""}` : "Nominal"}
              </span>
            </div>
            <strong style={{ fontSize: "1.45rem", fontVariantNumeric: "tabular-nums" }}>
              {summary ? `${summary.overlap_sun_and_dte_hours.toFixed(1)}h` : "—"}
            </strong>
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Simultaneous power &amp; Earth comms</div>
          </div>
        </div>
      </section>

      <CollapsibleSection
        title="Detailed Telemetry, Sub-Scores & Risk Warnings"
        subtitle="Inspect weighted sub-scores, irradiance, streak durations, and caution flags"
        badge={warnCount > 0 ? `${warnCount} Alert${warnCount > 1 ? "s" : ""}` : "All Details"}
        badgeTone={warnCount > 0 ? "warn" : "neutral"}
        helpKey="kpiDetailed"
        defaultOpen={personaMode === "explorer"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="kpi-detail-grid">
            <div className="panel-inset">
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Sunlit Duration</div>
              <strong style={{ fontSize: "1rem" }}>{summary ? formatMetric(summary.sunlit_hours, 1, " hrs") : "—"}</strong>
            </div>
            <div className="panel-inset">
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>DTE Comms Duration</div>
              <strong style={{ fontSize: "1rem" }}>{summary ? formatMetric(summary.dte_comms_hours, 1, " hrs") : "—"}</strong>
            </div>
            <div className="panel-inset">
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Mean Solar Irradiance</div>
              <strong style={{ fontSize: "1rem" }}>{summary ? formatMetric(summary.mean_irradiance_w_m2, 0, " W/m²") : "—"}</strong>
            </div>
            <div className="panel-inset">
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Longest Dark / Blackout</div>
              <strong style={{ fontSize: "1rem" }}>
                {summary
                  ? `${formatMetric(summary.longest_dark_streak_hours, 1, "h")} / ${formatMetric(summary.longest_comms_blackout_hours, 1, "h")}`
                  : "—"}
              </strong>
            </div>
          </div>

          {summary && (
            <div className="kpi-detail-grid">
              {[
                { label: "Power Sub-Score (35%)", value: summary.sub_scores.power_score },
                { label: "Thermal Sub-Score (20%)", value: summary.sub_scores.thermal_score },
                { label: "Comms Sub-Score (25%)", value: summary.sub_scores.comms_score },
                { label: "Terrain Sub-Score (20%)", value: summary.sub_scores.terrain_score },
              ].map((item) => (
                <div key={item.label} className="panel-inset">
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{item.label}</div>
                  <strong style={{ fontSize: "1rem" }}>{item.value === null ? "N/A" : `${item.value.toFixed(1)} / 100`}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="screen-grid-two">
            <CountdownBadge
              label={isSunlit ? "Next Sunset" : "Next Sunrise"}
              hoursRemaining={solarCountdown}
              accentColor="var(--accent-sun)"
            />
            <CountdownBadge
              label={isDteVisible ? "Next Earthset" : "Next Earthrise"}
              hoursRemaining={dteCountdown}
              accentColor="var(--accent-dte)"
            />
          </div>

          {summary && summary.risk_warnings.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
              {summary.risk_warnings.map((warning) => (
                <span key={warning} className="tone-pill tone-warn">
                  <AlertTriangle size={12} aria-hidden="true" />
                  <span>{warning}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
