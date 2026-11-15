/** Polar stereographic (80S-90S) & equirectangular projections plus NASA map URL builders.
 *
 * Scope note: this is P1 (`P1-MAP`), and it is **rendering geometry only**. It does
 * not compute or assert any scientific value. The site list shown on the map comes
 * from `GET /api/v1/sites`; there is no hardcoded terrain or feature table, and no
 * PSR layer because P0 does not compute permanent shadow (REQ-08).
 *
 * `moonRadiusKm` is a projection parameter supplied by the caller from the API
 * contract, never a constant defined here (REQ-06).
 */

import { degToRad, radToDeg } from "../../types";

export type MapViewMode = "south_pole" | "global";

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

/** South-polar coverage floor: the verified DEM covers 80S..90S (REQ-04). */
export const SOUTH_POLE_MIN_LAT_DEG = -80.0;
export const DEFAULT_POLE_ZOOM = 1.65;

/** Largest stereographic radius for the south-polar cap. */
export function maxStereoRadiusKm(moonRadiusKm: number): number {
  return 2 * moonRadiusKm * Math.tan(degToRad(90 + SOUTH_POLE_MIN_LAT_DEG) / 2);
}

/** Forward polar stereographic projection centred on the South Pole (0E at +y / top). */
export function projectSouthPoleStereoKm(latDeg: number, lonDeg: number, moonRadiusKm: number): { xKm: number; yKm: number; rKm: number } {
  const rKm = 2 * moonRadiusKm * Math.tan(degToRad(90 + latDeg) / 2);
  const lonRad = degToRad(lonDeg);
  return {
    xKm: rKm * Math.sin(lonRad),
    yKm: rKm * Math.cos(lonRad),
    rKm,
  };
}

/** Inverse polar stereographic projection from km offsets to selenographic (lat, lon). */
export function unprojectSouthPoleStereoKm(xKm: number, yKm: number, moonRadiusKm: number): { lat_deg: number; lon_deg: number } {
  const rKm = Math.hypot(xKm, yKm);
  const latDeg = 2 * radToDeg(Math.atan(rKm / (2 * moonRadiusKm))) - 90;
  const lonDeg = rKm < 1e-9 ? 0.0 : radToDeg(Math.atan2(xKm, yKm));
  return { lat_deg: latDeg, lon_deg: lonDeg };
}

/** Project selenographic coordinates into SVG canvas space for South Pole or Global mode. */
export function latLonToSvgPoint(
  latDeg: number,
  lonDeg: number,
  mode: MapViewMode,
  cx: number,
  cy: number,
  radiusPx: number,
  moonRadiusKm: number,
  poleZoom: number = DEFAULT_POLE_ZOOM,
): ProjectedPoint {
  if (mode === "global") {
    return {
      x: cx + (lonDeg / 180.0) * (radiusPx * 1.5),
      y: cy - (latDeg / 90.0) * (radiusPx * 0.75),
      visible: true,
    };
  }
  const effectiveMaxKm = maxStereoRadiusKm(moonRadiusKm) / poleZoom;
  const { xKm, yKm, rKm } = projectSouthPoleStereoKm(latDeg, lonDeg, moonRadiusKm);
  return {
    x: cx + (xKm / effectiveMaxKm) * radiusPx,
    y: cy - (yKm / effectiveMaxKm) * radiusPx,
    visible: latDeg <= SOUTH_POLE_MIN_LAT_DEG + 5.0 && rKm <= effectiveMaxKm * 1.04,
  };
}

/** Inverse project an SVG point back into lunar (lat_deg, lon_deg), or null if outside. */
export function svgPointToLatLon(
  svgX: number,
  svgY: number,
  mode: MapViewMode,
  cx: number,
  cy: number,
  radiusPx: number,
  moonRadiusKm: number,
  poleZoom: number = DEFAULT_POLE_ZOOM,
): { lat_deg: number; lon_deg: number } | null {
  if (mode === "global") {
    const halfW = radiusPx * 1.5;
    const halfH = radiusPx * 0.75;
    if (Math.abs(svgX - cx) > halfW || Math.abs(svgY - cy) > halfH) {
      return null;
    }
    return {
      lat_deg: ((cy - svgY) / halfH) * 90.0,
      lon_deg: ((svgX - cx) / halfW) * 180.0,
    };
  }
  const dxPx = svgX - cx;
  const dyPx = cy - svgY;
  if (Math.hypot(dxPx, dyPx) > radiusPx) {
    return null;
  }
  const effectiveMaxKm = maxStereoRadiusKm(moonRadiusKm) / poleZoom;
  const xKm = (dxPx / radiusPx) * effectiveMaxKm;
  const yKm = (dyPx / radiusPx) * effectiveMaxKm;
  return unprojectSouthPoleStereoKm(xKm, yKm, moonRadiusKm);
}

/** Compute the SVG endpoint for a topocentric Sun/Earth azimuth ray from an active site pin. */
export function computeAzimuthRayEndpoint(
  originX: number,
  originY: number,
  lonDeg: number,
  azimuthDeg: number,
  mode: MapViewMode,
  lengthPx: number,
): { x2: number; y2: number } {
  const angleDeg = mode === "south_pole" ? lonDeg + azimuthDeg : azimuthDeg;
  const rad = degToRad(angleDeg);
  return {
    x2: originX + lengthPx * Math.sin(rad),
    y2: originY - lengthPx * Math.cos(rad),
  };
}

/** Build a centred NASA LROC Quickmap inspection URL for the active lunar coordinate. */
export function buildQuickmapUrl(latDeg: number, lonDeg: number, apiUrl?: string): string {
  if (apiUrl) return apiUrl;
  const base = "https://quickmap.lroc.asu.edu/";
  if (latDeg <= -75) {
    return `${base}?extent=-180,-90,180,-80&proj=22&lat=${latDeg.toFixed(4)}&lon=${lonDeg.toFixed(4)}`;
  }
  return `${base}?lat=${latDeg.toFixed(4)}&lon=${lonDeg.toFixed(4)}`;
}

/** Build a centred NASA Moon Trek inspection URL for the active lunar coordinate. */
export function buildMoonTrekUrl(latDeg: number, lonDeg: number, apiUrl?: string): string {
  if (apiUrl) return apiUrl;
  return `https://trek.nasa.gov/moon/#v=0.1&x=${lonDeg.toFixed(4)}&y=${latDeg.toFixed(4)}&z=6&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104903`;
}
