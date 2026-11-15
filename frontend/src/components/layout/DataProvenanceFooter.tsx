/** Data provenance and terrain classification disclosure footer (REQ-04, REQ-08). */

import { useMissionStore } from "../../state";

export function DataProvenanceFooter() {
  const selectedSite = useMissionStore((s) => s.selectedSite);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const terrainUnavailable = useMissionStore((s) => s.terrainUnavailable);

  const hasPrecomputed =
    (evaluationData?.site.has_precomputed_terrain ?? selectedSite?.has_precomputed_terrain ?? true) &&
    !terrainUnavailable;

  const quickmapUrl = selectedSite?.external_links.quickmap_url ?? null;
  const moonTrekUrl = selectedSite?.external_links.moon_trek_url ?? null;

  return (
    <footer
      className="panel-card"
      data-testid="provenance-footer"
      style={{
        padding: "0.65rem 0.9rem",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.6rem",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
          {hasPrecomputed ? "Class A • LOLA DEM" : "Class B • Spherical Limb"}
        </span>
        <span>•</span>
        <span>
          {hasPrecomputed
            ? "Measured terrain mask enabled from LOLA elevation data."
            : "Terrain model unavailable — spherical limb only"}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.55rem" }}>
        <span>Sources: LOLA • JPL Horizons • CSA</span>
        {quickmapUrl ? (
          <a href={quickmapUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-dte)" }}>
            QuickMap
          </a>
        ) : (
          <span>QuickMap</span>
        )}
        {moonTrekUrl ? (
          <a href={moonTrekUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-dte)" }}>
            Moon Trek
          </a>
        ) : (
          <span>Moon Trek</span>
        )}
      </div>
    </footer>
  );
}
