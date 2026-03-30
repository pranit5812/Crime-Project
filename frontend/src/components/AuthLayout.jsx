import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function AuthLayout({ title, subtitle, children, footerText, footerLink, footerLabel }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(147,51,234,0.18),transparent_45%)]"
      />
      <div aria-hidden="true" className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-sky-400/10 blur-2xl" />
      <div aria-hidden="true" className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="glass w-full max-w-md p-6 md:p-8 relative"
      >
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">{subtitle}</p>
        </div>

        {children}

        <p className="text-sm text-slate-300 mt-6">
          {footerText}{" "}
          <Link className="text-sky-300 hover:text-sky-200 transition-colors" to={footerLink}>
            {footerLabel}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
