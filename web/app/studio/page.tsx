"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Upload, Mic, FileText, CalendarCheck, Check, Copy } from "lucide-react";
import { api, API, Persona, ACCENTS } from "@/lib/api";
import { useOwner } from "@/lib/useOwner";
import { Backdrop, Button, Card, Field, Pill } from "@/components/ui";
import { AppNav } from "@/components/AppNav";

const blank = { handle: "", name: "", headline: "", bio: "", rates: "", faqs: [{ q: "", a: "" }], links: [{ label: "", url: "" }], tone: "warm, concise, professional", accent: "lilac" };

export default function Studio() {
  const { me, personas, reload } = useOwner();
  const [f, setF] = useState<any>(blank);
  const [saved, setSaved] = useState("");
  const [docs, setDocs] = useState<{ name: string; chunks: number }[]>([]);
  const [msg, setMsg] = useState("");
  const p: Persona | undefined = personas[0];

  useEffect(() => { if (p) { setF({ ...p, faqs: p.faqs.length ? p.faqs : blank.faqs, links: p.links.length ? p.links : blank.links }); api(`/api/personas/${p.id}/docs`).then(setDocs); } }, [p]);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));

  async function save() {
    const body = JSON.stringify({ ...f, faqs: f.faqs.filter((x: any) => x.q), links: f.links.filter((x: any) => x.url) });
    try { p ? await api(`/api/personas/${p.id}`, { method: "PUT", body }) : await api("/api/personas", { method: "POST", body });
      await reload(); setSaved("Saved"); setTimeout(() => setSaved(""), 1800); } catch (e: any) { setMsg(e.message); }
  }
  async function upload(kind: "docs" | "voice", file?: File) {
    if (!file || !p) return; const fd = new FormData(); fd.append("file", file);
    try { const d = await api(`/api/personas/${p.id}/${kind}`, { method: "POST", body: fd });
      setMsg(kind === "docs" ? `Indexed ${d.chunks} chunks from ${d.name}` : d.mock ? "Voice sample saved. Cloning runs once the Gnani key is set." : "Voice cloned with Gnani.");
      kind === "docs" ? setDocs(await api(`/api/personas/${p.id}/docs`)) : reload(); } catch (e: any) { setMsg(e.message); }
  }
  const link = p ? `${typeof window !== "undefined" ? location.origin : ""}/p/${p.handle}` : "";

  return (
    <main className="relative min-h-screen pb-24">
      <Backdrop />
      <AppNav handle={p?.handle} />
      <div className="mx-auto mt-10 w-[min(1180px,calc(100%-2rem))]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><div className="text-sm text-ink-mute">Persona studio</div><h1 className="text-4xl font-semibold tracking-[-0.03em]">{p ? `Tune ${p.name.split(" ")[0]}'s Proxy` : "Create your Proxy"}</h1></div>
          <div className="flex items-center gap-3">{saved && <Pill tone="mint"><Check size={12} />{saved}</Pill>}<Button onClick={save}>{p ? "Save changes" : "Create persona"}</Button></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card>
              <h2 className="mb-5 text-lg font-semibold">Identity</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Display name"><input className="field clay-pressed" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Hardik Gupta" /></Field>
                <Field label="Handle" hint="proxy.app/handle"><input className="field clay-pressed" disabled={!!p} value={f.handle} onChange={(e) => set("handle", e.target.value)} placeholder="hardik" /></Field>
                <div className="md:col-span-2"><Field label="Headline"><input className="field clay-pressed" value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Full-stack and AI engineer" /></Field></div>
                <div className="md:col-span-2"><Field label="Bio" hint="Proxy speaks from this"><textarea rows={4} className="field clay-pressed resize-none" value={f.bio} onChange={(e) => set("bio", e.target.value)} /></Field></div>
                <Field label="Rates"><textarea rows={3} className="field clay-pressed resize-none" value={f.rates} onChange={(e) => set("rates", e.target.value)} /></Field>
                <Field label="Tone of voice"><textarea rows={3} className="field clay-pressed resize-none" value={f.tone} onChange={(e) => set("tone", e.target.value)} /></Field>
              </div>
              <div className="mt-5"><div className="mb-2 text-sm font-medium">Accent</div>
                <div className="flex gap-3">{Object.entries(ACCENTS).map(([k, c]) => <button key={k} onClick={() => set("accent", k)} className="clay-sm h-10 w-10 rounded-full" style={{ background: c.soft, outline: f.accent === k ? `2px solid ${c.deep}` : "none", outlineOffset: 3, borderRadius: 999 }} />)}</div></div>
            </Card>
            <Card>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">FAQs</h2><Button variant="clay" onClick={() => set("faqs", [...f.faqs, { q: "", a: "" }])}><Plus size={15} />Add</Button></div>
              <div className="space-y-3">{f.faqs.map((x: any, i: number) => (
                <motion.div layout key={i} className="clay-pressed grid gap-2 p-3 md:grid-cols-[1fr_1.4fr_auto]">
                  <input className="field bg-transparent" placeholder="Question" value={x.q} onChange={(e) => set("faqs", f.faqs.map((y: any, j: number) => j === i ? { ...y, q: e.target.value } : y))} />
                  <input className="field bg-transparent" placeholder="Answer" value={x.a} onChange={(e) => set("faqs", f.faqs.map((y: any, j: number) => j === i ? { ...y, a: e.target.value } : y))} />
                  <button className="px-3 text-ink-mute hover:text-ink" onClick={() => set("faqs", f.faqs.filter((_: any, j: number) => j !== i))}><Trash2 size={16} /></button>
                </motion.div>))}</div>
            </Card>
            <Card>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Links</h2><Button variant="clay" onClick={() => set("links", [...f.links, { label: "", url: "" }])}><Plus size={15} />Add</Button></div>
              <div className="space-y-3">{f.links.map((x: any, i: number) => (
                <div key={i} className="clay-pressed grid gap-2 p-3 md:grid-cols-[1fr_2fr]">
                  <input className="field bg-transparent" placeholder="Label" value={x.label} onChange={(e) => set("links", f.links.map((y: any, j: number) => j === i ? { ...y, label: e.target.value } : y))} />
                  <input className="field bg-transparent" placeholder="https://" value={x.url} onChange={(e) => set("links", f.links.map((y: any, j: number) => j === i ? { ...y, url: e.target.value } : y))} />
                </div>))}</div>
            </Card>
          </div>
          <div className="space-y-6">
            {p && <Card glass><div className="text-sm font-medium">Your share link</div>
              <div className="clay-pressed mt-3 flex items-center justify-between gap-2 p-3 text-sm"><span className="truncate font-mono">{link.replace(/^https?:\/\//, "")}</span>
                <button onClick={() => navigator.clipboard.writeText(link)} className="text-ink-soft hover:text-ink"><Copy size={16} /></button></div></Card>}
            <Card>
              <div className="clay-sm mb-4 grid h-11 w-11 place-items-center bg-peach"><FileText size={18} /></div>
              <h3 className="font-semibold">Knowledge</h3><p className="mt-1 text-sm text-ink-soft">PDF, Markdown or text. Proxy only answers from what you add.</p>
              <label className={`clay-sm mt-4 flex cursor-pointer items-center justify-center gap-2 bg-[#f7f7fb] px-4 py-3 text-sm font-medium ${!p && "pointer-events-none opacity-50"}`}><Upload size={15} />Upload document<input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => upload("docs", e.target.files?.[0])} /></label>
              <div className="mt-3 space-y-2">{docs.map((d) => <div key={d.name} className="flex justify-between text-sm"><span className="truncate">{d.name}</span><span className="text-ink-mute">{d.chunks} chunks</span></div>)}</div>
            </Card>
            <Card>
              <div className="clay-sm mb-4 grid h-11 w-11 place-items-center bg-lilac"><Mic size={18} /></div>
              <h3 className="font-semibold">Voice clone</h3><p className="mt-1 text-sm text-ink-soft">5 to 30 seconds of clean speech. Gnani builds a speaker embedding from it.</p>
              <div className="mt-3">{p?.has_voice ? <Pill tone="mint"><Check size={12} />Voice sample on file</Pill> : <Pill tone="white">No voice yet</Pill>}</div>
              <label className={`clay-sm mt-4 flex cursor-pointer items-center justify-center gap-2 bg-[#f7f7fb] px-4 py-3 text-sm font-medium ${!p && "pointer-events-none opacity-50"}`}><Upload size={15} />Upload voice sample<input type="file" accept="audio/*" className="hidden" onChange={(e) => upload("voice", e.target.files?.[0])} /></label>
            </Card>
            <Card>
              <div className="clay-sm mb-4 grid h-11 w-11 place-items-center bg-sky"><CalendarCheck size={18} /></div>
              <h3 className="font-semibold">Google Calendar</h3><p className="mt-1 text-sm text-ink-soft">Free/busy and booking. Proxy only offers slots you are actually free.</p>
              <div className="mt-3">{me?.google_tokens ? <Pill tone="mint">Connected</Pill> : <Pill tone="butter">Demo calendar in use</Pill>}</div>
              <a href={`${API}/api/auth/google/start`} className="clay-sm mt-4 flex items-center justify-center bg-[#f7f7fb] px-4 py-3 text-sm font-medium">Connect Google Calendar</a>
            </Card>
            {msg && <p className="text-sm text-ink-soft">{msg}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
