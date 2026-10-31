"use client";
import Image from "next/image";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Copy, FileText, Link as Link2, CircleNotch as Loader2, Microphone as Mic, Plus, Stop as Square, Trash as Trash2, UploadSimple as Upload, X, ArrowSquareOut as ExternalLink, SpeakerHigh as Volume2 } from "@phosphor-icons/react";
import clsx from "clsx";
import { api, API, encodeWav, Persona, token } from "@/lib/api";
import { Logo, Backdrop } from "@/components/ui";
import { Orb } from "@/components/Orb";
import { VoiceCloner } from "@/components/VoiceCloner";
import { AiImport } from "@/components/AiImport";

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
      <div className="mb-1.5 flex items-baseline justify-between"><span className="text-[13px] font-medium">{t}</span>{hint && <span className="text-[11px] text-ink-mute">{hint}</span>}</div>
      {children}
      {err && <p className="mt-1.5 text-xs text-peach-deep">{err}</p>}
    </div>
  );
}

function Chip({ on, children, onClick }: any) {
  return (
    <button type="button" onClick={onClick}
      className={clsx("h-7 rounded-full px-3 text-[12.5px] transition-colors", on ? "bg-ink font-medium text-canvas" : "hairline bg-white/70 text-ink-soft hover:bg-white hover:text-ink")}>
      {children}
    </button>
  );
}

function Progress({ step, max, go }: { step: number; max: number; go: (i: number) => void }) {
  return (
    <div>
      <div className="h-1 overflow-hidden rounded-full bg-paper-3 md:hidden">
        <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <ol className="hidden space-y-0.5 md:block">
        {STEPS.map((s, i) => {
          const done = i < step || (i <= max && i !== step);
          return (
            <li key={s}>
              <button disabled={i > max} onClick={() => go(i)} className={clsx("flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] transition-colors", i === step ? "bg-white font-medium text-ink hairline" : i <= max ? "text-ink-soft hover:bg-white/60 hover:text-ink" : "text-ink-mute/60")}>
                <span className={clsx("grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] tnum", done ? "bg-mint text-mint-deep" : i === step ? "bg-ink text-canvas" : "hairline bg-white/60")}>
                  {done ? <Check size={10} weight="bold" /> : i + 1}
                </span>{s}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function OnboardingInner() {
  const r = useRouter();
  const sp = useSearchParams();
  const [me, setMe] = useState<any>(null);
  const [d, setD] = useState<Draft>(empty());
  const [step, setStep] = useState(0);
  const [max, setMax] = useState(0);
  const [dir, setDir] = useState(1);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [loaded, setLoaded] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  // Local-first: load from localStorage; if signed in, merge API persona
  useEffect(() => {
    const handleParam = sp.get("handle") || "";
    if (handleParam) localStorage.setItem("proxy_claim", handleParam);
    const claim = localStorage.getItem("proxy_claim") || handleParam;
    const local = JSON.parse(localStorage.getItem("proxy_draft") || "null");

    if (token()) {
      api("/api/me")
        .then((owner) => { setMe(owner); return api("/api/me/personas"); })
        .then((ps: any[]) => {
          if (ps[0]) {
            const p = ps[0];
            setD({ ...empty(), ...p, availability: { ...DEFAULT_AVAIL, ...(p.availability || {}) } });
            const s = Math.min(p.onboarding_step || 1, 6);
            setStep(p.published ? 6 : s); setMax(p.published ? 6 : s);
          } else if (local) {
            setD({ ...local, handle: claim || local.handle });
          } else {
            set({ handle: claim });
          }
        })
        .catch(() => {
          localStorage.removeItem("proxy_token");
          if (local) setD({ ...local, handle: claim || local.handle });
          else set({ handle: claim });
        })
        .finally(() => setLoaded(true));
    } else {
      if (local) setD({ ...local, handle: claim || local.handle });
      else set({ handle: claim });
      setLoaded(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist draft locally when there's no API id yet
  useEffect(() => { if (loaded && !d.id) localStorage.setItem("proxy_draft", JSON.stringify(d)); }, [d, loaded]);

  // Live handle availability check
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

  async function ensurePersona(): Promise<string | null> {
    if (d.id) return d.id;
    if (!token()) {
      try {
        const guestEmail = `creator_${Date.now()}@twyn.app`;
        const res = await api("/api/auth/dev", {
          method: "POST",
          body: JSON.stringify({ email: guestEmail, name: d.name || "Creator" }),
        });
        localStorage.setItem("proxy_token", res.token);
      } catch (err) {
        console.error("Session creation failed", err);
        return null;
      }
    }
    try {
      const handle = d.handle?.trim() || `user-${Math.random().toString(36).substring(2, 7)}`;
      const body = {
        ...d,
        handle,
        name: d.name?.trim() || "My Twyn",
        faqs: d.faqs.filter((f: any) => f.q.trim()),
        links: d.links.filter((l: any) => l.url.trim()),
        onboarding_step: step,
      };
      const p: any = await api("/api/personas", { method: "POST", body: JSON.stringify(body) });
      setD((prev) => ({ ...prev, ...p, availability: { ...DEFAULT_AVAIL, ...(p.availability || {}) } }));
      return p.id;
    } catch (err) {
      console.error("Persona creation failed", err);
      return null;
    }
  }

  async function persist(nextStep: number, extra: Partial<Draft> = {}) {
    setSaving(true);
    try {
      if (!token()) {
        const guestEmail = `creator_${Date.now()}@twyn.app`;
        const res = await api("/api/auth/dev", {
          method: "POST",
          body: JSON.stringify({ email: guestEmail, name: d.name || "Creator" }),
        });
        localStorage.setItem("proxy_token", res.token);
      }
      const body = {
        ...d,
        ...extra,
        faqs: d.faqs.filter((f) => f.q.trim()),
        links: d.links.filter((l) => l.url.trim()),
        onboarding_step: Math.max(nextStep, d.onboarding_step || 0),
      };
      const p: any = d.id
        ? await api(`/api/personas/${d.id}`, { method: "PUT", body: JSON.stringify(body) })
        : await api("/api/personas", { method: "POST", body: JSON.stringify(body) });
      setD((x) => ({ ...x, ...p, availability: { ...DEFAULT_AVAIL, ...(p.availability || {}) } }));
      localStorage.removeItem("proxy_draft");
      localStorage.removeItem("proxy_claim");
      setSaved("Saved");
      setTimeout(() => setSaved(""), 1600);
      return true;
    } catch (e: any) {
      setErrs({ handle: e.message.includes("taken") ? "That handle is taken." : "Could not save. Check the API is running." });
      return false;
    } finally {
      setSaving(false);
    }
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
    <KnowledgeStep key="k" d={d} set={set} errs={errs} ensurePersona={ensurePersona} />,
    <VoiceStep key="v" d={d} set={set} ensurePersona={ensurePersona} />,
    <CalendarStep key="c" me={me} />,
    <AvailabilityStep key="a" d={d} set={set} errs={errs} />,
    <PublishStep key="p" d={d} publish={() => persist(6, { published: true }).then(() => set({ published: true }))} saving={saving} />,
  ];

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <div className="sticky top-0 z-30 border-b border-rule bg-canvas/70 backdrop-blur-xl">
        <header className="mx-auto flex h-12 w-[min(1040px,calc(100%-2rem))] items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3 text-[12.5px] text-ink-mute">
            <AnimatePresence>{saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-mint-deep"><Check size={14} />{saved}</motion.span>}</AnimatePresence>
            <span>Step {step + 1} of {STEPS.length}</span>
            <Link href="/studio" className="rounded-full px-2.5 py-1 hover:text-ink">Exit</Link>
          </div>
        </header>
      </div>
      <div className="mx-auto grid w-[min(1040px,calc(100%-2rem))] gap-6 pb-16 pt-8 md:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-20 md:self-start"><p className="eyebrow mb-3 hidden px-2 md:block">Set up your Twyn</p><Progress step={step} max={max} go={go} /></aside>
        <div className="clay relative overflow-hidden p-6 md:p-8">
          {!loaded ? <div className="grid h-64 place-items-center text-ink-mute"><Loader2 className="animate-spin" /></div> : (
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={step} custom={dir}
                initial={{ opacity: 0, x: dir * 36 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -36 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                {views[step]}
              </motion.div>
            </AnimatePresence>
          )}
          {loaded && step < 6 && (
            <div className="mt-8 flex items-center justify-between border-t border-rule pt-5">
              <button onClick={back} disabled={step === 0} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-ink-soft hover:text-ink disabled:invisible"><ArrowLeft size={15} />Back</button>
              <div className="flex items-center gap-2">
                {[3, 4].includes(step) && <button onClick={next} className="rounded-xl h-9 px-4 text-[13.5px] text-ink-soft hover:text-ink">Skip for now</button>}
                <motion.button whileTap={{ scale: 0.97 }} onClick={next} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-ink h-9 px-4 text-[13.5px] font-medium text-canvas hover:bg-ink-soft disabled:opacity-60">
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
  return <div className="mb-6"><p className="eyebrow">{k}</p><h1 className="display mt-1.5 text-[26px]">{t}</h1><p className="mt-1 max-w-lg text-[13.5px] text-ink-soft">{d}</p></div>;
}

function HandleStep({ d, set, avail, errs }: any) {
  return (
    <div>
      <Head k="Your link" t="Claim your handle" d="This is the link people will use to talk to your Twyn. Keep it short and easy to say." />
      <Label t="Handle" err={errs.handle}>
        <div className="clay-pressed flex items-center px-4">
          <span className="text-ink-mute">twyn.ai/</span>
          <input autoFocus disabled={!!d.id} value={d.handle} onChange={(e) => set({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            placeholder="yourname" className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium outline-none placeholder:text-ink-mute/70" />
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

function KnowledgeStep({ d, set, errs, ensurePersona }: any) {
  const [docs, setDocs] = useState<{ name: string; chunks: number }[]>([]);
  const [up, setUp] = useState(false);
  const [docErr, setDocErr] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (d.id) api(`/api/personas/${d.id}/docs`).then(setDocs).catch(() => {});
  }, [d.id]);

  async function upload(f: File) {
    setDocErr("");
    const name = f.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".txt") && !name.endsWith(".md")) {
      setDocErr("Please upload a PDF or text file (.pdf, .txt, .md).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setDocErr("File too large (max 10 MB).");
      return;
    }

    setUp(true);
    try {
      let pid = d.id;
      if (!pid && ensurePersona) {
        pid = await ensurePersona();
      }
      if (!pid) {
        setDocErr("Please enter your handle in Step 1 before uploading documents.");
        return;
      }
      const fd = new FormData();
      fd.append("file", f);
      const r = await api(`/api/personas/${pid}/docs`, { method: "POST", body: fd });
      setDocs((x) => [...x.filter((y) => y.name !== r.name), r]);
    } catch (e: any) {
      setDocErr(e.message || "Failed to upload document.");
    } finally {
      setUp(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteDoc(name: string) {
    if (!d.id) return;
    try {
      await api(`/api/personas/${d.id}/docs/${encodeURIComponent(name)}`, { method: "DELETE" });
      setDocs((x) => x.filter((y) => y.name !== name));
    } catch (e: any) {
      setDocErr(e.message || "Could not delete document.");
    }
  }

  const upd = (k: "faqs" | "links", i: number, p: any) => set({ [k]: d[k].map((x: any, j: number) => (j === i ? { ...x, ...p } : x)) });
  const del = (k: "faqs" | "links", i: number) => set({ [k]: d[k].filter((_: any, j: number) => j !== i) });

  return (
    <div>
      <Head k="Knowledge" t="What should it know?" d="Twyn only answers from what you add here. Anything else, it will say it does not know." />
      <div className="glass mb-6 p-4" style={{ borderRadius: 18 }}>
        <AiImport pid={d.id} compact onApplied={(p, o) => set({ ...(o.bio ? { bio: p.bio } : {}), ...(o.tone ? { tone: p.tone } : {}), faqs: [...d.faqs.filter((f: any) => f.q.trim()), ...p.faqs] })} />
      </div>
      <Label t="Rates and pricing" hint="optional"><input className={input} value={d.rates} onChange={(e) => set({ rates: e.target.value })} placeholder="MVP builds from 25,000 rupees per week. Discovery calls are free." /></Label>

      <div className="mt-7 flex items-center justify-between"><span className="text-sm font-medium">FAQs</span>
        <button type="button" onClick={() => set({ faqs: [...d.faqs, { q: "", a: "" }] })} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><Plus size={14} />Add</button></div>
      <div className="mt-2 space-y-2.5">
        {d.faqs.length === 0 && <p className="rounded-2xl border border-dashed border-ink/10 px-4 py-4 text-sm text-ink-mute">Add the questions people ask you most often.</p>}
        {d.faqs.map((f: any, i: number) => (
          <div key={i} className="glass flex gap-3 p-3" style={{ borderRadius: 18 }}>
            <div className="flex-1 space-y-2">
              <input className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-ink-mute/70" placeholder="Question" value={f.q} onChange={(e) => upd("faqs", i, { q: e.target.value })} />
              <input className="w-full bg-transparent text-sm text-ink-soft outline-none placeholder:text-ink-mute/70" placeholder="Answer" value={f.a} onChange={(e) => upd("faqs", i, { a: e.target.value })} />
            </div>
            <button type="button" onClick={() => del("faqs", i)} className="self-start p-1 text-ink-mute hover:text-ink" aria-label="Remove"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between"><span className="text-sm font-medium">Links</span>
        <button type="button" onClick={() => set({ links: [...d.links, { label: "", url: "" }] })} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><Plus size={14} />Add</button></div>
      <div className="mt-2 space-y-2.5">
        {d.links.map((l: any, i: number) => (
          <div key={i}>
            <div className="clay-pressed flex items-center gap-3 px-4 py-2.5">
              <Link2 size={15} className="text-ink-mute" />
              <input className="w-28 bg-transparent text-sm font-medium outline-none placeholder:text-ink-mute/70" placeholder="Label" value={l.label} onChange={(e) => upd("links", i, { label: e.target.value })} />
              <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-mute/70" placeholder="https://" value={l.url} onChange={(e) => upd("links", i, { url: e.target.value })} />
              <button type="button" onClick={() => del("links", i)} className="text-ink-mute hover:text-ink" aria-label="Remove"><Trash2 size={15} /></button>
            </div>
            {errs["link" + i] && <p className="mt-1 text-xs text-peach-deep">{errs["link" + i]}</p>}
          </div>
        ))}
      </div>

      <div className="mt-7">
        <span className="text-sm font-medium">Documents</span>
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0]);
          }}
          className={`mt-2 flex cursor-pointer items-center gap-4 rounded-[20px] border border-dashed px-5 py-5 transition-colors ${
            dragging ? "border-ink bg-white/80" : "border-ink/15 bg-white/40 hover:bg-white/70"
          }`}
        >
          <span className="clay-sm grid h-10 w-10 place-items-center bg-sky">
            {up ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
          </span>
          <div>
            <p className="text-sm font-medium">{up ? "Uploading and indexing..." : "Upload or drop a PDF or text file"}</p>
            <p className="text-xs text-ink-mute">Resume, portfolio, service menu, case studies (PDF, TXT, MD)</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
        {docErr && <p className="mt-2 text-xs text-peach-deep">{docErr}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {docs.map((x) => (
            <span key={x.name} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs">
              <FileText size={12} />
              {x.name} · {x.chunks} chunk{x.chunks === 1 ? "" : "s"}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); deleteDoc(x.name); }}
                className="ml-1 text-ink-mute hover:text-ink"
                aria-label={`Remove ${x.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function VoiceStep({ d, set, ensurePersona }: any) {
  return (
    <div>
      <Head k="Voice" t="Teach it your voice" d="Read the script below out loud for 15 to 30 seconds in a quiet room, or upload a clip. Twyn uses it to speak like you." />
      <VoiceCloner d={d} set={set} ensurePersona={ensurePersona} />
    </div>
  );
}

function CalendarStep({ me }: any) {
  const on = !!me?.google_tokens;
  return (
    <div>
      <Head k="Calendar" t="Connect Google Calendar" d="Twyn checks when you are free and books meetings straight into your calendar. It never sees event details, only busy times." />
      <div className="glass flex flex-wrap items-center gap-5 p-6">
        <span className="clay-sm grid h-12 w-12 place-items-center bg-white"><Image src="/brands/google-calendar.svg" alt="Google Calendar" width={22} height={22} /></span>
        <div className="flex-1"><p className="font-medium">Google Calendar</p><p className="text-sm text-ink-soft">{on ? `Connected as ${me.email}` : "Free/busy and event creation only"}</p></div>
        {on ? <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-sm font-medium"><Check size={14} />Connected</span>
          : <a href={`${API}/api/auth/google/login?next=%2Fonboarding`} className="rounded-full bg-ink h-9 px-4 text-[13.5px] font-medium text-canvas inline-flex items-center">Connect</a>}
      </div>
      {!on && <p className="mt-4 text-sm text-ink-mute">Skip this and Twyn will offer slots from your availability rules, then email you each booking to confirm.</p>}
    </div>
  );
}

function AvailabilityStep({ d, set, errs }: any) {
  const a = d.availability; const up = (p: any) => set({ availability: { ...a, ...p } });
  const sel = "clay-pressed rounded-lg bg-white h-9 px-2.5 text-[13px] outline-none";
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

function PublishStep({ d, publish, saving, onEmailAuth }: any) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/p/${d.handle}` : `/p/${d.handle}`;
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");

  const copy = () => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const a = d.availability;
  const rows: [string, string][] = [
    ["Persona", `${d.name} · ${d.headline}`], ["Tone", d.tone],
    ["Languages", d.languages.map((l: string) => LANGS.find((x) => x[0] === l)?.[1] || l).join(", ")],
    ["Knowledge", `${d.faqs.length} FAQ${d.faqs.length === 1 ? "" : "s"} · ${d.links.length} link${d.links.length === 1 ? "" : "s"}${d.rates ? " · rates" : ""}`],
    ["Voice", d.has_voice ? "Your cloned voice" : "Default voice (add yours later)"],
    ["Availability", `${a.days.map((i: number) => DAYS[i]).join(", ")} · ${a.start} to ${a.end} IST · ${a.duration} min`],
  ];

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setAuthBusy(true);
    setAuthErr("");
    try {
      const res = await api("/api/auth/dev", {
        method: "POST",
        body: JSON.stringify({ email: emailInput.trim(), name: d.name || emailInput.split("@")[0] }),
      });
      localStorage.setItem("proxy_token", res.token);
      await publish();
    } catch (err: any) {
      setAuthErr(err.message || "Sign-in failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  // Sign-in prompt when not authenticated
  if (!token() && !d.published) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Head k="Almost there" t="Create your account to go live" d="Sign in to publish your Twyn. Your draft is ready to be published immediately." />
        <div className="glass mt-6 p-6 text-left">
          <a
            href={`${API}/api/auth/google/login?next=%2Fonboarding`}
            className="clay-sm flex h-10 w-full items-center justify-center gap-2.5 bg-white text-[13.5px] font-medium hover:bg-canvas transition-colors"
          >
            <Image src="/brands/google.svg" alt="" width={15} height={15} />
            Continue with Google
          </a>

          <div className="my-4 flex items-center gap-3 text-[11px] text-ink-mute">
            <span className="h-px flex-1 bg-rule" />
            or continue with email
            <span className="h-px flex-1 bg-rule" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="block text-[12px] font-medium text-ink-mute mb-1">Your email</label>
              <input
                id="auth-email"
                type="email"
                required
                className="field clay-pressed"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={authBusy}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13.5px] font-medium text-canvas hover:bg-ink-soft disabled:opacity-60 transition-colors"
            >
              {authBusy ? <Loader2 size={15} className="animate-spin" /> : null}
              Publish as twyn.ai/{d.handle}
            </button>
            {authErr && <p className="text-[12px] text-peach-deep text-center">{authErr}</p>}
          </form>
        </div>
      </div>
    );
  }

  const initials = d.name ? d.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "TW";

  return (
    <div>
      {!d.published ? (<>
        <Head k="Review" t="Ready to go live" d="Check the details below. You can change any of them later in the Studio." />
        <dl className="divide-y divide-ink/5">{rows.map(([k, v]) => <div key={k} className="flex gap-6 py-3 text-sm"><dt className="w-28 shrink-0 text-ink-mute">{k}</dt><dd className="text-ink">{v}</dd></div>)}</dl>
        <motion.button whileTap={{ scale: 0.97 }} onClick={publish} disabled={saving} className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink h-9 px-5 text-[13.5px] font-medium text-canvas">{saving && <Loader2 size={15} className="animate-spin" />}Publish my Twyn</motion.button>
      </>) : (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="mx-auto grid place-items-center"><Orb size={84} state="speaking" level={0.3} initials={initials} /></div>
          <h1 className="display text-[32px] mt-2">Your Twyn is live.</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">Share this link anywhere. Conversations, leads and bookings show up in your dashboard.</p>
          <div className="clay-pressed mx-auto mt-7 flex max-w-md items-center gap-2 py-2 pl-4 pr-2">
            <span className="flex-1 truncate text-left text-sm font-medium">{link.replace(/^https?:\/\//, "")}</span>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm text-canvas">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/p/${d.handle}`} className="clay-sm inline-flex items-center gap-1.5 bg-white h-9 px-4 text-[13.5px]"><ExternalLink size={14} />Open page</Link>
            <Link href="/studio" className="clay-sm inline-flex items-center gap-1.5 bg-lilac h-9 px-4 text-[13.5px] font-medium">Go to studio</Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function Page() { return <Suspense><OnboardingInner /></Suspense>; }
