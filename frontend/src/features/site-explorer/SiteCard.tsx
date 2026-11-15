/** Curated lunar landing site card with telemetry metadata and Compare pin toggle (F3.3). */

import type { KeyboardEvent, MouseEvent } from "react";
import { Check, Mountain, Plus } from "lucide-react";
import type { SiteCategory, SiteSummary } from "../../types";

export const SITE_CATEGORY_META: Record<SiteCategory, { label: string; color: string }> = {
  artemis_iii: { label: "Artemis III South Pole", color: "var(--accent-sun)" },
  clps_commercial: { label: "CLPS / Commercial", color: "var(--accent-dte)" },
  apollo_historic: { label: "Apollo Historic", color: "var(--accent-ok)" },
  international: { label: "International", color: "#a78bfa" },
};

export interface SiteCardProps {
  site: SiteSummary;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: (siteId: string) => void;
  onPinToggle: (site: SiteSummary) => void;
}

export function SiteCard({ site, isSelected, isPinned, onSelect, onPinToggle }: SiteCardProps) {
  const categoryMeta = SITE_CATEGORY_META[site.category];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(site.id);
    }
  };

  const handlePinClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onPinToggle(site);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(site.id)}
      onKeyDown={handleKeyDown}
      className={`site-card ${isSelected ? "selected" : ""}`}
      aria-pressed={isSelected}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: categoryMeta.color }}>{categoryMeta.label}</span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 600,
              padding: "0.1rem 0.38rem",
              borderRadius: "999px",
              border: `1px solid ${site.has_precomputed_terrain ? "var(--accent-ok)" : "var(--accent-sun)"}`,
              color: site.has_precomputed_terrain ? "var(--accent-ok)" : "var(--accent-sun)",
            }}
          >
            {site.has_precomputed_terrain ? "Class A • LOLA" : "Class B • Limb Only"}
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              padding: "0.1rem 0.4rem",
              borderRadius: "999px",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            {site.agency}
          </span>
        </div>
      </div>

      <div style={{ fontWeight: 600, fontSize: "0.88rem", lineHeight: 1.25 }}>{site.name}</div>
      <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.35 }}>{site.summary}</p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.4rem",
          marginTop: "0.15rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "0.55rem", fontSize: "0.72rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
          <span>
            {site.lat_deg.toFixed(2)}°, {site.lon_deg.toFixed(2)}°
          </span>
          {site.has_precomputed_terrain && site.elevation_m !== null && site.mean_slope_deg !== null ? (
            <>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                <Mountain size={11} />
                {site.elevation_m >= 0 ? "+" : ""}
                {site.elevation_m.toFixed(0)}m
              </span>
              <span>Slope {site.mean_slope_deg.toFixed(1)}°</span>
            </>
          ) : (
            <span style={{ color: "var(--accent-sun)" }}>Terrain model unavailable — spherical limb only</span>
          )}
        </div>

        <button
          type="button"
          onClick={handlePinClick}
          className="btn-surface"
          style={{
            padding: "0.2rem 0.5rem",
            fontSize: "0.72rem",
            borderColor: isPinned ? "var(--accent-ok)" : "var(--border-subtle)",
            color: isPinned ? "var(--accent-ok)" : "var(--text-primary)",
          }}
          title={isPinned ? "Remove from Compare" : "Pin to Compare"}
        >
          {isPinned ? <Check size={12} /> : <Plus size={12} />}
          <span>{isPinned ? "Pinned" : "Pin"}</span>
        </button>
      </div>
    </div>
  );
}
