/** Map projection view mode, topographic overlay toggles, and NASA Quickmap/Moon Trek links (F3.4). */

import { ExternalLink, Globe2, Layers, Mountain, Snowflake, TriangleAlert } from "lucide-react";
import type { MapOverlayLayer, MapViewMode } from "./mapProjection";

export interface LayerToggleBarProps {
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  activeLayer: MapOverlayLayer;
  onLayerChange: (layer: MapOverlayLayer) => void;
  quickmapUrl: string;
  moonTrekUrl: string;
}

const OVERLAY_OPTIONS: { id: MapOverlayLayer; label: string; icon: typeof Mountain }[] = [
  { id: "elevation", label: "Elevation", icon: Mountain },
  { id: "slope", label: "Slope Hazard", icon: TriangleAlert },
  { id: "psr", label: "PSR Ice", icon: Snowflake },
];

export function LayerToggleBar({
  viewMode,
  onViewModeChange,
  activeLayer,
  onLayerChange,
  quickmapUrl,
  moonTrekUrl,
}: LayerToggleBarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.45rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => onViewModeChange("south_pole")}
          className={`category-pill ${viewMode === "south_pole" ? "active" : ""}`}
        >
          South Pole (80°–90°S)
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("global")}
          className={`category-pill ${viewMode === "global" ? "active" : ""}`}
        >
          <Globe2 size={11} style={{ verticalAlign: "-1px", marginRight: "0.25rem" }} />
          Global Moon
        </button>

        <span style={{ color: "var(--border-subtle)", margin: "0 0.1rem" }}>|</span>
        <Layers size={12} color="var(--text-muted)" />

        {OVERLAY_OPTIONS.map((layer) => {
          const Icon = layer.icon;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onLayerChange(layer.id)}
              className={`category-pill ${activeLayer === layer.id ? "active" : ""}`}
            >
              <Icon size={11} style={{ verticalAlign: "-1px", marginRight: "0.22rem" }} />
              {layer.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <a
          href={quickmapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-surface"
          style={{ textDecoration: "none", padding: "0.25rem 0.55rem", fontSize: "0.74rem" }}
        >
          <span>Inspect in NASA Quickmap</span>
          <ExternalLink size={11} />
        </a>
        <a
          href={moonTrekUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-surface"
          style={{ textDecoration: "none", padding: "0.25rem 0.55rem", fontSize: "0.74rem" }}
        >
          <span>Open in Moon Trek</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
