/** Contract A (SiteSummary) and Contract C (TerrainPatch) TypeScript types. */

export type SiteCategory =
  | "artemis_iii"
  | "clps_commercial"
  | "apollo_historic"
  | "international";

export interface ExternalLinks {
  quickmap_url: string;
  moon_trek_url: string;
}

export interface SiteSummary {
  id: string;
  name: string;
  category: SiteCategory;
  agency: string;
  lat_deg: number;
  lon_deg: number;
  elevation_m: number | null;
  mean_slope_deg: number | null;
  has_precomputed_terrain: boolean;
  summary: string;
  external_links: ExternalLinks;
}

export interface CustomTerrainRequest {
  lat_deg: number;
  lon_deg: number;
  label?: string | null;
}

export interface TerrainPatch {
  site_id: string;
  frame: "local_enu";
  grid_size: number;
  patch_radius_km: number;
  center_elevation_m: number;
  min_elevation_m: number;
  max_elevation_m: number;
  elevations_m_flat: number[];
  slopes_deg_flat: number[];
  psr_mask_flat: number[];
}
