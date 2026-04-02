import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { apiPost } from "../lib/api";
import { Mail, Hash, CheckCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillEmail = location.state?.email || "";

  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/auth/verify-otp", { email, otp });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code sent to your inbox"
      footerText="Registered with wrong email?"
      footerLink="/register"
      footerLabel="Go back"
    >
      <form className="space-y-5" onSubmit={onVerify}>
        {/* OTP visual indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex justify-center gap-2 my-2"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                otp.length > i
                  ? "bg-gradient-to-r from-sky-400 to-indigo-400 w-6"
                  : "bg-slate-700 w-4"
              }`}
              animate={{ scaleY: otp.length > i ? 1.5 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            />
          ))}
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
          <div className="relative group">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors z-10" />
            <input
              className="input-field pl-11 w-full"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </motion.div>

        {/* OTP */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">6-Digit OTP</label>
          <div className="relative group">
            <Hash size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors z-10" />
            <input
              className="input-field pl-11 w-full text-center tracking-[0.5em] font-mono text-xl font-bold"
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              inputMode="numeric"
            />
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
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3"
            >
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">
                Email verified! Redirecting to login...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={loading || success || otp.length < 6}
          whileHover={loading || success ? undefined : { scale: 1.02, y: -2 }}
          whileTap={loading || success ? undefined : { scale: 0.98 }}
          className="w-full relative overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all flex items-center justify-center gap-2.5 group"
          style={{
            background:
              success
                ? "linear-gradient(135deg, #10b981, #059669)"
                : loading || otp.length < 6
                ? "linear-gradient(135deg, #475569, #334155)"
                : "linear-gradient(135deg, #8b5cf6, #ec4899)",
            boxShadow:
              success || loading || otp.length < 6
                ? "none"
                : "0 4px 24px rgba(139, 92, 246, 0.35), 0 1px 4px rgba(0,0,0,0.3)",
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {success ? (
            <>
              <CheckCircle size={18} />
              <span>Verified!</span>
            </>
          ) : loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              <span>Verify OTP</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <RefreshCw size={12} />
          <span>Didn't receive the code? Check spam or re-register.</span>
        </div>
      </form>
    </AuthLayout>
  );
}
