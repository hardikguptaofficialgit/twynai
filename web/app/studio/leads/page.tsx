"use client";
import { useState } from "react";
import { Users, MagnifyingGlass, DownloadSimple } from "@phosphor-icons/react";
import { Card } from "@/components/ui";
import { useStudio, Page, Empty, Skeleton, ago } from "../ctx";

export default function Leads() {
  const { ov } = useStudio();
  const [q, setQ] = useState("");
  const list = (ov?.leads || []).filter((l: any) => `${l.name} ${l.contact} ${l.intent}`.toLowerCase().includes(q.toLowerCase()));
  function csv() {
    const rows = [["Name", "Contact", "Intent", "Created"], ...list.map((l: any) => [l.name, l.contact, l.intent, l.created_at])];
    const b = new Blob([rows.map((r) => r.map((x: any) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "twyn-leads.csv"; a.click();
  }
  return (
    <Page title="Leads" sub="People who left their details or booked a meeting."
      actions={<button onClick={csv} disabled={!list.length} className="clay-sm inline-flex h-8 items-center gap-1.5 bg-white px-3 text-[13px] font-medium disabled:opacity-40"><DownloadSimple size={14} />Export CSV</button>}>
      <div className="clay-pressed mb-3 flex h-9 items-center gap-2 px-3"><MagnifyingGlass size={14} className="text-ink-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads" className="flex-1 bg-transparent text-[13px] outline-none" /></div>
      <Card className="p-3">
        {!ov ? <Skeleton rows={4} /> : list.length === 0 ? <Empty icon={<Users size={18} />} title={q ? "No matches" : "No leads yet"} sub={q ? "Try another search." : "Your Twyn captures leads during chats and calls."} /> :
          <div className="divide-y divide-rule">{list.map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 px-2 py-2.5 text-[13px]">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-butter text-[12px] font-medium">{(l.name || l.contact || "?")[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1"><div className="font-medium">{l.name || "Anonymous"} <span className="font-normal text-ink-mute">{l.contact}</span></div><div className="truncate text-[12.5px] text-ink-soft">{l.intent}</div></div>
              <span className="shrink-0 text-[11.5px] text-ink-mute">{ago(l.created_at)}</span>
            </div>))}</div>}
      </Card>
    </Page>
  );
}
