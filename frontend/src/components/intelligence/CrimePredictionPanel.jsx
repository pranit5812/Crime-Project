import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Activity, Clock, MapPin, Zap, Target,
  TrendingUp, Shield, RefreshCw, ChevronDown, Bell,
  BarChart2, Crosshair, Radio
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid
} from "recharts";
import { apiGet, apiPost, WS_BASE } from "../../lib/api";
import { STATE_REGIONS } from "../../data/stateRegions";

/* ── Data ─────────────────────────────────────────────────── */
const CRIME_TYPES = ["Theft", "Robbery", "Assault", "Cybercrime", "Fraud"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATES = Object.keys(STATE_REGIONS);

/* ── Gauge component ──────────────────────────────────────── */
function RiskGauge({ score, level }) {
  const r = 54;
  const cx = 64;
  const cy = 64;
  const arc = 2 * Math.PI * r * 0.75;
  const offset = arc - (score / 100) * arc;
  const startAngle = 135;

  const levelColor = {
    High: { stroke: "#f43f5e", glow: "rgba(244,63,94,0.5)", text: "#f43f5e", bg: "rgba(244,63,94,0.08)" },
    Medium: { stroke: "#f59e0b", glow: "rgba(245,158,11,0.5)", text: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    Low: { stroke: "#10b981", glow: "rgba(16,185,129,0.5)", text: "#10b981", bg: "rgba(16,185,129,0.08)" },
  }[level] || { stroke: "#64748b", glow: "transparent", text: "#64748b", bg: "transparent" };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 128, height: 128 }}>
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Background arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
            strokeDasharray={`${arc} ${2 * Math.PI * r}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${startAngle}, ${cx}, ${cy})`}
          />
          {/* Animated score arc */}
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={levelColor.stroke}
            strokeWidth="10"
            strokeDasharray={`${arc} ${2 * Math.PI * r}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(${startAngle}, ${cx}, ${cy})`}
            initial={{ strokeDashoffset: arc }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${levelColor.glow})` }}
          />
          {/* Glow pulse circle */}
          <motion.circle
            cx={cx} cy={cy} r={r - 8}
            fill={levelColor.bg}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          />
        </svg>
        {/* Score label in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-black leading-none"
            style={{ color: levelColor.text }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Risk</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border"
        style={{
          color: levelColor.text,
          borderColor: levelColor.stroke + "50",
          background: levelColor.bg,
        }}
      >
        {level} Risk
      </motion.div>
    </div>
  );
}

/* ── Alert Banner ─────────────────────────────────────────── */
function AlertBanner({ message, score }) {
  if (!message) return null;
  const isHigh = score >= 71;
  const isMed = score >= 31 && score < 71;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className={`rounded-xl border p-3 flex items-start gap-2.5 overflow-hidden ${
        isHigh
          ? "border-rose-500/40 bg-rose-500/10"
          : isMed
          ? "border-amber-500/35 bg-amber-500/8"
          : "border-emerald-500/30 bg-emerald-500/8"
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isHigh ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <AlertTriangle size={16} className="text-rose-400" />
          </motion.div>
        ) : isMed ? (
          <AlertTriangle size={16} className="text-amber-400" />
        ) : (
          <Shield size={16} className="text-emerald-400" />
        )}
      </div>
      <p className={`text-xs font-medium leading-relaxed ${
        isHigh ? "text-rose-200" : isMed ? "text-amber-200" : "text-emerald-200"
      }`}>
        {message}
      </p>
      {isHigh && (
        <motion.div
          className="ml-auto shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <Radio size={8} className="text-rose-400" />
          <span className="text-[9px] text-rose-400 font-bold">ALERT</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Time Analysis Mini Chart ─────────────────────────────── */
function TimeAnalysisChart({ data }) {
  if (!data) return null;
  const { hourly, peak_window, summary, bucket_totals } = data;

  const chartData = hourly
    ? hourly.filter((_, i) => i % 2 === 0).map(d => ({
        name: `${d.hour}h`,
        count: d.count,
        hour: d.hour,
      }))
    : [];

  // Color bars by bucket
  const getColor = (hour) => {
    if (hour >= 0 && hour <= 5) return "#818cf8";   // night - violet
    if (hour >= 6 && hour <= 11) return "#34d399";  // morning - green
    if (hour >= 12 && hour <= 17) return "#38bdf8"; // afternoon - sky
    return "#f59e0b";                                // evening - amber
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-amber-400" />
          <span className="text-xs font-semibold text-slate-200">Time Patterns</span>
        </div>
        {peak_window && (
          <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            Peak: {peak_window}
          </span>
        )}
      </div>

      {summary && (
        <p className="text-[11px] text-slate-400 leading-relaxed">{summary}</p>
      )}

      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(56,189,248,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#475569", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(10,18,35,0.97)",
                border: "1px solid rgba(56,189,248,0.2)",
                borderRadius: "10px",
                fontSize: 11,
                color: "#e2e8f0",
              }}
              formatter={(v, _, { payload }) => [`${v} crimes`, `Hour ${payload?.hour}`]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={getColor(d.hour)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bucket pills */}
      {bucket_totals && (
        <div className="grid grid-cols-2 gap-1.5">
          {bucket_totals.map((b) => (
            <div
              key={b.label}
              className="rounded-lg border border-white/8 bg-white/3 px-2 py-1.5 text-center"
            >
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">{b.label}</div>
              <div className="text-sm font-bold text-slate-200">{b.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main CrimePredictionPanel ────────────────────────────── */
export function CrimePredictionPanel({ compact = false }) {
  /* Form state */
  const [state, setState] = useState("Maharashtra");
  const [area, setArea] = useState("Mumbai");
  const [hour, setHour] = useState(20);
  const [dow, setDow] = useState(4);
  const [crimeType, setCrimeType] = useState("");

  /* Results state */
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* Time analysis */
  const [timeData, setTimeData] = useState(null);
  const [timeLoading, setTimeLoading] = useState(false);

  /* Active tab */
  const [tab, setTab] = useState("predict"); // "predict" | "time"

  /* Real-time alerts from WS */
  const [wsAlerts, setWsAlerts] = useState([]);
  const wsRef = useRef(null);

  const regions = STATE_REGIONS[state] || [];

  // Sync area when state changes
  useEffect(() => {
    setArea(regions[0] || "");
  }, [state]);

  // WS listener for incoming alerts
  useEffect(() => {
    const token = localStorage.getItem("crime_token");
    try {
      const ws = new WebSocket(`${WS_BASE}/ws/live${token ? `?token=${token}` : ""}`);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === "crime_alert") {
            setWsAlerts((prev) => [msg, ...prev].slice(0, 3));
            setTimeout(() => setWsAlerts((prev) => prev.filter((a) => a !== msg)), 8000);
          }
        } catch { /* ignore */ }
      };
      wsRef.current = ws;
    } catch { /* ignore */ }
    return () => { try { wsRef.current?.close(); } catch { /* ignore */ } };
  }, []);

  /* Load time analysis */
  const loadTimeAnalysis = useCallback(async () => {
    setTimeLoading(true);
    try {
      const d = await apiGet("/crime-time-analysis");
      setTimeData(d);
    } catch {
      setTimeData(null);
    } finally {
      setTimeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeAnalysis();
  }, [loadTimeAnalysis]);

  /* Run prediction */
  const runPredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiPost("/predict-crime", {
        area,
        hour,
        day_of_week: dow,
        crime_type: crimeType || null,
        latitude: null,
        longitude: null,
      });
      setResult(res);
      setTab("predict");
    } catch (e) {
      setError(e.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const levelColor = {
    High: "text-rose-400",
    Medium: "text-amber-400",
    Low: "text-emerald-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full min-w-0 space-y-3"
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
          <Target size={14} className="text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest leading-none">
            Crime Prediction AI
          </h3>
          <p className="text-[9px] text-slate-500 mt-0.5">Risk Scoring • Hotspot • Alerts</p>
        </div>
        {result && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              result.risk_level === "High"
                ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                : result.risk_level === "Medium"
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {result.risk_level}
          </motion.div>
        )}
      </div>

      {/* ── WS Real-time alerts ─────────────────────────── */}
      <AnimatePresence>
        {wsAlerts.map((a, i) => (
          <motion.div
            key={`ws-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 flex items-center gap-2"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Bell size={12} className="text-rose-400 shrink-0" />
            </motion.div>
            <span className="text-[11px] text-rose-200 leading-snug truncate">
              🔴 {a.alert_message || `${a.predicted_crime} alert · ${a.area}`}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1 p-0.5 rounded-xl border border-white/8 bg-black/20">
        {[
          { id: "predict", label: "Predict", icon: Crosshair },
          { id: "time", label: "Time Analysis", icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
              tab === id
                ? "bg-white/10 text-white border border-white/15"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Predict ────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === "predict" && (
          <motion.div
            key="predict"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {/* Input grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* State */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">State</label>
                <div className="relative">
                  <select
                    className="w-full rounded-lg border border-white/10 bg-white/5 text-slate-200 text-xs px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
              {/* Area */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Area</label>
                <div className="relative">
                  <select
                    className="w-full rounded-lg border border-white/10 bg-white/5 text-slate-200 text-xs px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
              {/* Hour */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Clock size={9} /> Hour ({hour}:00)
                </label>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-violet-500 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-slate-600">
                  <span>0h</span><span>12h</span><span>23h</span>
                </div>
              </div>
              {/* Day */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Day</label>
                <div className="relative">
                  <select
                    className="w-full rounded-lg border border-white/10 bg-white/5 text-slate-200 text-xs px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition"
                    value={dow}
                    onChange={(e) => setDow(Number(e.target.value))}
                  >
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Optional crime type */}
            <div className="space-y-1">
              <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Crime Type (optional)</label>
              <div className="flex flex-wrap gap-1">
                {["", ...CRIME_TYPES].map((ct) => (
                  <button
                    key={ct || "any"}
                    type="button"
                    onClick={() => setCrimeType(ct)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition ${
                      crimeType === ct
                        ? "bg-violet-500/25 border-violet-400/50 text-violet-300"
                        : "bg-white/4 border-white/8 text-slate-500 hover:text-slate-300 hover:bg-white/8"
                    }`}
                  >
                    {ct || "Any"}
                  </button>
                ))}
              </div>
            </div>

            {/* Predict button */}
            <motion.button
              type="button"
              onClick={runPredict}
              disabled={loading}
              whileHover={loading ? undefined : { scale: 1.02 }}
              whileTap={loading ? undefined : { scale: 0.97 }}
              className="w-full relative overflow-hidden rounded-xl py-2.5 text-xs font-bold text-white flex items-center justify-center gap-2 transition"
              style={{
                background: loading
                  ? "linear-gradient(135deg, #334155, #475569)"
                  : "linear-gradient(135deg, #7c3aed, #6366f1, #8b5cf6)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(124,58,237,0.4)",
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap size={13} /> Predict Risk
                </>
              )}
            </motion.button>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-[11px] text-rose-300">
                {error}
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {/* Gauge */}
                  <div className="flex items-center justify-between gap-3">
                    <RiskGauge score={result.risk_score} level={result.risk_level} />
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Predicted crime */}
                      <div className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-2">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Predicted Crime</div>
                        <div className="text-sm font-bold text-slate-100">{result.predicted_crime}</div>
                      </div>
                      {/* Time window */}
                      <div className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-2">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Time Window</div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                          <Clock size={10} className="text-amber-400" />
                          {result.time_window}
                        </div>
                      </div>
                      {/* Hotspot */}
                      <div className={`rounded-lg border px-2.5 py-2 ${
                        result.hotspot
                          ? "border-rose-500/35 bg-rose-500/8"
                          : "border-white/8 bg-white/3"
                      }`}>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Hotspot</div>
                        <div className={`text-xs font-bold flex items-center gap-1 ${result.hotspot ? "text-rose-400" : "text-emerald-400"}`}>
                          <MapPin size={10} />
                          {result.hotspot ? "⚠️ Crime Hotspot" : "✅ Safe Zone"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Probability bars */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Risk Distribution</div>
                    {Object.entries(result.probabilities || {}).map(([level, prob]) => {
                      const pct = Math.round(prob * 100);
                      const color = level === "High" ? "#f43f5e" : level === "Medium" ? "#f59e0b" : "#10b981";
                      return (
                        <div key={level} className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 w-14 shrink-0">{level}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Model info */}
                  <div className="flex items-center justify-between text-[9px] text-slate-600">
                    <span>Model: {result.model}</span>
                    <span>Confidence: {(result.confidence * 100).toFixed(0)}%</span>
                  </div>

                  {/* Alert banner */}
                  <AlertBanner message={result.alert_message} score={result.risk_score} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── TAB: Time Analysis ──────────────────────────── */}
        {tab === "time" && (
          <motion.div
            key="time"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Hourly Crime Patterns</span>
              <button
                type="button"
                onClick={loadTimeAnalysis}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition"
              >
                <RefreshCw size={10} className={timeLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {timeLoading ? (
              <div className="h-[140px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
              </div>
            ) : timeData ? (
              <TimeAnalysisChart data={timeData} />
            ) : (
              <div className="h-[100px] flex items-center justify-center text-xs text-slate-500">
                No time data available
              </div>
            )}

            {/* Generated insight */}
            {timeData?.peak_window && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={11} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">AI Insight</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {timeData.summary}. Most incidents occur during{" "}
                  <span className="text-amber-300 font-semibold">{timeData.peak_label}</span>.
                  Patrol density should be increased accordingly.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
