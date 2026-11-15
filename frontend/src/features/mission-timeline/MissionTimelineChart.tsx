/** 3-Track SVG Mission Timeline (Solar, DTE Comms, Elevation) with draggable playhead (FE-002). */

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { Activity } from "lucide-react";
import { useMissionStore, usePlaybackStore } from "../../state";
import {
  buildElevationPolyline,
  buildTrackSegments,
  classifyDteState,
  classifySolarState,
  computeElevationBounds,
  elevToSvgY,
  TIMELINE_PAD_LEFT,
  TIMELINE_PAD_RIGHT,
  xCoordToSampleIndex,
  type DteTrackState,
  type SolarTrackState,
} from "./timelineSegments";

const SVG_W = 540;
const SVG_H = 220;
const PLOT_W = SVG_W - TIMELINE_PAD_LEFT - TIMELINE_PAD_RIGHT;
const SOLAR_Y = 18;
const DTE_Y = 44;
const BAND_H = 16;
const ELEV_Y = 74;
const ELEV_H = 114;

const SOLAR_COLORS: Record<SolarTrackState, string> = {
  sunlit: "#f59e0b",
  grazing: "#fbbf24",
  dark: "#1e293b",
};

const DTE_COLORS: Record<DteTrackState, string> = {
  available: "#38bdf8",
  blocked: "#ef4444",
};

export function MissionTimelineChart() {
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const currentIndex = usePlaybackStore((s) => s.currentIndex);
  const jumpToIndex = usePlaybackStore((s) => s.jumpToIndex);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const timeseries = evaluationData?.timeseries ?? [];

  const memoized = useMemo(() => {
    const solarSegs = buildTrackSegments(timeseries, classifySolarState);
    const dteSegs = buildTrackSegments(timeseries, classifyDteState);
    const bounds = computeElevationBounds(timeseries);
    const sunPath = buildElevationPolyline(timeseries, (p) => p.sun_elev_deg, TIMELINE_PAD_LEFT, PLOT_W, ELEV_Y, ELEV_H, bounds.minElev, bounds.maxElev);
    const earthPath = buildElevationPolyline(timeseries, (p) => p.earth_elev_deg, TIMELINE_PAD_LEFT, PLOT_W, ELEV_Y, ELEV_H, bounds.minElev, bounds.maxElev);
    const zeroY = elevToSvgY(0, ELEV_Y, ELEV_H, bounds.minElev, bounds.maxElev);
    return { solarSegs, dteSegs, bounds, sunPath, earthPath, zeroY };
  }, [timeseries]);

  const scrubFromClientX = (clientX: number): void => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || timeseries.length === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
    jumpToIndex(xCoordToSampleIndex(svgX, TIMELINE_PAD_LEFT, PLOT_W, timeseries.length));
  };

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>): void => {
    setPlaying(false);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubFromClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>): void => {
    if (dragging) scrubFromClientX(e.clientX);
  };

  const count = timeseries.length;
  const playheadRatio = count > 1 ? currentIndex / (count - 1) : 0;
  const playheadX = TIMELINE_PAD_LEFT + playheadRatio * PLOT_W;
  const activePoint = timeseries[currentIndex] ?? null;

  return (
    <section className="panel-card" aria-label="Power and DTE Mission Timeline">
      <h2 className="panel-title">
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <Activity size={13} color="var(--accent-sun)" /> 3-Track Mission Timeline (SVG)
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--text-muted)", textTransform: "none", fontVariantNumeric: "tabular-nums" }}>
          {activePoint ? activePoint.timestamp_utc.replace("T", " ").replace("Z", " UTC") : "Awaiting samples"}
        </span>
      </h2>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        style={{ width: "100%", height: "auto", aspectRatio: `${SVG_W} / ${SVG_H}`, display: "block", background: "#070c18", borderRadius: "0.55rem", border: "1px solid var(--border-subtle)", cursor: "ew-resize", touchAction: "none" }}
      >
        <text x={TIMELINE_PAD_LEFT - 6} y={SOLAR_Y + 11} textAnchor="end" fontSize="8" fill="#93a4c3">Solar</text>
        <g data-testid="timeline-track-solar">
          <rect x={TIMELINE_PAD_LEFT} y={SOLAR_Y} width={PLOT_W} height={BAND_H} fill="#0f172a" rx={2} />
          {memoized.solarSegs.map((seg) => (
            <rect
              key={`s-${seg.startIndex}`}
              x={TIMELINE_PAD_LEFT + seg.startRatio * PLOT_W}
              y={SOLAR_Y}
              width={Math.max(1, seg.widthRatio * PLOT_W)}
              height={BAND_H}
              fill={SOLAR_COLORS[seg.state]}
              opacity={seg.state === "grazing" ? 0.65 : 0.92}
            />
          ))}
        </g>

        <text x={TIMELINE_PAD_LEFT - 6} y={DTE_Y + 11} textAnchor="end" fontSize="8" fill="#93a4c3">DTE</text>
        <g data-testid="timeline-track-dte">
          <rect x={TIMELINE_PAD_LEFT} y={DTE_Y} width={PLOT_W} height={BAND_H} fill="#0f172a" rx={2} />
          {memoized.dteSegs.map((seg) => (
            <rect
              key={`d-${seg.startIndex}`}
              x={TIMELINE_PAD_LEFT + seg.startRatio * PLOT_W}
              y={DTE_Y}
              width={Math.max(1, seg.widthRatio * PLOT_W)}
              height={BAND_H}
              fill={DTE_COLORS[seg.state]}
              opacity={seg.state === "available" ? 0.88 : 0.72}
            />
          ))}
        </g>

        <text x={TIMELINE_PAD_LEFT - 6} y={ELEV_Y + 12} textAnchor="end" fontSize="8" fill="#93a4c3">Elev °</text>
        <g data-testid="timeline-track-elevation">
          <rect x={TIMELINE_PAD_LEFT} y={ELEV_Y} width={PLOT_W} height={ELEV_H} fill="rgba(16, 23, 38, 0.55)" stroke="#1f2d47" strokeWidth={0.8} />
          <line x1={TIMELINE_PAD_LEFT} y1={memoized.zeroY} x2={TIMELINE_PAD_LEFT + PLOT_W} y2={memoized.zeroY} stroke="#334566" strokeDasharray="3 3" strokeWidth={0.9} />
          <text x={TIMELINE_PAD_LEFT - 6} y={ELEV_Y + ELEV_H - 2} textAnchor="end" fontSize="7.5" fill="#93a4c3">{memoized.bounds.minElev}°</text>
          <text x={TIMELINE_PAD_LEFT - 6} y={ELEV_Y + 8} textAnchor="end" fontSize="7.5" fill="#93a4c3">{memoized.bounds.maxElev}°</text>
          {memoized.sunPath && <path d={memoized.sunPath} fill="none" stroke="#f59e0b" strokeWidth={1.6} />}
          {memoized.earthPath && <path d={memoized.earthPath} fill="none" stroke="#38bdf8" strokeWidth={1.5} />}
        </g>

        <g data-testid="timeline-playhead" pointerEvents="none">
          <line x1={playheadX} y1={12} x2={playheadX} y2={ELEV_Y + ELEV_H + 4} stroke="#e8eef9" strokeWidth={1.5} />
          <circle cx={playheadX} cy={12} r={3.5} fill="#e8eef9" />
        </g>

        <text x={TIMELINE_PAD_LEFT} y={SVG_H - 10} textAnchor="start" fontSize="8" fill="#93a4c3">Start</text>
        <text x={TIMELINE_PAD_LEFT + PLOT_W / 2} y={SVG_H - 10} textAnchor="middle" fontSize="8" fill="#93a4c3">Drag playhead to scrub ({count} samples)</text>
        <text x={TIMELINE_PAD_LEFT + PLOT_W} y={SVG_H - 10} textAnchor="end" fontSize="8" fill="#93a4c3">End</text>
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.73rem", color: "var(--text-muted)" }}>
        <span style={{ color: "var(--accent-sun)" }}>■ Sunlit</span>
        <span style={{ color: "#fbbf24" }}>■ Grazing</span>
        <span>■ Dark</span>
        <span style={{ color: "var(--accent-dte)" }}>■ DTE Active</span>
        <span style={{ color: "var(--accent-danger)" }}>■ DTE Blocked</span>
        <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
          {activePoint ? `Sun ${activePoint.sun_elev_deg.toFixed(1)}° • Earth ${activePoint.earth_elev_deg.toFixed(1)}°` : ""}
        </span>
      </div>
    </section>
  );
}
