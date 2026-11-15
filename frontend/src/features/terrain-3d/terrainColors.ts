/** Pure vertex color mapping utilities for 3D local_enu lunar terrain meshes (F4.1). */

import type { TerrainPatch } from "../../types";

export type TerrainSurfaceMode = "regolith" | "elevation" | "slope" | "psr";

export const SURFACE_MODE_LABELS: Record<TerrainSurfaceMode, string> = {
  regolith: "Regolith",
  elevation: "Elevation",
  slope: "Slope Hazard",
  psr: "PSR Frost",
};

type RGB = [number, number, number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(c1: RGB, c2: RGB, t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  return [lerp(c1[0], c2[0], clamped), lerp(c1[1], c2[1], clamped), lerp(c1[2], c2[2], clamped)];
}

function hypsometricColor(t: number): RGB {
  const stops: RGB[] = [
    [0.1, 0.22, 0.52],
    [0.18, 0.48, 0.62],
    [0.72, 0.62, 0.34],
    [0.98, 0.84, 0.38],
  ];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  return lerpRGB(stops[idx], stops[idx + 1], scaled - idx);
}

/** Sample normalized RGB [0..1] for a single terrain vertex under the chosen surface mode. */
export function sampleTerrainVertexRGB(
  mode: TerrainSurfaceMode,
  elevationM: number,
  minElevM: number,
  maxElevM: number,
  slopeDeg: number,
  psrFlag = 0,
): RGB {
  const span = Math.max(1e-6, maxElevM - minElevM);
  const normElev = Math.max(0, Math.min(1, (elevationM - minElevM) / span));

  if (mode === "elevation") {
    return hypsometricColor(normElev);
  }

  if (mode === "slope") {
    if (slopeDeg < 7.0) {
      return [0.12, 0.76, 0.48];
    }
    if (slopeDeg <= 15.0) {
      return [0.95, 0.65, 0.12];
    }
    return [0.9, 0.22, 0.26];
  }

  if (mode === "psr") {
    if (psrFlag > 0) {
      return [0.18, 0.85, 0.96];
    }
    const base = 0.28 + normElev * 0.24;
    return [base, base * 1.02, base * 1.06];
  }

  const slopeShade = Math.max(0, Math.min(1, slopeDeg / 30.0)) * 0.08;
  const albedo = Math.max(0.52, Math.min(0.78, 0.54 + normElev * 0.22 - slopeShade));
  return [albedo, albedo * 0.99, albedo * 0.97];
}

/** Build a flat Float32Array RGB vertex color buffer (grid_size * grid_size * 3). */
export function buildTerrainColorBuffer(patch: TerrainPatch, mode: TerrainSurfaceMode): Float32Array {
  const totalVertices = patch.grid_size * patch.grid_size;
  const colors = new Float32Array(totalVertices * 3);
  const { min_elevation_m: minE, max_elevation_m: maxE } = patch;
  const psrMask = (patch as { psr_mask_flat?: number[] }).psr_mask_flat;

  for (let i = 0; i < totalVertices; i += 1) {
    const elev = patch.elevations_m_flat[i] ?? patch.center_elevation_m;
    const slope = patch.slopes_deg_flat[i] ?? 0;
    const psr = psrMask?.[i] ?? (elev < -550 ? 1 : 0);
    const [r, g, b] = sampleTerrainVertexRGB(mode, elev, minE, maxE, slope, psr);
    const offset = i * 3;
    colors[offset] = r;
    colors[offset + 1] = g;
    colors[offset + 2] = b;
  }

  return colors;
}
