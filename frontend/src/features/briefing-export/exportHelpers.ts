/** Deterministic CSV/JSON mission briefing export builders (F5.4). */

import type { CompareResponse, EvaluateResponse } from "../../types";

export const PROVENANCE_CITATIONS = [
  "NASA LRO LOLA South-Polar DEM (ldem_80s_80m, 80 m/pix, 80S-90S)",
  "NASA/JPL Horizons Topocentric Ephemeris (MOON_ME frame, east-positive)",
  "LRO QuickMap (Lunar Reconnaissance Orbiter Camera)",
  "NASA Moon Trek",
  "Canadian Space Agency (CSA) Lunar Surface Context",
] as const;

const CSV_HEADER = [
  "timestamp_utc",
  "sun_az_deg",
  "sun_elev_deg",
  "sun_horizon_elev_deg",
  "sun_visible_fraction",
  "is_sunlit",
  "solar_power_factor",
  "earth_az_deg",
  "earth_elev_deg",
  "earth_horizon_elev_deg",
  "earth_clearance_deg",
  "is_dte_geometric",
  "is_solar_conjunction",
  "is_dte_visible",
  "sun_earth_sep_deg",
  "hours_to_next_sunset",
  "hours_to_next_sunrise",
  "hours_to_next_earthset",
  "hours_to_next_earthrise",
].join(",");

function formatOptionalNum(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

/** Serialize API-computed ephemeris, power, and DTE timeseries to CSV. */
export function buildTimeseriesCsv(evaluation: EvaluateResponse): string {
  const lines = [CSV_HEADER];
  for (const pt of evaluation.timeseries) {
    lines.push(
      [
        pt.timestamp_utc,
        pt.sun_az_deg,
        pt.sun_elev_deg,
        pt.sun_horizon_elev_deg,
        pt.sun_visible_fraction,
        pt.is_sunlit,
        pt.solar_power_factor,
        pt.earth_az_deg,
        pt.earth_elev_deg,
        pt.earth_horizon_elev_deg,
        pt.earth_clearance_deg,
        pt.is_dte_geometric ?? pt.is_dte_visible,
        pt.is_solar_conjunction ?? false,
        pt.is_dte_visible,
        pt.sun_earth_sep_deg,
        formatOptionalNum(pt.hours_to_next_sunset),
        formatOptionalNum(pt.hours_to_next_sunrise),
        formatOptionalNum(pt.hours_to_next_earthset),
        formatOptionalNum(pt.hours_to_next_earthrise),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Build structured JSON bundle containing scenario evaluation, comparison, and provenance. */
export function buildScenarioExportJson(evaluation: EvaluateResponse, shareUrl: string, comparison: CompareResponse | null): string {
  const isClassA = evaluation.site.has_precomputed_terrain !== false && evaluation.summary.feasibility_score !== null;

  const payload = {
    exported_at_utc: new Date().toISOString().replace(".000Z", "Z"),
    terrain_classification: isClassA ? "class_a_lola_80s_80m" : "class_b_spherical_limb_only",
    share_url: shareUrl,
    provenance_citations: [...PROVENANCE_CITATIONS],
    evaluation,
    comparison,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** Trigger a client-side file download for generated CSV or JSON content. */
export function triggerBrowserDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
