import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { apiGet, apiPost } from "../../lib/api";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const btnRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  const load = async () => {
    try {
      const rows = await apiGet("/notifications/");
      setItems(rows);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right)
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const mark = async (id) => {
    try {
      await apiPost(`/notifications/${id}/read`, {});
    } catch {
      /* ignore */
    }
    load();
  };

  if (!localStorage.getItem("crime_token")) return null;

  const panel =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[10000] cursor-default bg-slate-950/35"
          aria-label="Close notifications"
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="fixed z-[10001] w-[22rem] max-h-[min(26rem,72vh)] overflow-auto rounded-2xl border border-white/20 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl text-sm shadow-2xl"
          style={{ top: panelPos.top, right: panelPos.right }}
        >
          <div className="sticky top-0 z-10 px-4 py-3 border-b border-white/10 bg-slate-900/85 backdrop-blur-md">
            <div className="text-xs uppercase tracking-wide text-slate-300/90">Notifications</div>
          </div>
          {items.length === 0 ? (
            <div className="p-4 text-slate-300">No notifications</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => mark(n.id)}
                className={`w-full text-left p-3.5 border-b border-white/10 transition last:border-b-0 ${
                  n.read
                    ? "bg-white/[0.02] hover:bg-white/[0.05]"
                    : "bg-sky-400/10 hover:bg-sky-400/15"
                }`}
              >
                <div className={`font-semibold ${n.read ? "text-slate-100/85" : "text-white"}`}>{n.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-200/90">{n.body}</div>
              </button>
            ))
          )}
        </div>
      </>,
      document.body
    );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
        className="relative p-2 rounded-xl border border-white/10 dark:border-white/10 border-slate-300 bg-slate-200/50 dark:bg-slate-800/60"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] bg-rose-500 text-white rounded-full px-1">{unread}</span>
        )}
      </button>
      {panel}
    </div>
  );
}
