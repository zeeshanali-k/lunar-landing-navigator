/** Annual landing-window screening heatmap over precomputed ephemeris data (P1-WINDOWS). */

import { useEffect, useMemo, useState } from "react";
import { CollapsibleSection, ScreenHeader } from "../../components/ui";
import { isAbortError, scanWindows } from "../../services";
import { useComparisonStore, useMissionStore } from "../../state";
import type { DurationDays, SolarArrayType, WindowCandidate, WindowsResponse } from "../../types";
import { TopWindowsList } from "./TopWindowsList";
import { WindowMonthGrid } from "./WindowMonthGrid";
import { groupWindowsByMonth, rankTopWindows, WINDOW_GRID_STEP_MINUTES } from "./windowMath";

export function WindowHeatmapView() {
  const mission = useMissionStore();
  const pinScenario = useComparisonStore((s) => s.pinScenario);

  const [siteId, setSiteId] = useState(mission.selectedSiteId ?? "artemis-cabeus-peak");
  const [scanDuration, setScanDuration] = useState<DurationDays>(mission.durationDays);
  const [scanArray, setScanArray] = useState<SolarArrayType>(mission.solarArrayType);
  const [year, setYear] = useState<2026 | 2027 | 2028>(2027);
  const [data, setData] = useState<WindowsResponse | null>(null);
  const [selectedWin, setSelectedWin] = useState<WindowCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mission.selectedSiteId) setSiteId(mission.selectedSiteId);
  }, [mission.selectedSiteId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    scanWindows(
      { site_id: siteId, year, mission_duration_days: scanDuration, solar_array_type: scanArray },
      `windows:${siteId}:${year}:${scanDuration}:${scanArray}`,
      controller.signal,
    )
      .then((res) => {
        setData(res);
        setSelectedWin(res.windows[0] ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to load landing windows.");
      });
    return () => controller.abort();
  }, [siteId, year, scanDuration, scanArray]);

  const activeSite = mission.sites.find((s) => s.id === siteId) ?? null;
  const isClassB = activeSite?.has_precomputed_terrain === false;
  const monthGroups = useMemo(() => groupWindowsByMonth(data?.windows ?? []), [data]);
  const topWindows = useMemo(() => (data?.top_windows?.length ? data.top_windows : rankTopWindows(data?.windows ?? [], 5)), [data]);
  const candidateMap = useMemo(() => new Map((data?.windows ?? []).map((w) => [w.start_utc, w])), [data]);

  const handleLoadInCockpit = async (startUtc: string): Promise<void> => {
    if (siteId !== mission.selectedSiteId) await mission.selectSite(siteId);
    await mission.setSchedule(startUtc, scanDuration);
    mission.setActiveTab("cockpit");
  };

  const handlePinWindow = (startUtc: string, rank: number): void => {
    const labelSite = activeSite?.name ?? siteId;
    void pinScenario({
      scenario_id: `${siteId}-win-${startUtc.slice(0, 13)}`,
      label: `${labelSite} (#${rank} · ${startUtc.slice(0, 10)})`,
      request: {
        site_id: siteId,
        start_utc: startUtc,
        duration_days: scanDuration,
        step_minutes: mission.stepMinutes,
        solar_array_type: scanArray,
        fixed_array_azimuth_deg: mission.fixedArrayAzimuthDeg,
        observer_height_m: mission.observerHeightM,
        min_comms_elev_deg: mission.minCommsElevDeg,
      },
    });
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <ScreenHeader
        eyebrow="Screen 5 of 6"
        title="Landing Window Finder"
        description={`Scans candidate ${WINDOW_GRID_STEP_MINUTES}-min launch windows across the lunar year to pinpoint optimal sunlight and Earth link timing.`}
        helpKey="windowsScreen"
        actions={
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="select-surface" aria-label="Window scan site">
              {mission.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.has_precomputed_terrain ? "" : " (Class B)"}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value) as 2026 | 2027 | 2028)}
              className="select-surface"
              aria-label="Window scan year"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
            <select
              value={scanDuration}
              onChange={(e) => setScanDuration(Number(e.target.value) as DurationDays)}
              className="select-surface"
              aria-label="Window duration"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={29.5}>29.5 days</option>
            </select>
            <select
              value={scanArray}
              onChange={(e) => setScanArray(e.target.value as SolarArrayType)}
              className="select-surface"
              aria-label="Window array type"
            >
              <option value="vertical_tracking">Vertical Tracking</option>
              <option value="vertical_fixed">Vertical Fixed</option>
              <option value="horizontal_fixed">Horizontal Fixed</option>
            </select>
          </div>
        }
      />

      {isClassB && (
        <div
          className="panel-card"
          style={{
            borderColor: "var(--accent-warn)",
            background: "var(--surface-warn-soft)",
            color: "var(--accent-warn)",
            padding: "0.7rem 1rem",
            fontSize: "0.82rem",
          }}
        >
          <strong>Terrain model unavailable — spherical limb only</strong> (feasibility scores omitted; cells colored by sunlit fraction).
        </div>
      )}
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

      {loading ? (
        <div className="panel-card" style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
          Scanning {WINDOW_GRID_STEP_MINUTES}-min candidate windows...
        </div>
      ) : (
        <>
          <TopWindowsList
            topWindows={topWindows}
            candidateMap={candidateMap}
            isClassB={isClassB}
            onSelectWindow={(utc) => void handleLoadInCockpit(utc)}
            onPinWindow={handlePinWindow}
          />

          <CollapsibleSection
            title="Annual Monthly Calendar Heatmap"
            subtitle="Explore every screened start date month by month"
            badge={`${data?.windows.length ?? 0} windows`}
            helpKey="windowsScreen"
            defaultOpen={false}
          >
            <WindowMonthGrid
              totalWindows={data?.windows.length ?? 0}
              monthGroups={monthGroups}
              selectedWin={selectedWin}
              isClassB={isClassB}
              onSelectWin={setSelectedWin}
              onLoadInCockpit={(utc) => void handleLoadInCockpit(utc)}
            />
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
