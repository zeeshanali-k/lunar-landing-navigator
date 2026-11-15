/** Launch-delay sensitivity explorer at +14, +29.5, +90, and +180 days (P1-DELAYS). */

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, GitCompare, Plus } from "lucide-react";
import { useComparisonStore, useMissionStore } from "../../state";
import type { CompareScenarioInput } from "../../types";
import {
  buildDelaySensitivityCandidates,
  checkEphemerisCoverage,
  EPHEMERIS_COVERAGE_START_UTC,
  EPHEMERIS_COVERAGE_STOP_UTC,
  type LaunchDelayOffsetDays,
} from "./delayOffsets";

const OFFSET_LABELS: Record<LaunchDelayOffsetDays, string> = {
  14: "+14 Days",
  29.5: "+29.5 Days (1 Synodic Month)",
  90: "+90 Days (1 Quarter)",
  180: "+180 Days (Half Year)",
};

export function ScheduleShiftExplorer() {
  const {
    selectedSiteId,
    selectedSite,
    startUtc,
    durationDays,
    stepMinutes,
    solarArrayType,
    fixedArrayAzimuthDeg,
    observerHeightM,
    minCommsElevDeg,
    setSchedule,
    setActiveTab,
  } = useMissionStore();
  const { setScenarios, pinScenario } = useComparisonStore();
  const [shiftWarning, setShiftWarning] = useState<string | null>(null);

  const siteId = selectedSiteId ?? "artemis-shackleton-ridge";
  const siteName = selectedSite?.name ?? siteId;

  const baseRequest = useMemo(
    () => ({
      site_id: siteId,
      start_utc: startUtc,
      duration_days: durationDays,
      step_minutes: stepMinutes,
      solar_array_type: solarArrayType,
      fixed_array_azimuth_deg: fixedArrayAzimuthDeg,
      observer_height_m: observerHeightM,
      min_comms_elev_deg: minCommsElevDeg,
    }),
    [
      siteId,
      startUtc,
      durationDays,
      stepMinutes,
      solarArrayType,
      fixedArrayAzimuthDeg,
      observerHeightM,
      minCommsElevDeg,
    ],
  );

  const baselineCoverage = useMemo(
    () => checkEphemerisCoverage(startUtc, durationDays),
    [startUtc, durationDays],
  );

  const candidates = useMemo(() => {
    try {
      return buildDelaySensitivityCandidates(baseRequest, siteName);
    } catch {
      return [];
    }
  }, [baseRequest, siteName]);

  const handleCompareAll = (): void => {
    const validCandidates = candidates.filter((c) => c.coverage.valid);
    const outOfRange = candidates.filter((c) => !c.coverage.valid);
    if (outOfRange.length > 0) {
      setShiftWarning(
        `EPHEMERIS_RANGE_EXCEEDED: ${outOfRange.map((c) => `+${c.offsetDays}d`).join(", ")} exceed ${EPHEMERIS_COVERAGE_STOP_UTC} with 15-day lookahead and were omitted (no extrapolation).`,
      );
    } else {
      setShiftWarning(null);
    }
    if (!baselineCoverage.valid || validCandidates.length === 0) {
      setShiftWarning(
        `EPHEMERIS_RANGE_EXCEEDED: Not enough in-range shifts between ${EPHEMERIS_COVERAGE_START_UTC} and ${EPHEMERIS_COVERAGE_STOP_UTC}.`,
      );
      return;
    }
    const baselineScenario: CompareScenarioInput = {
      scenario_id: `${siteId}-baseline-${startUtc.slice(0, 10)}`,
      label: `${siteName} (Baseline · ${startUtc.slice(0, 10)})`,
      request: baseRequest,
    };
    const batch = [baselineScenario, ...validCandidates.slice(0, 3).map((c) => c.scenarioInput)];
    void setScenarios(batch, 0);
  };

  return (
    <section className="panel-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h2 className="panel-title">
            <span><CalendarClock size={14} /> Launch-Delay Sensitivity (+14 / +29.5 / +90 / +180 Days)</span>
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Site: <strong>{siteName}</strong> · Baseline: {startUtc} ({durationDays}d) · Coverage: {EPHEMERIS_COVERAGE_START_UTC.slice(0, 10)} to {EPHEMERIS_COVERAGE_STOP_UTC.slice(0, 10)}
          </p>
        </div>
        <button type="button" onClick={handleCompareAll} className="btn-surface" style={{ borderColor: "var(--accent-dte)" }}>
          <GitCompare size={14} /> Compare Baseline + Delay Shifts
        </button>
      </div>

      {shiftWarning && (
        <div className="panel-card" style={{ padding: "0.6rem 0.85rem", borderColor: "var(--accent-warn)", color: "#fde68a", fontSize: "0.78rem", flexDirection: "row", alignItems: "center" }}>
          <AlertTriangle size={15} />
          <span>{shiftWarning}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))", gap: "0.75rem" }}>
        {candidates.map((cand) => (
          <div key={cand.offsetDays} className="site-card" style={{ cursor: "default", background: "#0b1120" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.35rem" }}>
              <strong style={{ fontSize: "0.82rem" }}>{OFFSET_LABELS[cand.offsetDays]}</strong>
              <span
                className="status-pill"
                style={{
                  fontSize: "0.66rem",
                  padding: "0.15rem 0.45rem",
                  color: cand.coverage.valid ? "var(--accent-ok)" : "var(--accent-danger)",
                }}
              >
                {cand.coverage.valid ? "COVERED" : "EPHEMERIS_RANGE_EXCEEDED"}
              </span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              Start: {cand.shiftedStartUtc}
            </div>
            <div style={{ fontSize: "0.71rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              Lookahead End: {cand.coverage.lookaheadEndUtc}
            </div>
            {!cand.coverage.valid && cand.coverage.message && (
              <div style={{ fontSize: "0.7rem", color: "#fca5a5" }}>{cand.coverage.message}</div>
            )}
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!cand.coverage.valid}
                onClick={() => void pinScenario(cand.scenarioInput)}
                className="btn-surface"
                style={{ fontSize: "0.72rem", padding: "0.25rem 0.5rem", opacity: cand.coverage.valid ? 1 : 0.45 }}
              >
                <Plus size={12} /> Pin Shift
              </button>
              <button
                type="button"
                disabled={!cand.coverage.valid}
                onClick={() => {
                  void setSchedule(cand.shiftedStartUtc);
                  setActiveTab("cockpit");
                }}
                className="btn-surface"
                style={{ fontSize: "0.72rem", padding: "0.25rem 0.5rem", opacity: cand.coverage.valid ? 1 : 0.45 }}
              >
                Load Date in Cockpit
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
