/** Module 4 Fixture Preview Harness mounting all F4.1-F4.7 pure-prop visualizations. */

import { useEffect, useMemo, useState } from "react";
import { Moon, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { EvaluateResponse, SolarArrayType, TerrainPatch } from "./types";
import { LunarTerrainCanvas } from "./features/terrain-3d/LunarTerrainCanvas";
import { PanoramaHorizonChart } from "./features/sky-horizon/PanoramaHorizonChart";
import { PolarSkyDome } from "./features/sky-horizon/PolarSkyDome";
import { MissionTimelinePanel } from "./features/mission-timeline/MissionTimelinePanel";
import { SolarArraySelector } from "./features/mission-timeline/SolarArraySelector";
import { simulateArrayAndMastTimeseries } from "./features/mission-timeline/timelineSegments";
import { EarthMoonContrastCard } from "./features/earth-moon-contrast/EarthMoonContrastCard";

export function App() {
  const [terrain, setTerrain] = useState<TerrainPatch | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [solarArrayType, setSolarArrayType] = useState<SolarArrayType>("vertical_tracking");
  const [observerHeightM, setObserverHeightM] = useState<number>(2.0);
  const [personaMode, setPersonaMode] = useState<"planner" | "explorer">("planner");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/data/fixtures/terrain.sample.json", { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load terrain.sample.json (${r.status})`);
        return r.json() as Promise<TerrainPatch>;
      }),
      fetch("/data/fixtures/evaluate.sample.json", { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load evaluate.sample.json (${r.status})`);
        return r.json() as Promise<EvaluateResponse>;
      }),
    ])
      .then(([terrainData, evalData]) => {
        setTerrain(terrainData);
        setEvaluation(evalData);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") {
          setLoadError(err instanceof Error ? err.message : "Failed to load sample fixtures.");
        }
      });
    return () => controller.abort();
  }, []);

  const simulatedTimeseries = useMemo(() => {
    if (!evaluation) return [];
    return simulateArrayAndMastTimeseries(
      evaluation.timeseries,
      evaluation.horizon_profile,
      solarArrayType,
      observerHeightM,
    );
  }, [evaluation, solarArrayType, observerHeightM]);

  const totalSteps = simulatedTimeseries.length;

  useEffect(() => {
    if (!isPlaying || totalSteps === 0) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSteps);
    }, 350);
    return () => window.clearInterval(timer);
  }, [isPlaying, totalSteps]);

  const active = simulatedTimeseries[currentIndex];
  const maxIndex = Math.max(0, totalSteps - 1);
  const jumpToIndex = (idx: number) => {
    setIsPlaying(false);
    setCurrentIndex(idx);
  };

  return (
    <main style={{ minHeight: "100vh", padding: "1.25rem", maxWidth: "1360px", margin: "0 auto", display: "grid", gap: "1rem" }}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.85rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <Moon size={24} color="#f59e0b" />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.15rem" }}>Lunar Landing Site Navigator — Module 4 Preview</h1>
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {evaluation ? `${evaluation.site.name} (${evaluation.site.lat_deg}°, ${evaluation.site.lon_deg}°)` : "Loading sample fixtures..."}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {(["planner", "explorer"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPersonaMode(mode)}
              style={{
                padding: "0.35rem 0.7rem", fontSize: "0.78rem", borderRadius: "0.45rem", cursor: "pointer",
                border: `1px solid ${personaMode === mode ? "var(--accent-dte)" : "var(--border-subtle)"}`,
                background: personaMode === mode ? "rgba(56, 189, 248, 0.16)" : "transparent",
                color: personaMode === mode ? "#e0f2fe" : "var(--text-muted)",
              }}
            >
              {mode === "planner" ? "Mission Planner" : "Explorer / Educator"}
            </button>
          ))}
        </div>
      </header>

      {loadError && <p style={{ color: "#fda4af", margin: 0 }}>{loadError}</p>}

      {terrain && evaluation && totalSteps > 0 && (
        <>
          <section style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.75rem 1rem", display: "grid", gap: "0.55rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.65rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button type="button" onClick={() => jumpToIndex((currentIndex - 1 + totalSteps) % totalSteps)} style={iconBtnStyle} title="Step Back"><SkipBack size={15} /></button>
                <button type="button" onClick={() => setIsPlaying((p) => !p)} style={iconBtnStyle} title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
                <button type="button" onClick={() => jumpToIndex((currentIndex + 1) % totalSteps)} style={iconBtnStyle} title="Step Forward"><SkipForward size={15} /></button>
                <span style={{ fontSize: "0.8rem", marginLeft: "0.4rem" }}>
                  Step <strong>{currentIndex + 1}</strong> / {totalSteps} · <code>{active?.timestamp_utc}</code>
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <span>Sun El: <strong style={{ color: "var(--accent-sun)" }}>{active?.sun_elev_deg.toFixed(2)}°</strong></span>
                <span>Earth El: <strong style={{ color: "var(--accent-dte)" }}>{active?.earth_elev_deg.toFixed(2)}°</strong></span>
                <span>Power: <strong style={{ color: "var(--accent-ok)" }}>{active ? `${(active.solar_power_factor * 100).toFixed(1)}%` : "—"}</strong></span>
              </div>
            </div>
            <input type="range" min={0} max={maxIndex} value={currentIndex} onChange={(e) => jumpToIndex(Number(e.target.value))} style={{ width: "100%", accentColor: "#f59e0b" }} />
          </section>

          <SolarArraySelector
            timeseries={simulatedTimeseries}
            horizonProfile={evaluation.horizon_profile}
            currentIndex={currentIndex}
            solarArrayType={solarArrayType}
            observerHeightM={observerHeightM}
            onChangeArrayType={setSolarArrayType}
            onChangeObserverHeight={setObserverHeightM}
          />

          <LunarTerrainCanvas terrainPatch={terrain} timeseries={simulatedTimeseries} currentIndex={currentIndex} observerHeightM={observerHeightM} solarArrayType={solarArrayType} />

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(300px, 1fr)", gap: "1rem", alignItems: "start" }}>
            <PanoramaHorizonChart horizonProfile={evaluation.horizon_profile} timeseries={simulatedTimeseries} currentIndex={currentIndex} observerHeightM={observerHeightM} onSelectIndex={jumpToIndex} />
            <PolarSkyDome horizonProfile={evaluation.horizon_profile} timeseries={simulatedTimeseries} currentIndex={currentIndex} observerHeightM={observerHeightM} onSelectIndex={jumpToIndex} />
          </div>

          <MissionTimelinePanel timeseries={simulatedTimeseries} currentIndex={currentIndex} onSelectIndex={jumpToIndex} />
          <EarthMoonContrastCard evaluation={{ ...evaluation, timeseries: simulatedTimeseries }} currentIndex={currentIndex} personaMode={personaMode} />
        </>
      )}
    </main>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.35rem 0.5rem",
  borderRadius: "0.4rem", border: "1px solid var(--border-subtle)", background: "#0b1120", color: "var(--text-primary)", cursor: "pointer",
};

export default App;
