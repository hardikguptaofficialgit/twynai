"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarBlank, CaretLeft, CaretRight, CircleNotch, LockSimple, Plus, X } from "@phosphor-icons/react";
import { Card, Pill } from "@/components/ui";
import { useStudio, useUnsavedGuard, savePersona, Page } from "../ctx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEF = { days: [0, 1, 2, 3, 4], start: "10:00", end: "18:00", duration: 30, buffer: 15, notice: 12, max_days: 60, blocked_dates: [] as string[], date_overrides: {} as Record<string, { enabled?: boolean; start?: string; end?: string }> };

function keyOf(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function labelOf(date: Date, options: Intl.DateTimeFormatOptions) { return date.toLocaleDateString("en-IN", options); }

export default function Availability() {
  const { persona: p, reload, toast, me } = useStudio();
  const init = useMemo(() => ({ ...DEF, ...(p.availability || {}), blocked_dates: Array.isArray(p.availability?.blocked_dates) ? p.availability.blocked_dates : [], date_overrides: p.availability?.date_overrides && typeof p.availability.date_overrides === "object" ? p.availability.date_overrides : {} }), [p.availability]);
  const [av, setAv] = useState<any>(init);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState("");
  const dirty = useMemo(() => JSON.stringify(av) !== JSON.stringify(init), [av, init]);
  useUnsavedGuard(dirty);
  const up = (k: string, v: any) => setAv((x: any) => ({ ...x, [k]: v }));
  const selectedOverride = selectedDate && av.date_overrides?.[selectedDate] && typeof av.date_overrides[selectedDate] === "object" ? av.date_overrides[selectedDate] : null;
  const err = !Array.isArray(av.days) || !av.days.length ? "Pick at least one day." : av.start >= av.end ? "End time must be after start time." : av.duration < 10 || av.duration > 240 ? "Length must be 10 to 240 minutes." : av.buffer < 0 || av.notice < 0 || av.max_days < 1 || av.max_days > 370 ? "Buffer, notice and booking window must be valid." : Object.entries(av.date_overrides || {}).some(([, x]: any) => x && x.enabled !== false && (!x.start || !x.end || x.start >= x.end)) ? "Every custom date needs a valid start and end time." : "";
  const monthCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, i) => i < offset || i >= offset + total ? null : new Date(month.getFullYear(), month.getMonth(), i - offset + 1));
  }, [month]);
  function toggleBlocked(date: string) {
    const blocked = new Set<string>(av.blocked_dates || []);
    if (blocked.has(date)) blocked.delete(date); else blocked.add(date);
    const overrides = { ...(av.date_overrides || {}) }; delete overrides[date];
    setAv((current: any) => ({ ...current, blocked_dates: [...blocked].sort(), date_overrides: overrides }));
  }
  function setOverride(date: string, patch: any) { setAv((current: any) => ({ ...current, date_overrides: { ...(current.date_overrides || {}), [date]: { enabled: true, start: current.start, end: current.end, ...(current.date_overrides?.[date] || {}), ...patch } } })); }
  function clearOverride(date: string) { const overrides = { ...(av.date_overrides || {}) }; delete overrides[date]; setAv((current: any) => ({ ...current, date_overrides: overrides })); }
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
          <div className="mt-3 grid gap-3 sm:grid-cols-4">{([["duration", "Meeting length (min)"], ["buffer", "Buffer between (min)"], ["notice", "Minimum notice (hours)"], ["max_days", "Booking window (days)"]] as const).map(([k, l]) => (
            <label key={k} className="text-[12.5px] text-ink-soft">{l}<input type="number" min={0} value={av[k]} onChange={(e) => up(k, +e.target.value)} className="field clay-pressed mt-1 w-full text-ink" /></label>))}</div>
          {err && <p className="mt-3 text-[12.5px] text-peach-deep">{err}</p>}
        </Card>
        <Card className="p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><CalendarBlank size={17} /><h2 className="text-[14px] font-medium">Date exceptions</h2></div><p className="mt-1 text-[12.5px] text-ink-soft">Block holidays or add custom hours without changing your weekly schedule.</p></div><div className="flex items-center gap-1 rounded-full border border-rule bg-white px-1 py-1"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-canvas"><CaretLeft size={14} /></button><span className="min-w-28 text-center text-[12.5px] font-medium">{labelOf(month, { month: "long", year: "numeric" })}</span><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-canvas"><CaretRight size={14} /></button></div></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div><div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.08em] text-ink-mute">{DAYS.map((day) => <span key={day} className="py-1">{day.slice(0, 2)}</span>)}</div><div className="grid grid-cols-7 gap-1">{monthCells.map((date, i) => { if (!date) return <span key={`empty-${i}`} />; const dateKey = keyOf(date); const today = keyOf(new Date()); const past = dateKey < today; const blocked = (av.blocked_dates || []).includes(dateKey); const custom = !!av.date_overrides?.[dateKey]; const selected = selectedDate === dateKey; return <button type="button" key={dateKey} disabled={past} aria-label={`${labelOf(date, { weekday: "long", day: "numeric", month: "long" })}${past ? " (past)" : ""}`} onClick={() => setSelectedDate(dateKey)} className={`relative min-h-12 rounded-xl border p-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "border-ink bg-ink text-canvas" : blocked ? "border-peach-deep/30 bg-peach/30 text-peach-deep" : custom ? "border-lilac-deep/40 bg-lilac/35" : "border-rule bg-white/65 hover:bg-canvas"}`}><span className="text-[12px] font-medium">{date.getDate()}</span>{blocked ? <LockSimple size={11} className="absolute bottom-1.5 right-1.5" /> : custom ? <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-lilac-deep" /> : null}</button>; })}</div><div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-mute"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-lilac-deep" />Custom hours</span><span className="flex items-center gap-1"><LockSimple size={11} />Blocked</span><span className="text-[10px]">Past dates are unavailable</span></div></div>
            <div className="rounded-2xl border border-rule bg-white/65 p-3">{selectedDate ? <><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] uppercase tracking-[0.1em] text-ink-mute">Selected date</p><p className="mt-1 text-[13px] font-medium">{labelOf(new Date(`${selectedDate}T12:00:00`), { weekday: "long", day: "numeric", month: "long" })}</p></div><button type="button" aria-label="Clear selected date" onClick={() => setSelectedDate("")} className="text-ink-mute hover:text-ink"><X size={15} /></button></div>{(av.blocked_dates || []).includes(selectedDate) ? <button type="button" onClick={() => toggleBlocked(selectedDate)} className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[12px] font-medium text-canvas">Unblock date</button> : <><button type="button" onClick={() => toggleBlocked(selectedDate)} className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full border border-peach-deep/30 bg-peach/20 px-3 text-[12px] font-medium text-peach-deep"><LockSimple size={13} />Block date</button><div className="mt-4 border-t border-rule pt-3"><p className="text-[12px] font-medium">Custom hours</p><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[11px] text-ink-mute">From<input type="time" value={selectedOverride?.start || av.start} onChange={(e) => setOverride(selectedDate, { start: e.target.value })} className="field mt-1 w-full text-[12px]" /></label><label className="text-[11px] text-ink-mute">To<input type="time" value={selectedOverride?.end || av.end} onChange={(e) => setOverride(selectedDate, { end: e.target.value })} className="field mt-1 w-full text-[12px]" /></label></div>{selectedOverride && <button type="button" onClick={() => clearOverride(selectedDate)} className="mt-2 text-[11px] text-ink-mute underline underline-offset-2">Use weekly hours</button>}</div></>}</> : <div className="grid min-h-32 place-items-center text-center text-[12px] text-ink-mute"><Plus size={18} /><p>Select a date to block it or set custom hours.</p></div>}</div>
          </div>
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
