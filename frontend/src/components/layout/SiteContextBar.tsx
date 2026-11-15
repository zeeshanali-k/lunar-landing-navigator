/** Compact active landing site bar with instant Site Switcher trigger and Pin action. */

import { MapPin, Pin, SlidersHorizontal } from "lucide-react";
import { useComparisonStore, useMissionStore, useUiStore } from "../../state";
import { HelpPopover } from "../ui";

export function SiteContextBar() {
  const selectedSite = useMissionStore((s) => s.selectedSite);
  const customCoords = useMissionStore((s) => s.customCoords);
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const terrainUnavailable = useMissionStore((s) => s.terrainUnavailable);
  const startUtc = useMissionStore((s) => s.startUtc);
  const durationDays = useMissionStore((s) => s.durationDays);
  const solarArrayType = useMissionStore((s) => s.solarArrayType);
  const observerHeightM = useMissionStore((s) => s.observerHeightM);
  const personaMode = useMissionStore((s) => s.personaMode);
  const stepMinutes = useMissionStore((s) => s.stepMinutes);
  const fixedArrayAzimuthDeg = useMissionStore((s) => s.fixedArrayAzimuthDeg);
  const minCommsElevDeg = useMissionStore((s) => s.minCommsElevDeg);
  const setSitePickerOpen = useUiStore((s) => s.setSitePickerOpen);
  const pinScenario = useComparisonStore((s) => s.pinScenario);

  const siteName = customCoords
    ? customCoords.label || "Custom Coordinate"
    : (selectedSite?.name ?? evaluationData?.site.name ?? "Loading site...");

  const latLonText = evaluationData
    ? `${evaluationData.site.lat_deg.toFixed(2)}°, ${evaluationData.site.lon_deg.toFixed(2)}°`
    : selectedSite
      ? `${selectedSite.lat_deg.toFixed(2)}°, ${selectedSite.lon_deg.toFixed(2)}°`
      : "";

  const isClassB = terrainUnavailable || evaluationData?.site.has_precomputed_terrain === false;

  const handlePinCurrent = () => {
    if (!evaluationData) {
      return;
    }
    const baseId = customCoords ? `custom-${customCoords.lat_deg.toFixed(2)}_${customCoords.lon_deg.toFixed(2)}` : evaluationData.site.id;
    void pinScenario({
      scenario_id: `${baseId}-${solarArrayType}-${observerHeightM}m-${startUtc.slice(0, 10)}`,
      label: `${evaluationData.site.name} (${observerHeightM}m)`,
      request: {
        site_id: customCoords ? null : evaluationData.site.id,
        custom_coords: customCoords,
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

  return (
    <div className="site-context-bar" role="region" aria-label="Active landing site summary">
      <div className="site-context-meta">
        <MapPin size={16} color="var(--accent-sun)" aria-hidden="true" />
        <strong style={{ fontSize: "0.94rem" }}>{siteName}</strong>
        {latLonText && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{latLonText}</span>}
        <span className={`tone-pill ${isClassB ? "tone-warn" : "tone-ok"}`}>
          {isClassB ? "Class B · Spherical Limb" : "Class A · LOLA Terrain"}
        </span>
        {personaMode === "explorer" && selectedSite && <span className="category-pill">{selectedSite.category.replace("_", " ")}</span>}
      </div>

      <div className="site-context-actions">
        <div className="control-with-help">
          <button type="button" onClick={handlePinCurrent} disabled={!evaluationData} className="btn-surface">
            <Pin size={14} aria-hidden="true" />
            <span>Pin to Compare</span>
          </button>
          <HelpPopover helpKey="pinCompareBtn" />
        </div>

        <div className="control-with-help">
          <button type="button" onClick={() => setSitePickerOpen(true)} className="btn-primary">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Switch Site</span>
          </button>
          <HelpPopover helpKey="changeSiteBtn" />
        </div>
      </div>
    </div>
  );
}
