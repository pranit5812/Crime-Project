import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { apiGet } from "../../lib/api";

function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return undefined;
    const layer = L.heatLayer(points, { radius: 28, blur: 22, maxZoom: 14, max: 1.2 }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

/** Calls invalidateSize so tiles render correctly inside flex/sidebar layouts. */
function MapResize({ trigger = 0 }) {
  const map = useMap();
  useEffect(() => {
    const fix = () => {
      map.invalidateSize({ animate: false });
    };
    fix();
    const r1 = requestAnimationFrame(fix);
    const t1 = setTimeout(fix, 120);
    const t2 = setTimeout(fix, 400);
    window.addEventListener("resize", fix);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", fix);
    };
  }, [map, trigger]);
  return null;
}

/**
 * @param {{ selectedState: string, blinkKey?: string | null, refreshKey?: number, variant?: "default" | "sidebar" }} props
 */
export function CrimeMapLeaflet({ selectedState, blinkKey, refreshKey = 0, variant = "default" }) {
  const [incidents, setIncidents] = useState([]);
  const center = [20.5937, 78.9629];
  const sidebar = variant === "sidebar";

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await apiGet("/map/incidents", { state: selectedState, limit: 250 });
        if (!cancel) setIncidents(data);
      } catch {
        if (!cancel) setIncidents([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selectedState, blinkKey, refreshKey]);

  const heatPoints = useMemo(
    () => incidents.map((i) => [i.latitude, i.longitude, i.is_panic ? 1 : 0.55]),
    [incidents]
  );

  const blinkCls = blinkKey
    ? "ring-2 ring-rose-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 animate-pulse"
    : "";

  const shellCls = sidebar
    ? `crime-map-leaflet crime-map-leaflet--sidebar relative w-full overflow-hidden rounded-xl ${blinkCls}`
    : `crime-map-leaflet relative w-full overflow-hidden rounded-xl border border-slate-200/80 shadow-md dark:border-white/10 dark:shadow-glow ${blinkCls}`;

  const shellStyle = sidebar
    ? {
        height: "clamp(220px, 46vh, 320px)",
        minHeight: 220
      }
    : { height: 320 };

  return (
    <div className={shellCls} style={shellStyle}>
      <MapContainer
        center={center}
        zoom={sidebar ? 4.85 : 5}
        zoomControl
        attributionControl
        scrollWheelZoom
        className="z-0 h-full w-full rounded-xl [&_.leaflet-control-zoom]:border-slate-200/80 [&_.leaflet-control-zoom]:dark:border-white/10 [&_.leaflet-control-zoom_a]:text-slate-700 [&_.leaflet-control-zoom_a]:dark:text-slate-200 [&_.leaflet-control-attribution]:text-[9px] [&_.leaflet-control-attribution]:max-w-none"
        style={{ height: "100%", width: "100%" }}
      >
        <MapResize trigger={refreshKey} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatLayer points={heatPoints} />
        {incidents.map((i) => (
          <CircleMarker
            key={i.public_id}
            center={[i.latitude, i.longitude]}
            radius={i.public_id === blinkKey ? 14 : 7}
            pathOptions={{
              color: i.is_panic ? "#f43f5e" : "#38bdf8",
              fillColor: i.is_panic ? "#fb7185" : "#22d3ee",
              fillOpacity: 0.65
            }}
          >
            <Popup>
              <div className="min-w-[160px] space-y-1 text-xs">
                <div className="font-semibold">{i.crime_type}</div>
                <div>
                  {i.region}, {i.state}
                </div>
                <div className="opacity-70">{i.created_at}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
