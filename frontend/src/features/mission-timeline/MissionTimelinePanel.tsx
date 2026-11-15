/** Synchronized Multi-Day Power, DTE Comms Gantt & Elevation Timeline (F4.5). */

import { useMemo, useRef, useState } from "react";
import { usePlaybackStore } from "../../state";
import type { TimeseriesPoint } from "../../types";
import { buildCommsSegments, buildPowerSegments, type CommsSegmentState, type PowerSegmentState } from "./timelineSegments";

export interface MissionTimelinePanelProps {
  timeseries: TimeseriesPoint[];
  currentIndex?: number;
  onSelectIndex?: (index: number) => void;
}

const SVG_W = 800;
const SVG_H = 120;
const MIN_ELEV = -2;
const MAX_ELEV = 12;

const POWER_COLORS: Record<PowerSegmentState, { bg: string; fg: string }> = {
  sunlit: { bg: "#eab308", fg: "#090d16" },
  grazing: { bg: "#d97706", fg: "#fffbeb" },
  dark: { bg: "#1e293b", fg: "#cbd5e1" },
};

const COMMS_COLORS: Record<CommsSegmentState, { bg: string; fg: string }> = {
  dte_active: { bg: "#0ea5e9", fg: "#06121e" },
  dte_blocked: { bg: "#be123c", fg: "#ffe4e6" },
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(5, 16);
  return `${d.toISOString().slice(5, 10)} ${d.toISOString().slice(11, 16)}Z`;
}

function toElevY(elev: number): number {
  const clamped = Math.max(MIN_ELEV, Math.min(MAX_ELEV, elev));
  return SVG_H - ((clamped - MIN_ELEV) / (MAX_ELEV - MIN_ELEV)) * SVG_H;
}

export function MissionTimelinePanel({ timeseries, currentIndex, onSelectIndex }: MissionTimelinePanelProps) {
  const storeIndex = usePlaybackStore((s) => s.currentIndex);
  const jumpToIndex = usePlaybackStore((s) => s.jumpToIndex);
  const activeIdx = currentIndex ?? storeIndex;
  const selectIndex = onSelectIndex ?? jumpToIndex;

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const n = timeseries.length;
  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, n - 1));
  const active = timeseries[safeIdx];

  const powerSegments = useMemo(() => buildPowerSegments(timeseries), [timeseries]);
  const commsSegments = useMemo(() => buildCommsSegments(timeseries), [timeseries]);

  const { sunLine, earthLine, powerLine } = useMemo(() => {
    const toX = (i: number) => ((i + 0.5) / Math.max(1, n)) * SVG_W;
    const toPowerY = (factor: number) => SVG_H - Math.max(0, Math.min(1, factor)) * (SVG_H - 8) - 4;
    return {
      sunLine: timeseries.map((pt, i) => `${toX(i).toFixed(1)},${toElevY(pt.sun_elev_deg).toFixed(1)}`).join(" "),
      earthLine: timeseries.map((pt, i) => `${toX(i).toFixed(1)},${toElevY(pt.earth_elev_deg).toFixed(1)}`).join(" "),
      powerLine: timeseries.map((pt, i) => `${toX(i).toFixed(1)},${toPowerY(pt.solar_power_factor).toFixed(1)}`).join(" "),
    };
  }, [timeseries, n]);

  const scrubFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || n === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(0.99999, (clientX - rect.left) / Math.max(1, rect.width)));
    selectIndex(Math.floor(ratio * n));
  };

  const playheadPct = n > 0 ? ((safeIdx + 0.5) / n) * 100 : 0;

  return (
    <section className="panel-card" style={{ padding: "0.85rem 1rem", gap: "0.55rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <strong style={{ fontSize: "0.88rem" }}>Synchronized Power &amp; DTE Comms Timeline</strong>
        <div
          style={{
            display: "flex",
            gap: "0.9rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            flexWrap: "wrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>
            <span style={{ color: "#f59e0b" }}>●</span> Sun El: {active ? `${active.sun_elev_deg.toFixed(2)}°` : "—"}
          </span>
          <span>
            <span style={{ color: "#38bdf8" }}>●</span> Earth El: {active ? `${active.earth_elev_deg.toFixed(2)}°` : "—"}
          </span>
          <span>
            <span style={{ color: "#10b981" }}>●</span> Power: {active ? `${Math.round(active.solar_power_factor * 100)}%` : "—"}
          </span>
          <code>{active ? formatShortDate(active.timestamp_utc) : "—"}</code>
        </div>
      </div>

      <div
        ref={trackRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          scrubFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging) scrubFromClientX(e.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        style={{ position: "relative", userSelect: "none", touchAction: "none", cursor: "ew-resize", display: "grid", gap: "0.45rem" }}
      >
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
            1. Solar Power (Sunlit / Grazing / Dark Streak)
          </div>
          <div style={{ position: "relative", height: "24px", background: "#090f1d", borderRadius: "0.35rem", overflow: "hidden" }}>
            {powerSegments.map((seg) => {
              const leftPct = (seg.startIndex / Math.max(1, n)) * 100;
              const widthPct = ((seg.endIndex - seg.startIndex + 1) / Math.max(1, n)) * 100;
              const palette = POWER_COLORS[seg.state];
              return (
                <div
                  key={`${seg.state}-${seg.startIndex}`}
                  title={seg.label}
                  style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: 0,
                    bottom: 0,
                    background: palette.bg,
                    color: palette.fg,
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    borderRight: "1px solid #070b14",
                  }}
                >
                  {widthPct > 9 ? seg.label : ""}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
            2. Direct-to-Earth (DTE) Comms Window
          </div>
          <div style={{ position: "relative", height: "22px", background: "#090f1d", borderRadius: "0.35rem", overflow: "hidden" }}>
            {commsSegments.map((seg) => {
              const leftPct = (seg.startIndex / Math.max(1, n)) * 100;
              const widthPct = ((seg.endIndex - seg.startIndex + 1) / Math.max(1, n)) * 100;
              const palette = COMMS_COLORS[seg.state];
              return (
                <div
                  key={`${seg.state}-${seg.startIndex}`}
                  title={seg.label}
                  style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: 0,
                    bottom: 0,
                    background: palette.bg,
                    color: palette.fg,
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    borderRight: "1px solid #070b14",
                  }}
                >
                  {widthPct > 9 ? seg.label : ""}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
            3. Sun/Earth Elevation (-2°..12°) &amp; Power Factor (0–100%)
          </div>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="none"
            style={{
              width: "100%",
              height: "110px",
              display: "block",
              background: "#070c17",
              borderRadius: "0.35rem",
              border: "1px solid #1e293b",
            }}
          >
            <line x1={0} y1={toElevY(0)} x2={SVG_W} y2={toElevY(0)} stroke="#334155" strokeDasharray="4 3" />
            <line x1={0} y1={toElevY(5)} x2={SVG_W} y2={toElevY(5)} stroke="#1e293b" strokeDasharray="3 3" />
            {powerLine && <polyline fill="none" stroke="#10b981" strokeWidth="1.8" strokeOpacity="0.85" points={powerLine} />}
            {sunLine && <polyline fill="none" stroke="#f59e0b" strokeWidth="2.1" points={sunLine} />}
            {earthLine && <polyline fill="none" stroke="#38bdf8" strokeWidth="2.1" points={earthLine} />}
          </svg>
        </div>

        {n > 0 && (
          <div
            style={{
              position: "absolute",
              left: `${playheadPct}%`,
              top: "14px",
              bottom: 0,
              width: "2px",
              background: "#f8fafc",
              boxShadow: "0 0 8px rgba(248,250,252,0.8)",
              pointerEvents: "none",
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#f8fafc", transform: "translate(-4px, -4px)" }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
        <span>{timeseries[0] ? formatShortDate(timeseries[0].timestamp_utc) : "Start"}</span>
        <span>Drag or click anywhere on timeline to scrub</span>
        <span>{n > 0 ? formatShortDate(timeseries[n - 1].timestamp_utc) : "End"}</span>
      </div>
    </section>
  );
}
