import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { apiPost } from "../lib/api";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const InputField = ({ icon: Icon, label, children }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    className="space-y-1.5"
  >
    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors duration-200 z-10 pointer-events-none">
        <Icon size={16} />
      </div>
      {children}
    </div>
  </motion.div>
);

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
      if (res?.user?.role === "police") {
        navigate("/police");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access the crime intelligence platform"
      footerText="Need an account?"
      footerLink="/register"
      footerLabel="Create one"
    >
      <form className="space-y-4" onSubmit={onLogin}>
        <InputField icon={Mail} label="Email Address">
          <input
            className="input-field w-full"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </InputField>

        <InputField icon={Lock} label="Password">
          <input
            className="input-field pr-12 w-full"
            placeholder="Your password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <motion.button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors z-10"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </motion.button>
        </InputField>

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
          className="w-full relative overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all flex items-center justify-center gap-2.5 group"
          style={{
            background: loading
              ? "linear-gradient(135deg, #475569, #334155)"
              : "linear-gradient(135deg, #0ea5e9, #6366f1, #a855f7)",
            boxShadow: loading ? "none" : "0 4px 24px rgba(14, 165, 233, 0.35), 0 1px 4px rgba(0,0,0,0.3)",
          }}
        >
          {/* Shimmer on hover */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>Sign In</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>

        {/* Security notice */}
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
          <span className="text-xs text-slate-400 leading-relaxed">
            OTP verification required before login. Your data is{" "}
            <span className="text-emerald-400 font-medium">encrypted & secure</span>.
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}
