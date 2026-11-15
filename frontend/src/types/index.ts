/** Re-export of the generated wire contract plus display-only coordinate helpers.
 *
 * The wire types are generated from the Pydantic models in
 * backend/src/api/schemas via `python -m src.cli.export_openapi`; nothing in this
 * barrel restates a contract field. `coordinates.ts` holds deg/rad conversion and
 * azimuth normalisation only.
 */

export * from "./api.generated";
export type { CustomTerrainRequest as CustomCoords } from "./api.generated";
export { degToRad, normalizeAzimuthDeg, radToDeg } from "./coordinates";
