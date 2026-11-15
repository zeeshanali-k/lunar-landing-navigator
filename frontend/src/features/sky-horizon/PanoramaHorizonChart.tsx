/** 360-deg Panoramic Horizon Silhouette Chart with live Sun & Earth markers (F4.3). */

import { useMemo, useState } from "react";
import { HelpPopover } from "../../components/ui";
import { usePlaybackStore } from "../../state";
import type { HorizonProfilePoint, TimeseriesPoint } from "../../types";
import { azElevToPanoramaSVG, buildPanoramaHorizonPaths, interpolateHorizonElevDeg, splitWrappedTrajectorySegments } from "./horizonMath";

export interface PanoramaHorizonChartProps {
  horizonProfile: HorizonProfilePoint[];
  timeseries: TimeseriesPoint[];
  currentIndex?: number;
  onSelectIndex?: (index: number) => void;
}

interface ReadoutInfo {
  body: "Sun" | "Earth";
  azDeg: number;
  elevDeg: number;
  horizonDeg: number;
  clearanceDeg: number;
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

const project = (az: number, elev: number) => azElevToPanoramaSVG(az, elev, PLOT_W, PLOT_H, MIN_ELEV, MAX_ELEV);

function toBodyPolylines(timeseries: TimeseriesPoint[], body: "Sun" | "Earth"): string[] {
  const pts = timeseries.map((pt, index) => ({
    azDeg: body === "Sun" ? pt.sun_az_deg : pt.earth_az_deg,
    elevDeg: body === "Sun" ? pt.sun_elev_deg : pt.earth_elev_deg,
    index,
  }));
  return splitWrappedTrajectorySegments(pts).map((seg) =>
    seg
      .map((p) => {
        const pt = project(p.azDeg, p.elevDeg);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(" "),
  );
}

function buildBodyReadout(body: "Sun" | "Earth", pt: TimeseriesPoint, profile: HorizonProfilePoint[]): ReadoutInfo {
  const azDeg = body === "Sun" ? pt.sun_az_deg : pt.earth_az_deg;
  const elevDeg = body === "Sun" ? pt.sun_elev_deg : pt.earth_elev_deg;
  const horizonDeg =
    profile.length > 0
      ? interpolateHorizonElevDeg(profile, azDeg).terrainElevDeg
      : body === "Sun"
        ? pt.sun_horizon_elev_deg
        : pt.earth_horizon_elev_deg;
  return { body, azDeg, elevDeg, horizonDeg, clearanceDeg: elevDeg - horizonDeg };
}

export function PanoramaHorizonChart({ horizonProfile, timeseries, currentIndex, onSelectIndex }: PanoramaHorizonChartProps) {
  const storeIndex = usePlaybackStore((s) => s.currentIndex);
  const jumpToIndex = usePlaybackStore((s) => s.jumpToIndex);
  const activeIdx = currentIndex ?? storeIndex;
  const selectIndex = onSelectIndex ?? jumpToIndex;

  const [hovered, setHovered] = useState<ReadoutInfo | null>(null);
  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, timeseries.length - 1));
  const active = timeseries[safeIdx];
  const hasTerrain = horizonProfile.length > 0;

  const { areaPath, ridgeLinePath, limbLinePath } = useMemo(
    () => buildPanoramaHorizonPaths(horizonProfile, PLOT_W, PLOT_H, MIN_ELEV, MAX_ELEV),
    [horizonProfile],
  );
  const sunPolylines = useMemo(() => toBodyPolylines(timeseries, "Sun"), [timeseries]);
  const earthPolylines = useMemo(() => toBodyPolylines(timeseries, "Earth"), [timeseries]);

  const activeSun = active ? buildBodyReadout("Sun", active, horizonProfile) : null;
  const activeEarth = active ? buildBodyReadout("Earth", active, horizonProfile) : null;
  const activeSunPos = activeSun ? project(activeSun.azDeg, activeSun.elevDeg) : null;
  const activeEarthPos = activeEarth ? project(activeEarth.azDeg, activeEarth.elevDeg) : null;
  const activeSunHorizon = activeSun ? project(activeSun.azDeg, activeSun.horizonDeg) : null;
  const activeEarthHorizon = activeEarth ? project(activeEarth.azDeg, activeEarth.horizonDeg) : null;
  const readout = hovered ?? activeSun;

  return (
    <section className="panel-card" style={{ padding: "0.75rem 0.9rem", gap: "0.45rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <strong style={{ fontSize: "0.86rem" }}>360° Panoramic Horizon Silhouette</strong>
          <HelpPopover helpKey="horizonSection" align="left" />
          {!hasTerrain && (
            <span className="status-pill" style={{ fontSize: "0.7rem", color: "var(--accent-warn)" }}>
              Terrain model unavailable — spherical limb only
            </span>
          )}
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {readout
            ? `${readout.body} Clearance: ${readout.clearanceDeg >= 0 ? "+" : ""}${readout.clearanceDeg.toFixed(1)}° (El ${readout.elevDeg.toFixed(1)}° vs Ridge ${readout.horizonDeg.toFixed(1)}°)`
            : "Click Sun/Earth path to scrub"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          background: "var(--chart-bg)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "0.5rem",
        }}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {ELEV_TICKS.map((elev) => {
            const { y } = project(0, elev);
            return (
              <g key={elev}>
                <line
                  x1={0}
                  y1={y}
                  x2={PLOT_W}
                  y2={y}
                  stroke={elev === 0 ? "var(--border-strong)" : "var(--chart-grid)"}
                  strokeDasharray={elev === 0 ? "3 3" : undefined}
                />
                <text x={-6} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--chart-text)">
                  {elev}°
                </text>
              </g>
            );
          })}
          {AZ_TICKS.map((t) => {
            const { x } = project(t.az, MIN_ELEV);
            return (
              <g key={t.az}>
                <line x1={x} y1={0} x2={x} y2={PLOT_H} stroke="var(--chart-grid)" />
                <text x={x} y={PLOT_H + 16} textAnchor="middle" fontSize="10" fill="var(--chart-text)">
                  {t.label}
                </text>
              </g>
            );
          })}

          {hasTerrain && areaPath && <path d={areaPath} fill="var(--chart-horizon-fill)" />}
          <path d={limbLinePath} fill="none" stroke="var(--chart-text)" strokeWidth="1.2" strokeDasharray="5 4" />
          {hasTerrain && ridgeLinePath && <path d={ridgeLinePath} fill="none" stroke="var(--chart-horizon-stroke)" strokeWidth="1.75" />}

          {sunPolylines.map((pts, i) => (
            <polyline
              key={`sun-${i}`}
              fill="none"
              stroke="#f59e0b"
              strokeOpacity="0.6"
              strokeWidth="1.4"
              strokeDasharray="2 3"
              points={pts}
            />
          ))}
          {earthPolylines.map((pts, i) => (
            <polyline
              key={`earth-${i}`}
              fill="none"
              stroke="#38bdf8"
              strokeOpacity="0.65"
              strokeWidth="1.4"
              strokeDasharray="2 3"
              points={pts}
            />
          ))}

          {activeSunPos && activeSunHorizon && (
            <line
              x1={activeSunPos.x}
              y1={activeSunPos.y}
              x2={activeSunHorizon.x}
              y2={activeSunHorizon.y}
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          )}
          {activeEarthPos && activeEarthHorizon && (
            <line
              x1={activeEarthPos.x}
              y1={activeEarthPos.y}
              x2={activeEarthHorizon.x}
              y2={activeEarthHorizon.y}
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          )}

          {timeseries.map((pt, idx) => {
            const sp = project(pt.sun_az_deg, pt.sun_elev_deg);
            const ep = project(pt.earth_az_deg, pt.earth_elev_deg);
            return (
              <g key={pt.timestamp_utc}>
                <circle
                  cx={sp.x}
                  cy={sp.y}
                  r={3.6}
                  fill="#f59e0b"
                  fillOpacity={idx === safeIdx ? 0.95 : 0.35}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(buildBodyReadout("Sun", pt, horizonProfile))}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => selectIndex(idx)}
                />
                <circle
                  cx={ep.x}
                  cy={ep.y}
                  r={3.2}
                  fill="#38bdf8"
                  fillOpacity={idx === safeIdx ? 0.95 : 0.35}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(buildBodyReadout("Earth", pt, horizonProfile))}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => selectIndex(idx)}
                />
              </g>
            );
          })}

          {activeSunPos && (
            <g pointerEvents="none">
              <circle cx={activeSunPos.x} cy={activeSunPos.y} r={9.5} fill="#f59e0b" fillOpacity="0.24" />
              <circle cx={activeSunPos.x} cy={activeSunPos.y} r={4.5} fill="#fbbf24" stroke="#fef3c7" strokeWidth="1" />
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
    </section>
  );
}
