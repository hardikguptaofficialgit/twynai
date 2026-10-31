"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { ChatCircle as MessageSquare, Users, CalendarCheck, Hand, PaperPlaneRight as Send, Waveform as AudioLines, ArrowClockwise as RefreshCw } from "@phosphor-icons/react";
import { api, WS } from "@/lib/api";
import { useOwner } from "@/lib/useOwner";
import { Backdrop, Button, Card, Pill } from "@/components/ui";
import { AppNav } from "@/components/AppNav";

const ago = (iso: string) => { const s = (Date.now() - new Date(iso).getTime()) / 1000; return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };
const fmt = (s: string) => new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) + " IST";

export default function Dashboard() {
  const { personas } = useOwner();
  const p = personas[0];
  const [ov, setOv] = useState<any>(null);
  const [sel, setSel] = useState<string>("");
  const [conv, setConv] = useState<any>(null);
  const [reply, setReply] = useState("");
  const load = useCallback(async () => { if (p) setOv(await api(`/api/personas/${p.id}/overview`)); }, [p]);
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]);
  const loadConv = useCallback(async () => { if (sel) setConv(await api(`/api/conversations/${sel}`)); }, [sel]);
  useEffect(() => { loadConv(); if (!sel) return; const ws = new WebSocket(`${WS}/ws/conversations/${sel}`); ws.onmessage = () => loadConv(); return () => ws.close(); }, [sel, loadConv]);
  useEffect(() => { if (!sel && ov?.conversations?.[0]) setSel(ov.conversations[0].id); }, [ov, sel]);

  async function takeover(on: boolean) { await api(`/api/conversations/${sel}/takeover`, { method: "POST", body: JSON.stringify({ on }) }); loadConv(); }
  async function send() { if (!reply.trim()) return; await api(`/api/conversations/${sel}/reply`, { method: "POST", body: JSON.stringify({ text: reply }) }); setReply(""); loadConv(); }

  const stats = [
    { l: "Conversations", v: ov?.conversations.length ?? 0, I: MessageSquare, t: "bg-lilac" },
    { l: "Leads", v: ov?.leads.length ?? 0, I: Users, t: "bg-butter" },
    { l: "Meetings booked", v: ov?.bookings.length ?? 0, I: CalendarCheck, t: "bg-mint" },
    { l: "Voice calls", v: ov?.conversations.filter((c: any) => c.channel === "voice").length ?? 0, I: AudioLines, t: "bg-sky" },
  ];
  return (
    <main className="relative min-h-screen pb-16">
      <Backdrop />
      <AppNav handle={p?.handle} />
      <div className="mx-auto mt-6 w-[min(1040px,calc(100%-2rem))]">
        <div className="mb-5 flex items-end justify-between"><div><div className="eyebrow">Dashboard</div><h1 className="display mt-1 text-[28px]">What your Twyn did</h1></div>
          <Button size="sm" variant="clay" onClick={load}><RefreshCw size={13} />Refresh</Button></div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">{stats.map((s) => (
          <Card key={s.l} className="flex items-center gap-3 p-4"><div className={`grid h-9 w-9 place-items-center rounded-xl ${s.t}`}><s.I size={16} /></div><div><div className="tnum font-display text-[26px] leading-none">{s.v}</div><div className="text-[12px] text-ink-mute">{s.l}</div></div></Card>))}</div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[300px_1fr]">
          <Card glass className="flex h-[540px] flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-[12px] font-medium text-ink-mute"><span>Conversations</span><span className="normal-case tracking-normal">{ov?.conversations.length ?? 0} total</span></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {ov?.conversations.length === 0 && <p className="p-3 text-sm text-ink-soft">No conversations yet. Share your link.</p>}
            {ov?.conversations.map((c: any) => (
              <button key={c.id} onClick={() => setSel(c.id)} className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left transition ${sel === c.id ? "clay-sm bg-white" : "hover:bg-white/50"}`}>
                <div className="flex items-center justify-between"><span className="text-[13px] font-medium">{c.visitor_name}</span><span className="text-xs text-ink-mute">{ago(c.updated_at)}</span></div>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-soft">{c.summary || c.last}</p>
                <div className="mt-1.5 flex gap-1"><Pill tone={c.channel === "voice" ? "sky" : "lilac"}>{c.channel}</Pill><Pill tone="white">{c.language}</Pill>{c.takeover ? <Pill tone="peach">You</Pill> : null}</div>
              </button>))}
            </div>
          </Card>
          <Card className="flex h-[540px] flex-col overflow-hidden p-0">
            {conv ? <>
              <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                <div><div className="text-[14px] font-medium">{conv.visitor_name}</div><p className="mt-0.5 max-w-xl text-[12.5px] text-ink-soft">{conv.summary}</p></div>
                <Button size="sm" variant={conv.takeover ? "mint" : "primary"} onClick={() => takeover(!conv.takeover)}><Hand size={13} />{conv.takeover ? "Hand back to Twyn" : "Take over"}</Button>
              </div>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">{conv.messages.map((m: any) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={m.role === "visitor" ? "flex justify-start" : "flex justify-end"}>
                  <div className="max-w-[75%]">
                    <div className="mb-0.5 text-[11px] text-ink-mute">{m.role === "visitor" ? conv.visitor_name : m.role === "owner" ? "You" : `Twyn${m.meta?.provider ? " · " + m.meta.provider : ""}`}</div>
                    <div className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${m.role === "visitor" ? "clay-pressed" : m.role === "owner" ? "bg-peach" : "bg-ink text-canvas"}`}>{m.text}</div>
                    {m.meta?.tools?.length > 0 && <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">{m.meta.tools.map((t: any, i: number) => <Pill key={i} tone="sky">{t.name}</Pill>)}</div>}
                  </div>
                </motion.div>))}</div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="clay-pressed m-2 flex items-center gap-1 p-1">
                <input disabled={!conv.takeover} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={conv.takeover ? "Reply as yourself..." : "Take over to reply live"} className="flex-1 bg-transparent h-9 px-3 text-[13px] outline-none" />
                <button disabled={!conv.takeover} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-canvas disabled:opacity-40"><Send size={15} /></button>
              </form>
            </> : <div className="grid flex-1 place-items-center text-sm text-ink-mute">Select a conversation</div>}
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card><h2 className="mb-3 text-[15px] font-medium">Leads</h2>
            {ov?.leads.length === 0 && <p className="text-sm text-ink-soft">No leads yet.</p>}
            <div className="space-y-2">{ov?.leads.map((l: any) => <div key={l.id} className="clay-pressed flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]"><div className="min-w-0"><div className="font-medium">{l.name || l.contact || "Anonymous"}</div><div className="truncate text-ink-soft">{l.intent}</div></div><span className="shrink-0 text-xs text-ink-mute">{ago(l.created_at)}</span></div>)}</div></Card>
          <Card><h2 className="mb-3 text-[15px] font-medium">Upcoming meetings</h2>
            {ov?.bookings.length === 0 && <p className="text-sm text-ink-soft">No bookings yet.</p>}
            <div className="space-y-2">{ov?.bookings.map((b: any) => <div key={b.id} className="clay-pressed flex items-center justify-between px-3 py-2.5 text-[13px]"><div><div className="font-medium">{b.guest_name} {b.guest_email && <span className="text-ink-mute">· {b.guest_email}</span>}</div><div className="text-ink-soft">{b.topic || "Meeting"}</div></div><Pill tone="mint">{fmt(b.start + "+05:30")}</Pill></div>)}</div></Card>
        </div>
      </div>
    </main>
  );
}
