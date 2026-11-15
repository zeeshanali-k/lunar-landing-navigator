/** Annual landing-window screening heatmap over precomputed ephemeris data (P1-WINDOWS). */

import { useEffect, useMemo, useState } from "react";
import { CalendarSearch } from "lucide-react";
import { isAbortError, scanWindows } from "../../services";
import { useComparisonStore, useMissionStore } from "../../state";
import type { DurationDays, SolarArrayType, CandidateWindow, WindowsResponse } from "../../types";
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
  const [selectedWin, setSelectedWin] = useState<CandidateWindow | null>(null);
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
      <section className="panel-card panel-row">
        <div>
          <h2 className="panel-title">
            <span>
              <CalendarSearch size={14} /> Annual Landing-Window Screening Heatmap
            </span>
          </h2>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>
            {WINDOW_GRID_STEP_MINUTES}-minute screening grid (versus 10/60-min `evaluate`) · Polar seasonality: annual (~365d) cycle with
            ~18.6-year nodal modulation
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", fontSize: "0.78rem" }}>
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
      </section>

      {isClassB && (
        <div
          className="panel-card"
          style={{ borderColor: "var(--accent-warn)", color: "#fde68a", padding: "0.65rem 1rem", fontSize: "0.82rem" }}
        >
          <strong>Terrain model unavailable — spherical limb only</strong> (feasibility scores omitted; cells colored by sunlit fraction).
        </div>
      )}
      {error && (
        <div className="panel-card" style={{ borderColor: "var(--accent-danger)", color: "#fca5a5", fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="panel-card" style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
          Scanning {WINDOW_GRID_STEP_MINUTES}-min candidate windows...
        </div>
      ) : (
        <>
          <WindowMonthGrid
            totalWindows={data?.windows.length ?? 0}
            monthGroups={monthGroups}
            selectedWin={selectedWin}
            isClassB={isClassB}
            onSelectWin={setSelectedWin}
            onLoadInCockpit={(utc) => void handleLoadInCockpit(utc)}
          />

          <TopWindowsList
            topWindows={topWindows}
            candidateMap={candidateMap}
            isClassB={isClassB}
            onSelectWindow={(utc) => void handleLoadInCockpit(utc)}
            onPinWindow={handlePinWindow}
          />
        </>
      )}
    </div>
  );
}
