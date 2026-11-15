/** Barrel exports for 360° SVG Horizon Silhouette (FE-002). */

export { HorizonProfileChart } from "./HorizonProfileChart";
export {
  azElevToSvgCoord,
  buildLimbLinePath,
  buildTerrainAreaPath,
  computeHorizonBounds,
  findNearestHorizonPoint,
  xCoordToAzimuthDeg,
  type HorizonBounds,
  type SvgPoint,
} from "./horizonMath";
