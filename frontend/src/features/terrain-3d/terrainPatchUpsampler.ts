/** Deterministic 64x64 Shackleton Ridge terrain upsampler for coarse Track 0 fixtures (F4.1). */

import { radToDeg, type TerrainPatch } from "../../types";

interface CraterSpec {
  xKm: number;
  northKm: number;
  radiusKm: number;
  depthM: number;
  rimM: number;
}

const CRATERS: readonly CraterSpec[] = [
  { xKm: 5.5, northKm: -5.5, radiusKm: 6.2, depthM: 3750, rimM: 480 },
  { xKm: -7.5, northKm: -4.5, radiusKm: 6.8, depthM: 2950, rimM: 320 },
  { xKm: -3.2, northKm: 6.8, radiusKm: 3.4, depthM: 1150, rimM: 210 },
  { xKm: 11.5, northKm: 3.2, radiusKm: 2.9, depthM: 920, rimM: 180 },
  { xKm: -13.2, northKm: 2.5, radiusKm: 3.1, depthM: 1050, rimM: 190 },
  { xKm: 1.8, northKm: -14.0, radiusKm: 3.5, depthM: 1200, rimM: 220 },
  { xKm: -11.0, northKm: -13.5, radiusKm: 2.6, depthM: 820, rimM: 150 },
  { xKm: 13.8, northKm: -12.0, radiusKm: 2.4, depthM: 760, rimM: 140 },
  { xKm: -5.0, northKm: 14.5, radiusKm: 2.8, depthM: 880, rimM: 170 },
  { xKm: 14.5, northKm: 11.0, radiusKm: 2.2, depthM: 680, rimM: 130 },
  { xKm: 3.4, northKm: 3.6, radiusKm: 1.5, depthM: 420, rimM: 95 },
  { xKm: -4.4, northKm: 1.8, radiusKm: 1.7, depthM: 480, rimM: 105 },
];

function gaussian2D(dx: number, dn: number, sx: number, sn: number): number {
  return Math.exp(-0.5 * ((dx / sx) ** 2 + (dn / sn) ** 2));
}

function craterProfile(dist: number, radius: number, depthM: number, rimM: number): number {
  const r = dist / radius;
  if (r < 0.86) {
    const bowl = Math.cos((r / 0.86) * (Math.PI * 0.5));
    return -depthM * Math.pow(bowl, 1.35) + rimM * Math.exp(-((r - 0.96) ** 2) / 0.04);
  }
  if (r < 2.1) {
    return rimM * Math.exp(-((r - 0.98) ** 2) / 0.09);
  }
  return 0;
}

function evaluateShackletonElevation(xKm: number, northKm: number, centerM: number): { elevM: number; isPsr: number } {
  const distCenter = Math.hypot(xKm, northKm);
  // Connecting ridge spine running NW-SE through (0, 0)
  const perpRidge = (xKm + northKm) * Math.SQRT1_2;
  const alongRidge = (xKm - northKm) * Math.SQRT1_2;
  const ridgeBase = centerM - 160 * (1 - Math.exp(-(perpRidge ** 2) / 22)) - 0.55 * alongRidge ** 2;

  // Horizon-matched azimuthal massifs (Az ~40 NE, Az ~230 SW) & SE DTE saddle (Az ~130)
  const neMassif = 920 * gaussian2D(xKm - 8.2, northKm - 9.8, 4.5, 4.2);
  const swMassif = 740 * gaussian2D(xKm + 9.4, northKm + 7.8, 4.6, 4.4);
  const nwShoulder = 340 * gaussian2D(xKm + 8.5, northKm - 10.5, 5.0, 4.5);
  const seSaddle = -260 * gaussian2D(xKm - 9.2, northKm + 7.6, 5.2, 4.5);

  // Subtle multi-frequency regolith undulation suppressed near center landing pad
  const padBlend = Math.min(1, Math.max(0, (distCenter - 0.9) / 2.2));
  const micro = padBlend * (42 * Math.sin(xKm * 0.72 + northKm * 0.41) + 26 * Math.cos(xKm * 1.15 - northKm * 0.95));

  let craterDelta = 0;
  let psrFlag = 0;
  for (let i = 0; i < CRATERS.length; i += 1) {
    const c = CRATERS[i];
    const d = Math.hypot(xKm - c.xKm, northKm - c.northKm);
    craterDelta += craterProfile(d, c.radiusKm, c.depthM, c.rimM);
    if (i < 2 && d < c.radiusKm * 0.62) {
      psrFlag = 1;
    } else if (i >= 2 && d < c.radiusKm * 0.35 && c.depthM > 800) {
      psrFlag = 1;
    }
  }

  // Smoothly anchor exact landing site center near centerM
  const centerAnchor = Math.exp(-(distCenter ** 2) / 1.4);
  const rawElev = ridgeBase + neMassif + swMassif + nwShoulder + seSaddle + micro + craterDelta;
  const elevM = rawElev * (1 - centerAnchor) + centerM * centerAnchor;
  return { elevM, isPsr: elevM < -550 ? 1 : psrFlag };
}

/** Upgrade coarse (<64x64) Track 0 TerrainPatch fixtures to realistic 64x64 lunar crater terrain. */
export function prepareTerrainPatch(patch: TerrainPatch): TerrainPatch {
  if (patch.grid_size >= 64) {
    return patch;
  }
  const n = 64;
  const total = n * n;
  const spanKm = patch.patch_radius_km * 2.0;
  const stepM = (spanKm * 1000.0) / (n - 1);
  const elevations = new Array<number>(total);
  const slopes = new Array<number>(total);
  const psrMask = new Array<number>(total);

  let minElev = Infinity;
  let maxElev = -Infinity;
  for (let r = 0; r < n; r += 1) {
    const northKm = (r / (n - 1) - 0.5) * spanKm;
    for (let c = 0; c < n; c += 1) {
      const xKm = (c / (n - 1) - 0.5) * spanKm;
      const { elevM, isPsr } = evaluateShackletonElevation(xKm, northKm, patch.center_elevation_m);
      const idx = r * n + c;
      elevations[idx] = Number(elevM.toFixed(1));
      psrMask[idx] = isPsr;
      minElev = Math.min(minElev, elevM);
      maxElev = Math.max(maxElev, elevM);
    }
  }

  for (let r = 0; r < n; r += 1) {
    const r0 = Math.max(0, r - 1);
    const r1 = Math.min(n - 1, r + 1);
    for (let c = 0; c < n; c += 1) {
      const c0 = Math.max(0, c - 1);
      const c1 = Math.min(n - 1, c + 1);
      const dzdx = (elevations[r * n + c1] - elevations[r * n + c0]) / ((c1 - c0) * stepM);
      const dzdy = (elevations[r1 * n + c] - elevations[r0 * n + c]) / ((r1 - r0) * stepM);
      slopes[r * n + c] = Number(radToDeg(Math.atan(Math.hypot(dzdx, dzdy))).toFixed(2));
    }
  }

  return {
    ...patch,
    grid_size: n,
    min_elevation_m: Number(minElev.toFixed(1)),
    max_elevation_m: Number(maxElev.toFixed(1)),
    elevations_m_flat: elevations,
    slopes_deg_flat: slopes,
    psr_mask_flat: psrMask,
  };
}
