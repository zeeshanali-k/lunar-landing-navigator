/** Interactive 2D Polar Stereographic South Pole & Global Moon Map with Sun/Earth rays (F3.4). */

import { type MouseEvent, useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { useMissionStore, usePlaybackStore } from "../../state";
import { LayerToggleBar } from "./LayerToggleBar";
import {
  buildMoonTrekUrl,
  buildQuickmapUrl,
  computeAzimuthRayEndpoint,
  DEFAULT_POLE_ZOOM,
  formatFeatureTooltip,
  getFeatureLabelProps,
  getOverlayFeatureStyle,
  latLonToSvgPoint,
  MAX_STEREO_RADIUS_KM,
  projectSouthPoleStereoKm,
  SOUTH_POLE_FEATURES,
  svgPointToLatLon,
  type MapOverlayLayer,
  type MapViewMode,
} from "./mapProjection";

const SVG_W = 360;
const SVG_H = 232;
const CX = 180;
const CY = 116;
const RADIUS_PX = 96;
const POLE_RINGS_DEG = [-80, -84, -86, -88];

export function SouthPoleMap() {
  const {
    sites, selectedSiteId, selectedSite, customCoords, evaluationData, selectSite, setCustomCoordinates,
  } = useMissionStore();
  const currentIndex = usePlaybackStore((s) => s.currentIndex);

  const [viewMode, setViewMode] = useState<MapViewMode>("south_pole");
  const [poleZoom, setPoleZoom] = useState<number>(DEFAULT_POLE_ZOOM);
  const [activeLayer, setActiveLayer] = useState<MapOverlayLayer>("psr");
  const [hoverCoords, setHoverCoords] = useState<{ lat_deg: number; lon_deg: number } | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeLat = customCoords?.lat_deg ?? evaluationData?.site.lat_deg ?? selectedSite?.lat_deg ?? -89.45;
  const activeLon = customCoords?.lon_deg ?? evaluationData?.site.lon_deg ?? selectedSite?.lon_deg ?? 135.2;

  useEffect(() => {
    setViewMode(activeLat <= -75 ? "south_pole" : "global");
  }, [activeLat]);

  const toCoordsFromEvent = (event: MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const svgX = ((event.clientX - rect.left) / rect.width) * SVG_W;
    const svgY = ((event.clientY - rect.top) / rect.height) * SVG_H;
    return svgPointToLatLon(svgX, svgY, viewMode, CX, CY, RADIUS_PX, poleZoom);
  };

  const handleMapClick = (event: MouseEvent<SVGSVGElement>): void => {
    const coords = toCoordsFromEvent(event);
    if (coords) {
      void setCustomCoordinates({ lat_deg: coords.lat_deg, lon_deg: coords.lon_deg, label: "2D Map Pin" });
    }
  };

  const effectiveMaxKm = MAX_STEREO_RADIUS_KM / poleZoom;
  const activePoint = latLonToSvgPoint(activeLat, activeLon, viewMode, CX, CY, RADIUS_PX, poleZoom);
  const currentSample = evaluationData?.timeseries[currentIndex] ?? null;
  const sunRay = currentSample && computeAzimuthRayEndpoint(activePoint.x, activePoint.y, activeLon, currentSample.sun_az_deg, viewMode, 34);
  const earthRay = currentSample && computeAzimuthRayEndpoint(activePoint.x, activePoint.y, activeLon, currentSample.earth_az_deg, viewMode, 30);

  const quickmapUrl = buildQuickmapUrl(activeLat, activeLon, !customCoords ? selectedSite?.external_links.quickmap_url : undefined);
  const moonTrekUrl = buildMoonTrekUrl(activeLat, activeLon, !customCoords ? selectedSite?.external_links.moon_trek_url : undefined);

  return (
    <section className="panel-card">
      <h2 className="panel-title">
        <span><Compass size={13} /> 2D Lunar Map ({viewMode === "south_pole" ? "Polar Stereo" : "Global Equirectangular"})</span>
        {viewMode === "south_pole" && (
          <button
            type="button"
            className="category-pill active"
            onClick={() => setPoleZoom((z) => (z > 1.2 ? 1.0 : DEFAULT_POLE_ZOOM))}
            style={{ textTransform: "none", letterSpacing: 0 }}
          >
            {poleZoom > 1.2 ? "Zoom: 84°S Core" : "Zoom: 80°S Wide"}
          </button>
        )}
      </h2>

      <LayerToggleBar viewMode={viewMode} onViewModeChange={setViewMode} activeLayer={activeLayer} onLayerChange={setActiveLayer} quickmapUrl={quickmapUrl} moonTrekUrl={moonTrekUrl} />

      <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        onMouseMove={(e) => setHoverCoords(toCoordsFromEvent(e))}
        onMouseLeave={() => { setHoverCoords(null); setHoveredInfo(null); }}
        onClick={handleMapClick}
        style={{ width: "100%", height: "auto", aspectRatio: `${SVG_W} / ${SVG_H}`, display: "block", cursor: "crosshair", background: "#070c18", borderRadius: "0.55rem", border: "1px solid var(--border-subtle)" }}
      >
        <defs>
          <radialGradient id="lunarPoleBg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#162138" /><stop offset="100%" stopColor="#0a1120" /></radialGradient>
          <clipPath id="southPoleClip"><circle cx={CX} cy={CY} r={RADIUS_PX} /></clipPath>
        </defs>

        {viewMode === "south_pole" ? (
          <g>
            <circle cx={CX} cy={CY} r={RADIUS_PX} fill="url(#lunarPoleBg)" stroke="#334566" strokeWidth={1.2} />
            <g clipPath="url(#southPoleClip)">
              {SOUTH_POLE_FEATURES.map((feat) => {
                const pos = latLonToSvgPoint(feat.lat_deg, feat.lon_deg, "south_pole", CX, CY, RADIUS_PX, poleZoom);
                if (!pos.visible) return null;
                const rPx = Math.max(4, (feat.radius_km / effectiveMaxKm) * RADIUS_PX);
                const style = getOverlayFeatureStyle(feat, activeLayer);
                const lbl = getFeatureLabelProps(pos.x, pos.y, rPx, feat.labelSide);
                const tip = formatFeatureTooltip(feat);
                return (
                  <g key={feat.name} onMouseEnter={() => setHoveredInfo(tip)} onMouseLeave={() => setHoveredInfo(null)} style={{ cursor: "help" }}>
                    <title>{tip}</title>
                    <circle cx={pos.x} cy={pos.y} r={rPx} fill={style.fill} stroke={style.stroke} strokeWidth={0.9} strokeDasharray={feat.kind === "psr_crater" && activeLayer === "psr" ? "3 2" : undefined} />
                    <text x={lbl.x} y={lbl.y} textAnchor={lbl.textAnchor} fontSize="6.5" fill="#9fb2d4">{feat.name}</text>
                  </g>
                );
              })}
              {POLE_RINGS_DEG.map((lat) => {
                const rPx = (projectSouthPoleStereoKm(lat, 0).rKm / effectiveMaxKm) * RADIUS_PX;
                return <circle key={lat} cx={CX} cy={CY} r={rPx} fill="none" stroke="#243554" strokeDasharray="3 3" strokeWidth={0.8} />;
              })}
              <line x1={CX - RADIUS_PX} y1={CY} x2={CX + RADIUS_PX} y2={CY} stroke="#1f2e4a" strokeWidth={0.8} />
              <line x1={CX} y1={CY - RADIUS_PX} x2={CX} y2={CY + RADIUS_PX} stroke="#1f2e4a" strokeWidth={0.8} />
            </g>
            <text x={CX} y={CY - RADIUS_PX - 5} textAnchor="middle" fontSize="7.5" fill="#38bdf8" fontWeight="700">0°E ▲ EARTH</text>
            <text x={CX + RADIUS_PX + 14} y={CY + 3} textAnchor="middle" fontSize="7" fill="#93a4c3">90°E</text>
            <text x={CX} y={CY + RADIUS_PX + 10} textAnchor="middle" fontSize="7" fill="#93a4c3">180°</text>
            <text x={CX - RADIUS_PX - 15} y={CY + 3} textAnchor="middle" fontSize="7" fill="#93a4c3">90°W</text>
          </g>
        ) : (
          <g>
            <rect x={CX - 144} y={CY - 72} width={288} height={144} fill="#0e1729" stroke="#334566" strokeWidth={1.2} />
            <rect x={CX - 144} y={CY - 72} width={72} height={144} fill="rgba(5, 8, 16, 0.45)" />
            <rect x={CX + 72} y={CY - 72} width={72} height={144} fill="rgba(5, 8, 16, 0.45)" />
            <line x1={CX - 144} y1={CY} x2={CX + 144} y2={CY} stroke="#2a3d5f" strokeDasharray="3 2" />
            <line x1={CX} y1={CY - 72} x2={CX} y2={CY + 72} stroke="#2a3d5f" strokeDasharray="3 2" />
            <text x={CX} y={CY - 76} textAnchor="middle" fontSize="7.5" fill="#38bdf8">Near Side (0°E Center) • Shaded = Far Side (0% DTE)</text>
          </g>
        )}

        {sites.map((site) => {
          const pt = latLonToSvgPoint(site.lat_deg, site.lon_deg, viewMode, CX, CY, RADIUS_PX, poleZoom);
          if (!pt.visible) return null;
          const isCurrent = !customCoords && selectedSiteId === site.id;
          const siteTip = `${site.name} (${site.agency}) • ${site.lat_deg.toFixed(2)}°, ${site.lon_deg.toFixed(2)}° • Slope ${site.mean_slope_deg.toFixed(1)}°`;
          return (
            <g
              key={site.id}
              onClick={(e) => { e.stopPropagation(); void selectSite(site.id); }}
              onMouseEnter={() => setHoveredInfo(siteTip)}
              onMouseLeave={() => setHoveredInfo(null)}
              style={{ cursor: "pointer" }}
            >
              <title>{siteTip}</title>
              <circle cx={pt.x} cy={pt.y} r={isCurrent ? 4.2 : 3} fill={isCurrent ? "#10b981" : "#cbd5e1"} stroke="#070b14" strokeWidth={1} />
            </g>
          );
        })}

        {activePoint.visible && (
          <g pointerEvents="none">
            {sunRay && currentSample && (
              <g><line x1={activePoint.x} y1={activePoint.y} x2={sunRay.x2} y2={sunRay.y2} stroke="#f59e0b" strokeWidth={1.8} strokeDasharray={currentSample.is_sunlit ? undefined : "3 2"} /><circle cx={sunRay.x2} cy={sunRay.y2} r={3.2} fill="#f59e0b" /></g>
            )}
            {earthRay && currentSample && (
              <g><line x1={activePoint.x} y1={activePoint.y} x2={earthRay.x2} y2={earthRay.y2} stroke={currentSample.is_dte_visible ? "#38bdf8" : "#ef4444"} strokeWidth={1.6} strokeDasharray={currentSample.is_dte_visible ? undefined : "3 2"} /><circle cx={earthRay.x2} cy={earthRay.y2} r={2.8} fill={currentSample.is_dte_visible ? "#38bdf8" : "#ef4444"} /></g>
            )}
            <circle cx={activePoint.x} cy={activePoint.y} r={7} fill="none" stroke="#10b981" strokeWidth={1.4} />
            <circle cx={activePoint.x} cy={activePoint.y} r={3} fill="#10b981" />
          </g>
        )}
      </svg>
      {hoveredInfo && (
        <div style={{ position: "absolute", left: "0.5rem", bottom: "0.5rem", right: "0.5rem", pointerEvents: "none", padding: "0.35rem 0.6rem", borderRadius: "0.4rem", background: "rgba(7, 11, 20, 0.92)", border: "1px solid var(--accent-dte)", color: "var(--text-primary)", fontSize: "0.73rem" }}>
          {hoveredInfo}
        </div>
      )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <span>
          {hoverCoords ? `Cursor: ${hoverCoords.lat_deg.toFixed(2)}°, ${hoverCoords.lon_deg.toFixed(2)}°` : `Active: ${activeLat.toFixed(2)}°, ${activeLon.toFixed(2)}°`}
        </span>
        <span style={{ display: "flex", gap: "0.75rem" }}>
          <span style={{ color: "var(--accent-sun)" }}>● Sun Az {currentSample ? `${currentSample.sun_az_deg.toFixed(0)}°` : "—"}</span>
          <span style={{ color: currentSample?.is_dte_visible ? "var(--accent-dte)" : "var(--accent-danger)" }}>● Earth Az {currentSample ? `${currentSample.earth_az_deg.toFixed(0)}°` : "—"}</span>
        </span>
      </div>
    </section>
  );
}
