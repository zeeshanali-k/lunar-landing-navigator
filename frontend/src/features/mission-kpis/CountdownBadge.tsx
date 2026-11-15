/** Reusable countdown readout card with automatic <12h amber warning state (F3.7). */

import { AlertTriangle, Clock } from "lucide-react";

export interface CountdownBadgeProps {
  label: string;
  hoursRemaining: number | null;
  fallbackText?: string;
  accentColor?: string;
}

function formatCountdown(hoursRemaining: number | null, fallbackText: string): string {
  if (hoursRemaining === null || Number.isNaN(hoursRemaining)) return fallbackText;
  const safeHours = Math.max(0, hoursRemaining);
  if (safeHours < 24) return `${safeHours.toFixed(1)}h remaining`;
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

  const cardStyle = {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    gap: "0.35rem",
    padding: "0.65rem 0.75rem",
    borderRadius: "0.6rem",
    border: isImminent ? "1px solid rgba(245, 158, 11, 0.55)" : "1px solid var(--border-subtle)",
    background: isImminent ? "rgba(245, 158, 11, 0.14)" : "var(--bg-panel-elevated)",
  };

  const pillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.1rem 0.4rem",
    borderRadius: "999px",
    border: "1px solid rgba(245, 158, 11, 0.55)",
    background: "rgba(245, 158, 11, 0.22)",
    color: "#fbbf24",
    fontSize: "0.66rem",
    fontWeight: 700,
    letterSpacing: "0.03em",
  };

  const valueColor = isImminent ? "#fcd34d" : hoursRemaining === null ? "var(--text-muted)" : "var(--text-primary)";

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.4rem",
          fontSize: "0.73rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <Clock size={12} color={isImminent ? "var(--accent-warn)" : accentColor} />
          {label}
        </span>
        {isImminent && (
          <span style={pillStyle}>
            <AlertTriangle size={11} />
            IMMINENT (&lt;12h)
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: hoursRemaining === null ? "0.86rem" : "1.02rem",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: valueColor,
        }}
      >
        {formatted}
      </div>
      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
        {isImminent
          ? "Critical transition within 12 hours"
          : hoursRemaining === null
            ? "No transition inside active window"
            : "Live countdown from selected step"}
      </div>
    </div>
  );
}
