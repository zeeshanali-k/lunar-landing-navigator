/** Searchable, category-grouped Landing Site Explorer & Custom Coordinates sidebar (F3.3). */

import { useEffect, useMemo, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { useComparisonStore, useMissionStore } from "../../state";
import type { CustomCoords, SiteCategory, SiteSummary } from "../../types";
import { CustomCoordForm } from "./CustomCoordForm";
import { SITE_CATEGORY_META, SiteCard } from "./SiteCard";

type ExplorerMode = "curated" | "custom";
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
    customCoords,
    evaluationData,
    startUtc,
    durationDays,
    solarArrayType,
    observerHeightM,
    loading,
    selectSite,
    setCustomCoordinates,
  } = useMissionStore();
  const { pinnedScenarios, pinScenario, unpinScenario } = useComparisonStore();

  const [mode, setMode] = useState<ExplorerMode>(customCoords ? "custom" : "curated");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    if (customCoords) setMode("custom");
  }, [customCoords]);

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
        solar_array_type: solarArrayType,
        observer_height_m: observerHeightM,
      },
    });
  };

  const handlePinCustom = (coords: CustomCoords): void => {
    const scenarioId = `custom-${coords.lat_deg.toFixed(2)}_${coords.lon_deg.toFixed(2)}-${solarArrayType}`;
    void pinScenario({
      scenario_id: scenarioId,
      label: coords.label || `Custom (${coords.lat_deg.toFixed(2)}°, ${coords.lon_deg.toFixed(2)}°)`,
      request: {
        site_id: null,
        custom_coords: coords,
        start_utc: startUtc,
        duration_days: durationDays,
        solar_array_type: solarArrayType,
        observer_height_m: observerHeightM,
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem" }}>
        <button
          type="button"
          onClick={() => setMode("curated")}
          className="btn-surface"
          style={{
            justifyContent: "center",
            borderColor: mode === "curated" ? "var(--accent-dte)" : "var(--border-subtle)",
          }}
        >
          <MapPin size={13} /> Curated ({sites.length})
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className="btn-surface"
          style={{
            justifyContent: "center",
            borderColor: mode === "custom" ? "var(--accent-dte)" : "var(--border-subtle)",
          }}
        >
          <Crosshair size={13} /> Custom Coords
        </button>
      </div>

      {mode === "curated" ? (
        <>
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
                No matching sites found. Try clearing filters or switch to Custom Coords.
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
                        isSelected={!customCoords && selectedSiteId === site.id}
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
        </>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <CustomCoordForm
            activeCustomCoords={customCoords}
            loading={loading}
            onSubmitCoords={setCustomCoordinates}
            onPinCustom={handlePinCustom}
          />
          {customCoords && evaluationData && (
            <div className="site-card" style={{ cursor: "default" }}>
              <strong style={{ fontSize: "0.78rem", color: "var(--accent-dte)" }}>Active Custom Telemetry</strong>
              <span style={{ fontSize: "0.78rem" }}>
                {evaluationData.site.name} ({evaluationData.site.lat_deg.toFixed(4)}°, {evaluationData.site.lon_deg.toFixed(4)}°)
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Score: <strong style={{ color: "var(--accent-ok)" }}>{evaluationData.summary.feasibility_score}</strong> | Sunlit:{" "}
                {evaluationData.summary.sunlit_hours}h
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
