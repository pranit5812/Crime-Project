import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { apiPost } from "../lib/api";

export default function OtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillEmail = location.state?.email || "";

  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/auth/verify-otp", { email, otp });
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify OTP"
      subtitle="Enter the OTP sent to your email"
      footerText="Back to"
      footerLink="/register"
      footerLabel="register"
    >
      <form className="space-y-3" onSubmit={onVerify}>
        <input className="w-full p-3 bg-slate-900/60 rounded-xl border border-white/10" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full p-3 bg-slate-900/60 rounded-xl border border-white/10 tracking-[0.3em]" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
        {error && <p className="text-red-300 text-sm">{error}</p>}
        <button disabled={loading} className="w-full p-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-60">
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>
    </AuthLayout>
  );
}
