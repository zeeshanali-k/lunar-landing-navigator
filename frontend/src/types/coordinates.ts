/** Display-only formatting helpers. No physics lives in the frontend: every
 * physical quantity is computed by the API and rendered as received. */

export function degToRad(angleDeg: number): number {
  return (angleDeg * Math.PI) / 180.0;
}

export function radToDeg(angleRad: number): number {
  return (angleRad * 180.0) / Math.PI;
}

/** Normalize an azimuth in degrees into [0, 360) for rendering only. */
export function normalizeAzimuthDeg(azDeg: number): number {
  const mod = azDeg % 360.0;
  return mod < 0 ? mod + 360.0 : mod;
}
