"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, MessageSquare, AudioLines, Square, CalendarCheck, UserPlus, Search } from "lucide-react";
import { api, API, WS, Persona, ACCENTS, encodeWav } from "@/lib/api";
import { Backdrop, Logo, Pill } from "@/components/ui";
import { Orb } from "@/components/Orb";

type Msg = { role: "visitor" | "persona" | "owner"; text: string; tools?: any[] };
const TOOL_LABEL: Record<string, [string, any, string]> = {
  check_availability: ["Checked calendar", Search, "sky"], book_meeting: ["Meeting booked", CalendarCheck, "mint"], capture_lead: ["Saved as lead", UserPlus, "butter"],
};
const LANG: Record<string, string> = { hinglish: "Hinglish", "hi-IN": "Hindi", "ta-IN": "Tamil", "en-IN": "English", "te-IN": "Telugu", "kn-IN": "Kannada", "bn-IN": "Bengali", "mr-IN": "Marathi" };

export default function PublicPersona() {
  const { handle } = useParams<{ handle: string }>();
  const [p, setP] = useState<Persona | null>(null);
  const [mode, setMode] = useState<"chat" | "voice">("chat");
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
  const rec = useRef<MediaRecorder | null>(null);
  const raf = useRef<number>(0);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { api<Persona>(`/api/p/${handle}`).then(setP).catch(() => setErr("This Twyn does not exist.")); }, [handle]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => {
    if (!cid) return;
    const ws = new WebSocket(`${WS}/ws/conversations/${cid}`);
    ws.onmessage = (e) => { const d = JSON.parse(e.data);
      if (d.type === "takeover") setHuman(d.on);
      if (d.type === "message" && d.role === "owner") setMsgs((m) => [...m, { role: "owner", text: d.text }]); };
    return () => ws.close();
  }, [cid]);

  const accent = ACCENTS[p?.accent || "lilac"] || ACCENTS.lilac;

  async function send(t = text) {
    if (!t.trim() || busy) return;
    setMsgs((m) => [...m, { role: "visitor", text: t }]); setText(""); setBusy(true);
    try {
      const d = await api(`/api/p/${handle}/chat`, { method: "POST", body: JSON.stringify({ text: t, conversation_id: cid }) });
      setCid(d.conversation_id); setHuman(d.takeover);
      if (d.reply) setMsgs((m) => [...m, { role: "persona", text: d.reply, tools: d.tools }]);
    } catch { setMsgs((m) => [...m, { role: "persona", text: "Something went wrong. Please try again." }]); }
    setBusy(false);
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
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const stop = meter(stream); const chunks: Blob[] = [];
      const r = new MediaRecorder(stream); rec.current = r;
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = async () => { stop(); stream.getTracks().forEach((t) => t.stop()); await voiceTurn(new Blob(chunks, { type: r.mimeType })); };
      r.start(); setOrb("listening");
      setTimeout(() => r.state === "recording" && r.stop(), 28000);
    } catch { setErr("Microphone is blocked. Type below instead, or allow mic access."); }
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
  async function voiceTurn(blob: Blob, hint = "") {
    setOrb("thinking"); setNote("");
    const fd = new FormData();
    try { fd.append("audio", await encodeWav(blob), "turn.wav"); } catch { fd.append("audio", blob, "turn.webm"); }
    fd.append("conversation_id", cid); fd.append("text_hint", hint);
    const t0 = performance.now();
    let res: Response;
    try { res = await fetch(`${API}/api/p/${handle}/voice/stream`, { method: "POST", body: fd }); if (!res.ok || !res.body) throw 0; }
    catch { return voiceTurnBatch(fd, t0); }
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
    const finish = () => { cancelAnimationFrame(raf.current); setLevel(0); setOrb("idle"); ctx.close(); };
    if (firstAudio) setTimeout(finish, Math.max(0, (at - ctx.currentTime) * 1000) + 150);
    else { finish(); if (mock || speakLocal.length) playQueue(mock ? reply : speakLocal.join(" "), [], language); }
  }

  async function voiceTurnBatch(fd: FormData, t0: number) {
    try {
      const d = await api(`/api/p/${handle}/voice`, { method: "POST", body: fd });
      setCid(d.conversation_id); setLang(d.language || "");
      setMsgs((m) => [...m, { role: "visitor", text: d.transcript }, ...(d.reply ? [{ role: "persona" as const, text: d.reply, tools: d.tools }] : [])]);
      setNote(d.fallback?.length ? `Fallback: ${d.fallback.join(", ")}` : d.mock_tts ? "Demo voice (browser speech) until the Gnani key is set" : "");
      const segs: string[] = d.segments?.length ? d.segments : d.audio ? [d.audio] : [];
      const first = await playQueue(d.reply, d.mock_tts ? [] : segs, d.language);
      if (d.latency) setLat({ ...d.latency, client_ms: Math.round(first - t0), first_audio_ms: Math.round(first - t0) });
    } catch { setOrb("idle"); setErr("Voice request failed."); }
  }

  if (err && !p) return <main className="grid min-h-screen place-items-center"><Backdrop /><div className="glass p-10 text-ink-soft">{err}</div></main>;
  if (!p) return <main className="grid min-h-screen place-items-center"><Backdrop /><div className="clay h-16 w-16 animate-pulse rounded-full" /></main>;

  const initials = p.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <main className="relative min-h-screen pb-10">
      <Backdrop />
      <div className="sticky top-0 z-30 border-b border-rule bg-canvas/70 backdrop-blur-xl"><div className="mx-auto flex h-16 w-[min(1200px,calc(100%-2.5rem))] items-center justify-between"><Logo /><span className="font-mono text-[13px] text-ink-mute">twyn.ai/{p.handle}</span></div></div>
      <div className="reveal mx-auto grid w-[min(1200px,calc(100%-2.5rem))] gap-6 pt-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="glass p-7">
            <div className="clay-sm grid h-20 w-20 place-items-center font-display text-3xl" style={{ background: accent.soft }}>{initials}</div>
            <h1 className="mt-6 text-4xl">{p.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">{p.headline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={human ? "peach" : "mint"}>{human ? `${p.name.split(" ")[0]} joined` : "AI persona online"}</Pill>
              {p.has_voice && <Pill tone="lilac">Cloned voice</Pill>}
            </div>
            <p className="mt-5 border-t border-rule pt-5 text-sm leading-relaxed text-ink-soft">{p.bio}</p>
            {p.rates && <div className="clay-pressed mt-5 p-4 text-sm"><div className="mb-1 text-xs font-medium text-ink-mute">Rates</div>{p.rates}</div>}
            {p.links.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{p.links.map((l) => <a key={l.url} href={l.url} target="_blank" className="clay-sm bg-canvas px-3 py-1.5 text-xs font-medium">{l.label}</a>)}</div>}
          </div>
          {p.faqs.length > 0 && <div className="glass p-6"><div className="mb-3 text-xs font-medium text-ink-mute">Ask me</div>
            <div className="flex flex-col gap-2">{p.faqs.slice(0, 4).map((f) => <button key={f.q} onClick={() => { setMode("chat"); send(f.q); }} className="clay-sm bg-canvas px-4 py-2.5 text-left text-sm hover:bg-white">{f.q}</button>)}</div></div>}
        </aside>

        <section className="glass flex min-h-[calc(100vh-7rem)] flex-col p-3">
          <div className="flex items-center justify-between border-b border-rule px-4 pb-3 pt-2">
            <span className="text-sm text-ink-soft">Talking to {p.name.split(" ")[0]}&rsquo;s Twyn</span>
            <div className="clay-pressed flex p-1">
              {(["chat", "voice"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium">
                  {mode === m && <motion.span layoutId="tab" className="clay-sm absolute inset-0 bg-white" />}
                  <span className="relative flex items-center gap-2">{m === "chat" ? <MessageSquare size={15} /> : <AudioLines size={15} />}{m === "chat" ? "Chat" : "Talk"}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === "voice" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <Orb state={orb} level={level} color={accent.soft} deep={accent.deep} />
              <div className="text-center">
                <div className="text-lg font-medium">{{ idle: "Tap to talk", listening: "Listening", thinking: "Thinking", speaking: `${p.name.split(" ")[0]} is speaking` }[orb]}</div>
                <div className="mt-1 text-sm text-ink-mute">Speak in any Indian language. {lang && `Detected: ${LANG[lang] || lang}`}</div>
                {lat && <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-xs">{([["Hear", lat.stt_ms], ["First token", lat.llm_ms], ["TTS first chunk", lat.tts_ms], ["First audio", lat.first_audio_ms]] as const).map(([k, v]) => (
                  <span key={k} className="rounded-full bg-white/70 px-2.5 py-1 text-ink-soft">{k} <span className="font-medium text-ink">{(v / 1000).toFixed(1)}s</span></span>))}</div>}
                {note && <div className="mt-2 text-xs text-ink-mute">{note}</div>}
              </div>
              <motion.button aria-label="Talk to Twyn" whileTap={{ scale: 0.94 }} onClick={() => (orb === "listening" ? rec.current?.stop() : orb === "idle" && startTalk())}
                className="clay-sm grid h-16 w-16 place-items-center text-white" style={{ background: orb === "listening" ? accent.deep : "var(--color-ink)", borderRadius: 9999 }}>
                {orb === "listening" ? <Square size={20} /> : <Mic size={22} />}
              </motion.button>
              {err && <p className="text-sm text-peach-deep">{err}</p>}
              <div className="mt-4 w-full max-w-xl space-y-2">{msgs.slice(-2).map((m, i) => <p key={i} className={m.role === "visitor" ? "text-right text-sm text-ink-mute" : "text-sm"}>{m.text}</p>)}</div>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {msgs.length === 0 && (
                  <div className="mx-auto mt-16 max-w-md text-center">
                    <div className="mx-auto w-fit"><Orb size={90} color={accent.soft} deep={accent.deep} /></div>
                    <h2 className="display mt-2 text-4xl md:text-5xl">Hi, I am {p.name.split(" ")[0]}'s Twyn.</h2>
                    <p className="mt-2 text-sm text-ink-soft">Ask about work, rates or availability. I can book a call for you. English, Hindi, Hinglish and more.</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {["Aapka rate kitna hai?", "Can we book a call this week?", "What do you work on?"].map((s) => <button key={s} onClick={() => send(s)} className="clay-sm bg-canvas px-4 py-2 text-sm">{s}</button>)}
                    </div>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {msgs.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={m.role === "visitor" ? "flex justify-end" : "flex justify-start"}>
                      <div className="max-w-[78%]">
                        {m.role === "owner" && <div className="mb-1 text-xs font-medium text-peach-deep">{p.name} (live)</div>}
                        <div className={m.role === "visitor" ? "rounded-3xl rounded-br-lg bg-ink px-5 py-3 text-[15px] leading-relaxed text-canvas" : "clay-sm whitespace-pre-wrap px-5 py-3 text-[15px] leading-relaxed"} style={m.role === "visitor" ? {} : { background: m.role === "owner" ? "#f8dacb" : "#fbfbfd", borderRadius: "24px 24px 24px 8px" }}>{m.text}</div>
                        {m.tools && m.tools.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{m.tools.map((t, j) => { const [l, I, tone] = TOOL_LABEL[t.name] || [t.name, Search, "white"]; return <Pill key={j} tone={tone}><I size={12} />{l}</Pill>; })}</div>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {busy && <div className="clay-sm flex w-fit gap-1.5 bg-[#fbfbfd] px-5 py-4">{[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-ink-mute" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />)}</div>}
                <div ref={end} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="clay m-2 flex items-center gap-2 p-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${p.name.split(" ")[0]}...`} className="flex-1 bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-ink-mute" />
                <button type="button" onClick={() => setMode("voice")} className="grid h-11 w-11 place-items-center rounded-2xl text-ink-soft hover:bg-white"><Mic size={18} /></button>
                <motion.button whileTap={{ scale: 0.94 }} className="grid h-11 w-11 place-items-center rounded-full bg-ink text-canvas"><Send size={17} /></motion.button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
