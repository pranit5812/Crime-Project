import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from "recharts";
import {
  Car, Bike, Truck, ShieldAlert, RotateCcw, LogOut, UploadCloud,
  Sparkles, Sun, Moon, Radio, MapPinned, Menu, X, Zap, Shield,
  AlertTriangle, Activity, TrendingUp, BarChart2, FileText,
  Mic, Phone, Clock, MapPin, ChevronRight, Newspaper, ExternalLink,
  Flame, TrendingDown, Eye, RefreshCw, Wifi, WifiOff, ChevronDown
} from "lucide-react";
import { CrimeMapLeaflet } from "../components/intelligence/CrimeMapLeaflet";
import { CrimePredictionPanel } from "../components/intelligence/CrimePredictionPanel";
import { VoiceFill } from "../components/intelligence/VoiceFill";
import { PanicFab } from "../components/intelligence/PanicFab";
import { Chatbot } from "../components/intelligence/Chatbot";
import { NotificationBell } from "../components/intelligence/NotificationBell";
import { ReportTracking } from "../components/intelligence/ReportTracking";
import { Toast } from "../components/Toast";
import { STATE_REGIONS } from "../data/stateRegions";
import { apiGet, apiPost, apiUpload } from "../lib/api";
import { useCrimeSocket } from "../hooks/useCrimeSocket";
import { useTheme } from "../context/ThemeContext";

/* ── Color palettes ─────────────────────────────────────── */
const CRIME_TYPE_BAR_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#2dd4bf"];
const REGION_BAR_SHADES = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#6366f1", "#818cf8"];
const ACTOR_PIE_COLORS = ["#34d399", "#f472b6", "#fbbf24", "#38bdf8", "#a78bfa", "#94a3b8"];
const PEAK_HOUR_COLORS = ["#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706"];

const chartPalette = () => ({
  axis: "#475569",
  grid: "rgba(56, 189, 248, 0.06)",
  tick: { fill: "#64748b", fontSize: 11 },
  tooltipBg: "rgba(10, 18, 35, 0.97)",
  tooltipBorder: "rgba(56, 189, 248, 0.25)",
  label: "#e2e8f0",
  subtle: "#475569",
});

/* ── Risk colors ─────────────────────────────────────────── */
const riskStyle = {
  High: "risk-high",
  Medium: "risk-medium",
  Low: "risk-low",
};

/* ── Static crime news data (simulates live feed) ─────────── */
const CRIME_NEWS_ITEMS = [
  {
    id: 1, category: "Breaking", severity: "high",
    headline: "Armed robbery foiled near Connaught Place, 2 arrested",
    source: "Times of India", time: "2 min ago", region: "Delhi",
    icon: "🚨", views: "4.2K",
  },
  {
    id: 2, category: "Cybercrime", severity: "medium",
    headline: "Phishing gang busted in Hyderabad; ₹12 crore recovered",
    source: "Deccan Chronicle", time: "8 min ago", region: "Hyderabad",
    icon: "💻", views: "3.1K",
  },
  {
    id: 3, category: "Arrest", severity: "low",
    headline: "Serial chain-snatcher caught after 3-month hunt in Chennai",
    source: "The Hindu", time: "15 min ago", region: "Chennai",
    icon: "🔗", views: "2.8K",
  },
  {
    id: 4, category: "Alert", severity: "high",
    headline: "Drug trafficking network dismantled; 500kg narcotics seized",
    source: "NDTV", time: "22 min ago", region: "Mumbai",
    icon: "💊", views: "6.7K",
  },
  {
    id: 5, category: "Investigation", severity: "medium",
    headline: "Multi-crore bank fraud under probe in Bengaluru tech hub",
    source: "Hindustan Times", time: "34 min ago", region: "Bengaluru",
    icon: "🏦", views: "1.9K",
  },
  {
    id: 6, category: "Breaking", severity: "high",
    headline: "Kidnapping case: Victim recovered safe, 3 held in Lucknow",
    source: "Aaj Tak", time: "41 min ago", region: "Lucknow",
    icon: "🚓", views: "5.3K",
  },
  {
    id: 7, category: "Cybercrime", severity: "medium",
    headline: "OTP fraud surge during festive season; police warns public",
    source: "Indian Express", time: "55 min ago", region: "Pan-India",
    icon: "📱", views: "8.1K",
  },
  {
    id: 8, category: "Arrest", severity: "low",
    headline: "Counterfeiting unit busted in Pune; fake notes worth ₹2L seized",
    source: "Pune Mirror", time: "1 hr ago", region: "Pune",
    icon: "💵", views: "1.4K",
  },
  {
    id: 9, category: "Alert", severity: "high",
    headline: "Terror threat neutralized; 4 suspected militants detained at border",
    source: "Republic TV", time: "1.5 hr ago", region: "J&K",
    icon: "⚠️", views: "12.4K",
  },
  {
    id: 10, category: "Investigation", severity: "medium",
    headline: "Land scam worth ₹300 crore under CBI scanner in Ahmedabad",
    source: "Gujarat Today", time: "2 hr ago", region: "Ahmedabad",
    icon: "🏗️", views: "2.2K",
  },
];

const NEWS_SEVERITY_STYLES = {
  high: { bg: "bg-rose-500/12", border: "border-rose-500/25", badge: "bg-rose-500/20 text-rose-400 border-rose-500/30", dot: "bg-rose-400" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", dot: "bg-amber-400" },
  low: { bg: "bg-emerald-500/8", border: "border-emerald-500/15", badge: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
};

/* ── Live News Sidebar Component ─────────────────────────── */
function LiveCrimeNewsSidebar({ isOpen, onClose }) {
  const [filter, setFilter] = useState("All");
  const [newsItems, setNewsItems] = useState(CRIME_NEWS_ITEMS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flashId, setFlashId] = useState(null);
  const tickerRef = useRef(null);

  const categories = ["All", "Breaking", "Cybercrime", "Arrest", "Alert", "Investigation"];

  const filtered = filter === "All" ? newsItems : newsItems.filter(n => n.category === filter);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate new incoming news
      const newItem = {
        id: Date.now(), category: "Breaking", severity: "high",
        headline: "Live update: Police patrol intensified across 12 districts",
        source: "Live Feed", time: "Just now", region: "Pan-India",
        icon: "🔴", views: "0",
      };
      setNewsItems(prev => [newItem, ...prev.slice(0, 9)]);
      setFlashId(newItem.id);
      setIsRefreshing(false);
      setTimeout(() => setFlashId(null), 2500);
    }, 1200);
  };

  // Auto-refresh every 45 seconds
  useEffect(() => {
    const t = setInterval(() => {
      setFlashId(CRIME_NEWS_ITEMS[Math.floor(Math.random() * CRIME_NEWS_ITEMS.length)].id);
      setTimeout(() => setFlashId(null), 2000);
    }, 45000);
    return () => clearInterval(t);
  }, []);

  const breakingCount = newsItems.filter(n => n.severity === "high").length;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-black/60 lg:hidden"
            aria-label="Close news"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          dashboard-sidebar-scroll
          fixed z-[200] top-0 left-0 h-screen w-[min(calc(100vw-1.25rem),20rem)] shrink-0
          flex flex-col gap-0 overflow-y-auto overflow-x-hidden
          border-r border-white/8
          transition-[transform,box-shadow] duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto lg:h-auto lg:min-h-screen lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:w-80 xl:w-[22rem] lg:min-w-72
        `}
        style={{
          background: "rgba(5, 10, 22, 0.97)",
          backdropFilter: "blur(24px)",
          boxShadow: isOpen ? "8px 0 40px rgba(0,0,0,0.7)" : "none",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-3 pt-3 pb-2" style={{ background: "rgba(5,10,22,0.98)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Newspaper size={13} className="text-white" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Crime News</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span className="text-[9px] text-slate-500">LIVE FEED</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.button
                type="button"
                onClick={handleRefresh}
                whileTap={{ scale: 0.9 }}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-slate-400 hover:text-slate-200"
                aria-label="Refresh news"
              >
                <RefreshCw size={12} className={isRefreshing ? "animate-spin text-rose-400" : ""} />
              </motion.button>
              <button
                type="button"
                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
                onClick={onClose}
                aria-label="Close news sidebar"
              >
                <X size={14} className="text-slate-300" />
              </button>
            </div>
          </div>

          {/* Breaking banner */}
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-2.5 py-1.5 flex items-center gap-2 mb-2">
            <Flame size={11} className="text-rose-400 shrink-0" />
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wide">{breakingCount} Breaking Alerts</span>
            <span className="ml-auto text-[9px] text-slate-500 font-mono">Updated now</span>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition border ${
                  filter === cat
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                    : "bg-white/5 border-white/8 text-slate-500 hover:text-slate-300 hover:bg-white/8"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/6 mx-3" />

        {/* News list */}
        <div className="flex-1 px-2.5 py-2 flex flex-col gap-2 min-h-0">
          {filtered.map((item, idx) => {
            const style = NEWS_SEVERITY_STYLES[item.severity];
            const isFlashing = flashId === item.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                className={`rounded-xl border p-2.5 cursor-pointer transition-all duration-300 group ${
                  style.bg
                } ${
                  style.border
                } ${
                  isFlashing ? "ring-1 ring-rose-400/60 shadow-lg shadow-rose-500/10" : ""
                } hover:brightness-110`}
                onClick={() => {}}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${style.badge}`}>
                        {item.category}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${
                        item.severity === "high" ? "animate-pulse" : ""
                      }`} />
                    </div>
                    <p className="text-xs font-medium text-slate-200 leading-snug line-clamp-2 group-hover:text-white transition">
                      {item.headline}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-slate-500">{item.source}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-[9px] text-slate-500">{item.region}</span>
                      <span className="text-slate-700 ml-auto">·</span>
                      <span className="text-[9px] text-slate-500">{item.time}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Eye size={8} className="text-slate-600" />
                      <span className="text-[9px] text-slate-600">{item.views}</span>
                      <ExternalLink size={8} className="text-slate-700 ml-auto opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-white/6" style={{ background: "rgba(5,10,22,0.95)" }}>
          <div className="flex items-center gap-2 text-[9px] text-slate-600">
            <Wifi size={9} className="text-emerald-500" />
            <span>Connected to live crime feed</span>
            <span className="ml-auto">India</span>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Form defaults ──────────────────────────────────────── */
const initialForm = {
  actorType: "Individual",
  crimeType: "Theft",
  weaponUsed: "No",
  vehicleUsed: "No",
  description: "",
  phone: "",
  vehicleSelection: "None",
};

/* ── Section header component ────────────────────────────── */
function SectionHeader({ icon: Icon, title, subtitle, color = "sky", action }) {
  const colors = {
    sky: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    violet: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    rose: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  };
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── Form select ─────────────────────────────────────────── */
function FormSelect({ label, value, onChange, options }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <select
        className="input-field w-full text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ── Chart card ──────────────────────────────────────────── */
function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`glass-card p-4 md:p-5 ${className}`}>
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("crime_user") || "null");
  const { theme, toggle } = useTheme();
  const chart = chartPalette();

  const defaultState = user?.state && STATE_REGIONS[user.state] ? user.state : "Maharashtra";
  const [selectedState, setSelectedState] = useState(defaultState);
  const [region, setRegion] = useState((STATE_REGIONS[defaultState] || [""])[0]);
  const [time, setTime] = useState("08:30");
  const [ampm, setAmpm] = useState("AM");
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [proofFileInputKey, setProofFileInputKey] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("");
  const [lastSubmitInfo, setLastSubmitInfo] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [graphInput, setGraphInput] = useState({ region: "", crime_type: "", actor_type: "" });
  const [mapBlinkId, setMapBlinkId] = useState(null);
  const [geoCoords, setGeoCoords] = useState(null);
  const [mapReload, setMapReload] = useState(0);
  const [trackingTick, setTrackingTick] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newsSidebarOpen, setNewsSidebarOpen] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const regions = useMemo(() => STATE_REGIONS[selectedState] || [], [selectedState]);

  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);
  useEffect(() => {
    if (!regions.includes(region)) setRegion(regions[0] || "");
  }, [regions, region]);

  const notify = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3200);
  }, []);

  const onLive = useCallback((msg) => {
    if (!msg?.type) return;
    if (msg.type === "crime_report" || msg.type === "panic") {
      notify(
        msg.type === "panic"
          ? `🚨 Panic / emergency signal: ${msg.region}`
          : `Live alert: ${msg.crime_type} (${msg.region})`,
        "error"
      );
      setMapBlinkId(msg.public_id || null);
      setMapReload((k) => k + 1);
      setTimeout(() => setMapBlinkId(null), 5000);
    }
  }, [notify]);

  const { connected: wsConnected } = useCrimeSocket(onLive);

  const loadZones = async () => {
    try {
      const data = await apiGet("/zones", { state: selectedState, mode: "rl" });
      setZones(data);
    } catch (err) { notify(err.message, "error"); }
  };

  const generateGraphs = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await apiGet("/analytics", {
        state: selectedState,
        region: graphInput.region,
        crime_type: graphInput.crime_type,
        actor_type: graphInput.actor_type,
      });
      setAnalytics(data);
    } catch (err) { notify(err.message, "error"); }
    finally { setAnalyticsLoading(false); }
  };

  useEffect(() => { loadZones(); generateGraphs(); }, [selectedState]);

  const resetAll = () => {
    const next = defaultState;
    setSelectedState(next);
    setRegion((STATE_REGIONS[next] || [""])[0]);
    setTime("08:30"); setAmpm("AM");
    setForm(initialForm); setFile(null); setPreviewUrl("");
    setProofFileInputKey((k) => k + 1);
    setGraphInput({ region: "", crime_type: "", actor_type: "" });
    setGeoCoords(null);
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoiceBlob(null); setVoicePreviewUrl(""); setLastSubmitInfo(null);
    setMapVisible(false); setSidebarOpen(false); setNewsSidebarOpen(false);
    notify("Dashboard reset");
  };

  const logout = () => {
    localStorage.removeItem("crime_user");
    localStorage.removeItem("crime_token");
    navigate("/login");
  };

  const onFile = async (next) => {
    setFile(next);
    if (!next) { setPreviewUrl(""); return; }
    setPreviewUrl(URL.createObjectURL(next));
    if (next.type.startsWith("audio/")) return;
    if (next.type.startsWith("image/")) {
      try {
        const res = await apiUpload("/ai/analyze-image", next);
        const h = res.form_hints || {};
        setForm((p) => ({
          ...p,
          weaponUsed: h.weaponUsed || p.weaponUsed,
          vehicleUsed: h.vehicleUsed || p.vehicleUsed,
          vehicleSelection: h.vehicleSelection || p.vehicleSelection,
        }));
        notify("Image analysis applied to form fields", "success");
      } catch { notify("Image analysis unavailable", "error"); }
    }
  };

  const applyGps = () => {
    if (!navigator.geolocation) { notify("Geolocation not supported", "error"); return; }
    setMapVisible(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoCoords({ lat: latitude, lng: longitude });
        try {
          const hint = await apiGet("/geo/hint", { lat: latitude, lng: longitude });
          if (hint.state) setSelectedState(hint.state);
          if (hint.region) setRegion(hint.region);
          notify("Location applied to state/region", "success");
        } catch (e) { notify(e.message, "error"); }
      },
      () => notify("GPS permission denied", "error"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const submitReport = async () => {
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("state", selectedState);
      payload.append("region", region);
      payload.append("time", `${time} ${ampm}`);
      payload.append("crime_type", form.crimeType);
      payload.append("actor_type", form.actorType);
      payload.append("weapon", form.weaponUsed);
      payload.append("vehicle", form.vehicleUsed);
      payload.append("description", form.description);
      payload.append("phone", form.phone);
      payload.append("vehicle_selection", form.vehicleSelection);
      if (geoCoords) {
        payload.append("latitude", String(geoCoords.lat));
        payload.append("longitude", String(geoCoords.lng));
      }
      if (file) payload.append("file", file);
      if (voiceBlob) {
        const ext = voiceBlob.type.includes("webm") ? "webm" : voiceBlob.type.includes("mp4") ? "m4a" : "webm";
        payload.append("voice", voiceBlob, `voice-evidence.${ext}`);
      }
      const res = await apiPost("/report", payload, true);
      const submittedLabel = res.submitted_at ? new Date(res.submitted_at).toLocaleString() : new Date().toLocaleString();
      notify(`Submitted ${submittedLabel} · Incident: ${time} ${ampm} · ID ${res.report_id || ""}`, "success");
      setLastSubmitInfo({ id: res.report_id, submittedAt: res.submitted_at || new Date().toISOString(), incidentTime: `${time} ${ampm}` });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
      setFile(null); setPreviewUrl(""); setVoiceBlob(null); setVoicePreviewUrl("");
      setProofFileInputKey((k) => k + 1);
      setForm((p) => ({ ...p, description: "", phone: "" }));
      setMapReload((k) => k + 1);
      setTrackingTick((t) => t + 1);
      await Promise.all([generateGraphs(), loadZones()]);
    } catch (err) { notify(err.message, "error"); }
    finally { setSubmitting(false); }
  };

  const role = user?.role || "citizen";

  /* ── Sidebar content ───────────────────────────────────── */
  const sidebarInner = (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex w-full items-center justify-between gap-2 pb-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Map & AI</span>
        </div>
        <button
          type="button"
          className="lg:hidden shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X size={16} className="text-slate-300" />
        </button>
      </div>

      {/* Map */}
      <div className="glass-card p-3.5 shrink-0">
        {mapVisible ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={13} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">Live Map</span>
              <span className="text-[10px] text-slate-500">· OpenStreetMap</span>
            </div>
            <CrimeMapLeaflet variant="sidebar" selectedState={selectedState} blinkKey={mapBlinkId} refreshKey={mapReload} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-600/20 border border-teal-500/20 flex items-center justify-center">
              <MapPinned size={20} className="text-teal-400" />
            </div>
            <p className="text-center text-xs text-slate-500 leading-relaxed">
              Map hidden. Tap <span className="text-teal-400 font-semibold">Use GPS</span> to reveal.
            </p>
          </div>
        )}
      </div>

      {/* Crime Prediction AI Panel */}
      <div className="glass-card p-3.5 shrink-0">
        <CrimePredictionPanel />
      </div>

      {/* Report tracking */}
      <div className="glass-card p-3.5 min-h-0 flex-1">
        <ReportTracking role={role} onNotify={notify} refreshTrigger={trackingTick} />
      </div>
    </div>
  );

  /* ── Main render ───────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-slate-100 relative z-10">
      <Toast message={toast.message} type={toast.type} />
      <Chatbot
        onAutoFill={(ctx) => {
          if (ctx.crime_type) setForm((p) => ({ ...p, crimeType: ctx.crime_type }));
          if (ctx.location) setRegion(ctx.location);
          if (ctx.time) {
            const v = String(ctx.time).toLowerCase();
            if (v.includes("night")) setAmpm("PM");
            else if (v.includes("morning")) setAmpm("AM");
          }
          if (ctx.people) setForm((p) => ({ ...p, actorType: ctx.people }));
        }}
        onUrgent={() => notify("🚨 This seems urgent. Please use Panic button if immediate danger.", "error")}
      />

      {/* LEFT — Live Crime News Sidebar */}
      <LiveCrimeNewsSidebar isOpen={newsSidebarOpen} onClose={() => setNewsSidebarOpen(false)} />

      {/* Center — Main content area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Header */}
        <header
          className="shrink-0 w-full border-b border-white/8 sticky top-0 z-[100]"
          style={{
            background: "rgba(7, 13, 28, 0.92)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-[1000px] mx-auto w-full px-4 py-3 md:py-4">
            <div className="flex items-center gap-3">
              {/* Mobile: News sidebar toggle */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl border border-rose-500/20 bg-rose-500/8 hover:bg-rose-500/14 transition"
                onClick={() => setNewsSidebarOpen(true)}
                aria-label="Open news"
              >
                <Newspaper size={18} className="text-rose-400" />
              </button>
              {/* Mobile: Map & AI sidebar toggle */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open map sidebar"
              >
                <Menu size={18} className="text-slate-300" />
              </button>

              {/* Brand */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="hidden sm:flex w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 items-center justify-center shadow-glow shrink-0">
                  <Shield size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-gradient-blue truncate">
                    CRIMEWATCH AI
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      Welcome, <span className="text-slate-300 font-medium">{user?.username || "Guest"}</span>
                    </span>
                    <span className="hidden sm:inline text-slate-600">·</span>
                    <span className="hidden sm:inline text-xs text-slate-500">{defaultState}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/20">
                      {role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <PanicFab onStatus={notify} variant="header" />

                {/* Live indicator */}
                <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${wsConnected
                    ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
                    : "border-slate-600/30 bg-slate-800/30 text-slate-500"
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <Radio size={11} />
                  {wsConnected ? "Live" : "WS"}
                </div>

                <NotificationBell />

                <button
                  type="button"
                  onClick={toggle}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-slate-400 hover:text-slate-200 transition"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 text-xs font-medium transition"
                >
                  <RotateCcw size={13} /> Reset
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/8 text-rose-400 hover:bg-rose-500/15 text-xs font-medium transition"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 min-h-0">
          <div className="max-w-[1000px] mx-auto w-full px-4 py-5 flex flex-col gap-5">

            {/* ── RL Zone Panel ───────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-4 md:p-5 border border-white/07"
            >
              <SectionHeader
                icon={AlertTriangle}
                title="RL Zone Panel"
                subtitle="Reinforcement learning — risk zones for current state"
                color="amber"
                action={
                  <motion.button
                    type="button"
                    onClick={loadZones}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25 text-amber-400 hover:from-amber-500/25 hover:to-orange-500/25 transition"
                  >
                    <Activity size={13} /> Refresh
                  </motion.button>
                }
              />
              <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[260px] overflow-auto pr-1">
                {zones.length === 0 && (
                  <div className="col-span-full text-center text-slate-500 text-sm py-6">No zone data yet — click Refresh.</div>
                )}
                {zones.map((z) => (
                  <motion.div
                    key={`${z.state}-${z.zone}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    className={`rounded-xl p-3 ${riskStyle[z.risk] || "risk-medium"}`}
                  >
                    <div className="font-semibold text-sm truncate">{z.zone}</div>
                    <div className="text-xs opacity-70 mt-0.5">{z.state}</div>
                    <div className="text-xs mt-2 flex items-center justify-between">
                      <span className="font-medium">Risk: {z.risk}</span>
                      <span className="opacity-70">{z.crime_frequency} cases</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── Incident Details ─────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-4 md:p-5"
              style={{ borderColor: "rgba(56,189,248,0.1)" }}
            >
              <SectionHeader icon={FileText} title="Incident Details" subtitle="Classify the type of incident" color="sky" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <FormSelect
                  label="Individual / Group"
                  value={form.actorType}
                  onChange={(v) => setForm((p) => ({ ...p, actorType: v }))}
                  options={["Individual", "Group"]}
                />
                <FormSelect
                  label="Type of Crime"
                  value={form.crimeType}
                  onChange={(v) => setForm((p) => ({ ...p, crimeType: v }))}
                  options={["Theft", "Robbery", "Assault", "Cybercrime", "Fraud"]}
                />
                <FormSelect
                  label="Weapon Used"
                  value={form.weaponUsed}
                  onChange={(v) => setForm((p) => ({ ...p, weaponUsed: v }))}
                  options={["Yes", "No"]}
                />
                <FormSelect
                  label="Vehicle Used"
                  value={form.vehicleUsed}
                  onChange={(v) => setForm((p) => ({ ...p, vehicleUsed: v }))}
                  options={["Yes", "No"]}
                />
              </div>
            </motion.section>

            {/* ── Vehicle selection ────────────────────────────── */}
            <AnimatePresence>
              {form.vehicleUsed === "Yes" && (
                <motion.section
                  initial={{ opacity: 0, y: 12, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 12, height: 0 }}
                  className="glass-card p-4 md:p-5 overflow-hidden"
                  style={{ borderColor: "rgba(168,85,247,0.15)" }}
                >
                  <SectionHeader icon={Car} title="Vehicle Selection" color="violet" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                    {[
                      { label: "Car", icon: Car },
                      { label: "Bike", icon: Bike },
                      { label: "Truck", icon: Truck },
                      { label: "None", icon: ShieldAlert },
                    ].map((v) => {
                      const Icon = v.icon;
                      const selected = form.vehicleSelection === v.label;
                      return (
                        <motion.button
                          key={v.label}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setForm((p) => ({ ...p, vehicleSelection: v.label }))}
                          className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${selected
                              ? "bg-violet-500/15 border-violet-400/40 shadow-glow-violet"
                              : "bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15"
                            }`}
                        >
                          <Icon size={22} className={selected ? "text-violet-400" : "text-slate-400"} />
                          <span className={`text-xs font-medium ${selected ? "text-violet-300" : "text-slate-400"}`}>{v.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <select
                    className="input-field w-full text-sm"
                    value={form.vehicleSelection}
                    onChange={(e) => setForm((p) => ({ ...p, vehicleSelection: e.target.value }))}
                  >
                    {["Car", "Bike", "Truck", "None"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </motion.section>
              )}
            </AnimatePresence>

            {/* ── Proof & Evidence ─────────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card overflow-hidden"
              style={{ borderColor: "rgba(20,184,166,0.2)" }}
            >
              {/* Section header banner */}
              <div
                className="px-4 py-4 md:px-6 border-b border-white/8"
                style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.08), rgba(56,189,248,0.06), rgba(99,102,241,0.08))" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                    <UploadCloud size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Proof & Evidence</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Set location, attach files, then submit your report.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 flex flex-col gap-5">
                {/* GPS location card */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Smart Location</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Use your device GPS to auto-fill <strong className="text-slate-200">State</strong> and{" "}
                      <strong className="text-slate-200">Region</strong>, and reveal the live map.
                    </p>
                    {geoCoords && (
                      <p className="text-xs font-mono text-emerald-400 mt-1.5">
                        📍 {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    onClick={applyGps}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 border border-white/15 shadow-glow-emerald hover:from-teal-400 hover:to-emerald-500 transition"
                  >
                    <MapPinned size={18} /> Use GPS
                  </motion.button>
                </div>

                {/* State / Region / Time */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">State</label>
                    <select className="input-field w-full text-sm" value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                      {Object.keys(STATE_REGIONS).map((st) => <option key={st}>{st}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Region</label>
                    <select className="input-field w-full text-sm" value={region} onChange={(e) => setRegion(e.target.value)}>
                      {regions.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={11} /> Time
                    </label>
                    <input type="time" className="input-field w-full text-sm" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">AM / PM</label>
                    <select className="input-field w-full text-sm" value={ampm} onChange={(e) => setAmpm(e.target.value)}>
                      <option>AM</option><option>PM</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Incident Description</label>
                  <textarea
                    className="input-field w-full min-h-[90px] resize-y text-sm"
                    placeholder="Describe the incident in detail..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Phone size={11} /> Contact Phone
                  </label>
                  <input
                    className="input-field w-full text-sm"
                    placeholder="Your phone number"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>

                {/* File upload + voice */}
                <div className="flex flex-wrap gap-3">
                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 min-w-[140px] flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/50 cursor-pointer transition"
                  >
                    <UploadCloud size={18} className="text-sky-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-slate-200">Upload Proof</div>
                      <div className="text-[10px] text-slate-500">Photo, video or audio</div>
                    </div>
                    <input
                      key={proofFileInputKey}
                      type="file"
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={(e) => onFile(e.target.files?.[0] || null)}
                    />
                  </motion.label>

                  <VoiceFill
                    onVoiceRecorded={(blob) => {
                      setVoiceBlob(blob);
                      setVoicePreviewUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return URL.createObjectURL(blob);
                      });
                      notify("Voice note recorded — uploads when you submit.", "success");
                    }}
                    onError={(msg) => notify(msg, "error")}
                  />
                </div>

                {/* Voice preview */}
                {voicePreviewUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Mic size={13} className="text-violet-400" />
                      <span className="text-xs text-violet-300 font-medium">Voice evidence (uploads with Submit)</span>
                    </div>
                    <audio src={voicePreviewUrl} controls className="w-full rounded-lg" style={{ height: "36px" }} />
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300 transition hover:underline"
                      onClick={() => {
                        setVoiceBlob(null);
                        setVoicePreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
                      }}
                    >
                      Remove voice note
                    </button>
                  </motion.div>
                )}

                {/* Media preview */}
                {previewUrl && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl overflow-hidden border border-white/10">
                    {file?.type.startsWith("video") ? (
                      <video src={previewUrl} controls className="w-full max-h-[280px] object-contain" />
                    ) : file?.type.startsWith("audio") ? (
                      <audio src={previewUrl} controls className="w-full" />
                    ) : (
                      <img src={previewUrl} alt="preview" className="w-full max-h-[260px] object-contain" />
                    )}
                  </motion.div>
                )}

                {/* Submit button */}
                <motion.button
                  type="button"
                  onClick={submitReport}
                  disabled={submitting}
                  whileHover={submitting ? undefined : { scale: 1.02, y: -2 }}
                  whileTap={submitting ? undefined : { scale: 0.98 }}
                  className="w-full relative overflow-hidden rounded-xl py-4 font-bold text-white transition-all flex items-center justify-center gap-3 group text-sm"
                  style={{
                    background: submitting
                      ? "linear-gradient(135deg, #334155, #475569)"
                      : "linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)",
                    boxShadow: submitting ? "none" : "0 6px 30px rgba(99,102,241,0.4)",
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      <Shield size={18} />
                      Submit Proof
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>

                {/* Success info */}
                <AnimatePresence>
                  {lastSubmitInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                        <Zap size={14} />
                        Report Submitted Successfully
                      </div>
                      <div className="text-xs text-slate-400">Submitted: <span className="text-slate-200">{new Date(lastSubmitInfo.submittedAt).toLocaleString()}</span></div>
                      <div className="text-xs text-slate-400">Incident Time: <span className="text-slate-200">{lastSubmitInfo.incidentTime}</span></div>
                      <div className="text-xs font-mono border-t border-emerald-500/20 pt-1.5 text-emerald-400">
                        ID: {lastSubmitInfo.id}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>

            {/* ── Advanced Analytics ───────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 md:p-6"
              style={{ borderColor: "rgba(168,85,247,0.1)" }}
            >
              <SectionHeader
                icon={BarChart2}
                title="Advanced Analytics"
                subtitle="Filter and refresh to update all charts"
                color="violet"
              />

              {/* Filter row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 pb-5 border-b border-white/6">
                <select className="input-field text-sm" value={graphInput.region} onChange={(e) => setGraphInput((p) => ({ ...p, region: e.target.value }))}>
                  <option value="">All Regions</option>
                  {regions.map((r) => <option key={r}>{r}</option>)}
                </select>
                <select className="input-field text-sm" value={graphInput.crime_type} onChange={(e) => setGraphInput((p) => ({ ...p, crime_type: e.target.value }))}>
                  <option value="">All Crimes</option>
                  {["Theft", "Robbery", "Assault", "Cybercrime", "Fraud"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <select className="input-field text-sm" value={graphInput.actor_type} onChange={(e) => setGraphInput((p) => ({ ...p, actor_type: e.target.value }))}>
                  <option value="">All Actors</option>
                  <option>Individual</option>
                  <option>Group</option>
                </select>
                <motion.button
                  type="button"
                  onClick={generateGraphs}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500/80 to-indigo-600/80 text-white border border-white/10 hover:from-violet-500 hover:to-indigo-600 transition shadow-md"
                >
                  <TrendingUp size={15} /> Update Charts
                </motion.button>
              </div>

              {analyticsLoading || !analytics ? (
                <div className="space-y-4">
                  {[220, 200, 220].map((h, i) => (
                    <div key={i} className="animate-pulse rounded-2xl bg-white/4" style={{ height: h }} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Crime type bar */}
                  <ChartCard title="Incidents by Crime Type" subtitle="Taller bars = more reports in that category">
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.crime_type || []} margin={{ top: 6, right: 6, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 6" stroke={chart.grid} vertical={false} />
                          <XAxis dataKey="name" stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={{ stroke: chart.grid }} interval={0} angle={-18} textAnchor="end" height={56} />
                          <YAxis stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                          <Tooltip
                            cursor={{ fill: "rgba(56,189,248,0.06)" }}
                            contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: "12px", color: chart.label }}
                            labelStyle={{ color: chart.label, fontWeight: 600 }}
                            formatter={(v) => [`${v}`, "Reports"]}
                            labelFormatter={(l) => l != null ? String(l) : ""}
                          />
                          <Bar dataKey="value" radius={[7, 7, 0, 0]} maxBarSize={48} name="Reports">
                            {(analytics.crime_type || []).map((_, i) => <Cell key={`ct-${i}`} fill={CRIME_TYPE_BAR_COLORS[i % CRIME_TYPE_BAR_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Region bar */}
                  <ChartCard title="Incidents by Region" subtitle="Compare volume across areas">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.region || []} margin={{ top: 6, right: 6, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 6" stroke={chart.grid} vertical={false} />
                          <XAxis dataKey="name" stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={{ stroke: chart.grid }} interval={0} angle={-22} textAnchor="end" height={58} />
                          <YAxis stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                          <Tooltip
                            cursor={{ fill: "rgba(56,189,248,0.06)" }}
                            contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: "12px", color: chart.label }}
                            labelStyle={{ color: chart.label, fontWeight: 600 }}
                            formatter={(v) => [`${v}`, "Reports"]}
                          />
                          <Bar dataKey="value" radius={[7, 7, 0, 0]} maxBarSize={40} name="Reports">
                            {(analytics.region || []).map((_, i) => <Cell key={`rg-${i}`} fill={REGION_BAR_SHADES[i % REGION_BAR_SHADES.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Actor pie */}
                    <ChartCard title="Individual vs Group" subtitle="Share of reports by actor type">
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={analytics.actor_type || []} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={52} outerRadius={72} paddingAngle={2} stroke="rgba(10,18,35,0.97)" strokeWidth={2}>
                              {(analytics.actor_type || []).map((_, i) => <Cell key={`ac-${i}`} fill={ACTOR_PIE_COLORS[i % ACTOR_PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: "12px", color: chart.label }}
                              formatter={(value, name) => {
                                const total = (analytics.actor_type || []).reduce((s, x) => s + (Number(x.value) || 0), 0);
                                const p = total > 0 ? Math.round((Number(value) / total) * 100) : 0;
                                return [`${value} reports (${p}%)`, name];
                              }}
                            />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px", color: chart.subtle, paddingTop: 8 }} formatter={(value) => <span style={{ color: chart.label }}>{value}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>

                    {/* Trend area */}
                    <ChartCard title="Trend Over Time" subtitle="Report counts by time bucket">
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.time || []} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="dashAreaTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 6" stroke={chart.grid} vertical={false} />
                            <XAxis dataKey="name" stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={{ stroke: chart.grid }} />
                            <YAxis stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                            <Tooltip contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: "12px", color: chart.label }} formatter={(v) => [`${v}`, "Reports"]} />
                            <Area type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2.5} fill="url(#dashAreaTrend)" dot={{ r: 3, strokeWidth: 2, fill: "#0a1223", stroke: "#a78bfa" }} activeDot={{ r: 5 }} name="Reports" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  </div>

                  {/* Peak hours */}
                  <ChartCard title="Peak Hours" subtitle="When most reports were filed — brighter bars = busier times">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.peak_hours || []} margin={{ top: 6, right: 6, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 6" stroke={chart.grid} vertical={false} />
                          <XAxis dataKey="name" stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={{ stroke: chart.grid }} interval={0} />
                          <YAxis stroke={chart.axis} tick={chart.tick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                          <Tooltip
                            cursor={{ fill: "rgba(251,191,36,0.06)" }}
                            contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: "12px", color: chart.label }}
                            formatter={(v) => [`${v}`, "Reports this hour"]}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36} name="Reports">
                            {(analytics.peak_hours || []).map((entry, i) => {
                              const v = Number(entry?.value) || 0;
                              const max = Math.max(1, ...((analytics.peak_hours || []).map((d) => Number(d.value) || 0)));
                              const t = v / max;
                              const c = PEAK_HOUR_COLORS[Math.min(PEAK_HOUR_COLORS.length - 1, Math.floor(t * PEAK_HOUR_COLORS.length))];
                              return <Cell key={`ph-${i}`} fill={c} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>
              )}
            </motion.section>
          </div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-white/6 py-3 px-4" style={{ background: "rgba(7,13,28,0.8)" }}>
          <div className="max-w-[1000px] mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle size={14} /> Emergency: 100
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Zap size={14} /> Disaster: 108
            </div>
          </div>
        </footer>
      </div>

      {/* RIGHT — Map & AI Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-black/60 lg:hidden"
            aria-label="Close map sidebar"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      <aside
        className={`
          dashboard-sidebar-scroll
          fixed z-[200] top-0 right-0 h-screen w-[min(calc(100vw-1.25rem),21rem)] shrink-0
          flex flex-col items-stretch gap-0 p-3 sm:p-4 overflow-y-auto overflow-x-hidden
          border-l border-white/8
          transition-[transform,box-shadow] duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto lg:h-auto lg:min-h-screen lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:w-96 xl:w-[26rem] lg:min-w-96
        `}
        style={{
          background: "rgba(7, 13, 28, 0.96)",
          backdropFilter: "blur(24px)",
          boxShadow: sidebarOpen ? "-8px 0 40px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {sidebarInner}
      </aside>
    </div>
  );
}
