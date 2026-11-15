/** Mission date presets, UTC picker, duration selector, and array/mast config bar (F3.5). */

import { Calendar, Clock, Sliders } from "lucide-react";
import { useMissionStore } from "../../state";
import type { DurationDays, ObserverHeightM } from "../../types";
import type { SolarArrayType } from "../../types";

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

function toDatetimeLocalValue(isoUtc: string): string {
  const parsed = new Date(isoUtc);
  if (Number.isNaN(parsed.getTime())) {
    return "2027-11-01T00:00";
  }
  return parsed.toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(localStr: string): string | null {
  if (!localStr.trim()) {
    return null;
  }
  const candidate = localStr.length === 16 ? `${localStr}:00Z` : `${localStr}Z`;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().replace(".000Z", "Z");
}

export function DateAndDurationBar() {
  const startUtc = useMissionStore((s) => s.startUtc);
  const durationDays = useMissionStore((s) => s.durationDays);
  const solarArrayType = useMissionStore((s) => s.solarArrayType);
  const observerHeightM = useMissionStore((s) => s.observerHeightM);
  const loading = useMissionStore((s) => s.loading);
  const setSchedule = useMissionStore((s) => s.setSchedule);
  const setHardwareConfig = useMissionStore((s) => s.setHardwareConfig);

  const handleDateChange = (raw: string): void => {
    const nextIso = fromDatetimeLocalValue(raw);
    if (nextIso) {
      void setSchedule(nextIso, durationDays);
    }
  };

  return (
    <section className="panel-card" style={{ gap: "0.65rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginRight: "0.2rem" }}>
            <Calendar size={13} /> Presets:
          </span>
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

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.76rem", color: "var(--text-muted)" }}>
            <span>UTC Start:</span>
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(startUtc)}
              onChange={(e) => handleDateChange(e.target.value)}
              className="select-surface"
              style={{ fontSize: "0.76rem" }}
              aria-label="Mission start UTC"
            />
          </label>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            <Clock size={12} color="var(--text-muted)" />
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

          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.76rem" }}>
            <Sliders size={12} color="var(--text-muted)" />
            <select
              value={solarArrayType}
              onChange={(e) => void setHardwareConfig(e.target.value as SolarArrayType, observerHeightM)}
              className="select-surface"
              style={{ fontSize: "0.76rem" }}
              aria-label="Solar array type"
            >
              <option value="vertical_tracking">Vertical Tracking</option>
              <option value="vertical_fixed">Vertical Fixed</option>
              <option value="horizontal_fixed">Horizontal Fixed</option>
            </select>
          </label>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }} role="group" aria-label="Mast height">
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Mast:</span>
            {MAST_HEIGHT_OPTIONS.map((heightM) => (
              <button
                key={heightM}
                type="button"
                disabled={loading}
                onClick={() => void setHardwareConfig(solarArrayType, heightM)}
                className={`category-pill ${observerHeightM === heightM ? "active" : ""}`}
              >
                {heightM}m
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
