"use client";
import Image from "next/image";
import { useState } from "react";
import { Copy, Check, CircleNotch, Trash, ArrowSquareOut } from "@phosphor-icons/react";
import { api } from "@/lib/api";

export const AI_PROMPT = `From your memory of me and our past chats, write down everything you know about me so an AI assistant can represent me to people who visit my page. Use exactly this markdown structure, keep each point short and factual, write in first person ("I ..."), and skip any section you know nothing about. Do not invent anything.

## Bio
## Work
## Skills
## Projects
## How I talk
## FAQs
(as "Q: ..." and "A: ..." lines, the questions people most often ask me)
## Opinions
## Availability preferences
## Links`;

const enc = encodeURIComponent(AI_PROMPT);
const AIS = [
  { k: "ChatGPT", logo: "/brands/chatgpt-dark.svg", url: `https://chatgpt.com/?q=${enc}` },
  { k: "Claude", logo: "/brands/claude.svg", url: `https://claude.ai/new?q=${enc}` },
  { k: "Gemini", logo: "/brands/gemini.svg", url: "https://gemini.google.com/app", copy: true },
  { k: "Grok", logo: "/brands/grok.svg", url: `https://grok.com/?q=${enc}` },
  { k: "Perplexity", logo: "/brands/perplexity.svg", url: `https://www.perplexity.ai/search?q=${enc}` },
];

export type Parsed = { entries: { title: string; text: string }[]; faqs: { q: string; a: string }[]; links: { label: string; url: string }[]; bio: string; tone: string };

/** Split a markdown answer into sections; FAQs become Q/A pairs, Bio and How I talk can fill profile fields. */
export function parseAnswer(md: string): Parsed {
  const out: Parsed = { entries: [], faqs: [], links: [], bio: "", tone: "" };
  const secs: { title: string; body: string[] }[] = []; let cur = { title: "Notes", body: [] as string[] };
  for (const line of md.replace(/\r/g, "").split("\n")) {
    const h = line.match(/^\s{0,3}#{1,4}\s+(.+?)\s*#*\s*$/) || line.match(/^\s*\*\*([^*]{2,40})\*\*:?\s*$/);
    if (h) { if (cur.body.join("").trim()) secs.push(cur); cur = { title: h[1].replace(/[*_:]/g, "").trim(), body: [] }; }
    else cur.body.push(line);
  }
  if (cur.body.join("").trim()) secs.push(cur);
  const clean = (s: string) => s.replace(/^\s*[-*•]\s+/gm, "").replace(/\*\*/g, "").trim();
  for (const s of secs) {
    const t = s.title.toLowerCase(), body = s.body.join("\n");
    if (t.startsWith("faq")) {
      const re = /Q[:.)]\s*([\s\S]+?)\n\s*(?:[-*]\s*)?A[:.)]\s*([\s\S]+?)(?=\n\s*(?:[-*]\s*)?Q[:.)]|$)/g; let m;
      while ((m = re.exec(clean(body)))) out.faqs.push({ q: m[1].trim(), a: m[2].trim() });
      if (!out.faqs.length && clean(body)) out.entries.push({ title: s.title, text: clean(body) });
      continue;
    }
    const text = clean(body); if (!text) continue;
    if (t === "bio" || t === "about") out.bio = text.split("\n").join(" ");
    if (t.includes("talk") || t.includes("tone")) out.tone = text.split("\n").join(" ").slice(0, 200);
    if (t.includes("link")) {
      for (const line of text.split("\n")) {
        const match = line.match(/^\s*[-*]?\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)/) || line.match(/^\s*[-*]?\s*([^:]+):\s*(https?:\/\/\S+)/) || line.match(/^\s*[-*]?\s*(https?:\/\/\S+)/);
        if (match) out.links.push({ label: match[2] ? match[1].trim() : "Website", url: (match[2] || match[1]).replace(/[),.;]+$/, "") });
      }
    }
    out.entries.push({ title: s.title, text });
  }
  return out;
}

export function AiImport({ pid, onApplied, compact }: { pid?: string; onApplied?: (p: Parsed, opts: { bio: boolean; tone: boolean; links: { label: string; url: string }[] }) => void | Promise<void>; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [prev, setPrev] = useState<Parsed | null>(null);
  const [useBio, setUseBio] = useState(true); const [useTone, setUseTone] = useState(true);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const copy = async () => { await navigator.clipboard.writeText(AI_PROMPT).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  function preview() { setErr(""); setMsg(""); if (text.trim().length < 40) { setErr("Paste the full answer first."); return; } const p = parseAnswer(text); if (!p.entries.length && !p.faqs.length) { setErr("Could not find any sections. Make sure the answer uses ## headings."); return; } setPrev(p); }
  async function save() {
    if (!prev || !pid) return; setBusy(true); setErr("");
    try {
      const entries = [...prev.entries, ...prev.faqs.map((f) => ({ title: "FAQ", text: `Q: ${f.q} A: ${f.a}` }))];
      const r = await api(`/api/personas/${pid}/knowledge`, { method: "POST", body: JSON.stringify({ entries }) });
      await onApplied?.(prev, { bio: useBio && !!prev.bio, tone: useTone && !!prev.tone, links: prev.links });
      setMsg(`Imported ${r.chunks} knowledge entries.`); setPrev(null); setText("");
    } catch (e: any) { setErr(e.message || "Import failed."); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] font-medium">Import from your AI assistant</p>
        <p className="text-[12.5px] text-ink-soft">Your assistant already knows a lot about you. Ask it, then paste the answer here.</p>
      </div>
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
        {AIS.map((a) => (
          <a key={a.k} href={a.url} target="_blank" rel="noreferrer" onClick={() => { if (a.copy) copy(); }}
            className="clay-sm flex min-w-0 h-10 items-center gap-1.5 bg-white px-2.5 text-[12.5px] font-medium text-ink hover:bg-canvas sm:gap-2 sm:px-3 sm:text-[13px]">
            {a.logo.startsWith("http") ? <img src={a.logo} alt="" width={15} height={15} className="shrink-0" /> : <Image src={a.logo} alt="" width={15} height={15} className="shrink-0" />}<span className="min-w-0 flex-1 whitespace-nowrap">Ask {a.k}</span><ArrowSquareOut size={12} className="shrink-0 text-ink-mute" />
          </a>))}
        <button onClick={copy} className="clay-sm flex min-w-0 h-10 items-center gap-1.5 bg-white px-2.5 text-[12.5px] font-medium text-ink hover:bg-canvas sm:gap-2 sm:px-3 sm:text-[13px]">{copied ? <Check size={14} className="shrink-0" /> : <Copy size={14} className="shrink-0" />}<span className="whitespace-nowrap">{copied ? "Copied" : "Copy prompt"}</span></button>
      </div>
      <p className="text-[11.5px] text-ink-mute">Gemini does not accept a prefilled prompt, so the prompt is copied for you to paste.</p>
      {!prev ? <>
        <textarea rows={compact ? 4 : 6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the answer here..." className="field clay-pressed w-full resize-y text-[13px]" />
        <div className="flex items-center gap-2"><button onClick={preview} disabled={!pid} className="h-8 rounded-full bg-ink px-3 text-[13px] font-medium text-canvas disabled:opacity-50">Preview</button>
          {!pid && <span className="text-[12px] text-ink-mute">Save your persona first.</span>}</div>
      </> : (
        <div className="glass space-y-2 p-3" style={{ borderRadius: 16 }}>
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium">{prev.entries.length} sections, {prev.faqs.length} FAQs, {prev.links.length} links found</span>
            <button onClick={() => setPrev(null)} className="text-[12px] text-ink-soft hover:text-ink">Edit text</button></div>
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {prev.entries.map((e, i) => (
              <div key={i} className="clay-pressed flex gap-2 px-3 py-2 text-[12.5px]"><div className="min-w-0 flex-1"><div className="font-medium">{e.title}</div><p className="line-clamp-2 text-ink-soft">{e.text}</p></div>
                <button aria-label="Remove" onClick={() => setPrev({ ...prev, entries: prev.entries.filter((_, j) => j !== i) })} className="self-start text-ink-mute hover:text-ink"><Trash size={14} /></button></div>))}
            {prev.faqs.map((f, i) => (
              <div key={"f" + i} className="clay-pressed flex gap-2 px-3 py-2 text-[12.5px]"><div className="min-w-0 flex-1"><div className="font-medium">Q: {f.q}</div><p className="line-clamp-1 text-ink-soft">A: {f.a}</p></div>
                <button aria-label="Remove" onClick={() => setPrev({ ...prev, faqs: prev.faqs.filter((_, j) => j !== i) })} className="self-start text-ink-mute hover:text-ink"><Trash size={14} /></button></div>))}
          </div>
          {prev.bio && <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={useBio} onChange={(e) => setUseBio(e.target.checked)} />Also use the Bio section as my bio</label>}
          {prev.tone && <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={useTone} onChange={(e) => setUseTone(e.target.checked)} />Also use "How I talk" as my tone</label>}
          <button onClick={save} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-medium text-canvas">{busy && <CircleNotch size={13} className="animate-spin" />}Save to knowledge</button>
        </div>)}
      {msg && <p className="flex items-center gap-1.5 text-[12.5px] text-mint-deep"><Check size={13} />{msg}</p>}
      {err && <p className="text-[12.5px] text-peach-deep">{err}</p>}
    </div>
  );
}
