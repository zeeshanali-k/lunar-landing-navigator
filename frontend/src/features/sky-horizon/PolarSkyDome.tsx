/** Zenith-centered Polar Sky-Dome Radar Plot with Rim Magnification & Earth Libration (F4.4). */

import { useMemo, useState } from "react";
import { usePlaybackStore } from "../../state";
import type { HorizonProfilePoint, TimeseriesPoint } from "../../types";
import { azElevToSkyDomeSVG, interpolateHorizonElevDeg } from "./horizonMath";

export interface PolarSkyDomeProps {
  horizonProfile: HorizonProfilePoint[];
  timeseries: TimeseriesPoint[];
  currentIndex?: number;
  onSelectIndex?: (index: number) => void;
}

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 144;

function radiusForElev(elevDeg: number, rimMagnified: boolean): number {
  const minElev = -5;
  const maxElev = rimMagnified ? 25 : 90;
  const clamped = Math.max(minElev, Math.min(maxElev, elevDeg));
  return ((maxElev - clamped) / (maxElev - minElev)) * MAX_R;
}

export function PolarSkyDome({ horizonProfile, timeseries, currentIndex, onSelectIndex }: PolarSkyDomeProps) {
  const storeIndex = usePlaybackStore((s) => s.currentIndex);
  const jumpToIndex = usePlaybackStore((s) => s.jumpToIndex);
  const activeIdx = currentIndex ?? storeIndex;
  const selectIndex = onSelectIndex ?? jumpToIndex;

  const [rimMagnified, setRimMagnified] = useState<boolean>(true);
  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, timeseries.length - 1));
  const active = timeseries[safeIdx];
  const hasTerrain = horizonProfile.length > 0;

  const terrainMaskPath = useMemo(() => {
    if (!hasTerrain) return "";
    const outer = `M ${CX - MAX_R} ${CY} A ${MAX_R} ${MAX_R} 0 1 0 ${CX + MAX_R} ${CY} A ${MAX_R} ${MAX_R} 0 1 0 ${CX - MAX_R} ${CY} Z`;
    const innerPts: string[] = [];
    for (let i = 0; i <= 72; i += 1) {
      const az = (i / 72) * 360;
      const { terrainElevDeg } = interpolateHorizonElevDeg(horizonProfile, az === 360 ? 0 : az);
      const pt = azElevToSkyDomeSVG(az, terrainElevDeg, CX, CY, MAX_R, rimMagnified);
      innerPts.push(`${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    }
    return `${outer} ${innerPts.join(" ")} Z`;
  }, [hasTerrain, horizonProfile, rimMagnified]);

  const librationBoxPath = useMemo(() => {
    if (timeseries.length === 0) return "";
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
    if (maxAz - minAz > 180) return "";
    const corners = [
      azElevToSkyDomeSVG(minAz - 1, minEl - 0.5, CX, CY, MAX_R, rimMagnified),
      azElevToSkyDomeSVG(maxAz + 1, minEl - 0.5, CX, CY, MAX_R, rimMagnified),
      azElevToSkyDomeSVG(maxAz + 1, maxEl + 0.5, CX, CY, MAX_R, rimMagnified),
      azElevToSkyDomeSVG(minAz - 1, maxEl + 0.5, CX, CY, MAX_R, rimMagnified),
    ];
    return `${corners.map((c, idx) => `${idx === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")} Z`;
  }, [timeseries, rimMagnified]);

  const sunPoints = useMemo(
    () => timeseries.map((pt) => azElevToSkyDomeSVG(pt.sun_az_deg, pt.sun_elev_deg, CX, CY, MAX_R, rimMagnified)),
    [timeseries, rimMagnified],
  );
  const earthPoints = useMemo(
    () => timeseries.map((pt) => azElevToSkyDomeSVG(pt.earth_az_deg, pt.earth_elev_deg, CX, CY, MAX_R, rimMagnified)),
    [timeseries, rimMagnified],
  );
  const sunPoly = useMemo(() => sunPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), [sunPoints]);
  const earthPoly = useMemo(() => earthPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), [earthPoints]);

  const ringElevations = rimMagnified ? [0, 5, 10, 15, 20] : [0, 30, 60];
  const cardinals = [
    { label: "N 0°", az: 0, dx: 0, dy: -12 },
    { label: "E 90°", az: 90, dx: 18, dy: 4 },
    { label: "S 180°", az: 180, dx: 0, dy: 16 },
    { label: "W 270°", az: 270, dx: -18, dy: 4 },
  ];

  const activeSun = sunPoints[safeIdx];
  const activeEarth = earthPoints[safeIdx];

  return (
    <section className="panel-card" style={{ padding: "0.75rem 0.9rem", gap: "0.45rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <strong style={{ fontSize: "0.86rem" }}>Polar Sky-Dome Radar</strong>
        <button type="button" onClick={() => setRimMagnified((prev) => !prev)} className={`category-pill ${rimMagnified ? "active" : ""}`}>
          {rimMagnified ? "Rim Zoom (-5°..+25°)" : "Full Dome (-5°..90°)"}
        </button>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          width: "100%",
          maxWidth: "240px",
          height: "auto",
          margin: "0 auto",
          display: "block",
          background: "#070c17",
          borderRadius: "0.5rem",
        }}
      >
        <circle cx={CX} cy={CY} r={MAX_R} fill="#0b1222" stroke="#334155" />
        {terrainMaskPath && (
          <path d={terrainMaskPath} fill="rgba(71, 85, 105, 0.55)" fillRule="evenodd" stroke="#94a3b8" strokeWidth="1.2" />
        )}

        {ringElevations.map((elev) => {
          const r = radiusForElev(elev, rimMagnified);
          return (
            <g key={elev}>
              <circle
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke={elev === 0 ? "#64748b" : "#1e293b"}
                strokeDasharray={elev === 0 ? "4 3" : undefined}
              />
              <text x={CX + 3} y={CY - r + 10} fontSize="8.5" fill="#94a3b8">
                {elev}°
              </text>
            </g>
          );
        })}

        {cardinals.map((c) => {
          const end = azElevToSkyDomeSVG(c.az, -5, CX, CY, MAX_R, rimMagnified);
          return (
            <g key={c.label}>
              <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#1e293b" />
              <text x={end.x + c.dx} y={end.y + c.dy} textAnchor="middle" fontSize="9.5" fill="#cbd5e1">
                {c.label}
              </text>
            </g>
          );
        })}

        {librationBoxPath && (
          <path d={librationBoxPath} fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="1" />
        )}
        {sunPoly && <polyline fill="none" stroke="#f59e0b" strokeOpacity="0.65" strokeWidth="1.5" points={sunPoly} />}
        {earthPoly && <polyline fill="none" stroke="#38bdf8" strokeOpacity="0.75" strokeWidth="1.6" points={earthPoly} />}

        {timeseries.map((pt, idx) => (
          <g key={pt.timestamp_utc}>
            <circle
              cx={sunPoints[idx].x}
              cy={sunPoints[idx].y}
              r={3}
              fill="#f59e0b"
              fillOpacity={idx === safeIdx ? 1 : 0.4}
              style={{ cursor: "pointer" }}
              onClick={() => selectIndex(idx)}
            />
            <circle
              cx={earthPoints[idx].x}
              cy={earthPoints[idx].y}
              r={2.8}
              fill="#38bdf8"
              fillOpacity={idx === safeIdx ? 1 : 0.45}
              style={{ cursor: "pointer" }}
              onClick={() => selectIndex(idx)}
            />
          </g>
        ))}

        {activeSun && (
          <g pointerEvents="none">
            <circle cx={activeSun.x} cy={activeSun.y} r={9} fill="#f59e0b" fillOpacity="0.25" />
            <circle cx={activeSun.x} cy={activeSun.y} r={4.5} fill="#fbbf24" stroke="#fef3c7" strokeWidth="1" />
          </g>
        )}
        {activeEarth && (
          <g pointerEvents="none">
            <circle cx={activeEarth.x} cy={activeEarth.y} r={8.5} fill="#38bdf8" fillOpacity="0.25" />
            <circle cx={activeEarth.x} cy={activeEarth.y} r={4.2} fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1" />
          </g>
        )}
        <text x={CX} y={CY + 3} textAnchor="middle" fontSize="8" fill="#64748b">
          {rimMagnified ? "+25°" : "90° Z"}
        </text>
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.74rem",
          color: "var(--text-muted)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>Sun: {active ? `${active.sun_az_deg.toFixed(0)}° / ${active.sun_elev_deg.toFixed(2)}°` : "—"}</span>
        <span>Earth: {active ? `${active.earth_az_deg.toFixed(1)}° / ${active.earth_elev_deg.toFixed(2)}°` : "—"}</span>
      </div>
    </section>
  );
}
