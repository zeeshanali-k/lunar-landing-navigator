/** Printable and downloadable mission briefing modal with NASA provenance (F5.4). */

import { Download, FileJson, FileSpreadsheet, Printer, X } from "lucide-react";
import { buildShareableScenarioUrl, useComparisonStore, useMissionStore } from "../../state";
import { buildScenarioExportJson, buildTimeseriesCsv, PROVENANCE_CITATIONS, triggerBrowserDownload } from "./exportHelpers";

export interface MissionBriefingModalProps {
  open: boolean;
  onClose: () => void;
}

export function MissionBriefingModal({ open, onClose }: MissionBriefingModalProps) {
  const evaluation = useMissionStore((s) => s.evaluationData);
  const getScenarioUrlParams = useMissionStore((s) => s.getScenarioUrlParams);
  const comparisonData = useComparisonStore((s) => s.comparisonData);

  if (!open) return null;

  const shareUrl = buildShareableScenarioUrl(getScenarioUrlParams());
  const isClassB = evaluation?.site.has_precomputed_terrain === false || evaluation?.summary.feasibility_score === null;

  const handleDownloadCsv = (): void => {
    if (!evaluation) return;
    const slug = `${evaluation.site.id}-${evaluation.timeseries[0]?.timestamp_utc.slice(0, 10) ?? "mission"}`;
    triggerBrowserDownload(`${slug}-timeseries.csv`, buildTimeseriesCsv(evaluation), "text/csv;charset=utf-8");
  };

  const handleDownloadJson = (): void => {
    if (!evaluation) return;
    const slug = `${evaluation.site.id}-${evaluation.timeseries[0]?.timestamp_utc.slice(0, 10) ?? "mission"}`;
    triggerBrowserDownload(
      `${slug}-briefing.json`,
      buildScenarioExportJson(evaluation, shareUrl, comparisonData),
      "application/json;charset=utf-8",
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mission Briefing Export"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(7, 11, 20, 0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div className="panel-card" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="panel-row" style={{ display: "flex" }}>
          <h2 className="panel-title">
            <span>
              <Download size={14} /> Mission Briefing Export
            </span>
          </h2>
          <button type="button" onClick={onClose} className="btn-surface" aria-label="Close briefing modal">
            <X size={14} /> Close
          </button>
        </div>

        {!evaluation ? (
          <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)" }}>
            No active evaluation loaded yet. Select a curated site in the Mission Cockpit first.
          </p>
        ) : (
          <>
            <div
              style={{
                background: "#0b1120",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                display: "grid",
                gap: "0.35rem",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
                <strong>{evaluation.site.name}</strong>
                <span className="status-pill" style={{ fontSize: "0.7rem", color: isClassB ? "var(--accent-warn)" : "var(--accent-ok)" }}>
                  {isClassB ? "Class B: Spherical limb only" : "Class A: LOLA 80m DEM"}
                </span>
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                Coords: {evaluation.site.lat_deg.toFixed(4)}°, {evaluation.site.lon_deg.toFixed(4)}° · Elev:{" "}
                {evaluation.site.elevation_m !== null ? `${evaluation.site.elevation_m.toFixed(1)} m` : "N/A"} · Slope:{" "}
                {evaluation.site.mean_slope_deg !== null ? `${evaluation.site.mean_slope_deg.toFixed(2)}°` : "N/A"}
              </div>
              {isClassB && <div style={{ color: "#fde68a", fontSize: "0.76rem" }}>Terrain model unavailable — spherical limb only</div>}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                <span>
                  Feasibility:{" "}
                  <strong>{evaluation.summary.feasibility_score !== null ? evaluation.summary.feasibility_score.toFixed(1) : "N/A"}</strong>
                </span>
                <span>
                  Sunlit: <strong>{evaluation.summary.sunlit_hours.toFixed(1)}h</strong> (
                  {(evaluation.summary.sunlit_fraction * 100).toFixed(1)}%)
                </span>
                <span>
                  DTE: <strong>{evaluation.summary.dte_comms_hours.toFixed(1)}h</strong> (
                  {(evaluation.summary.dte_fraction * 100).toFixed(1)}%)
                </span>
                <span>
                  Max Dark: <strong>{evaluation.summary.longest_dark_streak_hours.toFixed(1)}h</strong>
                </span>
              </div>
            </div>

            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
              <strong>Shareable Canonical URL:</strong> {shareUrl}
            </div>

            <div style={{ display: "grid", gap: "0.25rem", fontSize: "0.74rem" }}>
              <strong style={{ color: "var(--text-primary)" }}>Data Provenance &amp; Citations</strong>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text-muted)", display: "grid", gap: "0.15rem" }}>
                {PROVENANCE_CITATIONS.map((cite) => (
                  <li key={cite}>{cite}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
              <button type="button" onClick={handleDownloadCsv} className="btn-surface" style={{ borderColor: "var(--accent-dte)" }}>
                <FileSpreadsheet size={14} /> Download Timeseries CSV ({evaluation.timeseries.length} rows)
              </button>
              <button type="button" onClick={handleDownloadJson} className="btn-surface">
                <FileJson size={14} /> Download Scenario JSON
              </button>
              <button type="button" onClick={() => window.print()} className="btn-surface">
                <Printer size={14} /> Print Briefing
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
