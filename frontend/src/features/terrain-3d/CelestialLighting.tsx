/** Three.js grazing-angle lighting, lander/mast, draped rings, starfield, and LOS rays (F4.2). */

import * as THREE from "three";
import { degToRad, type SolarArrayType, type TimeseriesPoint } from "../../types";
import {
  CARDINAL_MARKERS,
  RANGE_RING_RADII_KM,
  computeCelestialSceneVectors,
  computeMastVisualOffsetKm,
  generateStarfieldPositions,
} from "./celestialVectors";

export interface CelestialRig {
  group: THREE.Group;
  sunLight: THREE.DirectionalLight;
  landerGroup: THREE.Group;
  mastMesh: THREE.Mesh;
  panelPivot: THREE.Group;
  panelMesh: THREE.Mesh;
  sunRayLine: THREE.Line;
  earthRayLine: THREE.Line;
  earthBlockedLine: THREE.Line;
  sunOrb: THREE.Mesh;
  earthOrb: THREE.Mesh;
  ringLines: { radiusKm: number; line: THREE.Line }[];
  cardinalSprites: { xKm: number; zKm: number; sprite: THREE.Sprite }[];
  disposables: { dispose: () => void }[];
}

function makeLine(mat: THREE.Material, disposables: { dispose: () => void }[]): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
  disposables.push(geom);
  return new THREE.Line(geom, mat);
}

function setLineEndpoints(line: THREE.Line, a: [number, number, number], b: [number, number, number]): void {
  const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
  pos.setXYZ(0, a[0], a[1], a[2]);
  pos.setXYZ(1, b[0], b[1], b[2]);
  pos.needsUpdate = true;
}

function makeCardinalSprite(label: string, disposables: { dispose: () => void }[]): THREE.Sprite {
  const canvas = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(16, 23, 38, 0.88)";
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fill();
    Object.assign(ctx, {
      strokeStyle: label === "N" ? "#f59e0b" : "#38bdf8",
      lineWidth: 3,
      fillStyle: "#e8eef9",
      font: "bold 28px Inter, system-ui, sans-serif",
      textAlign: "center",
      textBaseline: "middle",
    });
    ctx.stroke();
    ctx.fillText(label, 32, 33);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  disposables.push(tex, mat);
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.0, 2.0, 1);
  return sprite;
}

function buildStarfield(disposables: { dispose: () => void }[]): THREE.Points {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(generateStarfieldPositions(220, 75.0), 3));
  const mat = new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.45, transparent: true, opacity: 0.65, sizeAttenuation: true });
  disposables.push(geom, mat);
  return new THREE.Points(geom, mat);
}

/** Create lighting, starfield, lander/mast, terrain-draped rings, and Sun/Earth rays. */
export function createCelestialRig(scene: THREE.Scene): CelestialRig {
  const disposables: { dispose: () => void }[] = [];
  const group = new THREE.Group();

  const ambientLight = new THREE.AmbientLight(0x88aadd, 0.04);
  const sunLight = new THREE.DirectionalLight(0xfff5db, 3.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 0.5, far: 90 });
  sunLight.shadow.bias = -0.0008;
  sunLight.shadow.normalBias = 0.015;

  const bodyGeom = new THREE.CylinderGeometry(0.32, 0.44, 0.36, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.35 });
  const mastGeom = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.5, roughness: 0.4 });
  const panelGeom = new THREE.BoxGeometry(0.95, 0.05, 0.65);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.45, roughness: 0.25 });
  const sunRayMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9 });
  const earthRayMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
  const earthBlockedMat = new THREE.LineDashedMaterial({ color: 0xf43f5e, dashSize: 0.9, gapSize: 0.6, transparent: true, opacity: 0.85 });
  const ringMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 });
  const orbGeom = new THREE.SphereGeometry(0.62, 16, 16);
  const sunOrbMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const earthOrbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  disposables.push(
    bodyGeom,
    bodyMat,
    mastGeom,
    mastMat,
    panelGeom,
    panelMat,
    sunRayMat,
    earthRayMat,
    earthBlockedMat,
    ringMat,
    orbGeom,
    sunOrbMat,
    earthOrbMat,
  );

  const landerGroup = new THREE.Group();
  const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
  bodyMesh.position.y = 0.18;
  bodyMesh.castShadow = true;
  const mastMesh = new THREE.Mesh(mastGeom, mastMat);
  mastMesh.castShadow = true;
  const panelPivot = new THREE.Group();
  const panelMesh = new THREE.Mesh(panelGeom, panelMat);
  panelMesh.castShadow = true;
  panelPivot.add(panelMesh);
  landerGroup.add(bodyMesh, mastMesh, panelPivot);

  const ringLines = RANGE_RING_RADII_KM.map((radiusKm) => {
    const pts = Array.from({ length: 241 }, (_, i) => {
      const t = (i / 240) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(t) * radiusKm, 0, Math.sin(t) * radiusKm);
    });
    const rGeom = new THREE.BufferGeometry().setFromPoints(pts);
    disposables.push(rGeom);
    const line = new THREE.Line(rGeom, ringMat);
    group.add(line);
    return { radiusKm, line };
  });
  const cardinalSprites = CARDINAL_MARKERS.map((m) => {
    const sprite = makeCardinalSprite(m.label, disposables);
    group.add(sprite);
    return { xKm: m.xKm, zKm: m.zKm, sprite };
  });

  const sunRayLine = makeLine(sunRayMat, disposables);
  const earthRayLine = makeLine(earthRayMat, disposables);
  const earthBlockedLine = makeLine(earthBlockedMat, disposables);
  const sunOrb = new THREE.Mesh(orbGeom, sunOrbMat);
  const earthOrb = new THREE.Mesh(orbGeom, earthOrbMat);
  const starfield = buildStarfield(disposables);

  group.add(ambientLight, sunLight, sunLight.target, landerGroup, sunRayLine, earthRayLine, earthBlockedLine, sunOrb, earthOrb, starfield);
  scene.add(group);
  return {
    group,
    sunLight,
    landerGroup,
    mastMesh,
    panelPivot,
    panelMesh,
    sunRayLine,
    earthRayLine,
    earthBlockedLine,
    sunOrb,
    earthOrb,
    ringLines,
    cardinalSprites,
    disposables,
  };
}

/** Update light, lander/mast, terrain-draped rings/compass, and Sun/Earth LOS rays. */
export function updateCelestialRig(
  rig: CelestialRig,
  point: TimeseriesPoint,
  centerSurfaceYKm: number,
  observerHeightM: number,
  solarArrayType: SolarArrayType,
  sampleSurfaceY: (xKm: number, zKm: number) => number,
  verticalExaggeration = 1.0,
): void {
  const vecs = computeCelestialSceneVectors(point, centerSurfaceYKm, observerHeightM, 24.0, verticalExaggeration, sampleSurfaceY);
  rig.sunLight.position.set(...vecs.sunLightPos);
  rig.sunLight.target.position.set(0, centerSurfaceYKm, 0);
  rig.sunLight.target.updateMatrixWorld();
  rig.sunLight.intensity = vecs.sunIntensity;

  const mastKm = computeMastVisualOffsetKm(observerHeightM);
  rig.landerGroup.position.set(0, centerSurfaceYKm, 0);
  rig.mastMesh.scale.set(1, mastKm, 1);
  rig.mastMesh.position.y = mastKm * 0.5;
  rig.panelPivot.position.set(0, mastKm, 0);
  rig.panelPivot.rotation.y = solarArrayType === "vertical_tracking" ? Math.PI - degToRad(point.sun_az_deg) : 0;
  rig.panelMesh.rotation.set(solarArrayType === "horizontal_fixed" ? 0 : Math.PI / 2, 0, 0);

  for (const { radiusKm, line } of rig.ringLines) {
    const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i <= 240; i += 1) {
      const t = (i / 240) * Math.PI * 2;
      const cosT = Math.cos(t);
      const sinT = Math.sin(t);
      const x = cosT * radiusKm;
      const z = sinT * radiusKm;
      const yMax = Math.max(
        sampleSurfaceY(x, z),
        sampleSurfaceY(cosT * (radiusKm - 0.35), sinT * (radiusKm - 0.35)),
        sampleSurfaceY(cosT * (radiusKm + 0.35), sinT * (radiusKm + 0.35)),
      );
      pos.setXYZ(i, x, yMax + 0.22, z);
    }
    pos.needsUpdate = true;
  }
  for (const { xKm, zKm, sprite } of rig.cardinalSprites) {
    sprite.position.set(xKm, sampleSurfaceY(xKm, zKm) + 1.6, zKm);
  }

  setLineEndpoints(rig.sunRayLine, vecs.mastOrigin, vecs.sunRayEnd);
  (rig.sunRayLine.material as THREE.LineBasicMaterial).opacity = vecs.isSunlit ? (vecs.isGrazing ? 0.6 : 0.95) : 0.2;
  setLineEndpoints(rig.earthRayLine, vecs.mastOrigin, vecs.earthRayEnd);
  setLineEndpoints(rig.earthBlockedLine, vecs.mastOrigin, vecs.earthRayEnd);
  rig.earthBlockedLine.computeLineDistances();
  rig.earthRayLine.visible = vecs.isDteVisible;
  rig.earthBlockedLine.visible = !vecs.isDteVisible;

  rig.sunOrb.position.set(...vecs.sunRayEnd);
  (rig.sunOrb.material as THREE.MeshBasicMaterial).color.setHex(vecs.isSunlit ? 0xfbbf24 : 0x64748b);
  rig.earthOrb.position.set(...vecs.earthRayEnd);
  (rig.earthOrb.material as THREE.MeshBasicMaterial).color.setHex(vecs.isDteVisible ? 0x38bdf8 : 0xf43f5e);
}

/** Dispose all Three.js geometries, materials, and textures owned by the rig. */
export function disposeCelestialRig(scene: THREE.Scene, rig: CelestialRig): void {
  scene.remove(rig.group);
  for (const item of rig.disposables) item.dispose();
}
