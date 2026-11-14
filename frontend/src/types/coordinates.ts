/** Coordinate guardrails and Three.js local_enu axis conversions (ARCH-03). */

export const MOON_RADIUS_KM = 1737.4;
export const POLE_LAT_CLAMP_DEG = 89.9999;

export function degToRad(angleDeg: number): number {
  return (angleDeg * Math.PI) / 180.0;
}

export function radToDeg(angleRad: number): number {
  return (angleRad * 180.0) / Math.PI;
}

/** Clamp latitude away from +-90 deg so meridian North remains well-defined. */
export function clampLunarLatitude(latDeg: number): number {
  if (latDeg > POLE_LAT_CLAMP_DEG) {
    return POLE_LAT_CLAMP_DEG;
  }
  if (latDeg < -POLE_LAT_CLAMP_DEG) {
    return -POLE_LAT_CLAMP_DEG;
  }
  return latDeg;
}

/** Normalize azimuth in degrees into [0, 360). */
export function normalizeAzimuthDeg(azDeg: number): number {
  const mod = azDeg % 360.0;
  return mod < 0 ? mod + 360.0 : mod;
}

/**
 * Convert topocentric (azimuthDeg, elevationDeg) into Three.js world vector:
 * +X = Local East (Az 90), +Y = Up (Elevation), -Z = Local North (Az 0).
 */
export function azElevToThreeXYZ(
  azDeg: number,
  elevDeg: number,
): [number, number, number] {
  const azRad = degToRad(azDeg);
  const elevRad = degToRad(elevDeg);
  const cosElev = Math.cos(elevRad);
  const x = cosElev * Math.sin(azRad);
  const y = Math.sin(elevRad);
  const z = -cosElev * Math.cos(azRad);
  return [x, y, z];
}
