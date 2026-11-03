"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Check, Clock, Microphone as Mic, PaperPlaneRight as Send, ChatCircle as MessageSquare, Waveform as AudioLines, Stop as Square, CalendarCheck, UserPlus, MagnifyingGlass as Search, SquaresFour, X } from "@phosphor-icons/react";
import { api, API, connectWs, Persona, ACCENTS, encodeWav, token } from "@/lib/api";
import { Backdrop, Logo, Pill, TwynLoader } from "@/components/ui";
import { Orb } from "@/components/Orb";
import { ProfileAvatar, profileAvatarUrl } from "@/components/ProfileAvatar";

type Msg = { role: "visitor" | "persona" | "owner"; text: string; tools?: any[] };
type BookingSlot = { start: string; say: string };
type BookingDraft = BookingSlot & { name?: string; email?: string; topic?: string };
type ConversationSnapshot = { conversationId: string; messages: Msg[]; bookingDraft: BookingDraft | null; savedAt: number };
const TOOL_LABEL: Record<string, [string, any, string]> = {
  check_availability: ["Checked calendar", Search, "sky"], book_meeting: ["Meeting booked", CalendarCheck, "mint"], capture_lead: ["Saved as lead", UserPlus, "butter"],
};
const LANG: Record<string, string> = { hinglish: "Hinglish", "hi-IN": "Hindi", "ta-IN": "Tamil", "en-IN": "English", "te-IN": "Telugu", "kn-IN": "Kannada", "bn-IN": "Bengali", "mr-IN": "Marathi" };
const linkLabel = (link: { label?: string; url: string }) => {
  if (link.label?.trim()) return link.label.trim();
  try { return new URL(link.url).hostname.replace(/^www\./, ""); } catch { return link.url || "Website"; }
};

function SlotPicker({ slots, onConfirm, disabled = false }: { slots: BookingSlot[]; onConfirm: (slot: BookingSlot) => void; disabled?: boolean }) {
  const days = Array.from(new Map(slots.map((slot) => [slot.start.slice(0, 10), slot])).entries()).map(([key, slot]) => ({ key, label: new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00`)) }));
  const [day, setDay] = useState(days[0]?.key || "");
  const [selected, setSelected] = useState("");
  useEffect(() => { if (!days.some((item) => item.key === day)) { setDay(days[0]?.key || ""); setSelected(""); } }, [day, days]);
  const daySlots = slots.filter((slot) => slot.start.startsWith(day));
  const chosen = daySlots.find((slot) => slot.start === selected);
  return <div className="mt-2 rounded-2xl border border-rule bg-white/70 p-3">
    <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">Choose a day</span><span className="text-[10.5px] text-ink-mute">{slots.length} times available</span></div>
    <div className="twyn-scrollbar flex gap-1.5 overflow-x-scroll pb-1 [touch-action:pan-x]">
      {days.map((item) => <button key={item.key} type="button" onClick={() => { setDay(item.key); setSelected(""); }} className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-[11px] transition ${day === item.key ? "border-ink bg-ink text-canvas" : "border-rule bg-white text-ink-soft hover:bg-lilac"}`}>{item.label}</button>)}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {daySlots.map((slot) => <button key={slot.start} type="button" disabled={disabled} onClick={() => setSelected(slot.start)} className={`rounded-xl border px-2.5 py-2 text-left text-[11.5px] transition ${selected === slot.start ? "border-ink bg-lilac text-ink" : "border-rule bg-white text-ink-soft hover:bg-lilac/60"}`}><span className="block font-medium text-ink">{slot.say}</span><span className="text-[10px]">Available</span></button>)}
    </div>
    <button type="button" disabled={!chosen || disabled} onClick={() => chosen && onConfirm(chosen)} className="mt-3 h-9 w-full rounded-full bg-ink text-[12px] font-medium text-canvas transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40">{chosen ? `Continue with ${chosen.say}` : "Select a time to continue"}</button>
  </div>;
}

function BookingDetailsForm({ draft, onSubmit, disabled = false }: { draft: BookingDraft; onSubmit: (details: { name: string; email: string; topic: string }) => void; disabled?: boolean }) {
  const [details, setDetails] = useState({ name: draft.name || "", email: draft.email || "", topic: draft.topic || "" });
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(details); }} className="mt-2 rounded-2xl border border-rule bg-white/85 p-3">
    <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">Booking details</div>
    <div className="mt-1 text-[12px] text-ink-soft">{draft.say}</div>
    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
      <input required autoComplete="name" className="field h-9 text-[12px]" placeholder="Your name" value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} />
      <input required type="email" autoComplete="email" className="field h-9 text-[12px]" placeholder="you@email.com" value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} />
    </div>
    <input className="field mt-1.5 h-9 w-full text-[12px]" placeholder="What is it about? (optional)" value={details.topic} onChange={(event) => setDetails({ ...details, topic: event.target.value })} />
    <button type="submit" disabled={disabled} className="mt-2 h-9 w-full rounded-full bg-ink text-[12px] font-medium text-canvas disabled:cursor-not-allowed disabled:opacity-40">{disabled ? "Confirming…" : "Confirm booking"}</button>
  </form>;
}

export default function PublicPersona() {
  const { handle } = useParams<{ handle: string }>();
  const [p, setP] = useState<Persona | null>(null);
  const [mode, setMode] = useState<"chat" | "voice" | "book">("chat");
  const [mobileActionOpen, setMobileActionOpen] = useState(false);
  const [mobileMode, setMobileMode] = useState<"chat" | "voice" | "book" | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [cid, setCid] = useState("");
  const [busy, setBusy] = useState(false);
  const [human, setHuman] = useState(false);
  const [orb, setOrb] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [level, setLevel] = useState(0);
  const [lang, setLang] = useState("");
  const [err, setErr] = useState("");
  const [lat, setLat] = useState<{ stt_ms: number; llm_ms: number; tts_ms: number; total_ms: number; client_ms: number; first_audio_ms: number } | null>(null);
  const [note, setNote] = useState("");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const raf = useRef<number>(0);
  const callActive = useRef(false);
  const turnStarted = useRef(false);
  const turnStopTimer = useRef<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const mobileClose = useRef<HTMLButtonElement>(null);
  const bookingSubmitLock = useRef(false);
  const skipConversationPersist = useRef(false);

  useEffect(() => { api<Persona>(`/api/p/${handle}`).then(setP).catch(() => setErr("This Twyn does not exist.")); }, [handle]);
  useEffect(() => {
    if (!handle || typeof window === "undefined") return;
    const key = `twyn-public-conversation-v1:${handle}`;
    skipConversationPersist.current = true;
    setCid(""); setMsgs([]); setBookingDraft(null);
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as ConversationSnapshot | null;
      const fresh = saved && Date.now() - saved.savedAt < 30 * 24 * 60 * 60 * 1000;
      if (fresh) {
        setCid(typeof saved.conversationId === "string" ? saved.conversationId : "");
        setMsgs(Array.isArray(saved.messages) ? saved.messages.filter((message) => message && (message.role === "visitor" || message.role === "persona" || message.role === "owner") && typeof message.text === "string") : []);
        setBookingDraft(saved.bookingDraft && typeof saved.bookingDraft.start === "string" && typeof saved.bookingDraft.say === "string" ? saved.bookingDraft : null);
      } else if (saved) localStorage.removeItem(key);
    } catch { /* local storage can be unavailable in private browsing */ }
  }, [handle]);
  useEffect(() => {
    if (!handle || typeof window === "undefined") return;
    if (skipConversationPersist.current) { skipConversationPersist.current = false; return; }
    if (!cid && !msgs.length && !bookingDraft) return;
    try { localStorage.setItem(`twyn-public-conversation-v1:${handle}`, JSON.stringify({ conversationId: cid, messages: msgs, bookingDraft, savedAt: Date.now() } satisfies ConversationSnapshot)); } catch { /* a full or disabled storage must not interrupt chat */ }
  }, [handle, cid, msgs, bookingDraft]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => {
    const locked = mobileActionOpen || !!mobileMode;
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => mobileClose.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileActionOpen(false); setMobileMode(null); } };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [mobileActionOpen, mobileMode]);
  useEffect(() => () => {
    callActive.current = false;
    if (turnStopTimer.current) window.clearTimeout(turnStopTimer.current);
    if (rec.current?.state === "recording") rec.current.stop();
    micStream.current?.getTracks().forEach((t) => t.stop());
    micStream.current = null;
    speechSynthesis?.cancel();
    cancelAnimationFrame(raf.current);
  }, []);
  useEffect(() => {
    if (!cid) return;
    return connectWs(`/ws/conversations/${cid}`, (d) => {
      if (d.type === "takeover") setHuman(d.on);
      if (d.type === "message" && d.role === "owner") setMsgs((m) => [...m, { role: "owner", text: d.text }]); });
  }, [cid]);

  const accent = ACCENTS[p?.accent || "lilac"] || ACCENTS.lilac;

  async function send(t = text) {
    if (!t.trim() || busy) return;
    setMsgs((m) => [...m, { role: "visitor", text: t }, { role: "persona", text: "" }]); setText(""); setBusy(true);
    try {
      const response = await fetch(`${API}/api/p/${handle}/chat/stream`, { method: "POST", headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, body: JSON.stringify({ text: t, conversation_id: cid }) });
      if (!response.ok || !response.body) throw new Error("The conversation could not be reached.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = ""; let tools: any[] = [];
      const updateReply = (reply: string, nextTools = tools) => setMsgs((messages) => { const next = [...messages]; const index = next.length - 1; next[index] = { role: "persona", text: reply, tools: nextTools }; return next; });
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        pending += decoder.decode(value, { stream: true });
        let newline; while ((newline = pending.indexOf("\n")) >= 0) {
          const line = pending.slice(0, newline).trim(); pending = pending.slice(newline + 1); if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "conversation") setCid(event.conversation_id);
          else if (event.type === "text") setMsgs((messages) => { const next = [...messages]; const index = next.length - 1; next[index] = { ...next[index], text: `${next[index].text}${event.delta}` }; return next; });
          else if (event.type === "tool") tools = [...tools, { name: event.name, result: event.result }];
          else if (event.type === "done") { setCid(event.conversation_id || cid); setHuman(event.takeover); updateReply(event.reply || "", event.tools || tools); if (event.tools?.some((tool: any) => tool.name === "book_meeting" && tool.result?.booked)) setBookingDraft(null); }
          else if (event.type === "error") throw new Error(event.message || "The conversation could not be reached.");
        }
      }
    } catch (error: any) { setMsgs((m) => { const next = [...m]; next[next.length - 1] = { role: "persona", text: error?.message || "Something went wrong. Please try again." }; return next; }); }
    finally { setBusy(false); }
  }

  function meter(stream: MediaStream | null, el?: HTMLAudioElement) {
    const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 256;
    (el ? ctx.createMediaElementSource(el) : ctx.createMediaStreamSource(stream!)).connect(an);
    if (el) an.connect(ctx.destination);
    const data = new Uint8Array(an.frequencyBinCount);
    const tick = () => { an.getByteFrequencyData(data); setLevel(data.reduce((a, b) => a + b, 0) / data.length / 90); raf.current = requestAnimationFrame(tick); };
    tick(); return () => { cancelAnimationFrame(raf.current); ctx.close(); setLevel(0); };
  }

  async function startTalk() {
    if (rec.current?.state === "recording") return;
    setErr("");
    try {
      const stream = micStream.current?.active ? micStream.current : await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      const ctx = new AudioContext(); const source = ctx.createMediaStreamSource(stream); const analyser = ctx.createAnalyser(); analyser.fftSize = 512; source.connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount); const chunks: Blob[] = [];
      const r = new MediaRecorder(stream); rec.current = r;
      r.ondataavailable = (e) => chunks.push(e.data);
      const stopTurn = () => { if (r.state === "recording") r.stop(); };
      const listen = () => {
        analyser.getByteTimeDomainData(samples);
        const volume = samples.reduce((sum, value) => sum + Math.abs(value - 128), 0) / samples.length;
        setLevel(Math.min(1, volume / 18));
        if (volume > 3) {
          turnStarted.current = true;
          if (turnStopTimer.current) { window.clearTimeout(turnStopTimer.current); turnStopTimer.current = null; }
        } else if (turnStarted.current && !turnStopTimer.current) {
          turnStopTimer.current = window.setTimeout(stopTurn, 900);
        }
        if (r.state === "recording") raf.current = requestAnimationFrame(listen);
      };
      r.onstop = async () => {
        cancelAnimationFrame(raf.current); if (turnStopTimer.current) window.clearTimeout(turnStopTimer.current); turnStopTimer.current = null;
        source.disconnect(); await ctx.close();
        if (!callActive.current) { stream.getTracks().forEach((t) => t.stop()); if (micStream.current === stream) micStream.current = null; }
        setLevel(0);
        if (!turnStarted.current || !chunks.length) {
          setOrb("idle");
          if (callActive.current) window.setTimeout(() => startTalk(), 300);
          return;
        }
        await voiceTurn(new Blob(chunks, { type: r.mimeType }), "", () => { if (callActive.current) startTalk(); });
      };
      r.start(); setOrb("listening");
      turnStarted.current = false; listen();
      window.setTimeout(() => r.state === "recording" && stopTurn(), 28000);
    } catch { setErr("Microphone is blocked. Type below instead, or allow mic access."); }
  }

  function beginCall() { callActive.current = true; setNote("Live conversation on — pause briefly when you finish speaking."); startTalk(); }
  function endCall() {
    callActive.current = false; speechSynthesis?.cancel(); cancelAnimationFrame(raf.current);
    if (turnStopTimer.current) window.clearTimeout(turnStopTimer.current);
    if (rec.current?.state === "recording") rec.current.stop();
    micStream.current?.getTracks().forEach((t) => t.stop());
    micStream.current = null;
    setOrb("idle"); setLevel(0); setNote("");
  }

  /** Plays reply segments back to back (first one starts while later ones are queued).
   *  With no real TTS audio it falls back to the browser's speech engine. Resolves with the time the first audio started. */
  function playQueue(reply: string, segs: string[], language: string): Promise<number> {
    return new Promise((resolve) => {
      let started = 0; const mark = () => { if (!started) { started = performance.now(); resolve(started); } };
      const done = () => { setOrb("idle"); mark(); };
      if (!reply) return done();
      setOrb("speaking");
      if (!segs.length) {
        if (typeof speechSynthesis === "undefined") return done();
        const u = new SpeechSynthesisUtterance(reply); u.lang = language === "hinglish" ? "hi-IN" : language || "en-IN";
        u.onstart = mark; u.onend = done; u.onerror = done; speechSynthesis.cancel(); speechSynthesis.speak(u);
        let fake = 0; const pulse = () => { if (speechSynthesis.speaking) { setLevel(0.3 + 0.4 * Math.abs(Math.sin((fake += 0.25)))); raf.current = requestAnimationFrame(pulse); } else setLevel(0); };
        pulse(); setTimeout(() => { if (!started) done(); }, 1500 + reply.length * 90); return;
      }
      const queue = segs.map((b) => { const el = new Audio(`data:audio/wav;base64,${b}`); el.preload = "auto"; return el; });
      const next = (i: number) => {
        if (i >= queue.length) return done();
        const el = queue[i]; const stop = meter(null, el);
        el.onplaying = mark; el.onended = () => { stop(); next(i + 1); }; el.onerror = () => { stop(); next(i + 1); };
        el.play().catch(() => { stop(); next(i + 1); });
      };
      next(0);
    });
  }

  /** Streaming voice turn: reads NDJSON from /voice/stream, shows LLM tokens as they arrive and
   *  schedules raw PCM16 chunks (Timbre SSE) back to back on one AudioContext, so the first
   *  sentence plays while the rest is still being generated. Falls back to the batch endpoint. */
  async function voiceTurn(blob: Blob, hint = "", afterSpeaking?: () => void) {
    setOrb("thinking"); setNote("");
    const fd = new FormData();
    try { fd.append("audio", await encodeWav(blob), "turn.wav"); } catch { fd.append("audio", blob, "turn.webm"); }
    fd.append("conversation_id", cid); fd.append("text_hint", hint);
    const t0 = performance.now();
    let res: Response;
    try { res = await fetch(`${API}/api/p/${handle}/voice/stream`, { method: "POST", body: fd }); if (!res.ok || !res.body) throw 0; }
    catch { return voiceTurnBatch(fd, t0, afterSpeaking); }
    const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 256; an.connect(ctx.destination);
    const data = new Uint8Array(an.frequencyBinCount);
    const tick = () => { an.getByteFrequencyData(data); setLevel(data.reduce((a, b) => a + b, 0) / data.length / 90); raf.current = requestAnimationFrame(tick); };
    let rate = 24000, at = 0, firstAudio = 0, reply = "", language = "", mock = false, carry = new Uint8Array(0);
    const speakLocal: string[] = [];
    const play = (b64: string) => {
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bytes = new Uint8Array(carry.length + raw.length); bytes.set(carry); bytes.set(raw, carry.length);
      const n = bytes.length >> 1; carry = bytes.slice(n * 2);
      if (!n) return;
      const dv = new DataView(bytes.buffer); const buf = ctx.createBuffer(1, n, rate); const ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = dv.getInt16(i * 2, true) / 32768;
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(an);
      if (!firstAudio) { firstAudio = performance.now(); setOrb("speaking"); tick(); at = ctx.currentTime + 0.05; }
      at = Math.max(at, ctx.currentTime); src.start(at); at += buf.duration;
    };
    const reader = res.body.getReader(); const dec = new TextDecoder(); let pending = "";
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        pending += dec.decode(value, { stream: true });
        let i; while ((i = pending.indexOf("\n")) >= 0) {
          const line = pending.slice(0, i); pending = pending.slice(i + 1); if (!line.trim()) continue;
          const e = JSON.parse(line);
          if (e.type === "transcript") {
            setCid(e.conversation_id); setLang(e.language); language = e.language; rate = e.rate || 24000;
            setMsgs((m) => [...m, { role: "visitor", text: e.text }, { role: "persona", text: "" }]);
          } else if (e.type === "text") {
            reply += e.delta; const r = reply;
            setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: r }; return c; });
          } else if (e.type === "audio") { if (e.mock) mock = true; else play(e.pcm); }
          else if (e.type === "speak_fallback") speakLocal.push(e.text);
          else if (e.type === "done") {
            if (e.reply) setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "persona", text: e.reply, tools: e.tools }; return c; });
            if (e.fallback?.length) setNote(`Fallback: ${e.fallback.join(", ")}`);
            else if (mock) setNote("Demo voice (browser speech) until the Gnani key is set");
            const L = e.latency || {};
            setLat({ stt_ms: L.stt_ms, llm_ms: L.first_token_ms ? L.first_token_ms - L.stt_ms : L.llm_ms, tts_ms: L.first_audio_ms && L.first_sentence_ms ? Math.max(0, L.first_audio_ms - Math.min(L.first_sentence_ms, L.filler_ms || 1e9)) : 0,
              total_ms: L.total_ms, client_ms: Math.round((firstAudio || performance.now()) - t0), first_audio_ms: Math.round((firstAudio || performance.now()) - t0) });
            reply = e.reply || reply;
          }
        }
      }
    } catch { setErr("Voice stream interrupted."); }
    const finish = () => { cancelAnimationFrame(raf.current); setLevel(0); setOrb("idle"); ctx.close(); afterSpeaking?.(); };
    if (firstAudio) setTimeout(finish, Math.max(0, (at - ctx.currentTime) * 1000) + 150);
    else if (mock || speakLocal.length) {
      cancelAnimationFrame(raf.current); setLevel(0); ctx.close();
      playQueue(mock ? reply : speakLocal.join(" "), [], language).then(() => afterSpeaking?.());
    }
    else finish();
  }

  async function voiceTurnBatch(fd: FormData, t0: number, afterSpeaking?: () => void) {
    try {
      const d = await api(`/api/p/${handle}/voice`, { method: "POST", body: fd });
      setCid(d.conversation_id); setLang(d.language || "");
      setMsgs((m) => [...m, { role: "visitor", text: d.transcript }, ...(d.reply ? [{ role: "persona" as const, text: d.reply, tools: d.tools }] : [])]);
      if (d.tools?.some((tool: any) => tool.name === "book_meeting" && tool.result?.booked)) setBookingDraft(null);
      setNote(d.fallback?.length ? `Fallback: ${d.fallback.join(", ")}` : d.mock_tts ? "Demo voice (browser speech) until the Gnani key is set" : "");
      const segs: string[] = d.segments?.length ? d.segments : d.audio ? [d.audio] : [];
      const first = await playQueue(d.reply, d.mock_tts ? [] : segs, d.language);
      if (d.latency) setLat({ ...d.latency, client_ms: Math.round(first - t0), first_audio_ms: Math.round(first - t0) });
      afterSpeaking?.();
    } catch { setOrb("idle"); setErr("Voice request failed."); }
  }

  if (err && !p) return <main className="grid min-h-screen place-items-center"><Backdrop /><div className="glass px-6 py-5 text-[13.5px] text-ink-soft">{err}</div></main>;
  if (!p) return <main className="grid min-h-screen place-items-center"><Backdrop /><TwynLoader label="Finding this Twyn" /></main>;

  const first = p.name.split(" ")[0];
  const initials = p.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const avatarImage = p.avatar_url ? `${API}${p.avatar_url}` : profileAvatarUrl(p.name, p.avatar_seed);
  const share = typeof window !== "undefined" ? window.location.href : "";
  const TABS = [["chat", "Chat", MessageSquare], ["voice", "Talk", AudioLines], ["book", "Book", CalendarCheck]] as const;
  const latestBookingMessage = [...msgs].reverse().find((message) => (message.tools || []).some((tool: any) => tool.name === "check_availability" || tool.name === "book_meeting"));
  const bookingComplete = !!latestBookingMessage?.tools?.some((tool: any) => tool.name === "book_meeting" && tool.result?.booked);
  const latestAvailabilityIndex = [...msgs].map((message, index) => ({ message, index })).reverse().find(({ message }) => (message.tools || []).some((tool: any) => tool.name === "check_availability" && (tool.result?.slots || []).length > 0))?.index ?? -1;
  const latestVoiceSlots = ([...msgs].reverse().map((message) => (message.tools || []).flatMap((tool: any) => tool.name === "check_availability" ? (tool.result?.slots || []) : [])).find((slots) => slots.length > 0) || []) as BookingSlot[];
  const chooseSlot = (slot: BookingSlot) => { setBookingDraft(slot); setNote(`Selected ${slot.say}. Add your details to continue.`); };
  async function submitBooking(details: { name: string; email: string; topic: string }) {
    if (!bookingDraft || busy || bookingSubmitLock.current) return;
    bookingSubmitLock.current = true;
    const slot = bookingDraft;
    setBusy(true);
    setMsgs((messages) => [...messages, { role: "visitor", text: `I’d like to book ${slot.say}.` }]);
    try {
      const result = await api(`/api/p/${handle}/book`, { method: "POST", body: JSON.stringify({ start: slot.start, name: details.name, email: details.email, topic: details.topic, conversation_id: cid }) });
      setMsgs((messages) => [...messages, { role: "persona", text: `Your meeting is confirmed for ${result.label} (${result.minutes} min).`, tools: [{ name: "book_meeting", result: { booked: true } }] }]);
      setBookingDraft(null);
    } catch (error: any) {
      setMsgs((messages) => [...messages, { role: "persona", text: error?.message || "I couldn’t confirm that time. Please choose another available slot." }]);
    } finally { bookingSubmitLock.current = false; setBusy(false); }
  }
  const modeContent = mode === "book" ? <BookPanel handle={handle} first={first} conversationId={cid} />
    : mode === "voice" ? (
      <div data-lenis-prevent="true" className="twyn-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper-2/30 p-3 [touch-action:pan-y] md:p-6" onWheel={(event) => event.stopPropagation()}>
        <div className="glass mx-auto flex min-h-full w-full max-w-[560px] flex-col items-center justify-start gap-4 rounded-[30px] p-6 pb-8 md:p-8">
          <Orb size={150} state={orb} level={level} color={accent.soft} deep={accent.deep} initials={initials} image={avatarImage} />
          <div className="text-center">
            <div className="text-[15px] font-medium">{{ idle: callActive.current ? "Your turn" : "Start a live conversation", listening: "Listening", thinking: "Thinking", speaking: `${first} is speaking` }[orb]}</div>
            <div className="mt-0.5 text-[12.5px] text-ink-mute">{callActive.current ? "Just speak. Twyn sends your turn after a short pause." : "Speak in any Indian language."} {lang && `Detected: ${LANG[lang] || lang}`}</div>
            {lat && <div className="mt-2 flex flex-wrap justify-center gap-1 text-[11px]">{([["Hear", lat.stt_ms], ["First token", lat.llm_ms], ["TTS chunk", lat.tts_ms], ["First audio", lat.first_audio_ms]] as const).map(([k, v]) => (
              <span key={k} className="hairline rounded-full bg-white/70 px-2 py-0.5 text-ink-soft">{k} <span className="font-medium text-ink tnum">{((v || 0) / 1000).toFixed(1)}s</span></span>))}</div>}
            {note && <div className="mt-1.5 text-[11px] text-ink-mute">{note}</div>}
          {latestVoiceSlots.length > 0 && !bookingDraft && !bookingComplete && <div className="w-full max-w-lg"><SlotPicker slots={latestVoiceSlots} onConfirm={chooseSlot} disabled={busy} /></div>}
          {bookingDraft && <div className="w-full max-w-lg"><BookingDetailsForm draft={bookingDraft} onSubmit={submitBooking} disabled={busy} /></div>}
          </div>
          <motion.button aria-label={callActive.current ? "End live conversation" : "Start live conversation"} whileTap={{ scale: 0.94 }} onClick={() => callActive.current ? endCall() : beginCall()}
            className="grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: orb === "listening" ? accent.deep : "var(--color-ink)" }}>
            {callActive.current ? <Square size={16} /> : <Mic size={18} />}
          </motion.button>
          {err && <p className="text-[12.5px] text-peach-deep">{err}</p>}
          <div className="mt-2 w-full max-w-lg space-y-1.5">{msgs.slice(-2).map((m, i) => <p key={i} className={m.role === "visitor" ? "text-right text-[13px] text-ink-mute" : "text-[13px]"}>{m.text}</p>)}</div>
        </div>
      </div>
    ) : (
      <>
        <div data-lenis-prevent="true" className="twyn-scrollbar min-h-0 flex-1 space-y-3 overflow-y-scroll overscroll-contain px-3 py-4 [touch-action:pan-y]" onWheel={(event) => event.stopPropagation()}>
          {msgs.length === 0 && (
            <div className="mx-auto mt-10 max-w-sm text-center">
              <div className="mx-auto w-fit"><Orb size={64} color={accent.soft} deep={accent.deep} initials={initials} image={avatarImage} /></div>
              <h2 className="display mt-2 text-[26px] leading-tight">Hi, I&rsquo;m {first}&rsquo;s Twyn.</h2>
              <p className="mt-1 text-[13px] text-ink-soft">Ask about work, rates or availability. I can book a call. English, Hindi, Hinglish and more.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {["Aapka rate kitna hai?", "Can we book a call this week?", "What do you work on?"].map((q) => <button key={q} onClick={() => send(q)} className="hairline h-7 rounded-full bg-white/80 px-3 text-[12.5px] text-ink-soft hover:bg-white hover:text-ink">{q}</button>)}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={m.role === "visitor" ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[78%]">
                  {m.role === "owner" && <div className="mb-0.5 text-[11px] font-medium text-peach-deep">{p.name} (live)</div>}
                  <div className={m.role === "visitor" ? "rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13.5px] leading-relaxed text-canvas" : "hairline whitespace-pre-wrap rounded-2xl rounded-bl-md px-3.5 py-2 text-[13.5px] leading-relaxed"} style={m.role === "visitor" ? {} : { background: m.role === "owner" ? "#f8dacb" : "#fbfbfd" }}>{m.text}</div>
                  {m.tools && m.tools.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{m.tools.map((t, j) => { const [l, I, tone] = TOOL_LABEL[t.name] || [t.name, Search, "white"]; return <Pill key={j} tone={tone}><I size={11} />{l}</Pill>; })}</div>}
                  {i === latestAvailabilityIndex && !bookingDraft && !bookingComplete && (m.tools || []).flatMap((t) => t.name === "check_availability" ? (t.result?.slots || []) : []).length > 0 && <SlotPicker slots={(m.tools || []).flatMap((t) => t.name === "check_availability" ? (t.result?.slots || []) : [])} onConfirm={chooseSlot} disabled={busy} />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && <div className="hairline flex w-fit gap-1 rounded-2xl bg-[#fbfbfd] px-3.5 py-3">{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-ink-mute" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />)}</div>}
          {bookingDraft && <BookingDetailsForm draft={bookingDraft} onSubmit={submitBooking} disabled={busy} />}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="clay-sm m-1 flex items-center gap-1 bg-white p-1">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${first}...`} className="h-9 flex-1 bg-transparent px-3 text-[13.5px] outline-none placeholder:text-ink-mute" />
          <button type="button" aria-label="Talk instead" onClick={() => setMode("voice")} className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-paper-2"><Mic size={15} /></button>
          <motion.button aria-label="Send" whileTap={{ scale: 0.94 }} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-canvas"><Send size={14} /></motion.button>
        </form>
      </>
    );
  return (
    <main className="relative min-h-screen pb-10 lg:h-dvh lg:overflow-hidden lg:pb-0">
      <Backdrop />
      <div className="sticky top-0 z-30 border-b border-rule bg-canvas/75 backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-[min(1040px,calc(100%-2rem))] items-center justify-between">
          <Logo />
          <span className="flex items-center gap-1.5">
            <span className="mr-2 hidden font-mono text-[12px] text-ink-mute sm:inline">twyn.ai/{p.handle}</span>
            {[["linkedin", "LinkedIn", "https://www.linkedin.com/sharing/share-offsite/?url="], ["x", "X", "https://x.com/intent/post?url="], ["whatsapp", "WhatsApp", "https://wa.me/?text="]].map(([k, n, u]) => (
              <a key={k} aria-label={`Share on ${n}`} target="_blank" rel="noreferrer" href={u + encodeURIComponent(share)} className="hairline grid h-7 w-7 place-items-center rounded-full bg-white/80 hover:bg-white"><Image src={`/brands/${k}.svg`} alt="" width={13} height={13} /></a>
            ))}
          </span>
        </div>
      </div>
      <div className="reveal mx-auto grid w-[min(1040px,calc(100%-2rem))] gap-4 pt-5 lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden">
        <aside data-lenis-prevent="true" className="twyn-scrollbar space-y-3 lg:min-h-0 lg:h-full lg:overflow-y-scroll lg:pr-2 [touch-action:pan-y]" onWheel={(event) => event.stopPropagation()}>
          <div className="glass p-5">
            <div className="flex items-center gap-3">
              <ProfileAvatar seed={p.name} image={avatarImage} size={56} alt={`${p.name}'s profile`} className="clay-sm shrink-0 ring-2 ring-white/70" />
              <div className="min-w-0">
                <h1 className="display truncate text-[22px] leading-tight">{p.name}</h1>
                <p className="truncate text-[12.5px] text-ink-soft">{p.headline}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={human ? "peach" : "mint"}>{human ? `${first} joined` : "Online now"}</Pill>
              {p.has_voice && <Pill tone="lilac">Own voice</Pill>}
              <Pill tone="sky">{(p.languages || []).length || 2}+ languages</Pill>
            </div>
            {p.bio && <p className="mt-4 border-t border-rule pt-4 text-[13px] leading-relaxed text-ink-soft">{p.bio}</p>}
            {p.rates && <div className="clay-pressed mt-3 px-3 py-2.5 text-[13px]"><div className="eyebrow mb-0.5">Rates</div>{p.rates}</div>}
            <button onClick={() => setMode("book")} className="mt-3 hidden h-9 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-medium text-canvas hover:bg-ink-soft lg:flex"><CalendarCheck size={14} />Book a call</button>
          </div>
          {p.links.length > 0 && <div className="glass space-y-1 p-3">
            {p.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="group flex min-h-10 items-center justify-between gap-3 rounded-xl border border-rule/70 bg-white/65 px-3 py-2 text-[13px] text-ink transition-colors hover:bg-white">
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{linkLabel(l)}</span><ArrowUpRight size={14} className="shrink-0 text-ink-mute group-hover:text-ink" />
              </a>))}
          </div>}
          {p.faqs.length > 0 && <div className="glass p-4"><div className="eyebrow mb-2">Ask me</div>
            <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">{p.faqs.slice(0, 4).map((f) => <button key={f.q} onClick={() => { setMode("chat"); send(f.q); }} className="rounded-full border border-rule/70 bg-white/60 px-3 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-white hover:text-ink lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-2.5 lg:text-[13px]">{f.q}</button>)}</div></div>}
        </aside>

        <section className="glass hidden min-h-[520px] min-h-0 flex-col p-2 lg:flex lg:h-full">
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <span className="text-[12.5px] text-ink-mute">{first}&rsquo;s Twyn</span>
            <div className="clay-pressed flex p-0.5">
              {TABS.map(([m, label, I]) => (
                <button key={m} onClick={() => setMode(m)} className="relative flex h-7 items-center rounded-[10px] px-3 text-[12.5px] font-medium">
                  {mode === m && <motion.span layoutId="tab" className="clay-sm absolute inset-0 bg-white" style={{ borderRadius: 10 }} />}
                  <span className="relative flex items-center gap-1.5"><I size={13} />{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="hair-t" />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {modeContent}
          </div>
        </section>
      </div>
      <div className="lg:hidden">
        <AnimatePresence>
          {!mobileActionOpen && !mobileMode && <motion.button
            initial={{ opacity: 0, scale: .8, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} whileTap={{ scale: .94 }}
            type="button" aria-label="Open connection actions" onClick={() => setMobileActionOpen(true)}
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-ink text-canvas shadow-[0_10px_25px_oklch(22%_0.025_285/0.2)]">
            <SquaresFour size={21} weight="fill" />
          </motion.button>}
        </AnimatePresence>

        <AnimatePresence>
          {mobileActionOpen && !mobileMode && <>
            <motion.button aria-label="Close connection actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileActionOpen(false)} className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]" />
            <motion.div role="dialog" aria-modal="true" aria-labelledby="connect-title" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-white/80 bg-canvas px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_32px_oklch(22%_0.025_285/0.12)]">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
              <div className="flex items-start justify-between gap-4">
                <div><p className="eyebrow">Connect</p><h2 id="connect-title" className="display mt-1 text-[25px]">Connect with {first}</h2></div>
                <button ref={mobileClose} type="button" aria-label="Close" onClick={() => setMobileActionOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-rule bg-white/70 text-ink-soft"><X size={17} /></button>
              </div>
              <div className="mt-5 space-y-2">
                {([["chat", "Chat", "Start a text conversation", MessageSquare, "bg-lilac"], ["voice", "Talk", "Speak with the real-time voice experience", AudioLines, "bg-mint"], ["book", "Book", "Schedule a time to meet", CalendarCheck, "bg-sky"]] as const).map(([next, title, description, Icon, tone]) => (
                  <button key={next} type="button" onClick={() => { setMode(next); setMobileMode(next); setMobileActionOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-rule/80 bg-white/75 p-3 text-left transition-transform active:scale-[.99]">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon size={20} /></span>
                    <span className="min-w-0"><span className="block text-[14px] font-medium">{title}</span><span className="mt-0.5 block text-[12px] text-ink-soft">{description}</span></span>
                    <ArrowUpRight size={15} className="ml-auto shrink-0 text-ink-mute" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>}
        </AnimatePresence>

        <AnimatePresence>
          {mobileMode && <motion.div role="dialog" aria-modal="true" aria-labelledby="mobile-mode-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex min-h-0 flex-col bg-canvas">
            <div className="flex shrink-0 items-center justify-between border-b border-rule px-4 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))]">
              <div><p className="text-[12px] text-ink-mute">{first}&rsquo;s Twyn</p><h2 id="mobile-mode-title" className="text-[15px] font-medium">{mobileMode === "chat" ? "Chat" : mobileMode === "voice" ? "Talk" : "Book a time"}</h2></div>
              <button ref={mobileClose} type="button" aria-label="Close experience" onClick={() => setMobileMode(null)} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-white/70 text-ink-soft"><X size={17} /></button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{modeContent}</div>
          </motion.div>}
        </AnimatePresence>
      </div>
    </main>
  );
}

type Slot = { start: string; label: string };
function BookPanel({ handle, first, conversationId }: { handle: string; first: string; conversationId: string }) {
  const cacheKey = `twyn-slots-${handle}`;
  const [data, setData] = useState<{ minutes: number; slots: Slot[] } | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem(cacheKey) || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState("");
  const [pick, setPick] = useState("");
  const [f, setF] = useState({ name: "", email: "", topic: "" });
  const [state, setState] = useState<{ busy?: boolean; err?: string; done?: string }>({});
  const load = () => { setLoading(true); return api(`/api/p/${handle}/slots?days=14`).then((d) => { setData(d); setDay(d.slots[0]?.start.slice(0, 10) || ""); try { sessionStorage.setItem(cacheKey, JSON.stringify(d)); } catch {} }).catch(() => { if (!data) setData({ minutes: 30, slots: [] }); }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = Array.from(new Set((data?.slots || []).map((s) => s.start.slice(0, 10))));
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(d + "T12:00:00").toLocaleDateString("en-IN", o);
  async function book(e: React.FormEvent) {
    e.preventDefault(); setState({ busy: true });
    try { const r = await api(`/api/p/${handle}/book`, { method: "POST", body: JSON.stringify({ start: pick, ...f, conversation_id: conversationId }) }); setState({ done: r.label }); }
    catch (x: any) { setState({ err: String(x?.message || "Could not book.") }); load(); setPick(""); }
  }
  if (!data) return <div className="grid flex-1 place-items-center"><div className="text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-ink" /><p className="mt-2 text-[12px] text-ink-mute">Checking available times…</p></div></div>;
  if (state.done) return (
    <div className="grid flex-1 place-items-center p-6 text-center">
      <div><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-mint text-mint-deep"><Check size={18} weight="bold" /></div>
        <h3 className="display mt-3 text-[24px]">You&rsquo;re booked.</h3>
        <p className="mt-1 text-[13px] text-ink-soft">{state.done} with {first}, {data.minutes} min. An invite is on its way to {f.email}.</p></div>
    </div>);
  return (
    <div data-lenis-prevent="true" className="twyn-scrollbar relative grid min-h-0 flex-1 gap-4 overflow-y-scroll overscroll-contain p-4 md:grid-cols-[minmax(0,1fr)_260px] [touch-action:pan-y]" onWheel={(event) => event.stopPropagation()}>
      {loading && <div className="pointer-events-none absolute right-4 top-3 z-10 rounded-full border border-rule bg-white/85 px-2.5 py-1 text-[11px] text-ink-mute">Updating times…</div>}
      <div>
        <div className="flex items-baseline justify-between"><h3 className="text-[15px] font-medium">Pick a time</h3><span className="flex items-center gap-1 text-[12px] text-ink-mute"><Clock size={12} />{data.minutes} min, IST</span></div>
        {days.length === 0 ? <p className="mt-6 text-[13px] text-ink-mute">No open times this week. Ask in chat and {first} will get back to you.</p> : <>
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {days.map((d) => (
              <button key={d} onClick={() => { setDay(d); setPick(""); }} className={"rounded-xl py-2 text-center transition-colors " + (d === day ? "bg-ink text-canvas" : "hairline bg-white/70 hover:bg-white")}>
                <div className="text-[10.5px] uppercase opacity-70">{fmt(d, { weekday: "short" })}</div><div className="text-[15px] font-medium tnum">{fmt(d, { day: "numeric" })}</div>
              </button>))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {data.slots.filter((s) => s.start.startsWith(day)).map((s) => (
              <button key={s.start} onClick={() => setPick(s.start)} className={"h-9 rounded-lg text-[13px] font-medium tnum transition-colors " + (pick === s.start ? "bg-lilac text-ink ring-1 ring-lilac-deep/40" : "hairline bg-white/70 hover:bg-white")}>
                {s.label.split(", ")[1]?.replace(" IST", "") || s.label}
              </button>))}
          </div></>}
      </div>
      <form onSubmit={book} className="clay-sm space-y-2.5 self-start bg-white/80 p-3.5">
        <div className="text-[12.5px] text-ink-mute">{pick ? data.slots.find((s) => s.start === pick)?.label : "Choose a time first"}</div>
        <input required className="field" placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input required type="email" className="field" placeholder="you@email.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="field" placeholder="What is it about? (optional)" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
        {state.err && <p className="text-[12px] text-peach-deep">{state.err}</p>}
        <button disabled={!pick || state.busy} className="flex h-9 w-full items-center justify-center rounded-full bg-ink text-[13px] font-medium text-canvas disabled:opacity-40">{state.busy ? "Booking..." : "Confirm booking"}</button>
      </form>
    </div>);
}
