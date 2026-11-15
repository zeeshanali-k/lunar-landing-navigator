/** Deterministic screening-window ranking and calendar grouping helpers (P1-WINDOWS). */

import type { TopWindow, WindowCandidate } from "../../types";

export const WINDOW_GRID_STEP_MINUTES = 180;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface MonthlyWindowGroup {
  monthKey: string;
  label: string;
  windows: WindowCandidate[];
}

function formatMonthLabel(monthKey: string): string {
  const parts = monthKey.split("-");
  const year = parts[0] ?? "";
  const monthNum = Number(parts[1]);
  const monthName =
    Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12
      ? MONTH_NAMES[monthNum - 1]
      : monthKey;
  return `${monthName} ${year}`;
}

/** Rank candidate windows by descending feasibility score, breaking ties by earliest start UTC. */
export function rankTopWindows(
  windows: readonly WindowCandidate[],
  maxCount = 5,
): TopWindow[] {
  const sorted = [...windows].sort((a, b) => {
    const scoreA = typeof a.feasibility_score === "number" ? a.feasibility_score : -Infinity;
    const scoreB = typeof b.feasibility_score === "number" ? b.feasibility_score : -Infinity;
    if (Math.abs(scoreB - scoreA) > 1e-9) {
      return scoreB - scoreA;
    }
    return a.start_utc.localeCompare(b.start_utc);
  });

  return sorted.slice(0, Math.max(0, maxCount)).map((win, idx) => ({
    rank: idx + 1,
    start_utc: win.start_utc,
    feasibility_score: win.feasibility_score,
    sunlit_fraction: win.sunlit_fraction,
    dte_fraction: win.dte_fraction,
  }));
}

/** Group candidate windows chronologically by YYYY-MM month key. */
export function groupWindowsByMonth(
  windows: readonly WindowCandidate[],
): MonthlyWindowGroup[] {
  const map = new Map<string, WindowCandidate[]>();
  const ordered = [...windows].sort((a, b) => a.start_utc.localeCompare(b.start_utc));

  for (const win of ordered) {
    const monthKey = win.start_utc.slice(0, 7);
    const list = map.get(monthKey);
    if (list) {
      list.push(win);
    } else {
      map.set(monthKey, [win]);
    }
  }

  return Array.from(map.entries()).map(([monthKey, items]) => ({
    monthKey,
    label: formatMonthLabel(monthKey),
    windows: items,
  }));
}

/** Deterministic heatmap cell color from feasibility score or sunlit fraction. */
export function getWindowCellColor(
  score: number | null | undefined,
  sunlitFraction: number,
): string {
  const metric =
    typeof score === "number" && Number.isFinite(score) ? score : sunlitFraction * 100;
  if (metric >= 82) return "#10b981";
  if (metric >= 70) return "#0ea5e9";
  if (metric >= 55) return "#f59e0b";
  if (metric >= 40) return "#ea580c";
  return "#dc2626";
}
