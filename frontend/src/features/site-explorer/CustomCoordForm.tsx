/** Validated custom selenographic (lat, lon) input form with pole guard and presets (F3.3). */

import { type FormEvent, useEffect, useState } from "react";
import { AlertCircle, Crosshair, Info, Plus } from "lucide-react";
import { POLE_LAT_CLAMP_DEG, type CustomCoords } from "../../types";

const CUSTOM_PRESETS: { label: string; lat_deg: number; lon_deg: number }[] = [
  { label: "Shackleton Rim", lat_deg: -89.52, lon_deg: 138.0 },
  { label: "Exact South Pole", lat_deg: -90.0, lon_deg: 0.0 },
  { label: "Haworth Crater Rim", lat_deg: -87.45, lon_deg: -4.2 },
];

export interface CustomCoordFormProps {
  activeCustomCoords: CustomCoords | null;
  loading: boolean;
  onSubmitCoords: (coords: CustomCoords) => Promise<void>;
  onPinCustom: (coords: CustomCoords) => void;
}

function validateCoordinates(latRaw: string, lonRaw: string): { valid: boolean; error: string | null; lat: number; lon: number } {
  const lat = Number(latRaw.trim());
  const lon = Number(lonRaw.trim());
  if (latRaw.trim() === "" || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { valid: false, error: "Latitude must be a number between -90° and +90°.", lat: 0, lon: 0 };
  }
  if (lonRaw.trim() === "" || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { valid: false, error: "Longitude must be a number between -180° and +180°.", lat: 0, lon: 0 };
  }
  return { valid: true, error: null, lat, lon };
}

export function CustomCoordForm({
  activeCustomCoords,
  loading,
  onSubmitCoords,
  onPinCustom,
}: CustomCoordFormProps) {
  const [latText, setLatText] = useState(activeCustomCoords ? String(activeCustomCoords.lat_deg) : "-89.52");
  const [lonText, setLonText] = useState(activeCustomCoords ? String(activeCustomCoords.lon_deg) : "138.0");
  const [labelText, setLabelText] = useState(activeCustomCoords?.label ?? "Custom Target");

  useEffect(() => {
    if (activeCustomCoords) {
      setLatText(String(activeCustomCoords.lat_deg));
      setLonText(String(activeCustomCoords.lon_deg));
      setLabelText(activeCustomCoords.label ?? "");
    }
  }, [activeCustomCoords]);

  const check = validateCoordinates(latText, lonText);
  const needsPoleClamp = check.valid && Math.abs(check.lat) > POLE_LAT_CLAMP_DEG;

  const buildPayload = (): CustomCoords | null => {
    if (!check.valid) return null;
    return { lat_deg: check.lat, lon_deg: check.lon, label: labelText.trim() || null };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const payload = buildPayload();
    if (payload) void onSubmitCoords(payload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.7rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.76rem", color: "var(--text-muted)" }}>
          <span>Latitude (-90° to +90°)</span>
          <input
            type="number"
            step="any"
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            className="coord-input"
            placeholder="-89.52"
          />
        </label>
        <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.76rem", color: "var(--text-muted)" }}>
          <span>Longitude (-180° to +180°)</span>
          <input
            type="number"
            step="any"
            value={lonText}
            onChange={(e) => setLonText(e.target.value)}
            className="coord-input"
            placeholder="138.0"
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.76rem", color: "var(--text-muted)" }}>
        <span>Mission Label (optional)</span>
        <input
          type="text"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          className="coord-input"
          placeholder="e.g., Shackleton Rim Candidate"
          maxLength={60}
        />
      </label>

      {check.error && (
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.76rem", color: "#fca5a5" }}>
          <AlertCircle size={14} /> <span>{check.error}</span>
        </div>
      )}

      {needsPoleClamp && (
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", fontSize: "0.74rem", color: "var(--accent-sun)" }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <span>Pole singularity guard clamps |lat| &gt; 89.9999° to ±{POLE_LAT_CLAMP_DEG}° so local North stays defined.</span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {CUSTOM_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="category-pill"
            onClick={() => {
              setLatText(String(preset.lat_deg));
              setLonText(String(preset.lon_deg));
              setLabelText(preset.label);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          disabled={!check.valid || loading}
          className="btn-surface"
          style={{ flex: 1, justifyContent: "center", borderColor: "var(--accent-dte)" }}
        >
          <Crosshair size={14} />
          <span>{loading ? "Evaluating..." : "Evaluate Custom Site"}</span>
        </button>
        <button
          type="button"
          disabled={!check.valid}
          onClick={() => {
            const payload = buildPayload();
            if (payload) onPinCustom(payload);
          }}
          className="btn-surface"
          title="Pin custom coordinates to Compare"
        >
          <Plus size={14} /> Pin
        </button>
      </div>
    </form>
  );
}
