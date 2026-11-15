/** Toolbar and footer overlays for interactive 3D Lunar Terrain viewer (F4.1 & F4.2). */

import type { CSSProperties } from "react";
import { HelpPopover } from "../../components/ui";
import type { TimeseriesPoint } from "../../types";
import { SURFACE_MODE_LABELS, type TerrainSurfaceMode } from "./terrainColors";

const EXAGGERATIONS: readonly number[] = [1, 2, 3];
const SURFACE_MODES: readonly TerrainSurfaceMode[] = ["regolith", "elevation", "slope", "psr"];

function pillStyle(active: boolean, accent: string): CSSProperties {
  return {
    padding: "0.24rem 0.55rem",
    fontSize: "0.75rem",
    borderRadius: "0.35rem",
    cursor: "pointer",
    border: `1px solid ${active ? accent : "var(--border-subtle)"}`,
    background: active ? "var(--surface-primary-soft)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-muted)",
    fontWeight: active ? 600 : 500,
  };
}

export interface TerrainHeaderBarProps {
  gridSize: number;
  surfaceMode: TerrainSurfaceMode;
  exaggeration: number;
  onChangeSurfaceMode: (mode: TerrainSurfaceMode) => void;
  onChangeExaggeration: (exaggeration: number) => void;
  onResetCamera: () => void;
}

export function TerrainHeaderBar({
  gridSize,
  surfaceMode,
  exaggeration,
  onChangeSurfaceMode,
  onChangeExaggeration,
  onResetCamera,
}: TerrainHeaderBarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.65rem 0.9rem",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ fontSize: "0.85rem" }}>
          3D ENU Terrain ({gridSize}×{gridSize})
        </strong>
        <HelpPopover helpKey="terrain3dSection" align="left" />
        {SURFACE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChangeSurfaceMode(mode)}
            style={pillStyle(surfaceMode === mode, "var(--accent-sun)")}
          >
            {SURFACE_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
        {EXAGGERATIONS.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onChangeExaggeration(ex)}
            style={pillStyle(exaggeration === ex, "var(--accent-dte)")}
          >
            {ex}x Z
          </button>
        ))}
        <div className="control-with-help">
          <button type="button" onClick={onResetCamera} style={pillStyle(false, "var(--text-muted)")}>
            Reset View
          </button>
          <HelpPopover helpKey="resetCameraBtn" />
        </div>
      </div>
    </div>
  );
}

export interface TerrainFooterBarProps {
  activePoint?: TimeseriesPoint;
}

export function TerrainFooterBar({ activePoint }: TerrainFooterBarProps) {
  const sunStatus = !activePoint
    ? "NO DATA"
    : !activePoint.is_sunlit
      ? "SHADOW"
      : activePoint.sun_visible_fraction < 0.95
        ? "GRAZING"
        : "SUNLIT";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: "0.5rem",
        padding: "0.55rem 0.9rem",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      <span>
        Sun: <strong style={{ color: activePoint?.is_sunlit ? "var(--accent-sun)" : "var(--text-muted)" }}>{sunStatus}</strong>{" "}
        {activePoint ? `(Az ${activePoint.sun_az_deg.toFixed(0)}°, El ${activePoint.sun_elev_deg.toFixed(1)}°)` : ""}
      </span>
      <span>
        Earth DTE:{" "}
        <strong style={{ color: activePoint?.is_dte_visible ? "var(--accent-dte)" : "var(--accent-danger)" }}>
          {activePoint?.is_dte_visible ? "ACTIVE" : "BLOCKED"}
        </strong>{" "}
        {activePoint ? `(Az ${activePoint.earth_az_deg.toFixed(0)}°, El ${activePoint.earth_elev_deg.toFixed(1)}°)` : ""}
      </span>
      <span>
        Frame: <code>+X East · +Y Up · -Z North</code>
      </span>
    </div>
  );
}
