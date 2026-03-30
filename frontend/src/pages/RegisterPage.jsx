import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { apiPost } from "../lib/api";
import { STATE_REGIONS } from "../data/stateRegions";
import { Eye, EyeOff, Mail, User, Lock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", state: "Maharashtra" });
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

  return (
    <AuthLayout
      title="Create account"
      subtitle="Register to access crime reporting dashboard"
      footerText="Already have an account?"
      footerLink="/login"
      footerLabel="Login"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-xs text-slate-300 mb-2">Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full p-3 pl-10 bg-slate-900/60 rounded-xl border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="Your name"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-300 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full p-3 pl-10 bg-slate-900/60 rounded-xl border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-300 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full p-3 pl-10 pr-12 bg-slate-900/60 rounded-xl border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="Create a strong password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-300 mb-2">State</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              className="w-full p-3 pl-10 bg-slate-900/60 rounded-xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              value={form.state}
              onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
              required
            >
              {Object.keys(STATE_REGIONS).map((state) => (
                <option key={state} className="bg-slate-950">
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-red-300 text-sm">{error}</p>}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={loading ? undefined : { scale: 1.01 }}
          whileTap={loading ? undefined : { scale: 0.99 }}
          className="w-full p-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90 disabled:opacity-60 text-white font-semibold transition"
        >
          {loading ? "Sending OTP..." : "Register"}
        </motion.button>

        <p className="text-xs text-slate-400">
          You will receive a 6-digit OTP on your email to verify your account.
        </p>
      </form>
    </AuthLayout>
  );
}
