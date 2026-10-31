"use client";
import { useState } from "react";
import { CalendarCheck } from "@phosphor-icons/react";
import { Card, Pill } from "@/components/ui";
import { useStudio, Page, Empty, Skeleton, fmtIST } from "../ctx";

export default function Bookings() {
  const { ov } = useStudio();
  const [tab, setTab] = useState<"up" | "past">("up");
  const now = new Date();
  const list = (ov?.bookings || []).filter((b: any) => (new Date(b.start + "+05:30") > now) === (tab === "up"));
  if (tab === "past") list.reverse();
  return (
    <Page title="Bookings" sub="Meetings booked from your page or by your Twyn."
      actions={<div className="clay-sm flex bg-white p-0.5">{(["up", "past"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`h-7 rounded-full px-3 text-[12.5px] ${tab === t ? "bg-ink text-canvas" : "text-ink-soft"}`}>{t === "up" ? "Upcoming" : "Past"}</button>)}</div>}>
      <Card className="p-3">
        {!ov ? <Skeleton rows={4} /> : list.length === 0 ? <Empty icon={<CalendarCheck size={18} />} title={tab === "up" ? "No upcoming bookings" : "No past bookings"} sub="Bookings show up here as soon as a visitor picks a time." /> :
          <div className="divide-y divide-rule">{list.map((b: any) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 px-2 py-2.5 text-[13px]">
              <div className="min-w-0 flex-1"><div className="font-medium">{b.guest_name || "Guest"} <span className="font-normal text-ink-mute">{b.guest_email}</span></div><div className="text-[12.5px] text-ink-soft">{b.topic || "Meeting"}</div></div>
              <Pill tone={b.calendar_event_id?.startsWith("mock-") ? "butter" : "mint"}>{b.calendar_event_id?.startsWith("mock-") ? "Demo calendar" : "Google Calendar"}</Pill>
              <Pill tone="white">{fmtIST(b.start + "+05:30")}</Pill>
            </div>))}</div>}
      </Card>
    </Page>
  );
}
