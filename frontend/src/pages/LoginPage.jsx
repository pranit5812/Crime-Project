import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { apiPost } from "../lib/api";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiPost("/auth/login", { email, password });
      localStorage.setItem("crime_user", JSON.stringify(res.user));
      localStorage.setItem("crime_token", res.token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Login to continue"
      footerText="Need an account?"
      footerLink="/register"
      footerLabel="Register"
    >
      <form className="space-y-4" onSubmit={onLogin}>
        <div>
          <label className="block text-xs text-slate-300 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full p-3 pl-10 bg-slate-900/60 rounded-xl border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="Your password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {error && <p className="text-red-300 text-sm">{error}</p>}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={loading ? undefined : { scale: 1.01 }}
          whileTap={loading ? undefined : { scale: 0.99 }}
          className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 disabled:opacity-60 text-white font-semibold transition"
        >
          {loading ? "Signing in..." : "Login"}
        </motion.button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={16} className="text-sky-300" />
          <span>OTP verification is required before login.</span>
        </div>
      </form>
    </AuthLayout>
  );
}
