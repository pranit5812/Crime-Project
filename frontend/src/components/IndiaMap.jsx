import { IndiaMap as RealIndiaMap } from "@vishalvoid/react-india-map";
import { useEffect, useMemo, useRef } from "react";
import { STATE_ID_TO_NAME } from "../data/stateRegions";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function heatColor(value, max) {
  const t = max <= 0 ? 0 : clamp(value / max, 0, 1);
  // gradient: slate -> amber -> red
  const r = Math.round(51 + t * 180);
  const g = Math.round(65 + (1 - t) * 120);
  const b = Math.round(85 + (1 - t) * 60);
  return `rgb(${r},${g},${b})`;
}

export function IndiaMap({ selectedState, onSelect, heat = [] }) {
  const mapShellRef = useRef(null);

  const heatMap = useMemo(() => new Map(heat.map((x) => [x.state, x.value])), [heat]);
  const max = Math.max(0, ...heat.map((x) => x.value || 0));

  const stateData = Object.entries(STATE_ID_TO_NAME).map(([id, name]) => ({
    id,
    customData: {
      name,
      active: name === selectedState
    }
  }));

  useEffect(() => {
    const root = mapShellRef.current;
    if (!root) return;

    // react-india-map renders SVG via innerHTML asynchronously; retry briefly.
    let tries = 0;
    const paint = () => {
      const svg = root.querySelector(".india-map-container svg");
      if (svg) {
        // The bundled SVG has fixed width/height but no viewBox.
        // Adding a viewBox makes it scale without cropping.
        if (!svg.getAttribute("viewBox")) {
          svg.setAttribute("viewBox", "0 0 611.85999 695.70178");
        }
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.display = "block";
      }

      const paths = root.querySelectorAll(".india-map-container path");
      if (!paths.length && tries < 10) {
        tries += 1;
        setTimeout(paint, 80);
        return;
      }

      paths.forEach((p) => {
        const id = p.getAttribute("id") || "";
        const stateName = STATE_ID_TO_NAME[id];
        const value = stateName ? (heatMap.get(stateName) ?? 0) : 0;
        const fill = heatColor(value, max);

        p.setAttribute("fill", fill);
        p.style.transition = "fill 180ms ease, opacity 180ms ease";

        if (stateName && stateName === selectedState) {
          p.setAttribute("stroke", "#38bdf8");
          p.setAttribute("stroke-width", "2");
          p.style.filter = "drop-shadow(0 0 10px rgba(56,189,248,0.35))";
          p.style.opacity = "1";
        } else {
          p.setAttribute("stroke", "rgba(226,232,240,0.85)");
          p.setAttribute("stroke-width", "0.9");
          p.style.filter = "";
          p.style.opacity = "0.98";
        }
      });
    };

    paint();
  }, [heatMap, max, selectedState]);

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950/60 p-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-xs text-slate-300">Crime intensity heatmap</div>
        <div className="text-[11px] text-slate-400">Max: {max}</div>
      </div>
      <div
        ref={mapShellRef}
        className="w-full aspect-[612/696] max-h-[clamp(240px,36vh,460px)] flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-slate-900/50 to-slate-950/80 shadow-glow"
      >
        <style>{`
          /* react-india-map sets width but not height on its outer container.
             Also the injected SVG has fixed width/height attributes.
             Force it to scale to our wrapper so the whole map fits. */
          .india-map-container {
            width: 100% !important;
            height: 100% !important;
          }
          .india-map-container svg {
            width: 100% !important;
            height: 100% !important;
            display: block;
          }
        `}</style>
        <RealIndiaMap
          mapStyle={{
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            hoverColor: "#38bdf8",
            stroke: "rgba(226, 232, 240, 0.85)",
            strokeWidth: 0.9,
            tooltipConfig: {
              backgroundColor: "rgba(2, 6, 23, 0.95)",
              textColor: "#e2e8f0"
            }
          }}
          stateData={stateData}
          onStateClick={(stateId, stateInfo) => {
            const stateName = (stateInfo?.customData?.name) || STATE_ID_TO_NAME[stateId];
            if (stateName) onSelect(stateName);
          }}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-slate-300 px-1">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: heatColor(0, max) }} /> Low</div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: heatColor(Math.round(max * 0.5), max) }} /> Medium</div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: heatColor(max, max) }} /> High</div>
      </div>
    </div>
  );
}
