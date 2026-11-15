/** Slide-over Landing Site Explorer drawer with Curated Sites (F3.3). */

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { HelpPopover } from "../../components/ui";
import { useComparisonStore, useMissionStore, useUiStore } from "../../state";
import type { SiteCategory, SiteSummary } from "../../types";
import { SITE_CATEGORY_META, SiteCard } from "./SiteCard";

type CategoryFilter = "all" | SiteCategory;

const CATEGORY_ORDER: SiteCategory[] = ["artemis_iii", "clps_commercial", "apollo_historic", "international"];
const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All Sites" },
  { id: "artemis_iii", label: "Artemis III" },
  { id: "clps_commercial", label: "CLPS" },
  { id: "apollo_historic", label: "Apollo" },
  { id: "international", label: "International" },
];

export function SiteExplorerDrawer() {
  const { sites, selectedSiteId, startUtc, durationDays, solarArrayType, observerHeightM, selectSite } = useMissionStore();
  const { pinnedScenarios, pinScenario, unpinScenario } = useComparisonStore();
  const open = useUiStore((s) => s.sitePickerOpen);
  const setOpen = useUiStore((s) => s.setSitePickerOpen);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const pinnedIds = useMemo(() => new Set(pinnedScenarios.map((item) => item.scenario_id)), [pinnedScenarios]);

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sites.filter((site) => {
      if (categoryFilter !== "all" && site.category !== categoryFilter) return false;
      if (!q) return true;
      return site.name.toLowerCase().includes(q) || site.agency.toLowerCase().includes(q) || site.summary.toLowerCase().includes(q);
    });
  }, [sites, categoryFilter, searchQuery]);

  if (!open) {
    return null;
  }

  const getSiteScenarioId = (siteId: string): string => `${siteId}-${solarArrayType}-${observerHeightM}m`;

  const handlePinSiteToggle = (site: SiteSummary): void => {
    const scenarioId = getSiteScenarioId(site.id);
    if (pinnedIds.has(scenarioId)) {
      void unpinScenario(scenarioId);
      return;
    }
    void pinScenario({
      scenario_id: scenarioId,
      label: `${site.name} (${observerHeightM}m)`,
      request: {
        site_id: site.id,
        start_utc: startUtc,
        duration_days: durationDays,
        solar_array_type: solarArrayType,
        observer_height_m: observerHeightM,
      },
    });
  };

  const categoriesToRender = categoryFilter === "all" ? CATEGORY_ORDER : [categoryFilter];

  return (
    <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Landing site selector" onClick={() => setOpen(false)}>
      <aside className="drawer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="panel-row">
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <MapPin size={16} color="var(--accent-sun)" aria-hidden="true" />
            <h2 className="panel-title">Choose Landing Site</h2>
            <HelpPopover helpKey="sitePickerSection" align="left" />
          </div>
          <button type="button" onClick={() => setOpen(false)} className="btn-surface" aria-label="Close site selector">
            <X size={14} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "0.65rem", top: "0.6rem", color: "var(--text-muted)" }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="coord-input"
            style={{ paddingLeft: "1.95rem" }}
            placeholder="Search site, agency, region..."
            aria-label="Search landing sites"
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`category-pill ${categoryFilter === cat.id ? "active" : ""}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="site-list-scroll">
          {filteredSites.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>No matching sites found. Try clearing filters.</p>
          ) : (
            categoriesToRender.map((cat) => {
              const group = filteredSites.filter((s) => s.category === cat);
              if (group.length === 0) return null;
              return (
                <div key={cat} style={{ display: "grid", gap: "0.45rem" }}>
                  {categoryFilter === "all" && (
                    <div
                      style={{
                        fontSize: "0.71rem",
                        fontWeight: 700,
                        color: SITE_CATEGORY_META[cat].color,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginTop: "0.25rem",
                      }}
                    >
                      {SITE_CATEGORY_META[cat].label}
                    </div>
                  )}
                  {group.map((site) => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      isSelected={selectedSiteId === site.id}
                      isPinned={pinnedIds.has(getSiteScenarioId(site.id))}
                      onSelect={(id) => {
                        void selectSite(id);
                        setOpen(false);
                      }}
                      onPinToggle={handlePinSiteToggle}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
