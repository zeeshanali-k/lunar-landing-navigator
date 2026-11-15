/** Solar Array Orientation & Mast Height Selector backed by API evaluation metrics (F4.6). */

import { usePlaybackStore } from "../../state";
import type {
  EvaluationSummary,
  ObserverHeightM,
  SolarArrayType,
  TimeseriesPoint,
} from "../../types";

export interface SolarArraySelectorProps {
  summary: EvaluationSummary;
  timeseries: TimeseriesPoint[];
  solarArrayType: SolarArrayType;
  observerHeightM: ObserverHeightM;
  loading?: boolean;
  onChangeArrayType: (type: SolarArrayType) => void;
  onChangeObserverHeight: (heightM: ObserverHeightM) => void;
  currentIndex?: number;
}

const ARRAY_OPTIONS: { id: SolarArrayType; label: string; sub: string }[] = [
  { id: "horizontal_fixed", label: "Horizontal Deck", sub: "Flat panel" },
  { id: "vertical_fixed", label: "Fixed Vertical", sub: "Fixed azimuth" },
  { id: "vertical_tracking", label: "Sun-Tracking Mast", sub: "360° yaw" },
];

const MAST_OPTIONS: { heightM: ObserverHeightM; label: string }[] = [
  { heightM: 1.5, label: "1.5m Rover" },
  { heightM: 2.0, label: "2.0m Lander" },
  { heightM: 10.0, label: "10.0m Tall Tower" },
];

export function SolarArraySelector({
  summary,
  timeseries,
  solarArrayType,
  observerHeightM,
  loading = false,
  onChangeArrayType,
  onChangeObserverHeight,
  currentIndex,
}: SolarArraySelectorProps) {
  const storeIndex = usePlaybackStore((s) => s.currentIndex);
  const activeIdx = currentIndex ?? storeIndex;
  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, timeseries.length - 1));
  const activePt = timeseries[safeIdx];

  const stepPowerPct = Math.round((activePt?.solar_power_factor ?? summary.mean_solar_power_factor) * 100);
  const meanPowerPct = (summary.mean_solar_power_factor * 100).toFixed(1);

  return (
    <section className="panel-card" style={{ padding: "0.75rem 0.9rem", gap: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
        <strong style={{ fontSize: "0.84rem" }}>Solar Array &amp; Mast Height Configuration</strong>
        <span style={{ fontSize: "0.75rem", color: "var(--accent-sun)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          Mean Irradiance: {summary.mean_irradiance_w_m2.toFixed(0)} W/m² · Step Power: {stepPowerPct}%
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {ARRAY_OPTIONS.map((opt) => {
            const selected = opt.id === solarArrayType;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={loading}
                onClick={() => onChangeArrayType(opt.id)}
                style={{
                  flex: "1 1 90px", padding: "0.32rem 0.5rem", borderRadius: "0.4rem", textAlign: "left", cursor: "pointer",
                  border: `1px solid ${selected ? "var(--accent-sun)" : "var(--border-subtle)"}`,
                  background: selected ? "rgba(245, 158, 11, 0.14)" : "#0b1120",
                  color: selected ? "#fef3c7" : "var(--text-primary)",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>{opt.sub}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {MAST_OPTIONS.map((opt) => {
            const selected = Math.abs(opt.heightM - observerHeightM) < 0.05;
            return (
              <button
                key={opt.heightM}
                type="button"
                disabled={loading}
                onClick={() => onChangeObserverHeight(opt.heightM)}
                style={{
                  flex: "1 1 85px", padding: "0.36rem 0.5rem", borderRadius: "0.4rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${selected ? "var(--accent-dte)" : "var(--border-subtle)"}`,
                  background: selected ? "rgba(56, 189, 248, 0.14)" : "#0b1120",
                  color: selected ? "#e0f2fe" : "var(--text-primary)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", padding: "0.38rem 0.65rem", borderRadius: "0.45rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.74rem", fontVariantNumeric: "tabular-nums" }}>
        <span>
          Mean Power Factor: <strong style={{ color: "var(--accent-ok)" }}>{meanPowerPct}%</strong> ({summary.mean_irradiance_w_m2.toFixed(0)} W/m²)
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          Sunlit: <strong>{summary.sunlit_hours.toFixed(0)}h</strong> · Max Dark: <strong>{summary.longest_dark_streak_hours.toFixed(0)}h</strong>
        </span>
      </div>
    </section>
  );
}
