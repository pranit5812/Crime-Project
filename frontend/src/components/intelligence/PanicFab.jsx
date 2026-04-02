import { useState } from "react";
import { AlertOctagon } from "lucide-react";
import { API_BASE, authHeaders } from "../../lib/api";

async function captureSnapshotBlob() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  const video = document.createElement("video");
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  await new Promise((r) => setTimeout(r, 400));
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  stream.getTracks().forEach((t) => t.stop());
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
}

/**
 * @param {{ onStatus?: (msg: string, type?: string) => void, variant?: "fab" | "header" }} props
 */
export function PanicFab({ onStatus, variant = "fab" }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!localStorage.getItem("crime_token")) {
      onStatus?.("Login required for panic alerts.", "error");
      return;
    }
    setBusy(true);
    try {
      const pos = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 12000 });
      });
      let blob = null;
      try {
        blob = await captureSnapshotBlob();
      } catch {
        /* camera denied — still send location */
      }
      const fd = new FormData();
      fd.append("latitude", String(pos.coords.latitude));
      fd.append("longitude", String(pos.coords.longitude));
      if (blob) fd.append("snapshot", blob, "panic.jpg");

      const res = await fetch(`${API_BASE}/panic/`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Panic send failed");
      onStatus?.(`Panic sent. Report ${data.report_id}`, "success");
    } catch (e) {
      onStatus?.(e.message || "Panic failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const isHeader = variant === "header";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={run}
      title="Send emergency alert with your location"
      className={
        isHeader
          ? "inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold text-white border-2 border-amber-200/50 shadow-lg shadow-orange-900/20 disabled:opacity-60 transition-all hover:brightness-110 active:scale-[0.98] bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:via-orange-500 hover:to-rose-500"
          : "fixed bottom-5 left-5 z-[540] flex items-center gap-2 px-5 py-4 rounded-2xl font-bold text-white border-2 border-fuchsia-300/40 shadow-2xl shadow-violet-900/35 disabled:opacity-60 animate-pulse bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-rose-500"
      }
    >
      <AlertOctagon size={isHeader ? 18 : 22} className="shrink-0" />
      {busy ? "Sending…" : isHeader ? "Emergency" : "PANIC"}
    </button>
  );
}
