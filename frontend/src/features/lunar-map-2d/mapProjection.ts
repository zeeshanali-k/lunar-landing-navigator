/** Polar stereographic (80S-90S) & equirectangular projections + NASA map URL builders (F3.4). */

import { clampLunarLatitude, degToRad, MOON_RADIUS_KM, radToDeg } from "../../types";

export type MapViewMode = "south_pole" | "global";
export type MapOverlayLayer = "elevation" | "slope" | "psr";

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

export type LabelSide = "left" | "right" | "top" | "bottom";

export interface SouthPoleFeature {
  name: string;
  lat_deg: number;
  lon_deg: number;
  radius_km: number;
  kind: "psr_crater" | "massif";
  elevation_hint_m: number;
  slope_hint_deg: number;
  labelSide: LabelSide;
}

export const SOUTH_POLE_MIN_LAT_DEG = -80.0;
export const DEFAULT_POLE_ZOOM = 1.65;
export const MAX_STEREO_RADIUS_KM =
  2 * MOON_RADIUS_KM * Math.tan(degToRad(90 + SOUTH_POLE_MIN_LAT_DEG) / 2);

export const SOUTH_POLE_FEATURES: SouthPoleFeature[] = [
  { name: "Shackleton", lat_deg: -89.9, lon_deg: 0.0, radius_km: 10.5, kind: "psr_crater", elevation_hint_m: -4200, slope_hint_deg: 28, labelSide: "bottom" },
  { name: "Shoemaker", lat_deg: -88.1, lon_deg: 44.9, radius_km: 25.5, kind: "psr_crater", elevation_hint_m: -3800, slope_hint_deg: 19, labelSide: "top" },
  { name: "Haworth", lat_deg: -87.5, lon_deg: -4.0, radius_km: 25.7, kind: "psr_crater", elevation_hint_m: -4100, slope_hint_deg: 21, labelSide: "left" },
  { name: "Faustini", lat_deg: -87.3, lon_deg: 77.0, radius_km: 21.0, kind: "psr_crater", elevation_hint_m: -3500, slope_hint_deg: 17, labelSide: "right" },
  { name: "de Gerlache", lat_deg: -88.5, lon_deg: -87.1, radius_km: 16.2, kind: "psr_crater", elevation_hint_m: -3400, slope_hint_deg: 22, labelSide: "left" },
  { name: "Cabeus", lat_deg: -84.9, lon_deg: -35.5, radius_km: 48.0, kind: "psr_crater", elevation_hint_m: -4500, slope_hint_deg: 16, labelSide: "left" },
  { name: "Mons Mouton", lat_deg: -84.65, lon_deg: 31.2, radius_km: 30.0, kind: "massif", elevation_hint_m: 5320, slope_hint_deg: 4, labelSide: "right" },
  { name: "Malapert", lat_deg: -85.97, lon_deg: -2.7, radius_km: 22.0, kind: "massif", elevation_hint_m: 4950, slope_hint_deg: 6, labelSide: "top" },
];

/** Forward polar stereographic projection centered on South Pole (0E at +y / top). */
export function projectSouthPoleStereoKm(
  latDeg: number,
  lonDeg: number,
): { xKm: number; yKm: number; rKm: number } {
  const clampedLat = clampLunarLatitude(latDeg);
  const rKm = 2 * MOON_RADIUS_KM * Math.tan(degToRad(90 + clampedLat) / 2);
  const lonRad = degToRad(lonDeg);
  return {
    xKm: rKm * Math.sin(lonRad),
    yKm: rKm * Math.cos(lonRad),
    rKm,
  };
}

/** Inverse polar stereographic projection from km offsets to selenographic (lat, lon). */
export function unprojectSouthPoleStereoKm(
  xKm: number,
  yKm: number,
): { lat_deg: number; lon_deg: number } {
  const rKm = Math.hypot(xKm, yKm);
  const latDeg = clampLunarLatitude(2 * radToDeg(Math.atan(rKm / (2 * MOON_RADIUS_KM))) - 90);
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
  poleZoom: number = DEFAULT_POLE_ZOOM,
): ProjectedPoint {
  if (mode === "global") {
    return {
      x: cx + (lonDeg / 180.0) * (radiusPx * 1.5),
      y: cy - (latDeg / 90.0) * (radiusPx * 0.75),
      visible: true,
    };
  }
  const effectiveMaxKm = MAX_STEREO_RADIUS_KM / poleZoom;
  const { xKm, yKm, rKm } = projectSouthPoleStereoKm(latDeg, lonDeg);
  return {
    x: cx + (xKm / effectiveMaxKm) * radiusPx,
    y: cy - (yKm / effectiveMaxKm) * radiusPx,
    visible: latDeg <= -75.0 && rKm <= effectiveMaxKm * 1.04,
  };
}

/** Inverse project an SVG click/hover point back into lunar (lat_deg, lon_deg). */
export function svgPointToLatLon(
  svgX: number,
  svgY: number,
  mode: MapViewMode,
  cx: number,
  cy: number,
  radiusPx: number,
  poleZoom: number = DEFAULT_POLE_ZOOM,
): { lat_deg: number; lon_deg: number } | null {
  if (mode === "global") {
    const halfW = radiusPx * 1.5;
    const halfH = radiusPx * 0.75;
    if (Math.abs(svgX - cx) > halfW || Math.abs(svgY - cy) > halfH) {
      return null;
    }
    return {
      lat_deg: clampLunarLatitude(((cy - svgY) / halfH) * 90.0),
      lon_deg: ((svgX - cx) / halfW) * 180.0,
    };
  }
  const dxPx = svgX - cx;
  const dyPx = cy - svgY;
  if (Math.hypot(dxPx, dyPx) > radiusPx) {
    return null;
  }
  const effectiveMaxKm = MAX_STEREO_RADIUS_KM / poleZoom;
  const xKm = (dxPx / radiusPx) * effectiveMaxKm;
  const yKm = (dyPx / radiusPx) * effectiveMaxKm;
  return unprojectSouthPoleStereoKm(xKm, yKm);
}

/** Compute SVG endpoint for a topocentric Sun/Earth azimuth ray from an active site pin. */
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

/** Build a centered NASA LROC Quickmap inspection URL for the active lunar coordinate. */
export function buildQuickmapUrl(latDeg: number, lonDeg: number, fallbackUrl?: string): string {
  if (fallbackUrl) return fallbackUrl;
  const base = "https://quickmap.lroc.asu.edu/";
  if (latDeg <= -75) {
    return `${base}?extent=-180,-90,180,-80&proj=22&lat=${latDeg.toFixed(4)}&lon=${lonDeg.toFixed(4)}`;
  }
  return `${base}?lat=${latDeg.toFixed(4)}&lon=${lonDeg.toFixed(4)}`;
}

/** Build a centered NASA Moon Trek inspection URL for the active lunar coordinate. */
export function buildMoonTrekUrl(latDeg: number, lonDeg: number, fallbackUrl?: string): string {
  if (fallbackUrl) return fallbackUrl;
  return `https://trek.nasa.gov/moon/#v=0.1&x=${lonDeg.toFixed(4)}&y=${latDeg.toFixed(4)}&z=6&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104903`;
}

/** Return non-overlapping SVG label coordinates and anchor for a South Pole feature. */
export function getFeatureLabelProps(
  x: number,
  y: number,
  rPx: number,
  side: LabelSide,
): { x: number; y: number; textAnchor: "start" | "middle" | "end" } {
  if (side === "left") return { x: x - rPx - 3.5, y: y + 2, textAnchor: "end" };
  if (side === "right") return { x: x + rPx + 3.5, y: y + 2, textAnchor: "start" };
  if (side === "top") return { x, y: y - rPx - 3.5, textAnchor: "middle" };
  return { x, y: y + rPx + 7.5, textAnchor: "middle" };
}

/** Return fill and stroke colors for South Pole features under the active map overlay. */
export function getOverlayFeatureStyle(
  feature: SouthPoleFeature,
  layer: MapOverlayLayer,
): { fill: string; stroke: string } {
  if (layer === "psr") {
    return feature.kind === "psr_crater"
      ? { fill: "rgba(56, 189, 248, 0.28)", stroke: "#38bdf8" }
      : { fill: "rgba(148, 163, 184, 0.10)", stroke: "rgba(148, 163, 184, 0.35)" };
  }
  if (layer === "slope") {
    if (feature.slope_hint_deg >= 20) return { fill: "rgba(239, 68, 68, 0.28)", stroke: "#ef4444" };
    if (feature.slope_hint_deg >= 10) return { fill: "rgba(245, 158, 11, 0.24)", stroke: "#f59e0b" };
    return { fill: "rgba(16, 185, 129, 0.24)", stroke: "#10b981" };
  }
  return feature.elevation_hint_m >= 0
    ? { fill: "rgba(245, 158, 11, 0.22)", stroke: "#f59e0b" }
    : { fill: "rgba(59, 130, 246, 0.22)", stroke: "#60a5fa" };
}

/** Format a rich hover tooltip string for a South Pole crater or massif. */
export function formatFeatureTooltip(f: SouthPoleFeature): string {
  const kindLabel = f.kind === "psr_crater" ? "PSR Crater" : "Massif";
  const elevSign = f.elevation_hint_m >= 0 ? "+" : "";
  return `${f.name} (${kindLabel}) • ${f.lat_deg.toFixed(1)}°, ${f.lon_deg.toFixed(1)}° • Elev ${elevSign}${f.elevation_hint_m}m • Slope ${f.slope_hint_deg}°`;
}
