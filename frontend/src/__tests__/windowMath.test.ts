/** Unit tests for landing-window ranking, tie-breaking, and monthly grouping (P1-WINDOWS). */

import {
  getWindowCellColor,
  groupWindowsByMonth,
  rankTopWindows,
  WINDOW_GRID_STEP_MINUTES,
} from "../features/window-finder/windowMath";
import type { WindowCandidate } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runWindowMathTests(): void {
  // 1. Closed 180-minute screening step
  assert(WINDOW_GRID_STEP_MINUTES === 180, `expected 180-min step, got ${WINDOW_GRID_STEP_MINUTES}`);

  // 2. Descending score ranking with earliest start_utc tie-break
  const candidates: WindowCandidate[] = [
    { start_utc: "2027-11-10T00:00:00Z", feasibility_score: 88.0, sunlit_fraction: 0.8, dte_fraction: 0.7, longest_dark_streak_hours: 30 },
    { start_utc: "2027-02-01T00:00:00Z", feasibility_score: 91.5, sunlit_fraction: 0.9, dte_fraction: 0.7, longest_dark_streak_hours: 18 },
    { start_utc: "2027-01-15T00:00:00Z", feasibility_score: 91.5, sunlit_fraction: 0.89, dte_fraction: 0.71, longest_dark_streak_hours: 19 },
    { start_utc: "2027-06-01T00:00:00Z", feasibility_score: 52.0, sunlit_fraction: 0.45, dte_fraction: 0.5, longest_dark_streak_hours: 110 },
  ];

  const ranked = rankTopWindows(candidates, 3);
  assert(ranked.length === 3, `expected 3 ranked windows, got ${ranked.length}`);
  assert(ranked[0].rank === 1 && ranked[0].start_utc === "2027-01-15T00:00:00Z", "tie must resolve to earliest start_utc");
  assert(ranked[1].rank === 2 && ranked[1].start_utc === "2027-02-01T00:00:00Z", "second tie must follow");
  assert(ranked[2].rank === 3 && ranked[2].start_utc === "2027-11-10T00:00:00Z", "third must be 88.0");

  // 3. Monthly grouping order
  const groups = groupWindowsByMonth(candidates);
  assert(groups.length === 4, `expected 4 month groups, got ${groups.length}`);
  assert(groups[0].monthKey === "2027-01" && groups[0].label === "Jan 2027", `unexpected group[0]: ${JSON.stringify(groups[0])}`);
  assert(groups[3].monthKey === "2027-11" && groups[3].label === "Nov 2027", `unexpected group[3]: ${JSON.stringify(groups[3])}`);

  // 4. Deterministic cell colors for Class A (score) and Class B (sunlit fraction fallback)
  assert(getWindowCellColor(85, 0.5) === "#10b981", "high score should map to emerald");
  assert(getWindowCellColor(null, 0.85) === "#10b981", "Class B fallback uses sunlitFraction * 100");
}

runWindowMathTests();
