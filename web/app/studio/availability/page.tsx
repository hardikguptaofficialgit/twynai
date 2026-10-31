"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { Card, Pill } from "@/components/ui";
import { useStudio, useUnsavedGuard, savePersona, Page } from "../ctx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEF = { days: [0, 1, 2, 3, 4], start: "10:00", end: "18:00", duration: 30, buffer: 15, notice: 12 };

export default function Availability() {
  const { persona: p, reload, toast, me } = useStudio();
  const init = { ...DEF, ...(p.availability || {}) };
  const [av, setAv] = useState<any>(init);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(av) !== JSON.stringify(init), [av, init]);
  useUnsavedGuard(dirty);
  const up = (k: string, v: any) => setAv((x: any) => ({ ...x, [k]: v }));
  const err = !av.days.length ? "Pick at least one day." : av.start >= av.end ? "End time must be after start time." : av.duration < 10 || av.duration > 240 ? "Length must be 10 to 240 minutes." : av.buffer < 0 || av.notice < 0 ? "Buffer and notice can't be negative." : "";
  async function save() { if (err) { toast(err, "err"); return; } setSaving(true); try { await savePersona(p, { availability: av }); await reload(); toast("Availability saved"); } catch (e: any) { toast(e.message, "err"); } finally { setSaving(false); } }
  const cal = me.calendar_status === "connected";
  return (
    <Page title="Availability" sub="Twyn offers slots inside these hours, minus anything already busy."
      actions={<>{dirty && <button onClick={() => setAv(init)} className="h-8 rounded-full px-3 text-[13px] text-ink-soft">Discard</button>}<button onClick={save} disabled={!dirty || saving} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-medium text-canvas disabled:opacity-40">{saving && <CircleNotch size={13} className="animate-spin" />}Save</button></>}>
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <h2 className="text-[14px] font-medium">Working days</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">{DAYS.map((d, i) => { const on = av.days.includes(i); return <button key={d} onClick={() => up("days", on ? av.days.filter((x: number) => x !== i) : [...av.days, i].sort())} className={`h-8 rounded-full px-3 text-[13px] font-medium ${on ? "bg-ink text-canvas" : "clay-sm bg-white"}`}>{d}</button>; })}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[12.5px] text-ink-soft">From (IST)<input type="time" value={av.start} onChange={(e) => up("start", e.target.value)} className="field clay-pressed mt-1 w-full text-ink" /></label>
            <label className="text-[12.5px] text-ink-soft">To (IST)<input type="time" value={av.end} onChange={(e) => up("end", e.target.value)} className="field clay-pressed mt-1 w-full text-ink" /></label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">{([["duration", "Meeting length (min)"], ["buffer", "Buffer between (min)"], ["notice", "Minimum notice (hours)"]] as const).map(([k, l]) => (
            <label key={k} className="text-[12.5px] text-ink-soft">{l}<input type="number" min={0} value={av[k]} onChange={(e) => up(k, +e.target.value)} className="field clay-pressed mt-1 w-full text-ink" /></label>))}</div>
          {err && <p className="mt-3 text-[12.5px] text-peach-deep">{err}</p>}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><Image src="/brands/google-calendar.svg" alt="" width={18} height={18} /><h2 className="text-[14px] font-medium">Google Calendar</h2></div>
          <div className="mt-2">{cal ? <Pill tone="mint">Connected</Pill> : <Pill tone="butter">Demo calendar in use</Pill>}</div>
          <p className="mt-2 text-[12.5px] text-ink-soft">{cal ? "Busy times on your primary calendar are removed, and bookings land there with a Google Meet link." : "Connect to block out busy times and add bookings to your calendar."}</p>
          <Link href="/studio/settings" className="mt-3 inline-block text-[13px] font-medium underline underline-offset-2">Manage in Settings</Link>
        </Card>
      </div>
    </Page>
  );
}
