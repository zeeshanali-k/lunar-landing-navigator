/** Pure-SVG 4-axis trade-off radar chart and overlaid 360-deg horizon comparison (F5.1). */

import type { ComparedScenario } from "../../types";
import { buildPanoramaHorizonPaths } from "../sky-horizon/horizonMath";

export const SCENARIO_PALETTE = ["#38bdf8", "#f59e0b", "#10b981", "#a78bfa"] as const;

export interface TradeoffRadarChartProps {
  scenarios: ComparedScenario[];
}

const AXES = [
  { key: "power_score", label: "Power", dx: 0, dy: -1, lx: 0, ly: -12, anchor: "middle" },
  { key: "thermal_score", label: "Thermal", dx: 1, dy: 0, lx: 10, ly: 4, anchor: "start" },
  { key: "comms_score", label: "Comms", dx: 0, dy: 1, lx: 0, ly: 16, anchor: "middle" },
  { key: "terrain_score", label: "Terrain", dx: -1, dy: 0, lx: -10, ly: 4, anchor: "end" },
] as const;

const CX = 150;
const CY = 132;
const R = 86;

function axisPoint(idx: number, value: number): { x: number; y: number } {
  const frac = Math.max(0, Math.min(100, value)) / 100;
  const axis = AXES[idx];
  return { x: CX + axis.dx * R * frac, y: CY + axis.dy * R * frac };
}

export function TradeoffRadarChart({ scenarios }: TradeoffRadarChartProps) {
  const hasClassB = scenarios.some(
    (s) => s.evaluation.summary.sub_scores.terrain_score === null,
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
      <section className="panel-card" style={{ padding: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
          <strong style={{ fontSize: "0.84rem" }}>Sub-Score Trade-Off Radar (0–100)</strong>
          {hasClassB && (
            <span style={{ fontSize: "0.7rem", color: "var(--accent-warn)" }}>
              Terrain axis N/A for spherical-limb sites
            </span>
          )}
        </div>

        <svg viewBox="0 0 300 264" style={{ width: "100%", maxHeight: "260px", background: "#070c17", borderRadius: "0.5rem" }}>
          {[25, 50, 75, 100].map((ring) => {
            const pts = AXES.map((_, idx) => axisPoint(idx, ring))
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(" ");
            return <polygon key={ring} points={pts} fill="none" stroke="#1e293b" strokeWidth="1" />;
          })}
          {AXES.map((axis, idx) => {
            const end = axisPoint(idx, 100);
            return (
              <g key={axis.key}>
                <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#334155" strokeWidth="1" />
                <text x={end.x + axis.lx} y={end.y + axis.ly} textAnchor={axis.anchor} fontSize="10.5" fill="#cbd5e1">
                  {axis.label}
                </text>
              </g>
            );
          })}

          {scenarios.map((scen, sIdx) => {
            const color = SCENARIO_PALETTE[sIdx % SCENARIO_PALETTE.length];
            const sub = scen.evaluation.summary.sub_scores;
            const values: (number | null)[] = [
              sub.power_score,
              sub.thermal_score,
              sub.comms_score,
              sub.terrain_score,
            ];
            const validPts = values
              .map((v, idx) => (v === null ? null : axisPoint(idx, v)))
              .filter((p): p is { x: number; y: number } => p !== null);

            if (validPts.length < 3) return null;
            const ptsStr = validPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            return (
              <g key={scen.scenario_id}>
                <polygon
                  points={ptsStr}
                  fill={color}
                  fillOpacity={0.14}
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray={sub.terrain_score === null ? "4 3" : undefined}
                />
                {validPts.map((pt, pIdx) => (
                  <circle key={`${scen.scenario_id}-${pIdx}`} cx={pt.x} cy={pt.y} r="3" fill={color} />
                ))}
              </g>
            );
          })}
        </svg>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", fontSize: "0.73rem" }}>
          {scenarios.map((scen, idx) => (
            <span key={scen.scenario_id} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: 9, height: 9, borderRadius: "999px", background: SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length] }} />
              {scen.label}
            </span>
          ))}
        </div>
      </section>

      <section className="panel-card" style={{ padding: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
          <strong style={{ fontSize: "0.84rem" }}>Overlaid 360° Horizon Profiles</strong>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Solid = LOLA ridge · Dashed = limb</span>
        </div>

        <svg viewBox="0 0 560 190" style={{ width: "100%", height: "auto", background: "#070c17", borderRadius: "0.5rem" }}>
          <g transform="translate(28,14)">
            {[-2, 0, 4, 8, 12].map((elev) => {
              const y = 148 - ((elev + 2) / 14) * 148;
              return (
                <g key={elev}>
                  <line x1={0} y1={y} x2={516} y2={y} stroke={elev === 0 ? "#475569" : "#1e293b"} strokeDasharray={elev === 0 ? "3 3" : undefined} />
                  <text x={-5} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{elev}°</text>
                </g>
              );
            })}
            {[0, 90, 180, 270, 360].map((az) => {
              const x = (az / 360) * 516;
              return (
                <text key={az} x={x} y={166} textAnchor="middle" fontSize="9.5" fill="#94a3b8">{az}°</text>
              );
            })}
            {scenarios.map((scen, idx) => {
              const color = SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length];
              const { ridgeLinePath, limbLinePath } = buildPanoramaHorizonPaths(
                scen.evaluation.horizon_profile,
                516,
                148,
                -2,
                12,
              );
              return (
                <g key={scen.scenario_id}>
                  {ridgeLinePath ? (
                    <path d={ridgeLinePath} fill="none" stroke={color} strokeWidth="1.8" opacity="0.92" />
                  ) : (
                    <path d={limbLinePath} fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="4 4" opacity="0.8" />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </section>
    </div>
  );
}
