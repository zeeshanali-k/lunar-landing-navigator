/** Module 4 Synchronized Cockpit Preview mounting all F4.1-F4.7 pure-prop views. */

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
    <main style={{ minHeight: "100vh", padding: "0.75rem 1rem", maxWidth: "1440px", margin: "0 auto", display: "grid", gap: "0.65rem" }}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.65rem", background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.55rem 0.9rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <Moon size={22} color="#f59e0b" />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.02rem" }}>Lunar Landing Site Navigator — Module 4 Cockpit</h1>
            <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-muted)" }}>
              {evaluation ? `${evaluation.site.name} (${evaluation.site.lat_deg}°, ${evaluation.site.lon_deg}°)` : "Loading sample fixtures..."}
            </p>
          </div>
        </div>

        {totalSteps > 0 && (
          <div style={{ display: "flex", flex: "1 1 360px", alignItems: "center", gap: "0.5rem", maxWidth: "560px" }}>
            <button type="button" onClick={() => jumpToIndex((currentIndex - 1 + totalSteps) % totalSteps)} style={iconBtnStyle} title="Step Back"><SkipBack size={14} /></button>
            <button type="button" onClick={() => setIsPlaying((p) => !p)} style={iconBtnStyle} title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <Pause size={14} /> : <Play size={14} />}</button>
            <button type="button" onClick={() => jumpToIndex((currentIndex + 1) % totalSteps)} style={iconBtnStyle} title="Step Forward"><SkipForward size={14} /></button>
            <input type="range" min={0} max={maxIndex} value={currentIndex} onChange={(e) => jumpToIndex(Number(e.target.value))} style={{ flex: 1, accentColor: "#f59e0b" }} />
            <code style={{ fontSize: "0.73rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{currentIndex + 1}/{totalSteps} · {active?.timestamp_utc.slice(5, 16)}Z</code>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.35rem" }}>
          {(["planner", "explorer"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPersonaMode(mode)}
              style={{
                padding: "0.3rem 0.6rem", fontSize: "0.75rem", borderRadius: "0.4rem", cursor: "pointer",
                border: `1px solid ${personaMode === mode ? "var(--accent-dte)" : "var(--border-subtle)"}`,
                background: personaMode === mode ? "rgba(56, 189, 248, 0.16)" : "transparent",
                color: personaMode === mode ? "#e0f2fe" : "var(--text-muted)",
              }}
            >
              {mode === "planner" ? "Mission Planner" : "Explorer"}
            </button>
          ))}
        </div>
      </header>

      {loadError && <p style={{ color: "#fda4af", margin: 0 }}>{loadError}</p>}

      {terrain && evaluation && totalSteps > 0 && (
        <>
          <SolarArraySelector
            timeseries={simulatedTimeseries}
            horizonProfile={evaluation.horizon_profile}
            currentIndex={currentIndex}
            solarArrayType={solarArrayType}
            observerHeightM={observerHeightM}
            onChangeArrayType={setSolarArrayType}
            onChangeObserverHeight={setObserverHeightM}
          />

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(360px, 1fr)", gap: "0.7rem", alignItems: "start" }}>
            <LunarTerrainCanvas
              terrainPatch={terrain}
              timeseries={simulatedTimeseries}
              currentIndex={currentIndex}
              observerHeightM={observerHeightM}
              solarArrayType={solarArrayType}
            />
            <div style={{ display: "grid", gap: "0.7rem" }}>
              <PanoramaHorizonChart
                horizonProfile={evaluation.horizon_profile}
                timeseries={simulatedTimeseries}
                currentIndex={currentIndex}
                observerHeightM={observerHeightM}
                onSelectIndex={jumpToIndex}
              />
              <PolarSkyDome
                horizonProfile={evaluation.horizon_profile}
                timeseries={simulatedTimeseries}
                currentIndex={currentIndex}
                observerHeightM={observerHeightM}
                onSelectIndex={jumpToIndex}
              />
            </div>
          </div>

          <MissionTimelinePanel timeseries={simulatedTimeseries} currentIndex={currentIndex} onSelectIndex={jumpToIndex} />
          <EarthMoonContrastCard evaluation={{ ...evaluation, timeseries: simulatedTimeseries }} currentIndex={currentIndex} personaMode={personaMode} />
        </>
      )}
    </main>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.3rem 0.45rem",
  borderRadius: "0.38rem", border: "1px solid var(--border-subtle)", background: "#0b1120", color: "var(--text-primary)", cursor: "pointer",
};

export default App;
