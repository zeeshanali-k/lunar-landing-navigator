/** Solar Array Orientation & Mast Height Selector backed by API evaluation metrics (F4.6). */

import { HelpPopover } from "../../components/ui";
import { usePlaybackStore } from "../../state";
import type { EvaluationSummary, ObserverHeightM, SolarArrayType, TimeseriesPoint } from "../../types";

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
    <section className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div className="panel-row">
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <strong style={{ fontSize: "0.86rem" }}>Solar Array &amp; Mast Height</strong>
          <HelpPopover helpKey="advancedParams" align="left" />
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--accent-sun)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          Mean: {summary.mean_irradiance_w_m2.toFixed(0)} W/m² · Step Power: {stepPowerPct}% ({meanPowerPct}% avg)
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.55rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {ARRAY_OPTIONS.map((opt) => {
            const selected = opt.id === solarArrayType;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={loading}
                onClick={() => onChangeArrayType(opt.id)}
                className="panel-inset"
                style={{
                  flex: "1 1 90px",
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor: selected ? "var(--accent-sun)" : "var(--border-subtle)",
                  background: selected ? "var(--surface-sun-soft)" : "var(--surface-inset)",
                }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{opt.sub}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {MAST_OPTIONS.map((opt) => {
            const selected = Math.abs(opt.heightM - observerHeightM) < 0.05;
            return (
              <button
                key={opt.heightM}
                type="button"
                disabled={loading}
                onClick={() => onChangeObserverHeight(opt.heightM)}
                className="panel-inset"
                style={{
                  flex: "1 1 85px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderColor: selected ? "var(--accent-dte)" : "var(--border-subtle)",
                  background: selected ? "var(--surface-dte-soft)" : "var(--surface-inset)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
