"use client";
import Link from "next/link";
import { ChatCircle, Users, CalendarCheck, Waveform, Copy, ArrowRight } from "@phosphor-icons/react";
import { Card, Pill } from "@/components/ui";
import { useStudio, Page, Empty, Skeleton, ago, fmtIST } from "./ctx";

export default function Overview() {
  const { persona: p, ov, toast, me } = useStudio();
  const link = typeof window !== "undefined" ? `${location.origin}/p/${p.handle}` : "";
  const upcoming = (ov?.bookings || []).filter((b: any) => new Date(b.start + "+05:30") > new Date());
  const stats = [
    { l: "Conversations", v: ov?.conversations?.length, I: ChatCircle, t: "bg-lilac" },
    { l: "Leads", v: ov?.leads?.length, I: Users, t: "bg-butter" },
    { l: "Upcoming meetings", v: upcoming.length, I: CalendarCheck, t: "bg-mint" },
    { l: "Voice calls", v: ov?.conversations?.filter((c: any) => c.channel === "voice").length, I: Waveform, t: "bg-sky" },
  ];
  return (
    <Page title={`Hi ${(me.name || "there").split(" ")[0]}`} sub="What your Twyn has been up to."
      actions={<button onClick={() => { navigator.clipboard.writeText(link); toast("Link copied"); }} className="clay-sm inline-flex h-8 items-center gap-1.5 bg-white px-3 text-[13px] font-medium"><Copy size={14} /><span className="font-mono text-[12px]">{link.replace(/^https?:\/\//, "")}</span></button>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ l, v, I, t }) => (
          <Card key={l} className="p-4"><span className={`clay-sm grid h-8 w-8 place-items-center ${t}`}><I size={15} /></span>
            <div className="mt-3 text-[22px] font-semibold tnum">{ov ? v ?? 0 : "–"}</div><div className="text-[12.5px] text-ink-soft">{l}</div></Card>))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[14px] font-medium">Recent chats</h2><Link href="/studio/conversations" className="inline-flex items-center gap-1 text-[12.5px] text-ink-soft hover:text-ink">All<ArrowRight size={12} /></Link></div>
          {!ov ? <Skeleton /> : ov.error ? <p className="text-[13px] text-peach-deep">Could not load. It will retry shortly.</p> : ov.conversations.length === 0 ? <Empty icon={<ChatCircle size={18} />} title="No chats yet" sub="Share your link and they will show up here." /> :
            <div className="space-y-1.5">{ov.conversations.slice(0, 5).map((c: any) => (
              <Link key={c.id} href={`/studio/conversations?c=${c.id}`} className="clay-pressed block px-3 py-2">
                <div className="flex items-center justify-between text-[13px]"><span className="font-medium">{c.visitor_name}</span><span className="text-[11.5px] text-ink-mute">{ago(c.updated_at)}</span></div>
                <p className="line-clamp-1 text-[12.5px] text-ink-soft">{c.summary || c.last}</p></Link>))}</div>}
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[14px] font-medium">Upcoming bookings</h2><Link href="/studio/bookings" className="inline-flex items-center gap-1 text-[12.5px] text-ink-soft hover:text-ink">All<ArrowRight size={12} /></Link></div>
          {!ov ? <Skeleton /> : upcoming.length === 0 ? <Empty icon={<CalendarCheck size={18} />} title="Nothing booked yet" sub="Visitors can book from your page or by asking your Twyn." /> :
            <div className="space-y-1.5">{upcoming.slice(0, 5).map((b: any) => (
              <div key={b.id} className="clay-pressed flex items-center justify-between gap-3 px-3 py-2 text-[13px]"><div className="min-w-0"><div className="truncate font-medium">{b.guest_name}</div><div className="truncate text-[12px] text-ink-soft">{b.topic || "Meeting"}</div></div><Pill tone="mint">{fmtIST(b.start + "+05:30")}</Pill></div>))}</div>}
        </Card>
      </div>
    </Page>
  );
}
