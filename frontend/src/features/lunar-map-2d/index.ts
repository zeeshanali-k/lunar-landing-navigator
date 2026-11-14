/** 2D Lunar South Pole stereographic map feature exports (F3.4). */

export { LayerToggleBar, type LayerToggleBarProps } from "./LayerToggleBar";
export { SouthPoleMap } from "./SouthPoleMap";
export {
  buildMoonTrekUrl,
  buildQuickmapUrl,
  computeAzimuthRayEndpoint,
  latLonToSvgPoint,
  projectSouthPoleStereoKm,
  svgPointToLatLon,
  unprojectSouthPoleStereoKm,
  type MapOverlayLayer,
  type MapViewMode,
  type ProjectedPoint,
  type SouthPoleFeature,
} from "./mapProjection";
