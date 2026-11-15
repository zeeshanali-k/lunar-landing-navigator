/** Pure Three.js BufferGeometry builders for local_enu lunar terrain patches (F4.1). */

import * as THREE from "three";
import type { TerrainPatch } from "../../types";
import { buildTerrainColorBuffer, type TerrainSurfaceMode } from "./terrainColors";

function elevationToYKm(elevationM: number, centerElevationM: number, verticalExaggeration: number): number {
  return ((elevationM - centerElevationM) / 1000.0) * verticalExaggeration;
}

/** Build an indexed THREE.BufferGeometry in local_enu (+X East, +Y Up, -Z North). */
export function buildTerrainGeometry(
  patch: TerrainPatch,
  surfaceMode: TerrainSurfaceMode,
  verticalExaggeration: number,
): THREE.BufferGeometry {
  const n = Math.max(2, patch.grid_size);
  const totalVertices = n * n;
  const positions = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const spanKm = patch.patch_radius_km * 2.0;

  for (let row = 0; row < n; row += 1) {
    const v = row / (n - 1);
    const northKm = (v - 0.5) * spanKm;
    const zKm = -northKm;
    for (let col = 0; col < n; col += 1) {
      const u = col / (n - 1);
      const xKm = (u - 0.5) * spanKm;
      const idx = row * n + col;
      const elevM = patch.elevations_m_flat[idx] ?? patch.center_elevation_m;
      const yKm = elevationToYKm(elevM, patch.center_elevation_m, verticalExaggeration);

      const posOffset = idx * 3;
      positions[posOffset] = xKm;
      positions[posOffset + 1] = yKm;
      positions[posOffset + 2] = zKm;

      const uvOffset = idx * 2;
      uvs[uvOffset] = u;
      uvs[uvOffset + 1] = v;
    }
  }

  const cellCount = (n - 1) * (n - 1);
  const indices = new Uint32Array(cellCount * 6);
  let ptr = 0;
  for (let row = 0; row < n - 1; row += 1) {
    for (let col = 0; col < n - 1; col += 1) {
      const i00 = row * n + col;
      const i10 = i00 + 1;
      const i01 = (row + 1) * n + col;
      const i11 = i01 + 1;

      indices[ptr++] = i00;
      indices[ptr++] = i10;
      indices[ptr++] = i01;

      indices[ptr++] = i10;
      indices[ptr++] = i11;
      indices[ptr++] = i01;
    }
  }

  const colors = buildTerrainColorBuffer(patch, surfaceMode);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/** Update Y elevations in-place when vertical exaggeration changes without reallocating buffers. */
export function updateTerrainGeometryElevations(geometry: THREE.BufferGeometry, patch: TerrainPatch, verticalExaggeration: number): void {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!posAttr) {
    return;
  }
  const n = Math.max(2, patch.grid_size);
  const total = n * n;
  for (let i = 0; i < total; i += 1) {
    const elevM = patch.elevations_m_flat[i] ?? patch.center_elevation_m;
    const yKm = elevationToYKm(elevM, patch.center_elevation_m, verticalExaggeration);
    posAttr.setY(i, yKm);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

/** Update vertex colors in-place when switching between the surface modes. */
export function updateTerrainGeometryColors(geometry: THREE.BufferGeometry, patch: TerrainPatch, mode: TerrainSurfaceMode): void {
  const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  const nextColors = buildTerrainColorBuffer(patch, mode);
  if (!colorAttr || colorAttr.array.length !== nextColors.length) {
    geometry.setAttribute("color", new THREE.BufferAttribute(nextColors, 3));
    return;
  }
  (colorAttr.array as Float32Array).set(nextColors);
  colorAttr.needsUpdate = true;
}

/** Bilinearly sample terrain surface Y (km) at arbitrary local ENU (xKm, zKm). */
export function sampleSurfaceYKmAtXZ(patch: TerrainPatch, xKm: number, zKm: number, verticalExaggeration: number): number {
  const n = Math.max(2, patch.grid_size);
  const spanKm = Math.max(1e-6, patch.patch_radius_km * 2.0);
  const u = Math.max(0, Math.min(1, xKm / spanKm + 0.5));
  const v = Math.max(0, Math.min(1, -zKm / spanKm + 0.5));
  const colF = u * (n - 1);
  const rowF = v * (n - 1);
  const r0 = Math.floor(rowF);
  const c0 = Math.floor(colF);
  const r1 = Math.min(n - 1, r0 + 1);
  const c1 = Math.min(n - 1, c0 + 1);
  const dr = rowF - r0;
  const dc = colF - c0;

  const getElev = (r: number, c: number): number => patch.elevations_m_flat[r * n + c] ?? patch.center_elevation_m;

  const eTop = getElev(r0, c0) + (getElev(r0, c1) - getElev(r0, c0)) * dc;
  const eBot = getElev(r1, c0) + (getElev(r1, c1) - getElev(r1, c0)) * dc;
  return elevationToYKm(eTop + (eBot - eTop) * dr, patch.center_elevation_m, verticalExaggeration);
}

/** Bilinearly sample exact terrain surface Y (km) at (x=0, z=0) so the lander sits flush. */
export function sampleCenterSurfaceYKm(patch: TerrainPatch, verticalExaggeration: number): number {
  return sampleSurfaceYKmAtXZ(patch, 0, 0, verticalExaggeration);
}
