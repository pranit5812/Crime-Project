import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Zap } from "lucide-react";

const FloatingOrb = ({ className, delay = 0 }) => (
  <motion.div
    className={`absolute rounded-full pointer-events-none ${className}`}
    animate={{
      y: [0, -20, 0],
      scale: [1, 1.05, 1],
      opacity: [0.6, 0.9, 0.6],
    }}
    transition={{
      duration: 6,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const ParticleField = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-sky-400/30"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0, 0.6, 0],
          scale: [0, 1, 0],
        }}
        transition={{
          duration: 3 + Math.random() * 3,
          delay: Math.random() * 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

export function AuthLayout({ title, subtitle, children, footerText, footerLink, footerLabel }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <FloatingOrb
        className="w-[500px] h-[500px] -top-40 -left-40 bg-sky-500/8 blur-3xl"
        delay={0}
      />
      <FloatingOrb
        className="w-[400px] h-[400px] -bottom-32 -right-32 bg-violet-500/8 blur-3xl"
        delay={2}
      />
      <FloatingOrb
        className="w-[300px] h-[300px] top-1/3 left-1/4 bg-emerald-500/5 blur-2xl"
        delay={4}
      />

      {/* Particle field */}
      <ParticleField />

      {/* Rotating hex grid */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 opacity-[0.03]"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 6 }).map((_, i) => (
            <circle
              key={i}
              cx="400"
              cy="400"
              r={80 + i * 60}
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="10 20"
            />
          ))}
        </svg>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        className="relative w-full max-w-md z-10"
      >
        {/* Glow border */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-sky-500/30 via-violet-500/20 to-emerald-500/20 blur-sm opacity-60" />

        <div className="relative glass rounded-2xl p-8 overflow-hidden">
          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />

          {/* Logo/brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 18 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-glow">
                <Shield size={20} className="text-white" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap size={9} className="text-white" />
              </motion.div>
            </div>
            <div>
              <div className="text-xs font-bold text-sky-400 uppercase tracking-widest">CrimeWatch AI</div>
              <div className="text-[10px] text-slate-500">Intelligence Platform</div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mb-6"
          >
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {title}
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{subtitle}</p>
          </motion.div>

          {/* Form content */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            {children}
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-slate-400 mt-6 text-center"
          >
            {footerText}{" "}
            <Link
              className="text-sky-400 hover:text-sky-300 transition-colors font-medium underline underline-offset-2 decoration-sky-400/30 hover:decoration-sky-300"
              to={footerLink}
            >
              {footerLabel}
            </Link>
          </motion.p>

          {/* Bottom shimmer line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}
