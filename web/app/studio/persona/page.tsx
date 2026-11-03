"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash, UploadSimple, FileText, CircleNotch } from "@phosphor-icons/react";
import { api, ACCENTS } from "@/lib/api";
import { Card, Field } from "@/components/ui";
import { AiImport } from "@/components/AiImport";
import { useStudio, useUnsavedGuard, savePersona, Page, Empty } from "../ctx";

const pick = (p: any) => ({ name: p.name, headline: p.headline || "", bio: p.bio || "", rates: p.rates || "", tone: p.tone || "", accent: p.accent || "lilac",
  faqs: p.faqs?.length ? p.faqs : [], links: p.links?.length ? p.links : [] });

export default function PersonaPage() {
  const { persona: p, reload, toast } = useStudio();
  const [f, setF] = useState<any>(pick(p));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<any[] | null>(null);
  const [up, setUp] = useState(false);
  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(pick(p)), [f, p]);
  useUnsavedGuard(dirty);
  const loadDocs = () => api(`/api/personas/${p.id}/docs`).then(setDocs).catch(() => setDocs([]));
  useEffect(() => { loadDocs(); }, [p.id]); // eslint-disable-line
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));

  function validate() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Add your name.";
    if (f.bio.trim().length < 20) e.bio = "Write at least a sentence or two.";
    f.links.forEach((l: any, i: number) => { if (l.url && !/^https?:\/\/\S+\.\S+/.test(l.url)) e["link" + i] = "Use a full link starting with https://"; });
    setErrs(e); return !Object.keys(e).length;
  }
  async function save() {
    if (!validate()) { toast("Fix the highlighted fields", "err"); return; }
    setSaving(true);
    try { await savePersona(p, f); await reload(); toast("Saved"); } catch (e: any) { toast(e.message || "Save failed", "err"); } finally { setSaving(false); }
  }
  async function upload(file?: File) {
    if (!file) return; if (file.size > 10 * 1024 * 1024) { toast("Max 10 MB", "err"); return; }
    setUp(true); const fd = new FormData(); fd.append("file", file);
    try { const r = await api(`/api/personas/${p.id}/docs`, { method: "POST", body: fd }); toast(`Indexed ${r.chunks} chunks from ${r.name}`); loadDocs(); } catch (e: any) { toast(e.message, "err"); } finally { setUp(false); }
  }
  async function delDoc(name: string) { if (!confirm(`Remove ${name} from knowledge?`)) return; await api(`/api/personas/${p.id}/docs/${encodeURIComponent(name)}`, { method: "DELETE" }); toast("Removed"); loadDocs(); }
  const err = (k: string) => errs[k] && <p className="mt-1 text-[12px] text-peach-deep">{errs[k]}</p>;
  const row = (k: "faqs" | "links", i: number, patch: any) => set(k, f[k].map((x: any, j: number) => (j === i ? { ...x, ...patch } : x)));

  return (
    <Page title="Persona" sub="Who your Twyn is and what it knows."
      actions={<>{dirty && <span className="text-[12px] text-ink-mute">Unsaved changes</span>}
        {dirty && <button onClick={() => { setF(pick(p)); setErrs({}); }} className="h-8 rounded-full px-3 text-[13px] text-ink-soft hover:text-ink">Discard</button>}
        <button onClick={save} disabled={!dirty || saving} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-medium text-canvas disabled:opacity-40">{saving && <CircleNotch size={13} className="animate-spin" />}Save</button></>}>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 border-b border-rule pb-3"><h2 className="text-[15px] font-medium">Profile details</h2><p className="mt-0.5 text-[12.5px] text-ink-soft">The information visitors see on your public page.</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Field label="Display name"><input className="field clay-pressed" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>{err("name")}</div>
              <Field label="Headline"><input className="field clay-pressed" value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Full-stack and AI engineer" /></Field>
              <div className="md:col-span-2"><Field label="Bio" hint={`${f.bio.length} characters`}><textarea rows={5} className="field clay-pressed resize-y" value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell visitors what you do and how you can help." /></Field>{err("bio")}</div>
              <Field label="Rates" hint="Optional"><textarea rows={3} className="field clay-pressed resize-y" value={f.rates} onChange={(e) => set("rates", e.target.value)} placeholder="Share a starting rate or how you price projects." /></Field>
              <Field label="Conversation style"><textarea rows={3} className="field clay-pressed resize-y" value={f.tone} onChange={(e) => set("tone", e.target.value)} placeholder="Warm, direct, and concise." /></Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 text-[13px] font-medium">Page accent</span>
              {Object.entries(ACCENTS).map(([k, c]) => <button key={k} aria-label={k} onClick={() => set("accent", k)} className="h-6 w-6 rounded-full" style={{ background: c.soft, outline: f.accent === k ? `2px solid ${c.deep}` : "none", outlineOffset: 2 }} />)}</div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-medium">Frequently asked questions</h2><p className="mt-0.5 text-[12.5px] text-ink-soft">Give your Twyn a few accurate answers to start with.</p></div><button onClick={() => set("faqs", [...f.faqs, { q: "", a: "" }])} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-rule bg-white px-3 text-[12.5px] font-medium text-ink hover:bg-canvas"><Plus size={14} />Add FAQ</button></div>
            {f.faqs.length === 0 && <div className="rounded-xl border border-dashed border-rule bg-white/45 px-4 py-5 text-center text-[12.5px] text-ink-mute">No FAQs yet. Add the questions people ask you most.</div>}
            <div className="space-y-2.5">{f.faqs.map((x: any, i: number) => (
              <div key={i} className="clay-pressed grid gap-2 p-3 md:grid-cols-[1fr_1.4fr_auto]">
                <input className="min-w-0 bg-transparent px-1 text-[13px] font-medium text-ink outline-none placeholder:text-ink-mute" placeholder="Question" value={x.q} onChange={(e) => row("faqs", i, { q: e.target.value })} />
                <input className="min-w-0 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-mute" placeholder="Answer" value={x.a} onChange={(e) => row("faqs", i, { a: e.target.value })} />
                <button aria-label="Remove FAQ" onClick={() => set("faqs", f.faqs.filter((_: any, j: number) => j !== i))} className="justify-self-end px-1 text-ink-mute hover:text-peach-deep"><Trash size={14} /></button></div>))}</div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-medium">Your links</h2><p className="mt-0.5 text-[12.5px] text-ink-soft">Show visitors where to find your work.</p></div><button onClick={() => set("links", [...f.links, { label: "", url: "" }])} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-rule bg-white px-3 text-[12.5px] font-medium text-ink hover:bg-canvas"><Plus size={14} />Add link</button></div>
            {f.links.length === 0 && <div className="rounded-xl border border-dashed border-rule bg-white/45 px-4 py-5 text-center text-[12.5px] text-ink-mute">No links yet. Add a portfolio, LinkedIn, or website.</div>}
            <div className="space-y-2">{f.links.map((x: any, i: number) => (
              <div key={i}><div className="clay-pressed grid min-w-0 gap-1.5 p-2.5 sm:grid-cols-[minmax(90px,0.3fr)_minmax(0,1fr)_auto]">
                <input className="min-w-0 bg-transparent px-1 text-[13px] font-medium text-ink outline-none placeholder:text-ink-mute" placeholder="Label" value={x.label} onChange={(e) => row("links", i, { label: e.target.value })} />
                <input className="min-w-0 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-mute" placeholder="https://your-link.com" value={x.url} onChange={(e) => row("links", i, { url: e.target.value })} />
                <button aria-label="Remove link" onClick={() => set("links", f.links.filter((_: any, j: number) => j !== i))} className="justify-self-end px-1 text-ink-mute hover:text-peach-deep"><Trash size={14} /></button></div>{err("link" + i)}</div>))}</div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <div><h2 className="text-[15px] font-medium">Knowledge sources</h2><p className="mt-0.5 text-[12.5px] text-ink-soft">Twyn uses these to answer visitors accurately.</p></div>
            <label className="clay-sm mt-4 flex min-h-10 cursor-pointer items-center justify-center gap-2 bg-white px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-canvas">{up ? <CircleNotch size={14} className="animate-spin" /> : <UploadSimple size={14} />}Upload PDF, Markdown or text<input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></label>
            <div className="mt-4 space-y-2">
              {docs === null ? <div className="h-9 animate-pulse rounded-xl bg-ink/[0.05]" /> : docs.length === 0 ? <Empty icon={<FileText size={16} />} title="No documents yet" sub="Add a resume, portfolio or service menu, or import from your AI assistant." /> :
                docs.map((d) => <div key={d.name} className="clay-pressed flex items-center gap-2 px-3 py-2 text-[12.5px]"><FileText size={14} className="text-ink-mute" /><span className="min-w-0 flex-1 truncate">{d.name}</span><span className="text-ink-mute">{d.chunks}</span>
                  <button aria-label="Remove" onClick={() => delDoc(d.name)} className="text-ink-mute hover:text-ink"><Trash size={13} /></button></div>)}
            </div>
          </Card>
          <Card className="p-5"><AiImport pid={p.id} compact onApplied={async (x, o) => {
            const patch: any = { faqs: [...(p.faqs || []), ...x.faqs] }; if (o.bio) patch.bio = x.bio; if (o.tone) patch.tone = x.tone;
            await savePersona(p, patch); await reload(); setF((cur: any) => ({ ...cur, ...patch })); loadDocs(); toast("Imported into knowledge"); }} /></Card>
        </div>
      </div>
    </Page>
  );
}
