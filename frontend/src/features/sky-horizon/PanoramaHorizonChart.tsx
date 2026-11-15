/** 360-deg Panoramic Horizon Silhouette Chart with live Sun disk & Earth orb (F4.3). */

import { useMemo, useState } from "react";
import type { HorizonProfilePoint, TimeseriesPoint } from "../../types";
import {
  azElevToPanoramaSVG,
  buildPanoramaHorizonPaths,
  interpolateHorizonElevDeg,
  splitWrappedTrajectorySegments,
} from "./horizonMath";

export interface PanoramaHorizonChartProps {
  horizonProfile: HorizonProfilePoint[];
  timeseries: TimeseriesPoint[];
  currentIndex: number;
  observerHeightM?: number;
  onSelectIndex?: (index: number) => void;
}

interface ReadoutInfo {
  body: "Sun" | "Earth";
  azDeg: number;
  elevDeg: number;
  terrainDeg: number;
  clearanceDeg: number;
  timestampUtc: string;
}

const W = 760;
const H = 250;
const PAD = { left: 42, right: 16, top: 18, bottom: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const MIN_ELEV = -2;
const MAX_ELEV = 12;
const ELEV_TICKS = [-2, 0, 2, 4, 6, 8, 10, 12];
const AZ_TICKS = [
  { az: 0, label: "0° N" },
  { az: 90, label: "90° E" },
  { az: 180, label: "180° S" },
  { az: 270, label: "270° W" },
  { az: 360, label: "360° N" },
];

export function PanoramaHorizonChart({
  horizonProfile,
  timeseries,
  currentIndex,
  observerHeightM = 2.0,
  onSelectIndex,
}: PanoramaHorizonChartProps) {
  const [hovered, setHovered] = useState<ReadoutInfo | null>(null);
  const safeIdx = Math.min(Math.max(0, currentIndex), Math.max(0, timeseries.length - 1));
  const active = timeseries[safeIdx];

  const { areaPath, ridgeLinePath, limbLinePath } = useMemo(
    () => buildPanoramaHorizonPaths(horizonProfile, PLOT_W, PLOT_H, MIN_ELEV, MAX_ELEV, observerHeightM),
    [horizonProfile, observerHeightM],
  );

  const sunSegments = useMemo(
    () => splitWrappedTrajectorySegments(timeseries.map((pt, index) => ({ azDeg: pt.sun_az_deg, elevDeg: pt.sun_elev_deg, index }))),
    [timeseries],
  );
  const earthSegments = useMemo(
    () => splitWrappedTrajectorySegments(timeseries.map((pt, index) => ({ azDeg: pt.earth_az_deg, elevDeg: pt.earth_elev_deg, index }))),
    [timeseries],
  );

  const project = (az: number, elev: number) => azElevToPanoramaSVG(az, elev, PLOT_W, PLOT_H, MIN_ELEV, MAX_ELEV);
  const toPolyline = (seg: { azDeg: number; elevDeg: number }[]) =>
    seg.map((p) => { const pt = project(p.azDeg, p.elevDeg); return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`; }).join(" ");

  const sunDiskR = Math.max(3.8, ((0.534 / (MAX_ELEV - MIN_ELEV)) * PLOT_H) * 0.5);
  const activeSunPos = active ? project(active.sun_az_deg, active.sun_elev_deg) : null;
  const activeEarthPos = active ? project(active.earth_az_deg, active.earth_elev_deg) : null;
  const activeSunRidge = active ? project(active.sun_az_deg, interpolateHorizonElevDeg(horizonProfile, active.sun_az_deg, observerHeightM).terrainElevDeg) : null;
  const activeEarthRidge = active ? project(active.earth_az_deg, interpolateHorizonElevDeg(horizonProfile, active.earth_az_deg, observerHeightM).terrainElevDeg) : null;

  const activeFallback: ReadoutInfo | null = active
    ? (() => {
        const terrain = interpolateHorizonElevDeg(horizonProfile, active.sun_az_deg, observerHeightM).terrainElevDeg;
        return { body: "Sun", azDeg: active.sun_az_deg, elevDeg: active.sun_elev_deg, terrainDeg: terrain, clearanceDeg: active.sun_elev_deg - terrain, timestampUtc: active.timestamp_utc };
      })()
    : null;
  const readout = hovered ?? activeFallback;

  const inspectPoint = (body: "Sun" | "Earth", pt: TimeseriesPoint) => {
    const azDeg = body === "Sun" ? pt.sun_az_deg : pt.earth_az_deg;
    const elevDeg = body === "Sun" ? pt.sun_elev_deg : pt.earth_elev_deg;
    const terrainDeg = interpolateHorizonElevDeg(horizonProfile, azDeg, observerHeightM).terrainElevDeg;
    setHovered({ body, azDeg, elevDeg, terrainDeg, clearanceDeg: elevDeg - terrainDeg, timestampUtc: pt.timestamp_utc });
  };

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.65rem 0.8rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.35rem" }}>
        <strong style={{ fontSize: "0.84rem" }}>360° Panoramic Horizon Silhouette</strong>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {readout
            ? `${readout.body}: Az ${readout.azDeg.toFixed(1)}° · El ${readout.elevDeg.toFixed(2)}° · Horizon ${readout.terrainDeg.toFixed(2)}° · Margin ${readout.clearanceDeg >= 0 ? "+" : ""}${readout.clearanceDeg.toFixed(2)}°`
            : "Click Sun/Earth path to jump"}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", background: "#070c17", borderRadius: "0.5rem" }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {ELEV_TICKS.map((elev) => {
            const { y } = project(0, elev);
            return (
              <g key={elev}>
                <line x1={0} y1={y} x2={PLOT_W} y2={y} stroke={elev === 0 ? "#475569" : "#1e293b"} strokeDasharray={elev === 0 ? "3 3" : undefined} />
                <text x={-6} y={y + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8">{elev}°</text>
              </g>
            );
          })}
          {AZ_TICKS.map((t) => {
            const { x } = project(t.az, MIN_ELEV);
            return (
              <g key={t.az}>
                <line x1={x} y1={0} x2={x} y2={PLOT_H} stroke="#1e293b" />
                <text x={x} y={PLOT_H + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">{t.label}</text>
              </g>
            );
          })}

          <path d={areaPath} fill="rgba(51, 65, 85, 0.72)" />
          <path d={limbLinePath} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="5 4" />
          <path d={ridgeLinePath} fill="none" stroke="#cbd5e1" strokeWidth="1.75" />

          {sunSegments.map((seg, i) => (
            <polyline key={`sun-${i}`} fill="none" stroke="#f59e0b" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="2 3" points={toPolyline(seg)} />
          ))}
          {earthSegments.map((seg, i) => (
            <polyline key={`earth-${i}`} fill="none" stroke="#38bdf8" strokeOpacity="0.65" strokeWidth="1.4" strokeDasharray="2 3" points={toPolyline(seg)} />
          ))}

          {activeSunPos && activeSunRidge && (
            <line x1={activeSunPos.x} y1={activeSunPos.y} x2={activeSunRidge.x} y2={activeSunRidge.y} stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
          )}
          {activeEarthPos && activeEarthRidge && (
            <line x1={activeEarthPos.x} y1={activeEarthPos.y} x2={activeEarthRidge.x} y2={activeEarthRidge.y} stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
          )}

          {timeseries.map((pt, idx) => {
            const sp = project(pt.sun_az_deg, pt.sun_elev_deg);
            const ep = project(pt.earth_az_deg, pt.earth_elev_deg);
            return (
              <g key={pt.timestamp_utc}>
                <circle cx={sp.x} cy={sp.y} r={3.6} fill="#f59e0b" fillOpacity={idx === safeIdx ? 0.95 : 0.35} style={{ cursor: "pointer" }} onMouseEnter={() => inspectPoint("Sun", pt)} onMouseLeave={() => setHovered(null)} onClick={() => onSelectIndex?.(idx)} />
                <circle cx={ep.x} cy={ep.y} r={3.2} fill="#38bdf8" fillOpacity={idx === safeIdx ? 0.95 : 0.35} style={{ cursor: "pointer" }} onMouseEnter={() => inspectPoint("Earth", pt)} onMouseLeave={() => setHovered(null)} onClick={() => onSelectIndex?.(idx)} />
              </g>
            );
          })}

          {activeSunPos && (
            <g pointerEvents="none">
              <circle cx={activeSunPos.x} cy={activeSunPos.y} r={sunDiskR * 2.2} fill="#f59e0b" fillOpacity="0.24" />
              <circle cx={activeSunPos.x} cy={activeSunPos.y} r={sunDiskR} fill="#fbbf24" stroke="#fef3c7" strokeWidth="1" />
            </g>
          )}
          {activeEarthPos && (
            <g pointerEvents="none">
              <circle cx={activeEarthPos.x} cy={activeEarthPos.y} r={8.5} fill="#38bdf8" fillOpacity="0.22" />
              <circle cx={activeEarthPos.x} cy={activeEarthPos.y} r={4.5} fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
