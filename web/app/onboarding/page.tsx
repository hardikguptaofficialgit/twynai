"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Copy, FileText, Link2, Loader2, Mic, Plus, Square, Trash2, Upload, X, CalendarDays, ExternalLink, Volume2 } from "lucide-react";
import clsx from "clsx";
import { api, API, encodeWav, Persona, token } from "@/lib/api";
import { useOwner } from "@/lib/useOwner";
import { Logo , Backdrop } from "@/components/ui";
import { Orb } from "@/components/Orb";

const STEPS = ["Handle", "Basics", "Knowledge", "Voice", "Calendar", "Availability", "Publish"];
const LANGS: [string, string][] = [["en", "English"], ["hi", "Hindi"], ["hinglish", "Hinglish"], ["ta", "Tamil"], ["te", "Telugu"], ["kn", "Kannada"], ["bn", "Bengali"], ["mr", "Marathi"], ["gu", "Gujarati"], ["ml", "Malayalam"], ["pa", "Punjabi"]];
const TONES = ["Warm and concise", "Friendly and casual", "Crisp and professional", "Playful"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_AVAIL = { days: [0, 1, 2, 3, 4], start: "10:00", end: "18:00", duration: 30, buffer: 15, notice: 12 };

type Draft = Omit<Persona, "id" | "has_voice"> & { id?: string; has_voice?: boolean; languages: string[]; availability: any; published?: boolean; onboarding_step?: number };
const empty = (name = ""): Draft => ({ handle: "", name, headline: "", bio: "", rates: "", faqs: [], links: [], tone: TONES[0], accent: "lilac", languages: ["en", "hinglish"], availability: DEFAULT_AVAIL });

const input = "field clay-pressed text-ink placeholder:text-ink-mute/70";

function Label({ t, hint, children, err }: any) {
  return (
    <div className="block">
      <div className="mb-2 flex items-baseline justify-between"><span className="text-sm font-medium">{t}</span>{hint && <span className="text-xs text-ink-mute">{hint}</span>}</div>
      {children}
      {err && <p className="mt-1.5 text-xs text-peach-deep">{err}</p>}
    </div>
  );
}

function Chip({ on, children, onClick }: any) {
  return (
    <button type="button" onClick={onClick}
      className={clsx("rounded-full px-3.5 py-1.5 text-sm transition-all", on ? "clay-sm bg-lilac font-medium text-ink" : "bg-white/60 text-ink-soft hover:bg-white")}>
      {children}
    </button>
  );
}

function Progress({ step, max, go }: { step: number; max: number; go: (i: number) => void }) {
  return (
    <div>
      <div className="clay-pressed h-2 overflow-hidden rounded-full p-0">
        <motion.div className="h-full rounded-full bg-lilac-deep" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <ol className="mt-4 hidden grid-cols-7 gap-1 md:grid">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button disabled={i > max} onClick={() => go(i)} className={clsx("flex items-center gap-1.5 text-xs", i === step ? "font-semibold text-ink" : i <= max ? "text-ink-soft hover:text-ink" : "text-ink-mute/60")}>
              <span className={clsx("grid h-5 w-5 place-items-center rounded-full text-[10px]", i < step || (i <= max && i !== step) ? "bg-mint text-mint-deep" : i === step ? "bg-ink text-canvas" : "bg-white/60")}>
                {i < step || (i <= max && i !== step) ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>{s}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Onboarding() {
  const { me } = useOwner();
  const [d, setD] = useState<Draft>(empty());
  const [step, setStep] = useState(0);
  const [max, setMax] = useState(0);
  const [dir, setDir] = useState(1);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [loaded, setLoaded] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  // resume: existing persona from API, else a local draft
  useEffect(() => {
    if (!me) return;
    (async () => {
      const ps: any[] = await api("/api/me/personas");
      const local = JSON.parse(localStorage.getItem("proxy_draft") || "null");
      const claim = localStorage.getItem("proxy_claim") || "";
      if (ps[0]) {
        const p = ps[0]; setD({ ...empty(), ...p, availability: { ...DEFAULT_AVAIL, ...(p.availability || {}) } });
        const s = Math.min(p.onboarding_step || 1, 6); setStep(p.published ? 6 : s); setMax(p.published ? 6 : s);
      } else if (local) { setD(local); }
      else set({ name: me.name || "", handle: claim });
      setLoaded(true);
    })();
  }, [me]);
  useEffect(() => { if (loaded && !d.id) localStorage.setItem("proxy_draft", JSON.stringify(d)); }, [d, loaded]);

  // live handle check
  const [avail, setAvail] = useState<null | boolean>(null);
  useEffect(() => {
    if (d.id || d.handle.length < 3) { setAvail(null); return; }
    const t = setTimeout(() => api(`/api/handles/${d.handle}`).then((r) => setAvail(r.available)).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [d.handle, d.id]);

  function validate(i: number) {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!/^[a-z0-9-]{3,30}$/.test(d.handle)) e.handle = "Use 3 to 30 lowercase letters, numbers or dashes.";
      else if (!d.id && avail === false) e.handle = "That handle is taken.";
    }
    if (i === 1) {
      if (!d.name.trim()) e.name = "Add your name.";
      if (!d.headline.trim()) e.headline = "Add a one-line role.";
      if (d.bio.trim().length < 40) e.bio = "Write at least a couple of sentences so Twyn has something to go on.";
      if (!d.languages.length) e.languages = "Pick at least one language.";
    }
    if (i === 2) d.links.forEach((l, k) => { if (l.url && !/^https?:\/\//.test(l.url)) e["link" + k] = "Links should start with https://"; });
    if (i === 5 && (!d.availability.days.length || d.availability.start >= d.availability.end)) e.avail = "Choose at least one day and an end time after the start time.";
    setErrs(e); return !Object.keys(e).length;
  }

  async function persist(nextStep: number, extra: Partial<Draft> = {}) {
    setSaving(true);
    try {
      const body = { ...d, ...extra, faqs: d.faqs.filter((f) => f.q.trim()), links: d.links.filter((l) => l.url.trim()), onboarding_step: Math.max(nextStep, d.onboarding_step || 0) };
      const p: any = d.id ? await api(`/api/personas/${d.id}`, { method: "PUT", body: JSON.stringify(body) })
        : await api("/api/personas", { method: "POST", body: JSON.stringify(body) });
      setD((x) => ({ ...x, ...p, availability: { ...DEFAULT_AVAIL, ...(p.availability || {}) } }));
      localStorage.removeItem("proxy_draft"); localStorage.removeItem("proxy_claim");
      setSaved("Saved"); setTimeout(() => setSaved(""), 1600);
      return true;
    } catch (e: any) {
      setErrs({ handle: e.message.includes("taken") ? "That handle is taken." : "Could not save. Check the API is running." }); return false;
    } finally { setSaving(false); }
  }

  async function next() {
    if (!validate(step)) return;
    const n = step + 1;
    if (!(await persist(n))) return;
    setDir(1); setStep(n); setMax((m) => Math.max(m, n));
  }
  const back = () => { setErrs({}); setDir(-1); setStep((s) => Math.max(0, s - 1)); };
  const go = (i: number) => { setErrs({}); setDir(i > step ? 1 : -1); setStep(i); };

  const views = [
    <HandleStep key="h" d={d} set={set} avail={avail} errs={errs} />,
    <BasicsStep key="b" d={d} set={set} errs={errs} />,
    <KnowledgeStep key="k" d={d} set={set} errs={errs} />,
    <VoiceStep key="v" d={d} set={set} />,
    <CalendarStep key="c" me={me} />,
    <AvailabilityStep key="a" d={d} set={set} errs={errs} />,
    <PublishStep key="p" d={d} publish={() => persist(6, { published: true }).then(() => set({ published: true }))} saving={saving} />,
  ];

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <div className="sticky top-0 z-30 border-b border-rule bg-canvas/70 backdrop-blur-xl"><header className="mx-auto flex h-16 w-[min(1200px,calc(100%-2.5rem))] items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3 text-sm text-ink-mute">
          <AnimatePresence>{saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-mint-deep"><Check size={14} />{saved}</motion.span>}</AnimatePresence>
          <span>Step {step + 1} of {STEPS.length}</span>
          <Link href="/studio" className="rounded-xl px-3 py-2 hover:text-ink">Exit</Link>
        </div>
      </header></div>
      <div className="mx-auto w-[min(880px,calc(100%-2.5rem))] pb-16 pt-10">
        <Progress step={step} max={max} go={go} />
        <div className="clay relative mt-8 overflow-hidden p-8 md:p-10">
          {!loaded ? <div className="grid h-80 place-items-center text-ink-mute"><Loader2 className="animate-spin" /></div> : (
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={step} custom={dir}
                initial={{ opacity: 0, x: dir * 36 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -36 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                {views[step]}
              </motion.div>
            </AnimatePresence>
          )}
          {loaded && step < 6 && (
            <div className="mt-10 flex items-center justify-between border-t border-ink/5 pt-6">
              <button onClick={back} disabled={step === 0} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-ink-soft hover:text-ink disabled:invisible"><ArrowLeft size={15} />Back</button>
              <div className="flex items-center gap-2">
                {[3, 4].includes(step) && <button onClick={next} className="rounded-xl px-4 py-2.5 text-sm text-ink-soft hover:text-ink">Skip for now</button>}
                <motion.button whileTap={{ scale: 0.97 }} onClick={next} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:bg-ink-soft disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null}{step === 5 ? "Review" : "Continue"}<ArrowRight size={15} />
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Head({ k, t, d }: { k: string; t: string; d: string }) {
  return <div className="mb-8"><p className="text-xs font-medium text-ink-mute">{k}</p><h1 className="display mt-2 text-4xl md:text-5xl">{t}</h1><p className="mt-2 max-w-lg text-ink-soft">{d}</p></div>;
}

function HandleStep({ d, set, avail, errs }: any) {
  return (
    <div>
      <Head k="Your link" t="Claim your handle" d="This is the link people will use to talk to your Twyn. Keep it short and easy to say." />
      <Label t="Handle" err={errs.handle}>
        <div className="clay-pressed flex items-center px-4">
          <span className="text-ink-mute">twyn.ai/</span>
          <input autoFocus disabled={!!d.id} value={d.handle} onChange={(e) => set({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            placeholder="yourname" className="min-w-0 flex-1 bg-transparent py-3.5 font-medium outline-none placeholder:text-ink-mute/70" />
          {d.id ? <span className="text-xs text-ink-mute">locked</span> : avail === true ? <span className="flex items-center gap-1 text-xs text-mint-deep"><Check size={13} />Available</span> : avail === false ? <span className="flex items-center gap-1 text-xs text-peach-deep"><X size={13} />Taken</span> : null}
        </div>
      </Label>
      <div className="mt-8 flex flex-wrap gap-2 text-sm text-ink-mute">
        <span>Ideas:</span>
        {["firstname", "firstname-lastname", "studio-name"].map((x) => <span key={x} className="rounded-full bg-white/60 px-3 py-1">{x}</span>)}
      </div>
    </div>
  );
}

function BasicsStep({ d, set, errs }: any) {
  const toggle = (l: string) => set({ languages: d.languages.includes(l) ? d.languages.filter((x: string) => x !== l) : [...d.languages, l] });
  return (
    <div>
      <Head k="Persona" t="Tell Twyn who you are" d="These basics shape how your Twyn introduces you and how it sounds." />
      <div className="grid gap-5 md:grid-cols-2">
        <Label t="Name" err={errs.name}><input className={input} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Hardik Gupta" /></Label>
        <Label t="Role" err={errs.headline}><input className={input} value={d.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="Full-stack and AI engineer" /></Label>
      </div>
      <div className="mt-5"><Label t="Bio" hint={`${d.bio.length} characters`} err={errs.bio}>
        <textarea rows={4} className={input + " resize-none"} value={d.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="What you do, who you work with, and what people usually reach out about." />
      </Label></div>
      <div className="mt-6"><Label t="Tone"><div className="flex flex-wrap gap-2">{TONES.map((t) => <Chip key={t} on={d.tone === t} onClick={() => set({ tone: t })}>{t}</Chip>)}</div></Label></div>
      <div className="mt-6"><Label t="Languages it can speak" err={errs.languages}><div className="flex flex-wrap gap-2">{LANGS.map(([k, v]) => <Chip key={k} on={d.languages.includes(k)} onClick={() => toggle(k)}>{v}</Chip>)}</div></Label></div>
    </div>
  );
}

function KnowledgeStep({ d, set, errs }: any) {
  const [docs, setDocs] = useState<{ name: string; chunks: number }[]>([]);
  const [up, setUp] = useState(false);
  useEffect(() => { if (d.id) api(`/api/personas/${d.id}/docs`).then(setDocs).catch(() => {}); }, [d.id]);
  async function upload(f: File) {
    setUp(true); const fd = new FormData(); fd.append("file", f);
    try { const r = await api(`/api/personas/${d.id}/docs`, { method: "POST", body: fd }); setDocs((x) => [...x.filter((y) => y.name !== r.name), r]); } finally { setUp(false); }
  }
  const upd = (k: "faqs" | "links", i: number, p: any) => set({ [k]: d[k].map((x: any, j: number) => (j === i ? { ...x, ...p } : x)) });
  const del = (k: "faqs" | "links", i: number) => set({ [k]: d[k].filter((_: any, j: number) => j !== i) });
  return (
    <div>
      <Head k="Knowledge" t="What should it know?" d="Twyn only answers from what you add here. Anything else, it will say it does not know." />
      <Label t="Rates and pricing" hint="optional"><input className={input} value={d.rates} onChange={(e) => set({ rates: e.target.value })} placeholder="MVP builds from 25,000 rupees per week. Discovery calls are free." /></Label>

      <div className="mt-7 flex items-center justify-between"><span className="text-sm font-medium">FAQs</span>
        <button onClick={() => set({ faqs: [...d.faqs, { q: "", a: "" }] })} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><Plus size={14} />Add</button></div>
      <div className="mt-2 space-y-2.5">
        {d.faqs.length === 0 && <p className="rounded-2xl border border-dashed border-ink/10 px-4 py-4 text-sm text-ink-mute">Add the questions people ask you most often.</p>}
        {d.faqs.map((f: any, i: number) => (
          <div key={i} className="glass flex gap-3 p-3" style={{ borderRadius: 18 }}>
            <div className="flex-1 space-y-2">
              <input className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-ink-mute/70" placeholder="Question" value={f.q} onChange={(e) => upd("faqs", i, { q: e.target.value })} />
              <input className="w-full bg-transparent text-sm text-ink-soft outline-none placeholder:text-ink-mute/70" placeholder="Answer" value={f.a} onChange={(e) => upd("faqs", i, { a: e.target.value })} />
            </div>
            <button onClick={() => del("faqs", i)} className="self-start p-1 text-ink-mute hover:text-ink" aria-label="Remove"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between"><span className="text-sm font-medium">Links</span>
        <button onClick={() => set({ links: [...d.links, { label: "", url: "" }] })} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><Plus size={14} />Add</button></div>
      <div className="mt-2 space-y-2.5">
        {d.links.map((l: any, i: number) => (
          <div key={i}>
            <div className="clay-pressed flex items-center gap-3 px-4 py-2.5">
              <Link2 size={15} className="text-ink-mute" />
              <input className="w-28 bg-transparent text-sm font-medium outline-none placeholder:text-ink-mute/70" placeholder="Label" value={l.label} onChange={(e) => upd("links", i, { label: e.target.value })} />
              <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-mute/70" placeholder="https://" value={l.url} onChange={(e) => upd("links", i, { url: e.target.value })} />
              <button onClick={() => del("links", i)} className="text-ink-mute hover:text-ink" aria-label="Remove"><Trash2 size={15} /></button>
            </div>
            {errs["link" + i] && <p className="mt-1 text-xs text-peach-deep">{errs["link" + i]}</p>}
          </div>
        ))}
      </div>

      <div className="mt-7"><span className="text-sm font-medium">Documents</span>
        <label className="mt-2 flex cursor-pointer items-center gap-4 rounded-[20px] border border-dashed border-ink/15 bg-white/40 px-5 py-5 hover:bg-white/70">
          <span className="clay-sm grid h-10 w-10 place-items-center bg-sky">{up ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}</span>
          <div><p className="text-sm font-medium">Upload a PDF or text file</p><p className="text-xs text-ink-mute">Resume, portfolio, service menu, case studies</p></div>
          <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">{docs.map((x) => <span key={x.name} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs"><FileText size={12} />{x.name} · {x.chunks} chunks</span>)}</div>
      </div>
    </div>
  );
}

function VoiceStep({ d, set }: any) {
  const [rec, setRec] = useState(false); const [secs, setSecs] = useState(0); const [level, setLevel] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(""); const [pBusy, setPBusy] = useState(false);
  const mr = useRef<MediaRecorder | null>(null); const timer = useRef<any>(null);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ""), [blob]);
  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext(); const an = ctx.createAnalyser(); ctx.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.fftSize);
    const parts: Blob[] = []; const m = new MediaRecorder(stream); mr.current = m;
    m.ondataavailable = (e) => parts.push(e.data);
    m.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); ctx.close(); clearInterval(timer.current); setLevel(0); setBlob(await encodeWav(new Blob(parts))); };
    m.start(); setRec(true); setSecs(0); const t0 = Date.now();
    timer.current = setInterval(() => { an.getByteTimeDomainData(buf); let s = 0; buf.forEach((v) => (s += Math.abs(v - 128))); setLevel(Math.min(1, s / buf.length / 30)); const el = (Date.now() - t0) / 1000; setSecs(el); if (el >= 30) stop(); }, 80);
  }
  function stop() { mr.current?.state === "recording" && mr.current.stop(); setRec(false); }
  async function save(b: Blob, name = "sample.wav") {
    setBusy(true); setMsg(""); const fd = new FormData(); fd.append("file", b, name);
    try { const r = await api(`/api/personas/${d.id}/voice`, { method: "POST", body: fd }); set({ has_voice: true }); setPreview("");
      setMsg(r.mock ? "Saved. Cloning runs when a Gnani key is added." : `Voice cloned from a ${Math.round(r.seconds || 0)}s sample with Gnani Timbre.`); }
    catch (e: any) { setMsg(String(e?.message || "").includes("5 to 30") ? "Use a clip between 5 and 30 seconds." : "Cloning failed. Try a cleaner 10 to 30 second clip."); } finally { setBusy(false); }
  }
  async function listen() {
    setPBusy(true);
    try {
      const r = await fetch(`${API}/api/personas/${d.id}/voice/preview`, { method: "POST", headers: token() ? { Authorization: `Bearer ${token()}` } : {} });
      if (!r.ok) throw 0; const u = URL.createObjectURL(await r.blob()); setPreview(u);
      setTimeout(() => (document.getElementById("clone-preview") as HTMLAudioElement | null)?.play().catch(() => {}), 50);
    } catch { setMsg("Preview failed. Try again in a moment."); } finally { setPBusy(false); }
  }
  return (
    <div>
      <Head k="Voice" t="Teach it your voice" d="Read anything out loud for 10 to 30 seconds in a quiet room. Twyn uses this sample to speak like you." />
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="grid place-items-center"><Orb size={130} state={rec ? "listening" : busy ? "thinking" : "idle"} level={level} /></div>
        <div>
          <div className="glass p-5 text-sm leading-relaxed text-ink-soft" style={{ borderRadius: 20 }}>
            "Hi, this is {d.name || "me"}. Thanks for reaching out. I work as a {(d.headline || "freelancer").toLowerCase()}, and I am happy to help you figure out if we are a good fit. Tell me what you are working on."
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!rec ? <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas"><Mic size={15} />{blob ? "Record again" : "Start recording"}</button>
              : <button onClick={stop} className="inline-flex items-center gap-2 rounded-2xl bg-peach px-5 py-3 text-sm font-medium"><Square size={13} />Stop · {secs.toFixed(0)}s</button>}
            <label className="clay-sm inline-flex cursor-pointer items-center gap-2 bg-white px-4 py-3 text-sm"><Upload size={15} />Upload audio
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBlob(f); } }} /></label>
          </div>
          {blob && !rec && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <audio src={url} controls className="h-10" />
              <button onClick={() => save(blob)} disabled={busy} className="clay-sm inline-flex items-center gap-2 bg-lilac px-4 py-2.5 text-sm font-medium">{busy && <Loader2 size={14} className="animate-spin" />}Use this sample</button>
            </div>
          )}
          {(msg || d.has_voice) && <p className="mt-3 flex items-center gap-1.5 text-sm text-mint-deep"><Check size={14} />{msg || "A voice sample is saved."}</p>}
          {d.has_voice && !rec && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={listen} disabled={pBusy} className="clay-sm inline-flex items-center gap-2 bg-mint px-4 py-2.5 text-sm font-medium">{pBusy ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={15} />}Hear my Twyn voice</button>
              {preview && <audio id="clone-preview" src={preview} controls className="h-10" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarStep({ me }: any) {
  const on = !!me?.google_tokens;
  return (
    <div>
      <Head k="Calendar" t="Connect Google Calendar" d="Twyn checks when you are free and books meetings straight into your calendar. It never sees event details, only busy times." />
      <div className="glass flex flex-wrap items-center gap-5 p-6">
        <span className="clay-sm grid h-12 w-12 place-items-center bg-white"><CalendarDays size={20} className="text-sky-deep" /></span>
        <div className="flex-1"><p className="font-medium">Google Calendar</p><p className="text-sm text-ink-soft">{on ? `Connected as ${me.email}` : "Free/busy and event creation only"}</p></div>
        {on ? <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-sm font-medium"><Check size={14} />Connected</span>
          : <a href={`${API}/api/auth/google/start`} className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas">Connect</a>}
      </div>
      {!on && <p className="mt-4 text-sm text-ink-mute">Skip this and Twyn will offer slots from your availability rules, then email you each booking to confirm.</p>}
    </div>
  );
}

function AvailabilityStep({ d, set, errs }: any) {
  const a = d.availability; const up = (p: any) => set({ availability: { ...a, ...p } });
  const sel = "clay-pressed rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none";
  return (
    <div>
      <Head k="Availability" t="When can people book you?" d="Twyn only offers times inside these rules, and skips anything already on your calendar." />
      <Label t="Days" err={errs.avail}><div className="flex flex-wrap gap-2">{DAYS.map((x, i) => <Chip key={x} on={a.days.includes(i)} onClick={() => up({ days: a.days.includes(i) ? a.days.filter((y: number) => y !== i) : [...a.days, i].sort() })}>{x}</Chip>)}</div></Label>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Label t="Hours"><div className="flex items-center gap-2"><input type="time" className={sel} value={a.start} onChange={(e) => up({ start: e.target.value })} /><span className="text-ink-mute">to</span><input type="time" className={sel} value={a.end} onChange={(e) => up({ end: e.target.value })} /><span className="text-xs text-ink-mute">IST</span></div></Label>
        <Label t="Meeting length"><div className="flex gap-2">{[15, 30, 45, 60].map((m) => <Chip key={m} on={a.duration === m} onClick={() => up({ duration: m })}>{m} min</Chip>)}</div></Label>
        <Label t="Buffer between meetings"><select className={sel} value={a.buffer} onChange={(e) => up({ buffer: +e.target.value })}>{[0, 10, 15, 30].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></Label>
        <Label t="Minimum notice"><select className={sel} value={a.notice} onChange={(e) => up({ notice: +e.target.value })}>{[2, 12, 24, 48].map((m) => <option key={m} value={m}>{m} hours</option>)}</select></Label>
      </div>
    </div>
  );
}

function PublishStep({ d, publish, saving }: any) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/p/${d.handle}` : `/p/${d.handle}`;
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const a = d.availability;
  const rows: [string, string][] = [
    ["Persona", `${d.name} · ${d.headline}`], ["Tone", d.tone],
    ["Languages", d.languages.map((l: string) => LANGS.find((x) => x[0] === l)?.[1] || l).join(", ")],
    ["Knowledge", `${d.faqs.length} FAQ${d.faqs.length === 1 ? "" : "s"} · ${d.links.length} link${d.links.length === 1 ? "" : "s"}${d.rates ? " · rates" : ""}`],
    ["Voice", d.has_voice ? "Your cloned voice" : "Default voice (add yours later)"],
    ["Availability", `${a.days.map((i: number) => DAYS[i]).join(", ")} · ${a.start} to ${a.end} IST · ${a.duration} min`],
  ];
  return (
    <div>
      {!d.published ? (<>
        <Head k="Review" t="Ready to go live" d="Check the details below. You can change any of them later in the Studio." />
        <dl className="divide-y divide-ink/5">{rows.map(([k, v]) => <div key={k} className="flex gap-6 py-3 text-sm"><dt className="w-28 shrink-0 text-ink-mute">{k}</dt><dd className="text-ink">{v}</dd></div>)}</dl>
        <motion.button whileTap={{ scale: 0.97 }} onClick={publish} disabled={saving} className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-canvas">{saving && <Loader2 size={15} className="animate-spin" />}Publish my Twyn</motion.button>
      </>) : (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="mx-auto grid place-items-center"><Orb size={110} state="speaking" level={0.3} /></div>
          <h1 className="display text-5xl">Your Twyn is live.</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">Share this link anywhere. Conversations, leads and bookings show up in your dashboard.</p>
          <div className="clay-pressed mx-auto mt-7 flex max-w-md items-center gap-2 py-2 pl-4 pr-2">
            <span className="flex-1 truncate text-left text-sm font-medium">{link.replace(/^https?:\/\//, "")}</span>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm text-canvas">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/p/${d.handle}`} className="clay-sm inline-flex items-center gap-1.5 bg-white px-4 py-2.5 text-sm"><ExternalLink size={14} />Open page</Link>
            <Link href="/dashboard" className="clay-sm inline-flex items-center gap-1.5 bg-lilac px-4 py-2.5 text-sm font-medium">Go to dashboard</Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
