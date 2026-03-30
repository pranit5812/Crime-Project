import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from "recharts";
import { Car, Bike, Truck, ShieldAlert, RotateCcw, LogOut, UploadCloud, Sparkles } from "lucide-react";
import { IndiaMap } from "../components/IndiaMap";
import { Toast } from "../components/Toast";
import { STATE_REGIONS } from "../data/stateRegions";
import { apiGet, apiPost } from "../lib/api";

const riskColor = { Low: "bg-emerald-500/20 text-emerald-200", Medium: "bg-amber-500/20 text-amber-200", High: "bg-red-500/20 text-red-200" };

const initialForm = {
  actorType: "Individual",
  crimeType: "Theft",
  weaponUsed: "No",
  vehicleUsed: "No",
  description: "",
  phone: "",
  vehicleSelection: "None"
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("crime_user") || "null");

  const defaultState = user?.state && STATE_REGIONS[user.state] ? user.state : "Maharashtra";
  const [selectedState, setSelectedState] = useState(defaultState);
  const [region, setRegion] = useState((STATE_REGIONS[defaultState] || [""])[0]);
  const [time, setTime] = useState("08:30");
  const [ampm, setAmpm] = useState("AM");
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [zones, setZones] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [graphInput, setGraphInput] = useState({ region: "", crime_type: "", actor_type: "" });
  const [stateHeat, setStateHeat] = useState([]);

  const regions = useMemo(() => STATE_REGIONS[selectedState] || [], [selectedState]);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (!regions.includes(region)) setRegion(regions[0] || "");
  }, [regions, region]);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 2500);
  };

  const loadStateHeat = async () => {
    try {
      const data = await apiGet("/analytics/state-heatmap", { crime_type: form.crimeType });
      setStateHeat(data);
    } catch (err) {
      // keep silent; map still works without heat
    }
  };

  const loadZones = async () => {
    try {
      const data = await apiGet("/zones", { state: selectedState, mode: "rl" });
      setZones(data);
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const generateGraphs = async () => {
    try {
      const data = await apiGet("/analytics", {
        state: selectedState,
        region: graphInput.region,
        crime_type: graphInput.crime_type,
        actor_type: graphInput.actor_type
      });
      setAnalytics(data);
    } catch (err) {
      notify(err.message, "error");
    }
  };

  useEffect(() => {
    loadZones();
    generateGraphs();
    loadStateHeat();
  }, [selectedState]);

  // Auto-refresh heatmap when crime type changes (for map visualization).
  useEffect(() => {
    loadStateHeat();
  }, [form.crimeType]);

  const resetAll = () => {
    const nextState = defaultState;
    setSelectedState(nextState);
    setRegion((STATE_REGIONS[nextState] || [""])[0]);
    setTime("08:30");
    setAmpm("AM");
    setForm(initialForm);
    setFile(null);
    setPreviewUrl("");
    setGraphInput({ region: "", crime_type: "", actor_type: "" });
    notify("Dashboard reset");
  };

  const logout = () => {
    localStorage.removeItem("crime_user");
    localStorage.removeItem("crime_token");
    console.log("logout");
    navigate("/login");
  };

  const onFile = (next) => {
    setFile(next);
    if (!next) {
      setPreviewUrl("");
      return;
    }
    setPreviewUrl(URL.createObjectURL(next));
  };

  const submitReport = async () => {
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
      if (file) payload.append("file", file);

      await apiPost("/report", payload, true);
      notify("Submitted successfully", "success");
      await Promise.all([generateGraphs(), loadZones()]);
    } catch (err) {
      notify(err.message, "error");
    }
  };

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8">
      <Toast message={toast.message} type={toast.type} />
      <div className="max-w-[1700px] mx-auto space-y-4">
        <header className="glass p-4 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">AI Crime Reporting & Analysis Dashboard</h1>
            <p className="text-slate-300 text-sm">Welcome {user?.username || "Officer"} · State: {defaultState}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={resetAll} className="px-4 py-2 rounded-lg bg-amber-200/20 text-amber-100 hover:bg-amber-200/30 flex items-center gap-2"><RotateCcw size={16} /> Reset</button>
            <button onClick={logout} className="px-4 py-2 rounded-lg bg-red-500/30 text-red-200 hover:bg-red-500/40 flex items-center gap-2"><LogOut size={16} /> Logout</button>
          </div>
        </header>

        <div className="grid xl:grid-cols-12 gap-4">
          <section className="xl:col-span-3 glass p-4 space-y-4">
            <h2 className="font-semibold">India State Map</h2>
            <IndiaMap
              selectedState={selectedState}
              onSelect={(stateName) => setSelectedState(stateName)}
              heat={stateHeat}
            />
            <select className="w-full p-2 bg-slate-800 rounded-lg" value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => <option key={r}>{r}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" className="p-2 bg-slate-800 rounded-lg" value={time} onChange={(e) => setTime(e.target.value)} />
              <select className="p-2 bg-slate-800 rounded-lg" value={ampm} onChange={(e) => setAmpm(e.target.value)}><option>AM</option><option>PM</option></select>
            </div>
          </section>

          <section className="xl:col-span-6 space-y-4">
            <div className="glass p-4 grid md:grid-cols-4 gap-3">
              {[
                { label: "Individual / Group", key: "actorType", opts: ["Individual", "Group"] },
                { label: "Type of Crime", key: "crimeType", opts: ["Theft", "Robbery", "Assault", "Cybercrime", "Fraud"] },
                { label: "Weapon Used", key: "weaponUsed", opts: ["Yes", "No"] },
                { label: "Vehicle Used", key: "vehicleUsed", opts: ["Yes", "No"] }
              ].map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="text-xs text-slate-300">{item.label}</div>
                  <select
                    className="w-full p-2 bg-slate-800 rounded-lg border border-white/10"
                    value={form[item.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [item.key]: e.target.value }))}
                  >
                    {item.opts.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 space-y-3">
                <h3 className="font-semibold">Proof Box</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-300">State</div>
                    <select
                      className="w-full p-2 bg-slate-800 rounded-lg border border-white/10"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                    >
                      {Object.keys(STATE_REGIONS).map((st) => <option key={st}>{st}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-300">Region</div>
                    <select className="w-full p-2 bg-slate-800 rounded-lg border border-white/10" value={region} onChange={(e) => setRegion(e.target.value)}>
                      {regions.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <textarea className="w-full p-2 min-h-24 bg-slate-800 rounded-lg" placeholder="Describe incident" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                <label className="p-2 bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer">
                  <UploadCloud size={16} /> Upload live image/video proof
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
                </label>
                {previewUrl && (
                  file?.type.startsWith("video") ? (
                    <video src={previewUrl} controls className="w-full rounded-lg border border-white/10" />
                  ) : (
                    <img src={previewUrl} alt="proof preview" className="w-full rounded-lg border border-white/10" />
                  )
                )}
                <input className="w-full p-2 bg-slate-800 rounded-lg" placeholder="Phone number" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />

                <button
                  onClick={submitReport}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:scale-[1.01] transition font-semibold"
                >
                  Submit Proof
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 md:col-span-2">
                <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                  <h3 className="font-semibold">Visualization</h3>
                  <Sparkles size={16} className="text-sky-300" />
                </div>
                <div className="grid md:grid-cols-4 gap-2 mb-3">
                  <select className="p-2 bg-slate-800 rounded-lg" value={graphInput.region} onChange={(e) => setGraphInput((p) => ({ ...p, region: e.target.value }))}>
                    <option value="">All Regions</option>
                    {regions.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <select className="p-2 bg-slate-800 rounded-lg" value={graphInput.crime_type} onChange={(e) => setGraphInput((p) => ({ ...p, crime_type: e.target.value }))}>
                    <option value="">All Crimes</option><option>Theft</option><option>Robbery</option><option>Assault</option><option>Cybercrime</option><option>Fraud</option>
                  </select>
                  <select className="p-2 bg-slate-800 rounded-lg" value={graphInput.actor_type} onChange={(e) => setGraphInput((p) => ({ ...p, actor_type: e.target.value }))}>
                    <option value="">All Actors</option><option>Individual</option><option>Group</option>
                  </select>
                  <button className="p-2 rounded-lg bg-sky-500/25 hover:bg-sky-500/35" onClick={generateGraphs}>Update Graphs</button>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.crime_type || []}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="name" stroke="#cbd5e1" /><YAxis stroke="#cbd5e1" /><Tooltip /><Bar dataKey="value" fill="#22d3ee" /></BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics?.actor_type || []} dataKey="value" nameKey="name" outerRadius={60}>
                          {["#34d399", "#fb7185", "#f59e0b", "#38bdf8"].map((c) => <Cell key={c} fill={c} />)}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics?.time || []}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="name" stroke="#cbd5e1" /><YAxis stroke="#cbd5e1" /><Tooltip /><Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} /></LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="glass p-4">
              <div className="flex justify-between mb-3 items-center">
                <h3 className="font-semibold">RL Zone Panel (All State Regions)</h3>
                <button onClick={loadZones} className="text-sm px-3 py-1 rounded-md bg-sky-500/20 hover:bg-sky-500/30">Refresh Zones</button>
              </div>
              <div className="grid md:grid-cols-3 gap-2 max-h-[300px] overflow-auto pr-1">
                {zones.map((z) => (
                  <div key={`${z.state}-${z.zone}`} className={`rounded-lg p-3 border border-white/10 ${riskColor[z.risk] || riskColor.Medium}`}>
                    <div className="font-semibold">{z.zone}</div>
                    <div className="text-xs opacity-90">{z.state}</div>
                    <div className="text-xs mt-1">Risk: {z.risk} · Cases: {z.crime_frequency}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="xl:col-span-3 glass p-4 space-y-3">
            <h3 className="font-semibold">Vehicle Selection</h3>
            {[{ label: "Car", icon: <Car size={18} /> }, { label: "Bike", icon: <Bike size={18} /> }, { label: "Truck", icon: <Truck size={18} /> }, { label: "None", icon: <ShieldAlert size={18} /> }].map((v) => (
              <button key={v.label} onClick={() => setForm((p) => ({ ...p, vehicleSelection: v.label }))} className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition ${form.vehicleSelection === v.label ? "bg-sky-500/20 border-sky-300" : "bg-slate-900/40 border-white/10 hover:bg-slate-800/60"}`}>
                {v.icon}<span>{v.label}</span>
              </button>
            ))}
            <select className="w-full p-2 bg-slate-800 rounded-lg" value={form.vehicleSelection} onChange={(e) => setForm((p) => ({ ...p, vehicleSelection: e.target.value }))}><option>Car</option><option>Bike</option><option>Truck</option><option>None</option></select>
          </aside>
        </div>

        <footer className="glass p-4 flex flex-col items-center gap-2">
          <div className="text-red-300 font-semibold">Emergency: 100</div>
        </footer>
      </div>
    </div>
  );
}
