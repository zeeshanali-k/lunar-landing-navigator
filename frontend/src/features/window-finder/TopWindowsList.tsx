/** Ranked list of top candidate landing windows with Cockpit & Compare actions (F5.3). */

import { Award, Compass, Plus } from "lucide-react";
import { HelpPopover } from "../../components/ui";
import type { TopWindow, CandidateWindow } from "../../types";

export interface TopWindowsListProps {
  topWindows: TopWindow[];
  candidateMap: Map<string, CandidateWindow>;
  isClassB: boolean;
  onSelectWindow: (startUtc: string) => void;
  onPinWindow: (startUtc: string, rank: number) => void;
}

export function TopWindowsList({ topWindows, candidateMap, isClassB, onSelectWindow, onPinWindow }: TopWindowsListProps) {
  if (topWindows.length === 0) {
    return (
      <div className="panel-card" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
        No candidate windows returned for the selected site and coverage range.
      </div>
    );
  }

  return (
    <section className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className="panel-row">
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Award size={15} color="var(--accent-ok)" aria-hidden="true" />
          <h3 className="panel-title">Top {topWindows.length} Recommended Landing Windows</h3>
          <HelpPopover helpKey="windowsScreen" align="left" />
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Sorted by score · ties broken by earliest UTC</span>
      </div>

      <div style={{ display: "grid", gap: "0.55rem" }}>
        {topWindows.map((win) => {
          const detail = candidateMap.get(win.start_utc);
          return (
            <div
              key={`${win.rank}-${win.start_utc}`}
              className="panel-inset"
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.6rem",
              }}
            >
              <div style={{ display: "grid", gap: "0.2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span
                    className="status-pill"
                    style={{
                      fontSize: "0.7rem",
                      color: win.rank === 1 ? "var(--accent-ok)" : "var(--accent-dte)",
                    }}
                  >
                    #{win.rank}
                  </span>
                  <strong style={{ fontSize: "0.84rem", fontVariantNumeric: "tabular-nums" }}>{win.start_utc}</strong>
                </div>
                <div style={{ display: "flex", gap: "0.85rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <span>
                    Score:{" "}
                    <strong style={{ color: isClassB ? "var(--accent-warn)" : "var(--text-primary)" }}>
                      {isClassB ? "N/A (Limb Only)" : win.feasibility_score.toFixed(1)}
                    </strong>
                  </span>
                  <span>
                    Sunlit: <strong>{(win.sunlit_fraction * 100).toFixed(1)}%</strong>
                  </span>
                  <span>
                    DTE: <strong>{(win.dte_fraction * 100).toFixed(1)}%</strong>
                  </span>
                  {detail && (
                    <span>
                      Max Dark Streak: <strong>{detail.longest_dark_streak_hours.toFixed(1)}h</strong>
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => onSelectWindow(win.start_utc)}
                  className="btn-surface"
                  style={{ fontSize: "0.74rem", borderColor: "var(--accent-dte)" }}
                >
                  <Compass size={13} /> Load in Cockpit
                </button>
                <button
                  type="button"
                  onClick={() => onPinWindow(win.start_utc, win.rank)}
                  className="btn-surface"
                  style={{ fontSize: "0.74rem" }}
                >
                  <Plus size={13} /> Pin to Compare
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
