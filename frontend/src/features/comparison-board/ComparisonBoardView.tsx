/** Side-by-side multi-scenario comparison workspace (P1-COMPARE, F5.1). */

import { GitCompare, Layers, Pin, Sparkles, Trash2 } from "lucide-react";
import { useComparisonStore, useMissionStore } from "../../state";
import type { ComparedScenario } from "../../types";
import { buildCommsSegments, buildPowerSegments } from "../mission-timeline/timelineSegments";
import { computeClientDeltasVsBaseline } from "./delayOffsets";
import { ScenarioColumnCard } from "./ScenarioColumnCard";
import { ScheduleShiftExplorer } from "./ScheduleShiftExplorer";
import { SCENARIO_PALETTE, TradeoffRadarChart } from "./TradeoffRadarChart";

const POWER_COLORS = { sunlit: "#f59e0b", grazing: "#d97706", dark: "#1e293b" } as const;
const COMMS_COLORS = { dte_active: "#38bdf8", dte_blocked: "#334155" } as const;

export function ComparisonBoardView() {
  const {
    pinnedScenarios,
    comparisonData,
    loading,
    error,
    pinScenario,
    setScenarios,
    unpinScenario,
    setBaselineIndex,
    clearComparison,
  } = useComparisonStore();
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
    selectSite,
    setActiveTab,
  } = useMissionStore();

  const handlePinCurrent = (): void => {
    const siteId = selectedSiteId ?? "artemis-shackleton-ridge";
    const siteName = selectedSite?.name ?? siteId;
    const scenarioId = `${siteId}-${startUtc.slice(0, 10)}-${solarArrayType}-${observerHeightM}m`;
    void pinScenario({
      scenario_id: scenarioId,
      label: `${siteName} (${observerHeightM}m · ${startUtc.slice(0, 10)})`,
      request: {
        site_id: siteId,
        start_utc: startUtc,
        duration_days: durationDays,
        step_minutes: stepMinutes,
        solar_array_type: solarArrayType,
        fixed_array_azimuth_deg: fixedArrayAzimuthDeg,
        observer_height_m: observerHeightM,
        min_comms_elev_deg: minCommsElevDeg,
      },
    });
  };

  const handleLoadPreset = (): void => {
    const shared = { start_utc: startUtc, duration_days: durationDays, step_minutes: stepMinutes, solar_array_type: solarArrayType, fixed_array_azimuth_deg: fixedArrayAzimuthDeg, observer_height_m: observerHeightM, min_comms_elev_deg: minCommsElevDeg };
    void setScenarios(
      [
        { scenario_id: "preset-shackleton", label: "Shackleton Connecting Ridge", request: { ...shared, site_id: "artemis-shackleton-ridge" } },
        { scenario_id: "preset-mons-mouton", label: "Mons Mouton (Leibnitz Beta)", request: { ...shared, site_id: "artemis-mons-mouton" } },
      ],
      0,
    );
  };

  const handleLoadInCockpit = (scen: ComparedScenario): void => {
    void selectSite(scen.evaluation.site.id);
    setActiveTab("cockpit");
  };

  const scenarios = comparisonData
    ? computeClientDeltasVsBaseline(comparisonData.scenarios, comparisonData.baseline_index)
    : [];

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel-card panel-row">
        <div>
          <h2 className="panel-title"><span><GitCompare size={14} /> Side-by-Side Scenario Comparison (2–4 Scenarios)</span></h2>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Pinned: {pinnedScenarios.length}/4 · Deltas evaluate each scenario minus Baseline #{(comparisonData?.baseline_index ?? 0) + 1}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={handlePinCurrent} className="btn-surface" style={{ borderColor: "var(--accent-dte)" }}>
            <Pin size={13} /> Pin Current Cockpit Scenario
          </button>
          <button type="button" onClick={handleLoadPreset} className="btn-surface">
            <Sparkles size={13} /> Load Artemis III Preset
          </button>
          {pinnedScenarios.length > 0 && (
            <button type="button" onClick={clearComparison} className="btn-surface" style={{ color: "var(--accent-danger)" }}>
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="panel-card" style={{ borderColor: "var(--accent-danger)", color: "#fca5a5", fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      {pinnedScenarios.length < 2 ? (
        <section className="panel-card" style={{ gap: "0.65rem" }}>
          <strong style={{ fontSize: "0.86rem" }}>Select 2 to 4 scenarios to run comparison (`POST /api/v1/compare`)</strong>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Pin at least two scenarios from the Site Explorer, the toolbar above, or the Launch-Delay Sensitivity explorer below.
          </p>
          {pinnedScenarios.map((item) => (
            <div key={item.scenario_id} className="btn-surface" style={{ justifyContent: "space-between", cursor: "default" }}>
              <span>{item.label}</span>
              <button type="button" onClick={() => void unpinScenario(item.scenario_id)} className="btn-surface" style={{ padding: "0.2rem 0.5rem" }}>
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
        </section>
      ) : loading ? (
        <div className="panel-card" style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
          Evaluating {pinnedScenarios.length} scenarios side-by-side...
        </div>
      ) : comparisonData ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`, gap: "1rem" }}>
            {scenarios.map((scen, idx) => (
              <ScenarioColumnCard
                key={scen.scenario_id}
                scenario={scen}
                index={idx}
                isBaseline={idx === comparisonData.baseline_index}
                isRecommended={scen.scenario_id === comparisonData.recommended_scenario_id}
                onSetBaseline={(nextIdx) => void setBaselineIndex(nextIdx)}
                onLoadInCockpit={handleLoadInCockpit}
                onRemove={(id) => void unpinScenario(id)}
              />
            ))}
          </div>

          <section className="panel-card" style={{ padding: "0.85rem" }}>
            <h3 className="panel-title"><span><Layers size={13} /> Overlaid Multi-Scenario Power &amp; DTE Timeline Strips</span></h3>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {scenarios.map((scen, idx) => {
                const ts = scen.evaluation.timeseries;
                const total = Math.max(1, ts.length);
                const powerSegs = buildPowerSegments(ts);
                const commsSegs = buildCommsSegments(ts);
                return (
                  <div key={scen.scenario_id} style={{ display: "grid", gap: "0.25rem", background: "#0b1120", padding: "0.55rem 0.7rem", borderRadius: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem" }}>
                      <strong style={{ color: SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length] }}>{scen.label}</strong>
                      <span style={{ color: "var(--text-muted)" }}>Sun {scen.evaluation.summary.sunlit_hours.toFixed(0)}h · DTE {scen.evaluation.summary.dte_comms_hours.toFixed(0)}h</span>
                    </div>
                    <div style={{ display: "flex", height: "10px", borderRadius: "4px", overflow: "hidden", background: "#0f172a" }} title="Solar illumination track">
                      {powerSegs.map((seg, i) => (
                        <div key={`p-${i}`} style={{ width: `${((seg.endIndex - seg.startIndex + 1) / total) * 100}%`, background: POWER_COLORS[seg.state] }} title={seg.label} />
                      ))}
                    </div>
                    <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", background: "#0f172a" }} title="DTE comms availability track">
                      {commsSegs.map((seg, i) => (
                        <div key={`c-${i}`} style={{ width: `${((seg.endIndex - seg.startIndex + 1) / total) * 100}%`, background: COMMS_COLORS[seg.state] }} title={seg.label} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <TradeoffRadarChart scenarios={scenarios} />
        </>
      ) : null}

      <ScheduleShiftExplorer />
    </div>
  );
}
