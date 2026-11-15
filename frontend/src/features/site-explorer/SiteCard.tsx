/** Streamlined curated landing site card reducing numeric density while preserving metadata (F3.3). */

import type { KeyboardEvent, MouseEvent } from "react";
import { Check, Plus } from "lucide-react";
import type { SiteCategory, SiteSummary } from "../../types";

export const SITE_CATEGORY_META: Record<SiteCategory, { label: string; color: string }> = {
  artemis_iii: { label: "Artemis III South Pole", color: "var(--accent-sun)" },
  clps_commercial: { label: "CLPS / Commercial", color: "var(--accent-dte)" },
  apollo_historic: { label: "Apollo Historic", color: "var(--accent-ok)" },
  international: { label: "International", color: "var(--accent-primary)" },
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
      className={`site-card ${isSelected ? "active" : ""}`}
      aria-pressed={isSelected}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.71rem", fontWeight: 700, color: categoryMeta.color }}>{categoryMeta.label}</span>
        <span className="category-pill">{site.agency}</span>
      </div>

      <div style={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.25 }}>{site.name}</div>
      <p style={{ margin: 0, fontSize: "0.77rem", color: "var(--text-muted)", lineHeight: 1.38 }}>{site.summary}</p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem", marginTop: "0.1rem" }}>
        <span style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
          {site.lat_deg.toFixed(1)}°, {site.lon_deg.toFixed(1)}°
        </span>

        <button
          type="button"
          onClick={handlePinClick}
          className="btn-surface"
          style={{
            padding: "0.2rem 0.55rem",
            fontSize: "0.73rem",
            borderColor: isPinned ? "var(--accent-ok)" : "var(--border-subtle)",
            color: isPinned ? "var(--accent-ok)" : "var(--text-primary)",
          }}
          title={isPinned ? "Remove from Compare" : "Pin to Compare"}
        >
          {isPinned ? <Check size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
          <span>{isPinned ? "Pinned" : "Pin"}</span>
        </button>
      </div>
    </div>
  );
}
