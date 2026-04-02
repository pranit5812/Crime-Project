import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { apiGet, apiPatch } from "../../lib/api";

const statusColors = {
  pending: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/25",
  investigating: "bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/25",
  resolved: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/25"
};

export function ReportTracking({ role, onNotify, refreshTrigger = 0 }) {
  const [rows, setRows] = useState([]);

  const load = async () => {
    try {
      const data = await apiGet("/reports/tracking");
      setRows(data);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("crime_token")) load();
  }, [refreshTrigger]);

  const updateStatus = async (id, status) => {
    try {
      await apiPatch(`/reports/${id}/status`, { status });
      onNotify?.(`Status → ${status}`, "success");
      load();
    } catch (e) {
      onNotify?.(e.message, "error");
    }
  };

  if (!localStorage.getItem("crime_token")) return null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2.5">
      <div className="flex w-full min-w-0 items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-white/10">
        <ClipboardList size={17} className="shrink-0 text-sky-600 dark:text-sky-400" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">My reports</span>
      </div>
      <div className="min-h-0 max-h-52 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5 text-xs">
        {rows.length === 0 ? (
          <p className="text-left text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            No reports yet. Submit while logged in to track IDs here.
          </p>
        ) : null}
        {rows.map((r) => (
          <div
            key={r.report_id}
            className="w-full min-w-0 space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-white/10 dark:bg-slate-800/40"
          >
            <div className="flex w-full min-w-0 items-start justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[10px] text-slate-700 dark:text-slate-300">{r.report_id}</span>
              <span
                className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${statusColors[r.status] || "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"}`}
              >
                {r.status}
              </span>
            </div>
            <div className="text-left text-[11px] text-slate-700 dark:text-slate-300">
              {r.crime_type}
              {r.created_at ? (
                <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-500">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              ) : null}
            </div>
            {(role === "police" || role === "admin") && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {["pending", "investigating", "resolved"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-md bg-slate-200/90 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-300/90 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600/80"
                    onClick={() => updateStatus(r.report_id, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
