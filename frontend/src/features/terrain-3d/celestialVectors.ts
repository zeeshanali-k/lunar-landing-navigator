/** Pure coordinate & celestial vector math for 3D Sun/Earth lighting and LOS rays (F4.2). */

import { azElevToThreeXYZ, type TimeseriesPoint } from "../../types";

export interface CelestialSceneVectors {
  sunUnitVec: [number, number, number];
  earthUnitVec: [number, number, number];
  sunLightPos: [number, number, number];
  sunRayEnd: [number, number, number];
  earthRayEnd: [number, number, number];
  mastOrigin: [number, number, number];
  sunIntensity: number;
  isSunlit: boolean;
  isGrazing: boolean;
  isDteVisible: boolean;
}

export interface CardinalMarker {
  label: string;
  azDeg: number;
  xKm: number;
  zKm: number;
}

export const RANGE_RING_RADII_KM: readonly number[] = [5, 10, 20];

const CARDINAL_RADIUS_KM = 21.5;

export const CARDINAL_MARKERS: readonly CardinalMarker[] = [
  { label: "N", azDeg: 0 },
  { label: "E", azDeg: 90 },
  { label: "S", azDeg: 180 },
  { label: "W", azDeg: 270 },
].map(({ label, azDeg }) => {
  const [x, , z] = azElevToThreeXYZ(azDeg, 0);
  return {
    label,
    azDeg,
    xKm: x * CARDINAL_RADIUS_KM,
    zKm: z * CARDINAL_RADIUS_KM,
  };
});

/** Map physical mast/observer height (m) to visible scene scale (km) preserving relative rank. */
export function computeMastVisualOffsetKm(observerHeightM: number): number {
  return 0.35 + Math.max(0.5, observerHeightM) * 0.08;
}

function addScaledVec(
  origin: [number, number, number],
  dir: [number, number, number],
  lengthKm: number,
): [number, number, number] {
  return [
    origin[0] + dir[0] * lengthKm,
    origin[1] + dir[1] * lengthKm,
    origin[2] + dir[2] * lengthKm,
  ];
}

/** Compute Three.js Sun/Earth unit vectors, light placement, and mast LOS endpoints. */
export function computeCelestialSceneVectors(
  point: TimeseriesPoint,
  centerSurfaceYKm: number,
  observerHeightM: number,
  rayLengthKm = 24.0,
): CelestialSceneVectors {
  const sunUnitVec = azElevToThreeXYZ(point.sun_az_deg, point.sun_elev_deg);
  const earthUnitVec = azElevToThreeXYZ(point.earth_az_deg, point.earth_elev_deg);

  const mastHeightKm = computeMastVisualOffsetKm(observerHeightM);
  const mastOrigin: [number, number, number] = [0, centerSurfaceYKm + mastHeightKm, 0];

  const lightDistanceKm = 46.0;
  const sunLightPos = addScaledVec([0, centerSurfaceYKm, 0], sunUnitVec, lightDistanceKm);
  const sunRayEnd = addScaledVec(mastOrigin, sunUnitVec, rayLengthKm);
  const earthRayEnd = addScaledVec(mastOrigin, earthUnitVec, rayLengthKm);

  const isGrazing = point.is_sunlit && point.sun_visible_fraction < 0.95;
  let sunIntensity = 0.0;
  if (point.sun_elev_deg > -0.3) {
    sunIntensity = point.is_sunlit
      ? 1.5 + 1.9 * Math.max(0.15, point.sun_visible_fraction)
      : 1.45;
  }

  return {
    sunUnitVec,
    earthUnitVec,
    sunLightPos,
    sunRayEnd,
    earthRayEnd,
    mastOrigin,
    sunIntensity,
    isSunlit: point.is_sunlit,
    isGrazing,
    isDteVisible: point.is_dte_visible,
  };
}
