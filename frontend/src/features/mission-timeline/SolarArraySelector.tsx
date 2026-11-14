/** Solar Array Orientation & Mast Height Trade-Off Simulator (F4.6). */

import { useMemo } from "react";
import type { HorizonProfilePoint, SolarArrayType, TimeseriesPoint } from "../../types";
import { computeArrayComparisonMetrics } from "./timelineSegments";

export interface SolarArraySelectorProps {
  timeseries: TimeseriesPoint[];
  horizonProfile: HorizonProfilePoint[];
  currentIndex: number;
  solarArrayType: SolarArrayType;
  observerHeightM: number;
  onChangeArrayType: (type: SolarArrayType) => void;
  onChangeObserverHeight: (heightM: number) => void;
}

const ARRAY_OPTIONS: { id: SolarArrayType; label: string; sub: string }[] = [
  { id: "horizontal_fixed", label: "Horizontal Deck", sub: "Flat panel" },
  { id: "vertical_fixed", label: "Fixed Vertical", sub: "South-facing" },
  { id: "vertical_tracking", label: "Sun-Tracking Mast", sub: "360° yaw" },
];

const MAST_OPTIONS: { heightM: number; label: string }[] = [
  { heightM: 1.5, label: "1.5m Rover" },
  { heightM: 2.0, label: "2.0m Lander" },
  { heightM: 10.0, label: "10.0m Tall Tower" },
];

export function SolarArraySelector({
  timeseries,
  horizonProfile,
  currentIndex,
  solarArrayType,
  observerHeightM,
  onChangeArrayType,
  onChangeObserverHeight,
}: SolarArraySelectorProps) {
  const safeIdx = Math.min(Math.max(0, currentIndex), Math.max(0, timeseries.length - 1));
  const activePt = timeseries[safeIdx];

  const comparison = useMemo(
    () => computeArrayComparisonMetrics(timeseries, horizonProfile, solarArrayType, observerHeightM),
    [timeseries, horizonProfile, solarArrayType, observerHeightM],
  );

  const liveWatts = activePt ? Math.round(activePt.solar_power_factor * 1361.0) : 0;
  const baselinePct = (comparison.baseline.meanPowerFactor * 100).toFixed(1);
  const activePct = (comparison.active.meanPowerFactor * 100).toFixed(1);
  const deltaGain = comparison.powerGainPct;
  const darkDeltaH = comparison.active.longestDarkStreakHours - comparison.baseline.longestDarkStreakHours;

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.85rem 1rem", display: "grid", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <strong style={{ fontSize: "0.88rem" }}>Solar Array &amp; Mast Height Simulator</strong>
        <span style={{ fontSize: "0.78rem", color: "var(--accent-sun)", fontWeight: 600 }}>
          Live Output: {liveWatts} W/m² ({activePt ? `${Math.round(activePt.solar_power_factor * 100)}%` : "0%"})
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
        <div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Solar Array Architecture</div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {ARRAY_OPTIONS.map((opt) => {
              const selected = opt.id === solarArrayType;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeArrayType(opt.id)}
                  style={{
                    flex: "1 1 90px",
                    padding: "0.45rem 0.55rem",
                    borderRadius: "0.45rem",
                    border: `1px solid ${selected ? "var(--accent-sun)" : "var(--border-subtle)"}`,
                    background: selected ? "rgba(245, 158, 11, 0.14)" : "#0b1120",
                    color: selected ? "#fef3c7" : "var(--text-primary)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: "0.69rem", color: "var(--text-muted)" }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Observer / Mast Height</div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {MAST_OPTIONS.map((opt) => {
              const selected = Math.abs(opt.heightM - observerHeightM) < 0.05;
              return (
                <button
                  key={opt.heightM}
                  type="button"
                  onClick={() => onChangeObserverHeight(opt.heightM)}
                  style={{
                    flex: "1 1 85px",
                    padding: "0.52rem 0.55rem",
                    borderRadius: "0.45rem",
                    border: `1px solid ${selected ? "var(--accent-dte)" : "var(--border-subtle)"}`,
                    background: selected ? "rgba(56, 189, 248, 0.14)" : "#0b1120",
                    color: selected ? "#e0f2fe" : "var(--text-primary)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.78rem" }}>
        <span>
          Viability Delta vs. 2m Horizontal Deck: <strong>{baselinePct}%</strong> →{" "}
          <strong style={{ color: "var(--accent-ok)" }}>{activePct}%</strong> mean power{" "}
          <span style={{ color: deltaGain >= 0 ? "var(--accent-ok)" : "#fda4af" }}>
            ({deltaGain >= 0 ? "+" : ""}{deltaGain.toFixed(1)} pts)
          </span>
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          Sunlit: <strong>{comparison.active.sunlitHours.toFixed(0)}h</strong> · Max Dark:{" "}
          <strong>{comparison.active.longestDarkStreakHours.toFixed(0)}h</strong>
          {darkDeltaH !== 0 ? ` (${darkDeltaH > 0 ? "+" : ""}${darkDeltaH.toFixed(0)}h)` : ""}
        </span>
      </div>
    </div>
  );
}
