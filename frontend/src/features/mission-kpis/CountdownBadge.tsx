/** Reusable countdown readout card with theme-safe <12h amber warning state (F3.7). */

import { AlertTriangle, Clock } from "lucide-react";

export interface CountdownBadgeProps {
  label: string;
  hoursRemaining: number | null;
  fallbackText?: string;
  accentColor?: string;
}

export function formatCountdown(hoursRemaining: number | null, fallbackText: string): string {
  if (hoursRemaining === null || Number.isNaN(hoursRemaining)) {
    return fallbackText;
  }
  const safeHours = Math.max(0, hoursRemaining);
  if (safeHours < 24) {
    return `${safeHours.toFixed(1)}h remaining`;
  }
  const rawDays = Math.floor(safeHours / 24);
  const rawHours = Math.round(safeHours % 24);
  const days = rawHours === 24 ? rawDays + 1 : rawDays;
  const hours = rawHours === 24 ? 0 : rawHours;
  return `${days}d ${hours}h remaining`;
}

export function CountdownBadge({
  label,
  hoursRemaining,
  fallbackText = "Continuous in window",
  accentColor = "var(--accent-sun)",
}: CountdownBadgeProps) {
  const isImminent = hoursRemaining !== null && hoursRemaining < 12;
  const formatted = formatCountdown(hoursRemaining, fallbackText);

  return (
    <div
      className="panel-inset"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "0.3rem",
        borderColor: isImminent ? "var(--accent-warn)" : "var(--border-subtle)",
        background: isImminent ? "var(--surface-warn-soft)" : "var(--surface-inset)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.4rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <Clock size={12} color={isImminent ? "var(--accent-warn)" : accentColor} aria-hidden="true" />
          {label}
        </span>
        {isImminent && (
          <span className="tone-pill tone-warn" style={{ fontSize: "0.66rem" }}>
            <AlertTriangle size={10} aria-hidden="true" />
            &lt;12h
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: hoursRemaining === null ? "0.86rem" : "1rem",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: isImminent ? "var(--accent-warn)" : hoursRemaining === null ? "var(--text-muted)" : "var(--text-primary)",
        }}
      >
        {formatted}
      </div>
    </div>
  );
}
