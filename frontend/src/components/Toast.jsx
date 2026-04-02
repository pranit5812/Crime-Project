import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Toast({ message, type = "success" }) {
  if (typeof document === "undefined") return null;

  const config = {
    success: {
      icon: CheckCircle2,
      bg: "from-emerald-950/95 to-teal-950/90",
      border: "border-emerald-500/30",
      iconBg: "bg-emerald-500/20 border-emerald-500/25",
      iconColor: "text-emerald-400",
      text: "text-emerald-50",
      bar: "from-emerald-500 to-teal-400",
      glow: "0 0 30px rgba(52,211,153,0.2)",
    },
    error: {
      icon: XCircle,
      bg: "from-rose-950/95 to-red-950/90",
      border: "border-rose-500/30",
      iconBg: "bg-rose-500/20 border-rose-500/25",
      iconColor: "text-rose-400",
      text: "text-rose-50",
      bar: "from-rose-500 to-orange-400",
      glow: "0 0 30px rgba(244,63,94,0.2)",
    },
    warning: {
      icon: AlertCircle,
      bg: "from-amber-950/95 to-yellow-950/90",
      border: "border-amber-500/30",
      iconBg: "bg-amber-500/20 border-amber-500/25",
      iconColor: "text-amber-400",
      text: "text-amber-50",
      bar: "from-amber-500 to-yellow-400",
      glow: "0 0 30px rgba(245,158,11,0.2)",
    },
    info: {
      icon: Info,
      bg: "from-sky-950/95 to-indigo-950/90",
      border: "border-sky-500/30",
      iconBg: "bg-sky-500/20 border-sky-500/25",
      iconColor: "text-sky-400",
      text: "text-sky-50",
      bar: "from-sky-500 to-indigo-400",
      glow: "0 0 30px rgba(56,189,248,0.2)",
    },
  };

  const c = config[type] || config.success;
  const Icon = c.icon;

  const node = (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message + type}
          initial={{ opacity: 0, x: 60, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`pointer-events-auto fixed right-4 top-4 z-[10060] max-w-[min(100vw-2rem,28rem)] rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} overflow-hidden`}
          style={{
            backdropFilter: "blur(20px)",
            boxShadow: `0 20px 50px rgba(0,0,0,0.5), ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          {/* Top glow bar */}
          <div className={`h-0.5 bg-gradient-to-r ${c.bar} opacity-80`} />

          <div className="flex items-start gap-3 px-4 py-3.5">
            <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-xl ${c.iconBg} border flex items-center justify-center`}>
              <Icon size={16} className={c.iconColor} />
            </div>
            <span className={`text-sm font-medium leading-5 ${c.text} pt-1`}>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}
