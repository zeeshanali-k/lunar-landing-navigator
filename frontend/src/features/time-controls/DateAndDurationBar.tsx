/** Streamlined mission schedule picker with progressive disclosure for hardware & sampling settings (F3.5). */

import { Calendar, Clock, Sliders } from "lucide-react";
import { CollapsibleSection, HelpPopover } from "../../components/ui";
import { useMissionStore } from "../../state";
import type { DurationDays, ObserverHeightM, SolarArrayType, StepMinutes } from "../../types";

interface DatePreset {
  label: string;
  startUtc: string;
  durationDays: DurationDays;
}

const DATE_PRESETS: DatePreset[] = [
  { label: "Artemis III Nov 2027", startUtc: "2027-11-01T00:00:00Z", durationDays: 14 },
  { label: "Southern Summer Peak", startUtc: "2027-12-20T00:00:00Z", durationDays: 14 },
  { label: "Southern Winter Dip", startUtc: "2027-06-15T00:00:00Z", durationDays: 14 },
  { label: "Full 29.5d Lunar Day", startUtc: "2027-11-01T00:00:00Z", durationDays: 29.5 },
];

const DURATION_OPTIONS: readonly DurationDays[] = [7, 14, 29.5];
const MAST_HEIGHT_OPTIONS: readonly ObserverHeightM[] = [1.5, 2.0, 10.0];
const STEP_OPTIONS: readonly StepMinutes[] = [60, 10];
const ARRAY_OPTIONS: { value: SolarArrayType; label: string }[] = [
  { value: "vertical_tracking", label: "Sun-Tracking Mast" },
  { value: "vertical_fixed", label: "Fixed Vertical" },
  { value: "horizontal_fixed", label: "Horizontal Deck" },
];

function toDatetimeLocalValue(isoUtc: string): string {
  const parsed = new Date(isoUtc);
  return Number.isNaN(parsed.getTime()) ? "2027-11-01T00:00" : parsed.toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(localStr: string): string | null {
  if (!localStr.trim()) return null;
  const candidate = localStr.length === 16 ? `${localStr}:00Z` : `${localStr}Z`;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().replace(".000Z", "Z");
}

export function DateAndDurationBar() {
  const startUtc = useMissionStore((s) => s.startUtc);
  const durationDays = useMissionStore((s) => s.durationDays);
  const stepMinutes = useMissionStore((s) => s.stepMinutes);
  const solarArrayType = useMissionStore((s) => s.solarArrayType);
  const fixedArrayAzimuthDeg = useMissionStore((s) => s.fixedArrayAzimuthDeg);
  const observerHeightM = useMissionStore((s) => s.observerHeightM);
  const minCommsElevDeg = useMissionStore((s) => s.minCommsElevDeg);
  const loading = useMissionStore((s) => s.loading);
  const setSchedule = useMissionStore((s) => s.setSchedule);
  const setStepMinutes = useMissionStore((s) => s.setStepMinutes);
  const setHardwareConfig = useMissionStore((s) => s.setHardwareConfig);

  const handleDateChange = (raw: string): void => {
    const nextIso = fromDatetimeLocalValue(raw);
    if (nextIso) void setSchedule(nextIso, durationDays);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <section className="panel-card" aria-label="Mission schedule controls">
        <div className="panel-row" style={{ marginBottom: "0.65rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Calendar size={15} color="var(--accent-primary)" aria-hidden="true" />
            <h2 className="panel-title">Mission Window &amp; Presets</h2>
            <HelpPopover helpKey="scheduleSection" align="left" />
          </div>
          <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Pick a season preset or custom UTC landing date</span>
        </div>

        <div className="panel-row">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem" }}>
            {DATE_PRESETS.map((preset) => {
              const isActive = startUtc === preset.startUtc && durationDays === preset.durationDays;
              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={loading}
                  onClick={() => void setSchedule(preset.startUtc, preset.durationDays)}
                  className={`category-pill ${isActive ? "active" : ""}`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
              <Clock size={13} color="var(--text-muted)" aria-hidden="true" />
              <span style={{ color: "var(--text-muted)" }}>Start UTC:</span>
              <input
                type="datetime-local"
                disabled={loading}
                value={toDatetimeLocalValue(startUtc)}
                onChange={(e) => handleDateChange(e.target.value)}
                className="select-surface"
              />
            </label>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }} role="group" aria-label="Mission duration">
              {DURATION_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  disabled={loading}
                  onClick={() => void setSchedule(startUtc, days)}
                  className={`category-pill ${durationDays === days ? "active" : ""}`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CollapsibleSection
        title="Advanced Hardware & Simulation Settings"
        subtitle="Solar panel type, mast height, sampling interval, and minimum Earth comms angle"
        badge={`${ARRAY_OPTIONS.find((a) => a.value === solarArrayType)?.label ?? solarArrayType} · ${observerHeightM}m`}
        helpKey="advancedParams"
        defaultOpen={false}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.8rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
              <Sliders size={13} aria-hidden="true" /> Solar Array Orientation
            </span>
            <select
              value={solarArrayType}
              disabled={loading}
              onChange={(e) => void setHardwareConfig(e.target.value as SolarArrayType, observerHeightM)}
              className="select-surface"
            >
              {ARRAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Lander / Rover Mast Height</span>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {MAST_HEIGHT_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={loading}
                  onClick={() => void setHardwareConfig(solarArrayType, h)}
                  className={`category-pill ${Math.abs(observerHeightM - h) < 0.05 ? "active" : ""}`}
                >
                  {h}m
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Simulation Step Resolution</span>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {STEP_OPTIONS.map((step) => (
                <button
                  key={step}
                  type="button"
                  disabled={loading}
                  onClick={() => void setStepMinutes(step)}
                  className={`category-pill ${stepMinutes === step ? "active" : ""}`}
                >
                  {step} min
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Min Comms Elevation Mask ({minCommsElevDeg.toFixed(0)}°)</span>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              disabled={loading}
              value={minCommsElevDeg}
              onChange={(e) => void setHardwareConfig(solarArrayType, observerHeightM, fixedArrayAzimuthDeg, Number(e.target.value))}
            />
          </label>

          {solarArrayType === "vertical_fixed" && (
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Fixed Array Azimuth ({fixedArrayAzimuthDeg.toFixed(0)}°)</span>
              <input
                type="range"
                min={0}
                max={355}
                step={5}
                disabled={loading}
                value={fixedArrayAzimuthDeg}
                onChange={(e) => void setHardwareConfig(solarArrayType, observerHeightM, Number(e.target.value), minCommsElevDeg)}
              />
            </label>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
