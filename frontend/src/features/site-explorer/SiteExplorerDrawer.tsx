/** Searchable, category-grouped Curated Landing Site Explorer sidebar (F3.3). */

import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useComparisonStore, useMissionStore } from "../../state";
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
  const {
    sites,
    selectedSiteId,
    startUtc,
    durationDays,
    stepMinutes,
    solarArrayType,
    fixedArrayAzimuthDeg,
    observerHeightM,
    minCommsElevDeg,
    selectSite,
  } = useMissionStore();
  const { pinnedScenarios, pinScenario, unpinScenario } = useComparisonStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const pinnedIds = useMemo(() => new Set(pinnedScenarios.map((item) => item.scenario_id)), [pinnedScenarios]);

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sites.filter((site) => {
      if (categoryFilter !== "all" && site.category !== categoryFilter) return false;
      if (!q) return true;
      return site.name.toLowerCase().includes(q) || site.agency.toLowerCase().includes(q) || site.summary.toLowerCase().includes(q);
    });
  }, [sites, categoryFilter, searchQuery]);

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
        step_minutes: stepMinutes,
        solar_array_type: solarArrayType,
        fixed_array_azimuth_deg: fixedArrayAzimuthDeg,
        observer_height_m: observerHeightM,
        min_comms_elev_deg: minCommsElevDeg,
      },
    });
  };

  const categoriesToRender = categoryFilter === "all" ? CATEGORY_ORDER : [categoryFilter];

  return (
    <aside className="panel-card site-explorer-drawer">
      <h2 className="panel-title">
        <span>
          <MapPin size={13} /> Landing Site Explorer
        </span>
        <span style={{ fontSize: "0.72rem", color: "var(--accent-dte)" }}>{sites.length} Curated</span>
      </h2>

      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: "0.6rem", top: "0.55rem", color: "var(--text-muted)" }} />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="coord-input"
          style={{ paddingLeft: "1.9rem" }}
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
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            No matching curated sites found. Clear the filter to inspect all locations.
          </p>
        ) : (
          categoriesToRender.map((cat) => {
            const group = filteredSites.filter((s) => s.category === cat);
            if (group.length === 0) return null;
            return (
              <div key={cat} style={{ display: "grid", gap: "0.45rem" }}>
                {categoryFilter === "all" && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: SITE_CATEGORY_META[cat].color,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginTop: "0.2rem",
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
                    onSelect={(id) => void selectSite(id)}
                    onPinToggle={handlePinSiteToggle}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
