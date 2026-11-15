/** 360° SVG Horizon Silhouette showing LOLA terrain, geometric limb, Sun/Earth & hover telemetry (FE-002). */

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Eye } from "lucide-react";
import { useMissionStore, usePlaybackStore } from "../../state";
import {
  azElevToSvgCoord,
  buildLimbLinePath,
  buildTerrainAreaPath,
  computeHorizonBounds,
  findNearestHorizonPoint,
  HORIZON_PAD_BOTTOM,
  HORIZON_PAD_TOP,
  HORIZON_PAD_X,
  xCoordToAzimuthDeg,
} from "./horizonMath";

const SVG_W = 540;
const SVG_H = 220;
const AZ_TICKS: { az: number; label: string }[] = [
  { az: 0, label: "0° N" },
  { az: 90, label: "90° E" },
  { az: 180, label: "180° S" },
  { az: 270, label: "270° W" },
  { az: 360, label: "360° N" },
];

type HoverTarget = { title: string; azimuthDeg: number; bodyElevDeg: number | null; horizonElevDeg: number; clearanceDeg: number | null };

function fmtSigned(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}°`;
}

export function HorizonProfileChart() {
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const selectedSite = useMissionStore((s) => s.selectedSite);
  const terrainUnavailable = useMissionStore((s) => s.terrainUnavailable);
  const currentIndex = usePlaybackStore((s) => s.currentIndex);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverTarget | null>(null);

  const profile = evaluationData?.horizon_profile ?? [];
  const timeseries = evaluationData?.timeseries ?? [];
  const currentPoint = timeseries[currentIndex] ?? null;
  const isClassB = Boolean(evaluationData && !evaluationData.site.has_precomputed_terrain) || Boolean(selectedSite && !selectedSite.has_precomputed_terrain);
  const hasTerrain = profile.length > 0 && !terrainUnavailable;

  const { bounds, terrain, limbPath, yTicks } = useMemo(() => {
    const sampleElevs = timeseries.flatMap((pt) => [pt.sun_elev_deg, pt.earth_elev_deg]);
    const b = computeHorizonBounds(profile, sampleElevs);
    const t = buildTerrainAreaPath(profile, SVG_W, SVG_H, b.minElev, b.maxElev);
    const fallbackLimb = timeseries[0]?.sun_horizon_elev_deg ?? 0;
    const l = buildLimbLinePath(profile, SVG_W, SVG_H, b.minElev, b.maxElev, fallbackLimb);
    const mid = Math.round((b.minElev + b.maxElev) / 2);
    const ticks = Array.from(new Set([b.minElev, 0, mid, b.maxElev])).sort((a, z) => a - z);
    return { bounds: b, terrain: t, limbPath: l, yTicks: ticks };
  }, [profile, timeseries]);

  const sunCoord = currentPoint
    ? azElevToSvgCoord(currentPoint.sun_az_deg, currentPoint.sun_elev_deg, SVG_W, SVG_H, bounds.minElev, bounds.maxElev)
    : null;
  const earthCoord = currentPoint
    ? azElevToSvgCoord(currentPoint.earth_az_deg, currentPoint.earth_elev_deg, SVG_W, SVG_H, bounds.minElev, bounds.maxElev)
    : null;

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>): void => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const svgX = ((event.clientX - rect.left) / rect.width) * SVG_W;
    const svgY = ((event.clientY - rect.top) / rect.height) * SVG_H;
    const near = (pt: { x: number; y: number } | null): boolean =>
      pt !== null && Math.hypot(svgX - pt.x, svgY - pt.y) <= 10;

    if (currentPoint && near(sunCoord)) {
      setHoverInfo({ title: "Sun", azimuthDeg: currentPoint.sun_az_deg, bodyElevDeg: currentPoint.sun_elev_deg, horizonElevDeg: currentPoint.sun_horizon_elev_deg, clearanceDeg: currentPoint.sun_elev_deg - currentPoint.sun_horizon_elev_deg });
      return;
    }
    if (currentPoint && near(earthCoord)) {
      setHoverInfo({ title: "Earth (DTE)", azimuthDeg: currentPoint.earth_az_deg, bodyElevDeg: currentPoint.earth_elev_deg, horizonElevDeg: currentPoint.earth_horizon_elev_deg, clearanceDeg: currentPoint.earth_clearance_deg });
      return;
    }
    const az = xCoordToAzimuthDeg(svgX, SVG_W);
    const nearest = findNearestHorizonPoint(profile, az);
    const horizonElev = nearest ? Math.max(nearest.terrain_elev_deg, nearest.geometric_limb_deg) : (currentPoint?.sun_horizon_elev_deg ?? 0);
    setHoverInfo({ title: "Horizon Sample", azimuthDeg: nearest?.azimuth_deg ?? az, bodyElevDeg: null, horizonElevDeg: horizonElev, clearanceDeg: null });
  };

  return (
    <section className="panel-card" aria-label="360° Horizon Silhouette">
      <h2 className="panel-title">
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <Eye size={13} color="var(--accent-dte)" /> 360° Horizon Silhouette (SVG)
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: hasTerrain ? "var(--text-muted)" : "var(--accent-warn)", textTransform: "none" }}>
          {hasTerrain ? `${profile.length} az samples` : "Terrain model unavailable — spherical limb only"}
        </span>
      </h2>

      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          style={{ width: "100%", height: "auto", aspectRatio: `${SVG_W} / ${SVG_H}`, display: "block", background: "#070c18", borderRadius: "0.55rem", border: "1px solid var(--border-subtle)" }}
        >
          {yTicks.map((tick) => {
            const pt = azElevToSvgCoord(0, tick, SVG_W, SVG_H, bounds.minElev, bounds.maxElev);
            return (
              <g key={tick}>
                <line x1={HORIZON_PAD_X} y1={pt.y} x2={SVG_W - 12} y2={pt.y} stroke={tick === 0 ? "#334566" : "#18233a"} strokeWidth={tick === 0 ? 1 : 0.7} />
                <text x={HORIZON_PAD_X - 5} y={pt.y + 3} textAnchor="end" fontSize="8" fill="#93a4c3">{tick}°</text>
              </g>
            );
          })}

          {AZ_TICKS.map((t) => {
            const pt = azElevToSvgCoord(t.az, bounds.minElev, SVG_W, SVG_H, bounds.minElev, bounds.maxElev);
            return (
              <g key={t.az}>
                <line x1={pt.x} y1={HORIZON_PAD_TOP} x2={pt.x} y2={SVG_H - HORIZON_PAD_BOTTOM} stroke="#18233a" strokeWidth={0.7} />
                <text x={pt.x} y={SVG_H - 8} textAnchor={t.az === 0 ? "start" : t.az === 360 ? "end" : "middle"} fontSize="8" fill="#93a4c3">{t.label}</text>
              </g>
            );
          })}

          {hasTerrain && (
            <g data-testid="horizon-terrain-group">
              <path data-testid="horizon-terrain-path" d={terrain.areaPath} fill="rgba(56, 189, 248, 0.14)" />
              <path d={terrain.strokePath} fill="none" stroke="#93a4c3" strokeWidth={1.6} />
            </g>
          )}

          <path data-testid="horizon-limb-path" d={limbPath} fill="none" stroke="#38bdf8" strokeWidth={1.3} strokeDasharray="5 3" />

          {hoverInfo && (
            <line
              x1={azElevToSvgCoord(hoverInfo.azimuthDeg, 0, SVG_W, SVG_H, bounds.minElev, bounds.maxElev).x}
              y1={HORIZON_PAD_TOP}
              x2={azElevToSvgCoord(hoverInfo.azimuthDeg, 0, SVG_W, SVG_H, bounds.minElev, bounds.maxElev).x}
              y2={SVG_H - HORIZON_PAD_BOTTOM}
              stroke="rgba(232, 238, 249, 0.35)"
              strokeDasharray="2 2"
            />
          )}

          {sunCoord && currentPoint && (
            <g data-testid="horizon-sun-marker" style={{ cursor: "pointer" }} onMouseEnter={() => setHoverInfo({ title: "Sun", azimuthDeg: currentPoint.sun_az_deg, bodyElevDeg: currentPoint.sun_elev_deg, horizonElevDeg: currentPoint.sun_horizon_elev_deg, clearanceDeg: currentPoint.sun_elev_deg - currentPoint.sun_horizon_elev_deg })}>
              <circle cx={sunCoord.x} cy={sunCoord.y} r={8} fill={currentPoint.is_sunlit ? "rgba(245, 158, 11, 0.22)" : "rgba(239, 68, 68, 0.18)"} />
              <circle cx={sunCoord.x} cy={sunCoord.y} r={4.5} fill={currentPoint.is_sunlit ? "#f59e0b" : "#93a4c3"} stroke="#070b14" strokeWidth={1.2} />
            </g>
          )}

          {earthCoord && currentPoint && (
            <g data-testid="horizon-earth-marker" style={{ cursor: "pointer" }} onMouseEnter={() => setHoverInfo({ title: "Earth (DTE)", azimuthDeg: currentPoint.earth_az_deg, bodyElevDeg: currentPoint.earth_elev_deg, horizonElevDeg: currentPoint.earth_horizon_elev_deg, clearanceDeg: currentPoint.earth_clearance_deg })}>
              <circle cx={earthCoord.x} cy={earthCoord.y} r={7.5} fill={currentPoint.is_dte_visible ? "rgba(56, 189, 248, 0.22)" : "rgba(239, 68, 68, 0.22)"} />
              <circle cx={earthCoord.x} cy={earthCoord.y} r={4} fill={currentPoint.is_dte_visible ? "#38bdf8" : "#ef4444"} stroke="#070b14" strokeWidth={1.2} />
            </g>
          )}
        </svg>

        {hoverInfo && (
          <div style={{ position: "absolute", left: "0.55rem", top: "0.55rem", pointerEvents: "none", padding: "0.3rem 0.55rem", borderRadius: "0.4rem", background: "rgba(7, 11, 20, 0.92)", border: "1px solid var(--border-subtle)", fontSize: "0.73rem", fontVariantNumeric: "tabular-nums" }}>
            <strong>{hoverInfo.title}</strong> • Az {hoverInfo.azimuthDeg.toFixed(1)}°
            {hoverInfo.bodyElevDeg !== null && ` • Body ${fmtSigned(hoverInfo.bodyElevDeg)}`}
            {` • Horizon ${fmtSigned(hoverInfo.horizonElevDeg)}`}
            {hoverInfo.clearanceDeg !== null && ` • Clearance ${fmtSigned(hoverInfo.clearanceDeg)}`}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.73rem", color: "var(--text-muted)" }}>
        <span style={{ display: "inline-flex", gap: "0.7rem", flexWrap: "wrap" }}>
          {hasTerrain && <span>▬ LOLA Terrain Horizon</span>}
          <span style={{ color: "var(--accent-dte)" }}>┈ Geometric Limb</span>
          <span style={{ color: "var(--accent-sun)" }}>● Sun {currentPoint ? fmtSigned(currentPoint.sun_elev_deg - currentPoint.sun_horizon_elev_deg) : "—"}</span>
          <span style={{ color: currentPoint?.is_dte_visible ? "var(--accent-dte)" : "var(--accent-danger)" }}>● Earth {currentPoint ? fmtSigned(currentPoint.earth_clearance_deg) : "—"}</span>
        </span>
        {isClassB && <span style={{ color: "var(--accent-warn)" }}>Class B spherical limb only</span>}
      </div>
    </section>
  );
}
