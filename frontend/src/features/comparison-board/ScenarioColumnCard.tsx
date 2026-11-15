/** Individual scenario comparison column card with baseline delta badges (F5.1). */

import { Award, Compass, Flag, Trash2 } from "lucide-react";
import type { ComparedScenario } from "../../types";

export interface ScenarioColumnCardProps {
  scenario: ComparedScenario;
  index: number;
  isBaseline: boolean;
  isRecommended: boolean;
  onSetBaseline: (index: number) => void;
  onLoadInCockpit: (scenario: ComparedScenario) => void;
  onRemove: (scenarioId: string) => void;
}

function DeltaBadge({ value, unit, invertGood = false }: { value: number; unit: string; invertGood?: boolean }) {
  const isZero = Math.abs(value) < 1e-6;
  const isGood = invertGood ? value < 0 : value > 0;
  const color = isZero ? "var(--text-muted)" : isGood ? "var(--accent-ok)" : "var(--accent-danger)";
  const sign = value > 0 ? "+" : "";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>
      {isZero ? "0" : `${sign}${value.toFixed(1)}`}
      {unit}
    </span>
  );
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div style={{ display: "grid", gap: "0.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem" }}>
        <span style={{ color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{score === null ? "N/A" : score.toFixed(0)}</span>
      </div>
      <div style={{ height: "5px", borderRadius: "999px", background: "#1e293b", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background:
              score === null ? "#475569" : pct >= 75 ? "var(--accent-ok)" : pct >= 50 ? "var(--accent-sun)" : "var(--accent-danger)",
          }}
        />
      </div>
    </div>
  );
}

export function ScenarioColumnCard({
  scenario,
  index,
  isBaseline,
  isRecommended,
  onSetBaseline,
  onLoadInCockpit,
  onRemove,
}: ScenarioColumnCardProps) {
  const { evaluation, deltas_vs_baseline: deltas } = scenario;
  const { site, summary } = evaluation;
  const isClassB = site.has_precomputed_terrain === false || summary.feasibility_score === null;

  return (
    <article
      className="panel-card"
      style={{
        padding: "0.85rem",
        borderColor: isRecommended ? "var(--accent-ok)" : isBaseline ? "var(--accent-dte)" : "var(--border-subtle)",
        background: isRecommended ? "rgba(16, 185, 129, 0.05)" : "var(--bg-panel)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{scenario.label}</div>
          <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
            {site.name} ({site.lat_deg.toFixed(2)}°, {site.lon_deg.toFixed(2)}°)
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {isBaseline && (
            <span className="status-pill" style={{ fontSize: "0.68rem", color: "var(--accent-dte)" }}>
              <Flag size={11} /> BASELINE
            </span>
          )}
          {isRecommended && (
            <span className="status-pill" style={{ fontSize: "0.68rem", color: "var(--accent-ok)" }}>
              <Award size={11} /> RECOMMENDED
            </span>
          )}
          <span className="status-pill" style={{ fontSize: "0.68rem", color: isClassB ? "var(--accent-warn)" : "var(--text-muted)" }}>
            {isClassB ? "Spherical limb only" : "LOLA DEM"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "0.45rem 0.6rem",
          background: "#0b1120",
          borderRadius: "0.5rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Feasibility Score</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, color: isClassB ? "var(--accent-warn)" : "var(--text-primary)" }}>
            {summary.feasibility_score !== null ? summary.feasibility_score.toFixed(1) : "N/A (Limb Only)"}
          </div>
        </div>
        {isBaseline ? (
          <span style={{ fontSize: "0.72rem", color: "var(--accent-dte)", fontWeight: 600 }}>Reference</span>
        ) : (
          <DeltaBadge value={deltas.feasibility_score_delta} unit=" pts" />
        )}
      </div>

      <div style={{ display: "grid", gap: "0.4rem" }}>
        <ScoreBar label="Power (P)" score={summary.sub_scores.power_score} />
        <ScoreBar label="Thermal (T)" score={summary.sub_scores.thermal_score} />
        <ScoreBar label="Comms (C)" score={summary.sub_scores.comms_score} />
        <ScoreBar label="Terrain (R)" score={summary.sub_scores.terrain_score} />
      </div>

      <div
        style={{ display: "grid", gap: "0.35rem", fontSize: "0.76rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.55rem" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Sunlit</span>
          <span>
            <strong>{summary.sunlit_hours.toFixed(1)}h</strong> ({(summary.sunlit_fraction * 100).toFixed(1)}%){" "}
            {!isBaseline && <DeltaBadge value={deltas.sunlit_hours_delta} unit="h" />}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Max Dark Streak</span>
          <span>
            <strong>{summary.longest_dark_streak_hours.toFixed(1)}h</strong>{" "}
            {!isBaseline && <DeltaBadge value={deltas.longest_dark_streak_hours_delta} unit="h" invertGood />}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>DTE Comms</span>
          <span>
            <strong>{summary.dte_comms_hours.toFixed(1)}h</strong> ({(summary.dte_fraction * 100).toFixed(1)}%){" "}
            {!isBaseline && <DeltaBadge value={deltas.dte_comms_hours_delta} unit="h" />}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Overlap / Irrad.</span>
          <span>
            {summary.overlap_sun_and_dte_hours.toFixed(1)}h · {summary.mean_irradiance_w_m2.toFixed(0)} W/m²
          </span>
        </div>
      </div>

      {summary.risk_warnings.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.72rem", color: "#fde68a", display: "grid", gap: "0.2rem" }}>
          {summary.risk_warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto", flexWrap: "wrap" }}>
        {!isBaseline && (
          <button
            type="button"
            onClick={() => onSetBaseline(index)}
            className="btn-surface"
            style={{ fontSize: "0.74rem", padding: "0.3rem 0.55rem" }}
          >
            <Flag size={12} /> Set Baseline
          </button>
        )}
        <button
          type="button"
          onClick={() => onLoadInCockpit(scenario)}
          className="btn-surface"
          style={{ fontSize: "0.74rem", padding: "0.3rem 0.55rem" }}
        >
          <Compass size={12} /> Open in Cockpit
        </button>
        <button
          type="button"
          onClick={() => onRemove(scenario.scenario_id)}
          className="btn-surface"
          style={{ fontSize: "0.74rem", padding: "0.3rem 0.55rem", color: "var(--accent-danger)" }}
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </article>
  );
}
