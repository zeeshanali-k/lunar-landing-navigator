/** Annual landing-window screening heatmap over precomputed ephemeris data (P1-WINDOWS). */

import { useEffect, useMemo, useState } from "react";
import { CalendarSearch, Compass } from "lucide-react";
import { isAbortError, scanWindows } from "../../services";
import { useComparisonStore, useMissionStore } from "../../state";
import type { DurationDays, SolarArrayType, WindowCandidate, WindowsResponse } from "../../types";
import { TopWindowsList } from "./TopWindowsList";
import { getWindowCellColor, groupWindowsByMonth, rankTopWindows, WINDOW_GRID_STEP_MINUTES } from "./windowMath";

export function WindowHeatmapView() {
  const {
    sites, selectedSiteId, durationDays, stepMinutes, solarArrayType, fixedArrayAzimuthDeg,
    observerHeightM, minCommsElevDeg, selectSite, setSchedule, setActiveTab,
  } = useMissionStore();
  const pinScenario = useComparisonStore((s) => s.pinScenario);

  const [siteId, setSiteId] = useState(selectedSiteId ?? "artemis-shackleton-ridge");
  const [scanDuration, setScanDuration] = useState<DurationDays>(durationDays);
  const [scanArray, setScanArray] = useState<SolarArrayType>(solarArrayType);
  const [year, setYear] = useState<2027 | 2028>(2027);
  const [data, setData] = useState<WindowsResponse | null>(null);
  const [selectedWin, setSelectedWin] = useState<WindowCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSiteId) setSiteId(selectedSiteId);
  }, [selectedSiteId]);

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

  const activeSite = sites.find((s) => s.id === siteId) ?? null;
  const isClassB = activeSite?.has_precomputed_terrain === false;
  const monthGroups = useMemo(() => groupWindowsByMonth(data?.windows ?? []), [data]);
  const topWindows = useMemo(
    () => (data?.top_windows?.length ? data.top_windows : rankTopWindows(data?.windows ?? [], 5)),
    [data],
  );
  const candidateMap = useMemo(
    () => new Map((data?.windows ?? []).map((w) => [w.start_utc, w])),
    [data],
  );

  const handleLoadInCockpit = async (startUtc: string): Promise<void> => {
    if (siteId !== selectedSiteId) await selectSite(siteId);
    await setSchedule(startUtc, scanDuration);
    setActiveTab("cockpit");
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
        step_minutes: stepMinutes,
        solar_array_type: scanArray,
        fixed_array_azimuth_deg: fixedArrayAzimuthDeg,
        observer_height_m: observerHeightM,
        min_comms_elev_deg: minCommsElevDeg,
      },
    });
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel-card panel-row">
        <div>
          <h2 className="panel-title"><span><CalendarSearch size={14} /> Annual Landing-Window Screening Heatmap</span></h2>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>
            {WINDOW_GRID_STEP_MINUTES}-minute screening grid (versus 10/60-min `evaluate`) · Polar seasonality: annual (~365d) cycle with ~18.6-year nodal modulation
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", fontSize: "0.78rem" }}>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="select-surface" aria-label="Window scan site">
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.has_precomputed_terrain ? "" : " (Class B)"}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value) as 2027 | 2028)} className="select-surface" aria-label="Window scan year">
            <option value={2027}>2027</option>
            <option value={2028}>2028 (Jan–Jun)</option>
          </select>
          <select value={scanDuration} onChange={(e) => setScanDuration(Number(e.target.value) as DurationDays)} className="select-surface" aria-label="Window duration">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={29.5}>29.5 days</option>
          </select>
          <select value={scanArray} onChange={(e) => setScanArray(e.target.value as SolarArrayType)} className="select-surface" aria-label="Window array type">
            <option value="vertical_tracking">Vertical Tracking</option>
            <option value="vertical_fixed">Vertical Fixed</option>
            <option value="horizontal_fixed">Horizontal Fixed</option>
          </select>
        </div>
      </section>

      {isClassB && (
        <div className="panel-card" style={{ borderColor: "var(--accent-warn)", color: "#fde68a", padding: "0.65rem 1rem", fontSize: "0.82rem" }}>
          <strong>Terrain model unavailable — spherical limb only</strong> (feasibility scores omitted; cells colored by sunlit fraction).
        </div>
      )}

      {error && <div className="panel-card" style={{ borderColor: "var(--accent-danger)", color: "#fca5a5", fontSize: "0.82rem" }}>{error}</div>}

      {loading ? (
        <div className="panel-card" style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>Scanning {WINDOW_GRID_STEP_MINUTES}-min candidate windows...</div>
      ) : (
        <>
          <section className="panel-card" style={{ padding: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <strong style={{ fontSize: "0.84rem" }}>Candidate Heatmap ({data?.windows.length ?? 0} windows)</strong>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Green ≥ 82 · Blue ≥ 70 · Amber ≥ 55 · Red &lt; 40</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "0.65rem" }}>
              {monthGroups.map((group) => (
                <div key={group.monthKey} style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: "0.5rem", padding: "0.55rem", display: "grid", gap: "0.4rem" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#cbd5e1" }}>{group.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {group.windows.map((win) => {
                      const active = selectedWin?.start_utc === win.start_utc;
                      const bg = getWindowCellColor(isClassB ? null : win.feasibility_score, win.sunlit_fraction);
                      return (
                        <button
                          key={win.start_utc}
                          type="button"
                          onClick={() => setSelectedWin(win)}
                          title={`${win.start_utc} · Score ${isClassB ? "N/A" : win.feasibility_score.toFixed(1)} · Sun ${(win.sunlit_fraction * 100).toFixed(0)}%`}
                          style={{
                            width: "18px", height: "18px", borderRadius: "3px", padding: 0, cursor: "pointer",
                            background: bg, border: active ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.15)",
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
              <div className="panel-row" style={{ display: "flex", background: "#0b1120", padding: "0.65rem 0.85rem", borderRadius: "0.5rem", border: "1px solid var(--border-subtle)", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.78rem", display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
                  <strong>{selectedWin.start_utc}</strong>
                  <span>Score: <strong>{isClassB ? "N/A" : selectedWin.feasibility_score.toFixed(1)}</strong></span>
                  <span>Sunlit: {(selectedWin.sunlit_fraction * 100).toFixed(1)}%</span>
                  <span>DTE: {(selectedWin.dte_fraction * 100).toFixed(1)}%</span>
                  <span>Max Dark: {selectedWin.longest_dark_streak_hours.toFixed(1)}h</span>
                </div>
                <button type="button" onClick={() => void handleLoadInCockpit(selectedWin.start_utc)} className="btn-surface" style={{ fontSize: "0.74rem", borderColor: "var(--accent-dte)" }}>
                  <Compass size={13} /> Load in Cockpit
                </button>
              </div>
            )}
          </section>

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
