/** 60fps requestAnimationFrame timeline scrubber with speed controls and Sunset/Earthset jumps (F3.5). */

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Radio, Sunset } from "lucide-react";
import { useMissionStore, usePlaybackStore, type PlaybackSpeed } from "../../state";
import type { TimeseriesPoint } from "../../types";

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 6, 24];

function findNextTransitionIndex(
  points: TimeseriesPoint[],
  currentIndex: number,
  isVisible: (pt: TimeseriesPoint) => boolean,
  fallbackMetric: (pt: TimeseriesPoint) => number,
): number {
  const count = points.length;
  if (count <= 1) return 0;

  for (let offset = 1; offset < count; offset++) {
    const idx = (currentIndex + offset) % count;
    if (idx === 0) continue;
    if (isVisible(points[idx - 1]) && !isVisible(points[idx])) {
      return idx;
    }
  }

  let minIdx = 0;
  for (let i = 1; i < count; i++) {
    if (fallbackMetric(points[i]) < fallbackMetric(points[minIdx])) {
      minIdx = i;
    }
  }
  return minIdx;
}

function formatUtcCompact(isoUtc: string): string {
  return isoUtc.replace("T", " ").replace(":00Z", " UTC").replace("Z", " UTC");
}

export function PlaybackScrubber() {
  const evaluationData = useMissionStore((s) => s.evaluationData);
  const startUtc = useMissionStore((s) => s.startUtc);

  const currentIndex = usePlaybackStore((s) => s.currentIndex);
  const totalSteps = usePlaybackStore((s) => s.totalSteps);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const playbackSpeed = usePlaybackStore((s) => s.playbackSpeed);
  const stepForward = usePlaybackStore((s) => s.stepForward);
  const stepBackward = usePlaybackStore((s) => s.stepBackward);
  const jumpToIndex = usePlaybackStore((s) => s.jumpToIndex);
  const togglePlaying = usePlaybackStore((s) => s.togglePlaying);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const setPlaybackSpeed = usePlaybackStore((s) => s.setPlaybackSpeed);

  const rafIdRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      return;
    }

    lastStepTimeRef.current = performance.now();
    const stepIntervalMs = 1000 / playbackSpeed;

    const tick = (now: number): void => {
      if (now - lastStepTimeRef.current >= stepIntervalMs) {
        lastStepTimeRef.current = now;
        stepForward();
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [isPlaying, playbackSpeed, stepForward]);

  const points = evaluationData?.timeseries ?? [];
  const currentPoint = points[currentIndex] ?? null;

  const handleJumpSunset = (): void => {
    if (points.length === 0) return;
    setPlaying(false);
    jumpToIndex(
      findNextTransitionIndex(
        points,
        currentIndex,
        (p) => p.is_sunlit,
        (p) => p.sun_elev_deg,
      ),
    );
  };

  const handleJumpEarthset = (): void => {
    if (points.length === 0) return;
    setPlaying(false);
    jumpToIndex(
      findNextTransitionIndex(
        points,
        currentIndex,
        (p) => p.is_dte_visible,
        (p) => p.earth_clearance_deg,
      ),
    );
  };

  return (
    <section className="panel-card" style={{ gap: "0.6rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <button type="button" onClick={stepBackward} className="btn-surface" title="Previous step" aria-label="Previous step">
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={togglePlaying}
            className="btn-surface"
            style={{ borderColor: isPlaying ? "var(--accent-sun)" : "var(--border-subtle)" }}
          >
            {isPlaying ? <Pause size={14} color="var(--accent-sun)" /> : <Play size={14} color="var(--accent-ok)" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button type="button" onClick={stepForward} className="btn-surface" title="Next step" aria-label="Next step">
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }} role="group" aria-label="Playback speed">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackSpeed(speed)}
              className={`category-pill ${playbackSpeed === speed ? "active" : ""}`}
            >
              {speed} hr/s
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: "200px", display: "grid", gap: "0.2rem" }}>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentIndex}
            onChange={(e) => {
              setPlaying(false);
              jumpToIndex(Number(e.target.value));
            }}
            style={{ width: "100%", margin: 0, cursor: "pointer" }}
            aria-label="Mission timeline scrubber"
          />
          {points.length > 0 && (
            <div
              style={{ display: "flex", height: "4px", borderRadius: "999px", overflow: "hidden", gap: "1px" }}
              title="Solar illumination strip (Gold = Sunlit, Dark = Shadow)"
            >
              {points.map((pt, idx) => (
                <span
                  key={pt.timestamp_utc}
                  style={{
                    flex: 1,
                    background: !pt.is_sunlit ? "#1e293b" : pt.sun_visible_fraction < 0.99 ? "#fbbf24" : "#f59e0b",
                    opacity: idx === currentIndex ? 1 : 0.72,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          Step <strong>{currentIndex + 1}</strong>/{totalSteps} • {formatUtcCompact(currentPoint?.timestamp_utc ?? startUtc)}
        </span>

        <div style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button type="button" onClick={handleJumpSunset} className="btn-surface" style={{ fontSize: "0.76rem" }}>
            <Sunset size={13} color="var(--accent-sun)" />
            <span>Jump to Next Sunset</span>
          </button>
          <button type="button" onClick={handleJumpEarthset} className="btn-surface" style={{ fontSize: "0.76rem" }}>
            <Radio size={13} color="var(--accent-dte)" />
            <span>Jump to Next Earthset</span>
          </button>
        </div>
      </div>
    </section>
  );
}
