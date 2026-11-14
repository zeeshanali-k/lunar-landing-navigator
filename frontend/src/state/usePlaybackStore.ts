/** Isolated 60fps playback state store so timeline scrubbing avoids full-app re-renders (F3.1). */

import { create } from "zustand";

export type PlaybackSpeed = 1 | 6 | 24;

export interface PlaybackState {
  currentIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  setTotalSteps: (totalSteps: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToIndex: (index: number) => void;
  togglePlaying: () => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  resetPlayback: (totalSteps?: number) => void;
}

function clampIndex(index: number, totalSteps: number): number {
  const maxIdx = Math.max(0, totalSteps - 1);
  if (index < 0) {
    return 0;
  }
  if (index > maxIdx) {
    return maxIdx;
  }
  return Math.trunc(index);
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentIndex: 0,
  totalSteps: 1,
  isPlaying: false,
  playbackSpeed: 6,

  setTotalSteps: (totalSteps) =>
    set((state) => {
      const normalizedTotal = Math.max(1, totalSteps);
      return {
        totalSteps: normalizedTotal,
        currentIndex: clampIndex(state.currentIndex, normalizedTotal),
      };
    }),

  stepForward: () =>
    set((state) => {
      const next = state.currentIndex + 1;
      return {
        currentIndex: next >= state.totalSteps ? 0 : next,
      };
    }),

  stepBackward: () =>
    set((state) => {
      const prev = state.currentIndex - 1;
      return {
        currentIndex: prev < 0 ? Math.max(0, state.totalSteps - 1) : prev,
      };
    }),

  jumpToIndex: (index) =>
    set((state) => ({
      currentIndex: clampIndex(index, state.totalSteps),
    })),

  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  resetPlayback: (totalSteps) =>
    set((state) => ({
      currentIndex: 0,
      isPlaying: false,
      totalSteps: totalSteps !== undefined ? Math.max(1, totalSteps) : state.totalSteps,
    })),
}));
