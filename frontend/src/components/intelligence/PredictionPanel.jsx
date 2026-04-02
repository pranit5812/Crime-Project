import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, MapPin } from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";

export function PredictionPanel({ selectedState, region, time, ampm, form }) {
  const [zones, setZones] = useState([]);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const z = await apiGet("/predict/zones", { state: selectedState });
        if (!c) setZones(z.high_risk || []);
      } catch {
        if (!c) setZones([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [selectedState]);

  const runPredict = async () => {
    setLoading(true);
    try {
      const p = await apiPost("/predict", {
        state: selectedState,
        region,
        time: `${time} ${ampm}`,
        crime_type: form.crimeType,
        actor_type: form.actorType
      });
      setLive(p);
    } catch {
      setLive(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full min-w-0 space-y-3">
      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <AlertTriangle className="shrink-0 text-amber-500 dark:text-amber-300" size={17} />
          <span className="leading-tight">AI Prediction</span>
        </h3>
        <button
          type="button"
          onClick={runPredict}
          className="shrink-0 self-start rounded-lg border border-sky-400/35 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-800 dark:text-sky-100 hover:bg-sky-500/25 dark:border-sky-400/30 dark:bg-sky-500/20"
        >
          {loading ? "…" : "Run"}
        </button>
      </div>
      <div className="flex w-full min-w-0 flex-col gap-1.5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-100/90 px-2 py-1 text-[10px] text-slate-700 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300">
          <MapPin size={11} className="shrink-0 opacity-80" /> High-risk zones
        </span>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-100/90 px-2 py-1 text-[10px] text-slate-700 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300">
          <Clock size={11} className="shrink-0 opacity-80" /> Time-aware
        </span>
      </div>
      <ul className="max-h-44 w-full min-w-0 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5 text-xs">
        {zones.map((z) => (
          <li
            key={z.region}
            className={`flex w-full min-w-0 flex-col gap-1 rounded-lg border px-2.5 py-2 ${
              z.risk_level === "High"
                ? "border-rose-400/45 bg-rose-500/[0.08] dark:border-rose-500/40 dark:bg-rose-500/10"
                : z.risk_level === "Medium"
                  ? "border-amber-400/45 bg-amber-500/[0.08] dark:border-amber-500/40 dark:bg-amber-500/10"
                  : "border-slate-200/80 bg-slate-50/90 dark:border-white/10 dark:bg-slate-900/40"
            }`}
          >
            <span className="truncate font-medium text-slate-800 dark:text-slate-100">{z.region}</span>
            <span className="text-[10px] leading-snug text-slate-600 dark:text-slate-300/90">
              {z.risk_level} · {z.reports} cases · {(z.confidence * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
      {live ? (
        <div className="w-full min-w-0 rounded-lg border border-sky-400/35 bg-sky-500/10 p-2.5 text-xs dark:border-sky-500/30">
          <div className="font-medium text-slate-800 dark:text-slate-100">Risk: {live.risk_level}</div>
          <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">Confidence: {live.confidence}</div>
          <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-500">Model: {live.model}</div>
        </div>
      ) : null}
    </motion.div>
  );
}
