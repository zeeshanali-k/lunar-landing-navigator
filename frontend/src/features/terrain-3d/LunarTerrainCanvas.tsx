/** Interactive 3D local_enu Lunar Terrain Canvas with grazing crater shadows (F4.1 & F4.2). */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SolarArrayType, TerrainPatch, TimeseriesPoint } from "../../types";
import { createCelestialRig, disposeCelestialRig, updateCelestialRig, type CelestialRig } from "./CelestialLighting";
import { buildTerrainGeometry, sampleCenterSurfaceYKm, sampleSurfaceYKmAtXZ, updateTerrainGeometryColors, updateTerrainGeometryElevations } from "./meshBuilder";
import { SURFACE_MODE_LABELS, type TerrainSurfaceMode } from "./terrainColors";
import { prepareTerrainPatch } from "./terrainPatchUpsampler";

export interface LunarTerrainCanvasProps {
  terrainPatch: TerrainPatch;
  timeseries: TimeseriesPoint[];
  currentIndex: number;
  observerHeightM?: number;
  solarArrayType?: SolarArrayType;
}

const DEFAULT_CAMERA_POS: [number, number, number] = [-18, 15.5, 22];
const EXAGGERATIONS: readonly number[] = [1, 2, 3];
const SURFACE_MODES: readonly TerrainSurfaceMode[] = ["regolith", "elevation", "slope", "psr"];

export function LunarTerrainCanvas({
  terrainPatch,
  timeseries,
  currentIndex,
  observerHeightM = 2.0,
  solarArrayType = "vertical_tracking",
}: LunarTerrainCanvasProps) {
  const preparedPatch = useMemo(() => prepareTerrainPatch(terrainPatch), [terrainPatch]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const rigRef = useRef<CelestialRig | null>(null);

  const [surfaceMode, setSurfaceMode] = useState<TerrainSurfaceMode>("regolith");
  const [exaggeration, setExaggeration] = useState<number>(2);
  const [webglError, setWebglError] = useState<string | null>(null);
  const activePoint = timeseries[Math.min(Math.max(0, currentIndex), Math.max(0, timeseries.length - 1))];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError("WebGL context unavailable in this browser.");
      return;
    }

    const initW = container.clientWidth || 640;
    const initH = container.clientHeight || 430;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initW, initH);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04070e);
    const camera = new THREE.PerspectiveCamera(44, initW / initH, 0.2, 220);
    camera.position.set(...DEFAULT_CAMERA_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 6;
    controls.maxDistance = 85;

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.04 });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const rig = createCelestialRig(scene);
    cameraRef.current = camera;
    controlsRef.current = controls;
    terrainMeshRef.current = mesh;
    rigRef.current = rig;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 10 || rect.height < 10) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    });
    ro.observe(container);

    let rafId = 0;
    const renderLoop = () => {
      controls.update();
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(renderLoop);
    };
    rafId = window.requestAnimationFrame(renderLoop);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      mesh.geometry.dispose();
      material.dispose();
      disposeCelestialRig(scene, rig);
      renderer.dispose();
      renderer.domElement.remove();
      terrainMeshRef.current = null;
      rigRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mesh = terrainMeshRef.current;
    if (!mesh) return;
    const prevGeom = mesh.geometry;
    mesh.geometry = buildTerrainGeometry(preparedPatch, surfaceMode, exaggeration);
    prevGeom.dispose();
  }, [preparedPatch]);

  useEffect(() => {
    const mesh = terrainMeshRef.current;
    if (!mesh) return;
    updateTerrainGeometryColors(mesh.geometry, preparedPatch, surfaceMode);
  }, [preparedPatch, surfaceMode]);

  useEffect(() => {
    const mesh = terrainMeshRef.current;
    if (!mesh) return;
    updateTerrainGeometryElevations(mesh.geometry, preparedPatch, exaggeration);
  }, [preparedPatch, exaggeration]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || !activePoint) return;
    const centerY = sampleCenterSurfaceYKm(preparedPatch, exaggeration);
    updateCelestialRig(rig, activePoint, centerY, observerHeightM, solarArrayType, (xKm, zKm) =>
      sampleSurfaceYKmAtXZ(preparedPatch, xKm, zKm, exaggeration),
    );
  }, [preparedPatch, exaggeration, activePoint, observerHeightM, solarArrayType]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(...DEFAULT_CAMERA_POS);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const sunStatus = !activePoint ? "NO DATA" : !activePoint.is_sunlit ? "SHADOW" : activePoint.sun_visible_fraction < 0.95 ? "GRAZING" : "SUNLIT";

  const pill = (active: boolean, accent: string): React.CSSProperties => ({
    padding: "0.24rem 0.55rem", fontSize: "0.75rem", borderRadius: "0.35rem", cursor: "pointer",
    border: `1px solid ${active ? accent : "var(--border-subtle)"}`,
    background: active ? "rgba(255,255,255,0.08)" : "transparent",
    color: active ? "#f8fafc" : "var(--text-muted)",
  });

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.85rem", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ fontSize: "0.85rem", marginRight: "0.35rem" }}>3D ENU Terrain ({preparedPatch.grid_size}×{preparedPatch.grid_size})</strong>
          {SURFACE_MODES.map((mode) => (
            <button key={mode} type="button" onClick={() => setSurfaceMode(mode)} style={pill(surfaceMode === mode, "#f59e0b")}>{SURFACE_MODE_LABELS[mode]}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          {EXAGGERATIONS.map((ex) => (
            <button key={ex} type="button" onClick={() => setExaggeration(ex)} style={pill(exaggeration === ex, "#38bdf8")}>{ex}x Z</button>
          ))}
          <button type="button" onClick={handleResetCamera} style={pill(false, "#94a3b8")}>Reset</button>
        </div>
      </div>

      <div ref={containerRef} style={{ position: "relative", width: "100%", height: "430px", background: "#04070e" }}>
        {webglError && <p style={{ padding: "1.5rem", color: "#fca5a5", margin: 0 }}>{webglError}</p>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.5rem", padding: "0.5rem 0.85rem", fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
        <span>Sun: <strong style={{ color: activePoint?.is_sunlit ? "var(--accent-sun)" : "#94a3b8" }}>{sunStatus}</strong> {activePoint ? `(Az ${activePoint.sun_az_deg.toFixed(1)}°, El ${activePoint.sun_elev_deg.toFixed(2)}°)` : ""}</span>
        <span>Earth DTE: <strong style={{ color: activePoint?.is_dte_visible ? "var(--accent-dte)" : "#f43f5e" }}>{activePoint?.is_dte_visible ? "ACTIVE" : "BLOCKED"}</strong> {activePoint ? `(Az ${activePoint.earth_az_deg.toFixed(1)}°, El ${activePoint.earth_elev_deg.toFixed(2)}°)` : ""}</span>
        <span>Frame: <code>+X East · +Y Up · -Z North</code></span>
      </div>
    </div>
  );
}
