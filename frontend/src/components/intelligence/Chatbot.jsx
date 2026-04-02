import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiPost } from "../../lib/api";

const suggestions = ["Report Theft", "Report Assault", "Emergency Help", "How to file a complaint?"];

function toSuggestedMessage(s) {
  if (s === "Report Theft") return "I want to report theft.";
  if (s === "Report Assault") return "I want to report assault.";
  if (s === "Emergency Help") return "This is urgent, I need help now.";
  return "How to report a crime?";
}

export function Chatbot({ onAutoFill, onUrgent }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const listRef = useRef(null);

  const sendMessage = async (text) => {
    const q = text.trim();
    if (!q) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setTyping(true);
    try {
      const res = await apiPost("/chat", { message: q, conversation_id: conversationId });
      setMessages((m) => [...m, { role: "bot", text: res.reply || res.answer || "I am here to help.", meta: res.source }]);
      if (res.context && onAutoFill) onAutoFill(res.context);
      if (res.urgent && onUrgent) onUrgent();
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: e.message || "Unable to process right now.", meta: "error" }]);
    } finally {
      setTyping(false);
    }
  };

  const startVoice = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setMessages((m) => [...m, { role: "bot", text: "Voice input is not supported in this browser.", meta: "system" }]);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const t = ev.results?.[0]?.[0]?.transcript || "";
      setInput(t);
      sendMessage(t);
    };
    rec.onerror = () => {
      setMessages((m) => [...m, { role: "bot", text: "Could not capture voice. Please type your message.", meta: "system" }]);
    };
    rec.start();
  };

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typing, open]);

  const intro = useMemo(
    () => "Hi, I can help you report a crime quickly. Tell me what happened, where, and when.",
    []
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[550] p-4 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl border border-indigo-300/50"
      >
        <MessageCircle size={22} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[5.25rem] right-5 z-[550] w-[min(100vw-2.5rem,420px)] glass p-3 flex flex-col gap-2 max-h-[520px]"
          >
            <div className="text-sm font-semibold">AI Crime Assistant</div>

            <div ref={listRef} className="flex-1 overflow-auto space-y-2 text-sm max-h-72 pr-1">
              {messages.length === 0 && <div className="rounded-xl bg-slate-200/80 dark:bg-slate-800/80 mr-6 px-3 py-2">{intro}</div>}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 ${
                    m.role === "user"
                      ? "bg-sky-500/25 ml-8 text-right"
                      : "bg-slate-200/80 dark:bg-slate-800/80 mr-8"
                  }`}
                >
                  {m.text}
                  {m.meta && <div className="text-[10px] opacity-60 mt-0.5">via {m.meta}</div>}
                </div>
              ))}
              {typing && (
                <div className="rounded-xl bg-slate-200/80 dark:bg-slate-800/80 mr-8 px-3 py-2 text-xs text-slate-500 dark:text-slate-300">
                  Bot is typing...
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(toSuggestedMessage(s))}
                  className="text-xs px-2 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={startVoice}
                className="p-2 rounded-lg bg-violet-500/25 hover:bg-violet-500/35 text-violet-100 border border-violet-300/40"
                title="Voice input"
              >
                <Mic size={18} />
              </button>
              <input
                className="flex-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-sm"
                value={input}
                placeholder="Describe incident..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              />
              <button type="button" onClick={() => sendMessage(input)} className="p-2 rounded-lg bg-sky-500 text-white">
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

