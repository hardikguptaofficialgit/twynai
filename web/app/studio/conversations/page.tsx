"use client";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ChatCircle as MessageSquare, Hand, PaperPlaneRight as Send } from "@phosphor-icons/react";
import { api, connectWs } from "@/lib/api";
import { Button, Card, Pill } from "@/components/ui";
import { useStudio, Page, Empty, Skeleton, ago } from "../ctx";

export default function ConversationsPage() { return <Suspense><Conversations /></Suspense>; }

function Conversations() {
  const { ov, toast } = useStudio();
  const sp = useSearchParams();
  const [sel, setSel] = useState<string>(sp.get("c") || "");
  const [conv, setConv] = useState<any>(null);
  const [reply, setReply] = useState("");
  const loadConv = useCallback(async () => { if (sel) try { setConv(await api(`/api/conversations/${sel}`)); } catch { toast("Could not load conversation", "err"); } }, [sel]); // eslint-disable-line
  useEffect(() => { loadConv(); if (!sel) return; return connectWs(`/ws/conversations/${sel}`, () => loadConv()); }, [sel, loadConv]);
  useEffect(() => { if (!sel && ov?.conversations?.[0] && window.innerWidth >= 1024) setSel(ov.conversations[0].id); }, [ov, sel]);
  async function takeover(on: boolean) { try { await api(`/api/conversations/${sel}/takeover`, { method: "POST", body: JSON.stringify({ on }) }); toast(on ? "You are live in this chat" : "Handed back to Twyn"); loadConv(); } catch (e: any) { toast(e.message, "err"); } }
  async function send() { if (!reply.trim()) return; try { await api(`/api/conversations/${sel}/reply`, { method: "POST", body: JSON.stringify({ text: reply }) }); setReply(""); loadConv(); } catch (e: any) { toast(e.message, "err"); } }
  return (
    <Page title="Conversations" sub="Every chat and call. Take over any time to reply as yourself.">
      <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
          <Card glass className="flex h-[calc(100vh-170px)] min-h-[420px] flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 text-[12px] font-medium text-ink-mute"><span>Conversations</span><span className="normal-case tracking-normal">{ov?.conversations.length ?? 0} total</span></div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {!ov ? <Skeleton rows={5} /> : ov.conversations.length === 0 && <Empty icon={<MessageSquare size={18} />} title="No conversations yet" sub="Share your link and chats will show up here." />}
            {ov?.conversations?.map((c: any) => (
              <button key={c.id} onClick={() => setSel(c.id)} className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left transition ${sel === c.id ? "clay-sm bg-white" : "hover:bg-white/50"}`}>
                <div className="flex items-center justify-between"><span className="text-[13px] font-medium">{c.visitor_name}</span><span className="text-xs text-ink-mute">{ago(c.updated_at)}</span></div>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-soft">{c.summary || c.last}</p>
                <div className="mt-1.5 flex gap-1"><Pill tone={c.channel === "voice" ? "sky" : "lilac"}>{c.channel}</Pill><Pill tone="white">{c.language}</Pill>{c.takeover ? <Pill tone="peach">You</Pill> : null}</div>
              </button>))}
            </div>
          </Card>
          <Card className="flex h-[calc(100vh-170px)] min-h-[420px] flex-col overflow-hidden p-0">
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
    </Page>
  );
}
