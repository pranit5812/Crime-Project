import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaClipboardList, FaExclamationTriangle, FaMapMarkedAlt,
  FaShieldAlt, FaStream, FaTimes, FaCheck, FaBan, FaSearch, FaSpinner
} from "react-icons/fa";
import {
  Shield, Activity, Bell, Radio, LogOut, Menu, X,
  Eye, Zap, MapPin, Clock, User, Phone, FileText,
  ChevronRight, AlertTriangle, CheckCircle2, XCircle, Search
} from "lucide-react";
import { Toast } from "../components/Toast";
import { CrimePredictionPanel } from "../components/intelligence/CrimePredictionPanel";
import { API_BASE, apiGet, apiPatch, authHeaders } from "../lib/api";

/* ── Nav items ─────────────────────────────────────── */
const navItems = [
  { id: "dashboard", label: "Dashboard",     icon: FaShieldAlt },
  { id: "live",      label: "Live Reports",  icon: FaStream },
  { id: "assigned",  label: "Assigned Cases",icon: FaClipboardList },
  { id: "map",       label: "Map View",      icon: FaMapMarkedAlt },
];

/* ── Status badges ─────────────────────────────────── */
const statusMeta = {
  Pending:      { badge: "bg-amber-500/15 text-amber-300 border-amber-400/30",   dot: "bg-amber-400",   glow: "rgba(245,158,11,0.2)" },
  Investigating:{ badge: "bg-sky-500/15 text-sky-300 border-sky-400/30",         dot: "bg-sky-400",     glow: "rgba(56,189,248,0.2)" },
  Resolved:     { badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30", dot: "bg-emerald-400", glow: "rgba(52,211,153,0.2)" },
  Rejected:     { badge: "bg-rose-500/15 text-rose-300 border-rose-400/30",      dot: "bg-rose-400",    glow: "rgba(244,63,94,0.2)" },
};

const uiToApiStatus = {
  Pending: "pending", Investigating: "investigating", Resolved: "resolved", Rejected: "rejected",
};

function nowClock() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── Spinner ────────────────────────────────────────── */
function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-2 text-slate-400 py-6 justify-center">
      <FaSpinner className="animate-spin text-sky-400" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    sky:     { bg: "from-sky-500/15 to-sky-600/5",     border: "border-sky-500/20",     text: "text-sky-400",     icon: "bg-sky-500/15 border-sky-500/25" },
    amber:   { bg: "from-amber-500/15 to-amber-600/5", border: "border-amber-500/20",   text: "text-amber-400",   icon: "bg-amber-500/15 border-amber-500/25" },
    emerald: { bg: "from-emerald-500/15 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-400", icon: "bg-emerald-500/15 border-emerald-500/25" },
    rose:    { bg: "from-rose-500/15 to-rose-600/5",   border: "border-rose-500/20",    text: "text-rose-400",    icon: "bg-rose-500/15 border-rose-500/25" },
  };
  const c = colors[color] || colors.sky;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-4 relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
          <div className={`text-3xl font-bold ${c.text}`}>{value}</div>
          {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${c.icon} border flex items-center justify-center`}>
          <Icon size={18} className={c.text} />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Evidence Modal ─────────────────────────────────── */
function EvidenceModal({ open, onClose, report }) {
  const [mediaUrl,   setMediaUrl]   = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [voiceUrl,   setVoiceUrl]   = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  const reportId = report?.public_id || report?.id;

  useEffect(() => {
    let cancelled = false, objectUrl = null;
    if (!open || !report) { setMediaUrl(null); setMediaError(null); return () => {}; }
    setMediaError(null);
    (async () => {
      if (report.evidence_url) { if (!cancelled) setMediaUrl(report.evidence_url); return; }
      if (report.has_file && reportId) {
        try {
          const res  = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/file`, { headers: { ...authHeaders() } });
          if (!res.ok) throw new Error("Could not load evidence");
          if (cancelled) return;
          const blob = await res.blob();
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setMediaUrl(objectUrl);
        } catch { if (!cancelled) { setMediaUrl(null); setMediaError("Could not load proof file from server."); } }
        return;
      }
      if (!cancelled) setMediaUrl(null);
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, report, reportId]);

  useEffect(() => {
    let cancelled = false, objectUrl = null;
    if (!open || !report) { setVoiceUrl(null); setVoiceError(null); return () => {}; }
    setVoiceError(null);
    (async () => {
      if (!report.has_voice || !reportId) { if (!cancelled) setVoiceUrl(null); return; }
      try {
        const res  = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/voice`, { headers: { ...authHeaders() } });
        if (!res.ok) throw new Error("voice");
        if (cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setVoiceUrl(objectUrl);
      } catch { if (!cancelled) { setVoiceUrl(null); setVoiceError("Could not load voice recording."); } }
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, report, reportId]);

  if (!open || !report) return null;
  const effectiveType = report.file_content_type || "";
  const isVideo    = effectiveType.startsWith("video")  || /\.(webm|mp4|mov)$/i.test(report.file_name || "");
  const isImage    = effectiveType.startsWith("image")  || /\.(jpe?g|png|gif|webp|bmp)$/i.test(report.file_name || "");
  const isAudioFile= effectiveType.startsWith("audio")  || /\.(mp3|wav|webm|ogg|m4a)$/i.test(report.file_name || "");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[800] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl"
          style={{ background: "rgba(8,15,30,0.98)", backdropFilter: "blur(20px)" }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                  <FileText size={14} className="text-white" />
                </div>
                <span className="font-bold text-white">Report & Evidence</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 ml-9">
                ID <span className="font-mono text-sky-400">{reportId}</span> · {report.crime_type}
                {report.file_name ? <span className="text-slate-500"> · {report.file_name}</span> : null}
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-4">
            {/* Media */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-white/8 bg-black/20 overflow-hidden min-h-[180px] flex items-center justify-center">
                {mediaError ? (
                  <div className="text-sm text-rose-300 p-4 text-center">{mediaError}</div>
                ) : mediaUrl ? (
                  isVideo ? <video src={mediaUrl} controls className="w-full max-h-[280px] object-contain" /> :
                  isImage ? <img src={mediaUrl} alt="Evidence" className="w-full max-h-[280px] object-contain" /> :
                  isAudioFile ? <audio src={mediaUrl} controls className="w-full px-3" /> :
                  <a href={mediaUrl} download={report.file_name || "evidence"} className="text-sm text-sky-400 underline p-4">Download attached file</a>
                ) : report.has_file ? (
                  <div className="text-sm text-slate-400 p-4">Loading proof…</div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 p-4">
                    <FileText size={32} className="opacity-30" />
                    <span className="text-sm">No photo/video proof uploaded.</span>
                  </div>
                )}
              </div>

              {(report.has_voice || voiceUrl || voiceError) && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 space-y-2">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Activity size={12} /> Voice Evidence
                  </div>
                  {voiceError ? <div className="text-sm text-rose-300">{voiceError}</div> :
                   voiceUrl   ? <audio src={voiceUrl} controls className="w-full" /> :
                   report.has_voice ? <div className="text-sm text-slate-400">Loading voice…</div> : null}
                  {report.voice_file_name && <div className="text-[11px] text-slate-500">{report.voice_file_name}</div>}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3">
              {[
                { label: "Reporter Email", value: report.user_email || "— (submitted without login)", icon: User },
                { label: "Phone",          value: report.phone || "—",                               icon: Phone },
                { label: "Location",       value: `${report.region}, ${report.state}`,               icon: MapPin },
                ...(report.latitude != null ? [{ label: "GPS", value: `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}`, icon: MapPin }] : []),
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <Icon size={11} /> {label}
                  </div>
                  <div className="text-sm text-white break-all">{value}</div>
                </div>
              ))}

              {report.description && (
                <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <div className="text-xs text-slate-500 mb-1">Description</div>
                  <div className="text-sm text-white whitespace-pre-wrap">{report.description}</div>
                </div>
              )}

              {report.voice_transcript && (
                <div className="rounded-xl border border-violet-400/25 bg-violet-950/20 p-3">
                  <div className="text-xs text-violet-400 mb-1">Voice Transcript (STT)</div>
                  <div className="text-sm text-white whitespace-pre-wrap">{report.voice_transcript}</div>
                </div>
              )}

              <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-1.5">
                <div className="text-xs text-slate-500 mb-1">Details</div>
                {[
                  ["Time", report.time], ["Actor", report.actor_type], ["Weapon", report.weapon],
                  ["Vehicle", report.vehicle], ["Vehicle Type", report.vehicle_selection || "—"],
                  ...(report.is_panic ? [["⚠️ Panic", "Emergency flag"]] : []),
                  ...(report.created_at ? [["Submitted", new Date(report.created_at).toLocaleString()]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-white/8 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm transition">
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────── */
export default function PoliceDashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("crime_user") || "null");
  const token    = localStorage.getItem("crime_token");

  if (!token)             return <Navigate to="/login" replace />;
  if (!user || user.role !== "police") return <Navigate to="/" replace />;

  const [active,         setActive]         = useState("dashboard");
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [toast,          setToast]          = useState({ message: "", type: "success" });
  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 2800);
  };

  const [alerts, setAlerts] = useState([
    { id: "a1", crime_type: "Robbery",    location: "Mumbai",    time: "08:30 PM", ts: Date.now() - 90000 },
    { id: "a2", crime_type: "Assault",    location: "Pune",      time: "09:05 PM", ts: Date.now() - 48000 },
    { id: "a3", crime_type: "Cybercrime", location: "Nagpur",    time: "09:20 PM", ts: Date.now() - 20000 },
  ]);

  const [loading,        setLoading]        = useState(true);
  const [reports,        setReports]        = useState([]);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalOpen,      setModalOpen]      = useState(false);

  /* WS for live alerts */
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(`ws://localhost:8000/ws/alerts?token=${encodeURIComponent(token || "")}`);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === "alert" || msg?.type === "crime_report" || msg?.type === "panic") {
            const location   = msg.region || msg.location || "Unknown";
            const crime_type = msg.crime_type || (msg.type === "panic" ? "PANIC" : "Alert");
            setAlerts((a) => [{ id: msg.public_id || `ws_${Date.now()}`, crime_type, location, time: nowClock(), ts: Date.now() }, ...a].slice(0, 6));
            notify(`LIVE: ${crime_type} · ${location}`, "error");
          }
        } catch { /* ignore */ }
      };
    } catch { /* ignore */ }
    return () => { try { ws?.close(); } catch { /* ignore */ } };
  }, []);

  const mockReports = useMemo(() => [
    { id: 1, public_id: "RPT-LOCAL-0001", crime_type: "Robbery",    state: "Maharashtra", region: "Mumbai",     time: "08:30 PM", status: "Pending",       has_file: false, has_voice: false, evidence_url: "/sample.jpg", file_content_type: "image/jpeg", phone: "9876543210", description: "Robbery near market",     actor_type: "Group",      weapon: "Yes", vehicle: "Yes" },
    { id: 2, public_id: "RPT-LOCAL-0002", crime_type: "Assault",    state: "Maharashtra", region: "Pune",       time: "07:10 PM", status: "Investigating", has_file: false, has_voice: false, evidence_url: "",            file_content_type: "",            phone: "9123456789", description: "Fight reported near station", actor_type: "Individual", weapon: "No",  vehicle: "No"  },
    { id: 3, public_id: "RPT-LOCAL-0003", crime_type: "Cybercrime", state: "Karnataka",   region: "Bangalore",  time: "11:55 AM", status: "Resolved",      has_file: false, has_voice: false, evidence_url: "",            file_content_type: "",            phone: "9000000000", description: "Phishing complaint",       actor_type: "Individual", weapon: "No",  vehicle: "No"  },
  ], []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet("/reports");
        if (!cancelled && Array.isArray(data)) {
          setReports(data.map((r) => ({
            ...r,
            status:     r.status ? r.status[0].toUpperCase() + r.status.slice(1) : "Pending",
            crime_type: r.crime_type || r.crime || "Unknown",
            region:     r.region || r.location || "Unknown",
            time:       r.time || r.created_at || nowClock(),
          })));
        }
      } catch { if (!cancelled) setReports(mockReports); }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [mockReports]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports
      .filter((r) => statusFilter === "All" ? true : r.status === statusFilter)
      .filter((r) => !q || [r.public_id, r.id, r.crime_type, r.region, r.state, r.user_email].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [reports, search, statusFilter]);

  const updateLocalStatus = (id, next) =>
    setReports((rs) => rs.map((r) => (r.public_id || r.id) !== id ? r : { ...r, status: next }));

  const updateStatus = async (report, next) => {
    const id = report.public_id || report.id;
    updateLocalStatus(id, next);
    notify(`Status → ${next}`, "success");
    try { await apiPatch(`/reports/${id}/status`, { status: uiToApiStatus[next] || "pending" }); }
    catch { notify("Could not sync status with server.", "error"); }
  };

  const openEvidence = (r) => { setSelectedReport(r); setModalOpen(true); };
  const logout = () => { localStorage.removeItem("crime_user"); localStorage.removeItem("crime_token"); navigate("/login"); };

  /* derived stats */
  const stats = useMemo(() => ({
    total:       reports.length,
    pending:     reports.filter((r) => r.status === "Pending").length,
    resolving:   reports.filter((r) => r.status === "Investigating").length,
    resolved:    reports.filter((r) => r.status === "Resolved").length,
  }), [reports]);

  /* ── render ──────────────────────────────────────── */
  return (
    <div className="min-h-screen text-slate-100 relative z-10" style={{ background: "rgba(5,10,22,0.98)" }}>
      <Toast message={toast.message} type={toast.type} />
      <EvidenceModal open={modalOpen} onClose={() => setModalOpen(false)} report={selectedReport} />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen">
        {/* ── Sidebar ────────────────────────────────── */}
        <aside
          className={`fixed lg:sticky top-0 inset-y-0 left-0 z-[300] w-72 lg:w-72 h-screen border-r border-white/8 transform transition-transform duration-300 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
          style={{ background: "rgba(6,11,24,0.98)", backdropFilter: "blur(20px)" }}
        >
          {/* Sidebar header */}
          <div className="p-5 border-b border-white/8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-glow">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-sky-400">CrimeWatch</div>
                  <div className="text-sm font-bold text-white">Police Portal</div>
                </div>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10">
                <X size={16} className="text-slate-300" />
              </button>
            </div>

            {/* Officer info */}
            <div className="mt-4 rounded-xl border border-white/8 bg-white/3 p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{user?.username?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{user?.username}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">On Duty</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((it) => {
              const Icon = it.icon;
              const isActive = active === it.id;
              return (
                <motion.button
                  key={it.id}
                  type="button"
                  whileHover={{ x: 2 }}
                  onClick={() => { setActive(it.id); setSidebarOpen(false); }}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon className={`text-base shrink-0 ${isActive ? "text-sky-400" : "text-slate-500"}`} />
                  <span>{it.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-sky-400 opacity-60" />}
                </motion.button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-white/8">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/8 text-rose-400 hover:bg-rose-500/15 transition text-sm font-medium"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </aside>

        {/* ── Main ───────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Top bar (mobile) */}
          <div
            className="sticky top-0 z-[120] border-b border-white/8"
            style={{ background: "rgba(6,11,24,0.95)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition"
                >
                  <Menu size={18} className="text-slate-300" />
                </button>
                <div>
                  <div className="text-xs text-slate-500">Police Operations</div>
                  <h1 className="text-lg font-bold text-gradient-blue">Police Dashboard</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Radio size={11} />
                  Live
                </div>
                <button type="button" onClick={logout} className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/8 text-rose-400 hover:bg-rose-500/15 text-xs font-medium transition">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {/* ── Stats ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Total Reports" value={stats.total}     icon={FaClipboardList} color="sky"     sub="All time" />
              <StatCard label="Pending"       value={stats.pending}   icon={AlertTriangle}   color="amber"   sub="Awaiting review" />
              <StatCard label="Investigating" value={stats.resolving} icon={Activity}        color="sky"     sub="Active cases" />
              <StatCard label="Resolved"      value={stats.resolved}  icon={CheckCircle2}    color="emerald" sub="Closed cases" />
            </div>

            {/* ── Crime Prediction AI ─────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-4 md:p-5"
            >
              <CrimePredictionPanel />
            </motion.section>

            {/* ── Live alerts + Map ──────────────────── */}
            <div className="grid lg:grid-cols-12 gap-4">
              {/* Live alerts */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-7 glass-card overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                      <Bell size={15} className="text-rose-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Live Alerts</div>
                      <div className="text-[10px] text-slate-500">Real-time incident feed</div>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setAlerts((a) => [{ id: `m_${Date.now()}`, crime_type: "Robbery", location: "Mumbai", time: nowClock(), ts: Date.now() }, ...a].slice(0, 6))}
                    className="text-xs px-3 py-1.5 rounded-lg border border-rose-400/25 bg-rose-500/8 text-rose-400 hover:bg-rose-500/15 transition font-medium"
                  >
                    + Mock alert
                  </motion.button>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {alerts.slice(0, 6).map((a) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-2xl border border-rose-400/20 p-4 relative overflow-hidden"
                        style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(239,68,68,0.06))" }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/40 to-transparent" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-white">{a.crime_type}</div>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <MapPin size={10} /> {a.location}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                            <Clock size={10} /> {a.time}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-rose-300">
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                          Incoming · Priority High
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>

              {/* Map placeholder */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-5 glass-card overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-white/8">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
                      <FaMapMarkedAlt className="text-sky-400 text-sm" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Map View</div>
                      <div className="text-[10px] text-slate-500">Crime cluster visualization</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 h-[calc(100%-65px)] min-h-[240px]">
                  <div className="h-full min-h-[220px] rounded-2xl border border-dashed border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-indigo-500/5 flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                      <FaMapMarkedAlt className="text-sky-400 text-2xl" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-slate-200 font-medium">Map Integration Ready</div>
                      <div className="text-xs text-slate-500 mt-1">Integrate Leaflet clusters & heatmap</div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>

            {/* ── Reports Management ──────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/8 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                    <FaClipboardList className="text-violet-400 text-sm" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Reports Management</div>
                    <div className="text-[10px] text-slate-500">Accept · Reject · Investigate · Resolve</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search reports…"
                      className="input-field pl-9 pr-3 py-2 text-sm w-44 sm:w-56"
                    />
                  </div>

                  {/* Status filter */}
                  <div className="flex gap-1 rounded-xl border border-white/8 bg-black/20 p-1 flex-wrap">
                    {["All", "Pending", "Investigating", "Resolved", "Rejected"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(s)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                          statusFilter === s
                            ? "bg-white/12 border-white/20 text-white"
                            : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/6"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {loading ? (
                  <Spinner label="Loading reports…" />
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText size={32} className="mx-auto text-slate-700 mb-3" />
                    <div className="text-slate-400 text-sm">No matching reports found.</div>
                  </div>
                ) : (
                  <div className="overflow-auto rounded-xl border border-white/8">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                          {["Report ID", "Crime Type", "Location", "Reporter", "Time", "Proof", "Status", "Actions"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/6">
                        {filtered.map((r) => {
                          const id   = r.public_id || r.id;
                          const meta = statusMeta[r.status] || statusMeta.Pending;
                          return (
                            <motion.tr
                              key={id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="hover:bg-white/3 transition"
                            >
                              <td className="px-4 py-3 font-mono text-xs text-sky-400 whitespace-nowrap">{id}</td>
                              <td className="px-4 py-3 text-slate-100 font-medium whitespace-nowrap">{r.crime_type}</td>
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                                {r.region}{r.state ? <span className="text-slate-500">, {r.state}</span> : null}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs max-w-[130px] truncate" title={r.user_email || ""}>
                                {r.user_email || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">{r.time}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">
                                {[r.has_file && "Media", r.has_voice && "Voice"].filter(Boolean).join(" + ") || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${meta.badge}`}
                                  style={{ boxShadow: `0 0 12px ${meta.glow}` }}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                  {r.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <motion.button whileHover={{ scale: 1.05 }} type="button" onClick={() => updateStatus(r, "Investigating")}
                                    className="px-2.5 py-1 rounded-lg bg-sky-500/12 border border-sky-500/25 hover:bg-sky-500/25 text-xs text-sky-300 flex items-center gap-1 transition">
                                    <FaCheck className="text-[10px]" /> Accept
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} type="button" onClick={() => updateStatus(r, "Rejected")}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/12 border border-rose-500/25 hover:bg-rose-500/25 text-xs text-rose-300 flex items-center gap-1 transition">
                                    <FaBan className="text-[10px]" /> Reject
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} type="button" onClick={() => updateStatus(r, "Investigating")}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-500/12 border border-indigo-500/25 hover:bg-indigo-500/25 text-xs text-indigo-300 transition">
                                    Investigate
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} type="button" onClick={() => updateStatus(r, "Resolved")}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/12 border border-emerald-500/25 hover:bg-emerald-500/25 text-xs text-emerald-300 transition">
                                    Resolve
                                  </motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} type="button" onClick={() => openEvidence(r)}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1 transition">
                                    <Eye size={12} /> Evidence
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.section>

            {/* ── Assigned Cases ──────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <FaClipboardList className="text-amber-400 text-sm" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Assigned Cases</div>
                  <div className="text-[10px] text-slate-500">Ready for future assignment logic (by station / officer ID).</div>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Current view uses the same reports list. Add assignment fields server-side (e.g.{" "}
                <code className="text-sky-400 bg-sky-500/5 border border-sky-500/15 px-1.5 py-0.5 rounded text-xs font-mono">assigned_to</code>,{" "}
                <code className="text-sky-400 bg-sky-500/5 border border-sky-500/15 px-1.5 py-0.5 rounded text-xs font-mono">station_id</code>
                ) and filter here.
              </p>
            </motion.section>
          </div>
        </main>
      </div>
    </div>
  );
}
