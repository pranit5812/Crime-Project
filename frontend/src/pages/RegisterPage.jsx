import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { apiPost } from "../lib/api";
import { STATE_REGIONS } from "../data/stateRegions";
import { Eye, EyeOff, Mail, User, Lock, MapPin, Shield, UserCog, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const roleOptions = [
  {
    value: "citizen",
    label: "Citizen",
    desc: "Report crimes & track cases",
    icon: User,
    color: "from-sky-500 to-indigo-500",
    glow: "rgba(56,189,248,0.2)",
  },
  {
    value: "police",
    label: "Police",
    desc: "Manage & investigate reports",
    icon: Shield,
    color: "from-violet-500 to-fuchsia-500",
    glow: "rgba(168,85,247,0.2)",
  },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    state: "Maharashtra",
    role: "citizen",
    police_register_secret: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/auth/register", form);
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join the Crime Intelligence Platform"
      footerText="Already have an account?"
      footerLink="/login"
      footerLabel="Sign in"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        {/* Role selection */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            Account Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = form.role === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setForm((p) => ({ ...p, role: opt.value }))}
                  className={`relative rounded-xl p-3 text-left border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                  }`}
                  style={{
                    boxShadow: isSelected ? `0 0 20px ${opt.glow}` : "none",
                  }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="role-indicator"
                      className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-10 rounded-xl`}
                    />
                  )}
                  <div className="flex items-start gap-2 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${opt.color} opacity-${isSelected ? "100" : "50"}`}
                    >
                      <Icon size={15} className="text-white" />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={14} className="absolute top-2 right-2 text-sky-400" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Username */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Username</label>
          <div className="relative group">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors z-10 pointer-events-none" />
            <input
              className="input-field w-full"
              placeholder="Your full name"
              value={form.username}
              onChange={set("username")}
              required
            />
          </div>
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Email Address</label>
          <div className="relative group">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors z-10 pointer-events-none" />
            <input
              className="input-field w-full"
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={set("email")}
              required
            />
          </div>
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Password</label>
          <div className="relative group">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors z-10 pointer-events-none" />
            <input
              className="input-field pr-12 w-full"
              placeholder="Create a strong password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              required
            />
            <motion.button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors z-10"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </motion.button>
          </div>
        </motion.div>

        {/* Police secret */}
        <AnimatePresence>
          {form.role === "police" && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              className="space-y-2 overflow-hidden"
            >
              <label className="block text-[11px] font-semibold text-violet-400 uppercase tracking-widest">
                Police Registration Secret
              </label>
              <div className="relative group">
                <UserCog size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors z-10 pointer-events-none" />
                <input
                  className="input-field w-full"
                  style={{ borderColor: "rgba(168,85,247,0.25)" }}
                  placeholder="Provided by your administrator"
                  type="password"
                  value={form.police_register_secret}
                  onChange={set("police_register_secret")}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Or set <span className="text-violet-400 font-mono">ALLOW_OPEN_POLICE_REGISTER=true</span> for open enrollment.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* State */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-2"
        >
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">State</label>
          <div className="relative group">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors z-10 pointer-events-none" />
            <select
              className="input-field w-full"
              value={form.state}
              onChange={set("state")}
              required
            >
              {Object.keys(STATE_REGIONS).map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3"
            >
              <p className="text-rose-300 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={loading ? undefined : { scale: 1.02, y: -2 }}
          whileTap={loading ? undefined : { scale: 0.98 }}
          className="w-full relative overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all flex items-center justify-center gap-2.5 group mt-2"
          style={{
            background: loading
              ? "linear-gradient(135deg, #475569, #334155)"
              : "linear-gradient(135deg, #8b5cf6, #6366f1, #0ea5e9)",
            boxShadow: loading ? "none" : "0 4px 24px rgba(99, 102, 241, 0.35), 0 1px 4px rgba(0,0,0,0.3)",
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Sending OTP...</span>
            </>
          ) : (
            <>
              <Shield size={18} />
              <span>Create Account</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>

        <p className="text-xs text-slate-500 text-center leading-relaxed">
          A <span className="text-sky-400 font-medium">6-digit OTP</span> will be sent to your email for verification.
        </p>
      </form>
    </AuthLayout>
  );
}
