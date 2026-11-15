/** Monthly candidate-window heatmap grid and active selection bar (P1-WINDOWS). */

import { Compass } from "lucide-react";
import type { WindowCandidate } from "../../types";
import { getWindowCellColor, type MonthlyWindowGroup } from "./windowMath";

const MONTH_CARD = {
  background: "#0b1120",
  border: "1px solid #1e293b",
  borderRadius: "0.5rem",
  padding: "0.55rem",
  display: "grid",
  gap: "0.4rem",
} as const;
const DETAIL_BAR = {
  display: "flex",
  background: "#0b1120",
  padding: "0.65rem 0.85rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--border-subtle)",
  gap: "0.75rem",
} as const;
const CELL_BASE = { width: "18px", height: "18px", borderRadius: "3px", padding: 0, cursor: "pointer" } as const;

interface WindowMonthGridProps {
  totalWindows: number;
  monthGroups: MonthlyWindowGroup[];
  selectedWin: WindowCandidate | null;
  isClassB: boolean;
  onSelectWin: (win: WindowCandidate) => void;
  onLoadInCockpit: (startUtc: string) => void;
}

export function WindowMonthGrid({ totalWindows, monthGroups, selectedWin, isClassB, onSelectWin, onLoadInCockpit }: WindowMonthGridProps) {
  return (
    <section className="panel-card" style={{ padding: "0.85rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <strong style={{ fontSize: "0.84rem" }}>Candidate Heatmap ({totalWindows} windows)</strong>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Green ≥ 82 · Blue ≥ 70 · Amber ≥ 55 · Red &lt; 40</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "0.65rem" }}>
        {monthGroups.map((group) => (
          <div key={group.monthKey} style={MONTH_CARD}>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#cbd5e1" }}>{group.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {group.windows.map((win) => {
                const active = selectedWin?.start_utc === win.start_utc;
                const bg = getWindowCellColor(isClassB ? null : win.feasibility_score, win.sunlit_fraction);
                return (
                  <button
                    key={win.start_utc}
                    type="button"
                    onClick={() => onSelectWin(win)}
                    title={`${win.start_utc} · Score ${isClassB ? "N/A" : win.feasibility_score.toFixed(1)} · Sun ${(win.sunlit_fraction * 100).toFixed(0)}%`}
                    style={{
                      ...CELL_BASE,
                      background: bg,
                      border: active ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.15)",
                    }}
                    aria-label={`Select window ${win.start_utc}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedWin && (
        <div className="panel-row" style={DETAIL_BAR}>
          <div style={{ fontSize: "0.78rem", display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
            <strong>{selectedWin.start_utc}</strong>
            <span>
              Score: <strong>{isClassB ? "N/A" : selectedWin.feasibility_score.toFixed(1)}</strong>
            </span>
            <span>Sunlit: {(selectedWin.sunlit_fraction * 100).toFixed(1)}%</span>
            <span>DTE: {(selectedWin.dte_fraction * 100).toFixed(1)}%</span>
            <span>Max Dark: {selectedWin.longest_dark_streak_hours.toFixed(1)}h</span>
          </div>
          <button
            type="button"
            onClick={() => onLoadInCockpit(selectedWin.start_utc)}
            className="btn-surface"
            style={{ fontSize: "0.74rem", borderColor: "var(--accent-dte)" }}
          >
            <Compass size={13} /> Load in Cockpit
          </button>
        </div>
      )}
    </section>
  );
}
