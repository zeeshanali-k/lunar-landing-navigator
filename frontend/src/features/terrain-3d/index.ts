/** Public exports for 3D local_enu lunar terrain and celestial lighting (F4.1 & F4.2). */

export { LunarTerrainCanvas, type LunarTerrainCanvasProps } from "./LunarTerrainCanvas";
export type { LocalTerrainPatch } from "./meshBuilder";
export {
  buildTerrainGeometry,
  sampleCenterSurfaceYKm,
  sampleSurfaceYKmAtXZ,
  updateTerrainGeometryColors,
  updateTerrainGeometryElevations,
} from "./meshBuilder";
export { SURFACE_MODE_LABELS, buildTerrainColorBuffer, sampleTerrainVertexRGB, type TerrainSurfaceMode } from "./terrainColors";
export { azElevToThreeXYZ, computeCelestialSceneVectors, computeMastVisualOffsetKm, type CelestialSceneVectors } from "./celestialVectors";
export { prepareTerrainPatch } from "./terrainPatchUpsampler";
