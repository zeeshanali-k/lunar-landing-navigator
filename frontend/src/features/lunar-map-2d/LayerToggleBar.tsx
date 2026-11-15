/** Map view mode and NASA Quickmap/Moon Trek links (P1-MAP).
 *
 * No overlay toggles: elevation, slope, and PSR overlays would all need terrain
 * data the frontend does not compute (REQ-06, REQ-08). The map shows curated
 * sites and the current Sun/Earth azimuths only.
 */

import { ExternalLink, Globe2 } from "lucide-react";
import type { MapViewMode } from "./mapProjection";

export interface LayerToggleBarProps {
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  quickmapUrl?: string;
  moonTrekUrl?: string;
}

export function LayerToggleBar({ viewMode, onViewModeChange, quickmapUrl, moonTrekUrl }: LayerToggleBarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.45rem",
      }}
    >
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
      </div>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {quickmapUrl && (
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
        )}
        {moonTrekUrl && (
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
        )}
      </div>
    </div>
  );
}
