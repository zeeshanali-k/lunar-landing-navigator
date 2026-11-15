/** Side-by-side multi-scenario comparison workspace (P1-COMPARE, F5.1). */

import { Layers, Pin, Sparkles, Trash2 } from "lucide-react";
import { CollapsibleSection, HelpPopover, ScreenHeader } from "../../components/ui";
import { useComparisonStore, useMissionStore } from "../../state";
import type { ComparedScenario } from "../../types";
import { buildCommsSegments, buildPowerSegments } from "../mission-timeline/timelineSegments";
import { computeClientDeltasVsBaseline } from "./delayOffsets";
import { ScenarioColumnCard } from "./ScenarioColumnCard";
import { ScheduleShiftExplorer } from "./ScheduleShiftExplorer";
import { SCENARIO_PALETTE, TradeoffRadarChart } from "./TradeoffRadarChart";

const POWER_COLORS = { sunlit: "#f59e0b", grazing: "#d97706", dark: "#334155" } as const;
const COMMS_COLORS = { dte_active: "#0ea5e9", dte_blocked: "#475569" } as const;
const TRACK_STYLE = { display: "flex", borderRadius: "4px", overflow: "hidden", background: "var(--surface-inset)" } as const;

export function ComparisonBoardView() {
  const { pinnedScenarios, comparisonData, loading, error, pinScenario, setScenarios, unpinScenario, setBaselineIndex, clearComparison } =
    useComparisonStore();
  const mission = useMissionStore();

  const sharedReq = {
    start_utc: mission.startUtc,
    duration_days: mission.durationDays,
    step_minutes: mission.stepMinutes,
    solar_array_type: mission.solarArrayType,
    fixed_array_azimuth_deg: mission.fixedArrayAzimuthDeg,
    observer_height_m: mission.observerHeightM,
    min_comms_elev_deg: mission.minCommsElevDeg,
  };

  const handlePinCurrent = (): void => {
    const siteId = mission.selectedSiteId ?? "artemis-cabeus-peak";
    const siteName = mission.selectedSite?.name ?? siteId;
    const scenarioId = `${siteId}-${mission.startUtc.slice(0, 10)}-${mission.solarArrayType}-${mission.observerHeightM}m`;
    void pinScenario({
      scenario_id: scenarioId,
      label: `${siteName} (${mission.observerHeightM}m · ${mission.startUtc.slice(0, 10)})`,
      request: { ...sharedReq, site_id: siteId },
    });
  };

  const handleLoadPreset = (): void => {
    void setScenarios(
      [
        { scenario_id: "preset-cabeus-peak", label: "Peak near Cabeus B", request: { ...sharedReq, site_id: "artemis-cabeus-peak" } },
        { scenario_id: "preset-mons-mouton", label: "Mons Mouton", request: { ...sharedReq, site_id: "artemis-mons-mouton" } },
      ],
      0,
    );
  };

  const handleLoadInCockpit = (scen: ComparedScenario): void => {
    void mission.selectSite(scen.evaluation.site.id);
    mission.setActiveTab("cockpit");
  };

  const scenarios = comparisonData ? computeClientDeltasVsBaseline(comparisonData.scenarios, comparisonData.baseline_index) : [];

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <ScreenHeader
        eyebrow="Screen 4 of 6"
        title="Compare Scenarios"
        description={`Compare up to 4 pinned mission configurations (${pinnedScenarios.length}/4 active). Deltas subtract Baseline #${(comparisonData?.baseline_index ?? 0) + 1}.`}
        helpKey="compareScreen"
        actions={
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <div className="control-with-help">
              <button type="button" onClick={handlePinCurrent} className="btn-primary">
                <Pin size={13} aria-hidden="true" />
                <span>Pin Current Site</span>
              </button>
              <HelpPopover helpKey="pinCompareBtn" />
            </div>
            <button type="button" onClick={handleLoadPreset} className="btn-surface">
              <Sparkles size={13} aria-hidden="true" />
              <span>Load Preset Cohort</span>
            </button>
            {pinnedScenarios.length > 0 && (
              <button type="button" onClick={clearComparison} className="btn-surface" style={{ color: "var(--accent-danger)" }}>
                <Trash2 size={13} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div
          className="panel-card"
          style={{
            borderColor: "var(--accent-danger)",
            background: "var(--surface-danger-soft)",
            color: "var(--accent-danger)",
            fontSize: "0.82rem",
          }}
        >
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
              <button
                type="button"
                onClick={() => void unpinScenario(item.scenario_id)}
                className="btn-surface"
                style={{ padding: "0.2rem 0.5rem" }}
              >
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

          <CollapsibleSection
            title="Overlaid Timelines & Trade-Off Radar"
            subtitle="Inspect sunlit/comms tracks and sub-score trade-offs side-by-side"
            helpKey="compareScreen"
            defaultOpen={true}
          >
            <div style={{ display: "grid", gap: "1rem" }}>
              <div style={{ display: "grid", gap: "0.6rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 700 }}>
                  <Layers size={14} aria-hidden="true" /> Overlaid Solar &amp; Comms Strips
                </div>
                {scenarios.map((scen, idx) => {
                  const ts = scen.evaluation.timeseries;
                  const total = Math.max(1, ts.length);
                  return (
                    <div key={scen.scenario_id} className="panel-inset" style={{ display: "grid", gap: "0.28rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                        <strong style={{ color: SCENARIO_PALETTE[idx % SCENARIO_PALETTE.length] }}>{scen.label}</strong>
                        <span style={{ color: "var(--text-muted)" }}>
                          Sun {scen.evaluation.summary.sunlit_hours.toFixed(0)}h · DTE {scen.evaluation.summary.dte_comms_hours.toFixed(0)}h
                        </span>
                      </div>
                      <div style={{ ...TRACK_STYLE, height: "10px" }} title="Solar illumination track">
                        {buildPowerSegments(ts).map((seg, i) => (
                          <div
                            key={`p-${i}`}
                            style={{
                              width: `${((seg.endIndex - seg.startIndex + 1) / total) * 100}%`,
                              background: POWER_COLORS[seg.state],
                            }}
                            title={seg.label}
                          />
                        ))}
                      </div>
                      <div style={{ ...TRACK_STYLE, height: "8px" }} title="DTE comms availability track">
                        {buildCommsSegments(ts).map((seg, i) => (
                          <div
                            key={`c-${i}`}
                            style={{
                              width: `${((seg.endIndex - seg.startIndex + 1) / total) * 100}%`,
                              background: COMMS_COLORS[seg.state],
                            }}
                            title={seg.label}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <TradeoffRadarChart scenarios={scenarios} />
            </div>
          </CollapsibleSection>
        </>
      ) : null}

      <CollapsibleSection
        title="Launch-Delay Sensitivity Explorer"
        subtitle="Simulate launching +14, +29.5, +90, or +180 days after your baseline date"
        helpKey="delayExplorer"
        defaultOpen={false}
      >
        <ScheduleShiftExplorer />
      </CollapsibleSection>
    </div>
  );
}
