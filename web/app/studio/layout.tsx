"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import clsx from "clsx";
import { SquaresFour, UserCircle, Waveform, CalendarBlank, CalendarCheck, Users, ChatCircle, GearSix, SidebarSimple, ArrowSquareOut, Warning, SignOut } from "@phosphor-icons/react";
import { api, API } from "@/lib/api";
import { useOwner } from "@/lib/useOwner";
import { Backdrop, Mark, TwynLoader } from "@/components/ui";
import { StudioCtx, useToasts, useOverview } from "./ctx";

const NAV = [
  { href: "/studio", label: "Overview", I: SquaresFour },
  { href: "/studio/persona", label: "Persona", I: UserCircle },
  { href: "/studio/voice", label: "Voice", I: Waveform },
  { href: "/studio/availability", label: "Availability", I: CalendarBlank },
  { href: "/studio/bookings", label: "Bookings", I: CalendarCheck },
  { href: "/studio/leads", label: "Leads", I: Users },
  { href: "/studio/conversations", label: "Conversations", I: ChatCircle },
  { href: "/studio/settings", label: "Settings", I: GearSix },
];
const MOBILE = ["/studio", "/studio/conversations", "/studio/bookings", "/studio/persona", "/studio/settings"];

const CAL_MSG: Record<string, string> = {
  revoked: "Google Calendar access was revoked or expired. Bookings use the demo calendar until you reconnect.",
  api_disabled: "The Google Calendar API is turned off for this app's Google project. Bookings use the demo calendar for now.",
  needs_reconnect: "Calendar access was not granted. Reconnect and allow calendar access so Twyn can see your free times.",
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  const r = useRouter(); const path = usePathname();
  const { me, setMe, reloadMe, personas, reload, loaded } = useOwner();
  const persona = personas[0];
  const { ov, loadOv } = useOverview(persona);
  const { toast, view } = useToasts();
  const [dirty, setDirty] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(localStorage.getItem("twyn_sidebar") === "1"); }, []);
  useEffect(() => { if (loaded && !persona) r.replace("/onboarding"); }, [loaded, persona, r]);   // new users finish onboarding first

  const guard = (e: React.MouseEvent) => { if (dirty && !confirm("You have unsaved changes. Leave without saving?")) e.preventDefault(); else setDirty(false); };
  const active = (h: string) => (h === "/studio" ? path === h : path.startsWith(h));
  async function logout() { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); localStorage.removeItem("proxy_token"); r.replace("/login"); }
  const st = me?.calendar_status;

  if (!me || !loaded || !persona) return <main className="grid min-h-screen place-items-center text-[13px] text-ink-mute"><Backdrop /><TwynLoader label="Loading your studio" /></main>;

  return (
    <StudioCtx.Provider value={{ me, setMe, reloadMe, persona, reload, ov, loadOv, toast, dirty, setDirty }}>
      <Backdrop />
      <div className="flex min-h-screen text-[14px]">
        <aside className={clsx("glass sticky top-0 hidden h-screen shrink-0 flex-col border-r border-rule p-2.5 md:flex", collapsed ? "w-[60px]" : "w-[216px]")} style={{ borderRadius: 0 }}>
          <div className="flex h-10 items-center justify-between px-1.5">
            {!collapsed && <Link href="/" className="flex items-center gap-1.5"><Mark size={20} /><span className="font-display text-[16px]">Twyn</span></Link>}
            <button aria-label="Toggle sidebar" onClick={() => { setCollapsed(!collapsed); localStorage.setItem("twyn_sidebar", collapsed ? "0" : "1"); }} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-white/70"><SidebarSimple size={17} /></button>
          </div>
          <nav className="mt-3 flex flex-1 flex-col gap-0.5">
            {NAV.map(({ href, label, I }) => (
              <Link key={href} href={href} onClick={guard} title={collapsed ? label : undefined}
                className={clsx("flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors", active(href) ? "clay-sm bg-white font-medium text-ink" : "text-ink-soft hover:bg-white/60 hover:text-ink")}>
                <I size={17} weight={active(href) ? "fill" : "regular"} />{!collapsed && label}
              </Link>))}
          </nav>
          <a href={`/p/${persona.handle}`} target="_blank" className="mb-1 flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-ink-soft hover:bg-white/60"><ArrowSquareOut size={16} />{!collapsed && "Public page"}</a>
          <div className={clsx("flex items-center gap-2 rounded-xl px-1.5 py-1.5", !collapsed && "hairline bg-white/50")}>
            {me.picture ? <img src={me.picture} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-lilac text-[12px] font-medium">{(me.name || me.email)[0]?.toUpperCase()}</span>}
            {!collapsed && <div className="min-w-0 flex-1"><div className="truncate text-[12.5px] font-medium">{me.name}</div><div className="truncate text-[11px] text-ink-mute">{me.email}</div></div>}
            {!collapsed && <button aria-label="Sign out" title="Sign out" onClick={logout} className="text-ink-mute hover:text-ink"><SignOut size={15} /></button>}
          </div>
        </aside>
        <div className="min-w-0 flex-1 pb-20 md:pb-0">
          {st && CAL_MSG[st] && (
            <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-butter/70 px-3 py-2 text-[12.5px] md:mx-6">
              <Warning size={15} /><span className="flex-1">{CAL_MSG[st]}</span>
              {st !== "api_disabled" && <a href={`${API}/api/auth/google/login?next=${encodeURIComponent(path)}&calendar=1`} className="rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-canvas">Reconnect</a>}
            </div>)}
          {children}
        </div>
      </div>
      <nav className="glass fixed inset-x-2 bottom-2 z-40 flex justify-around p-1 md:hidden" style={{ borderRadius: 18 }}>
        {NAV.filter((n) => MOBILE.includes(n.href)).map(({ href, label, I }) => (
          <Link key={href} href={href} onClick={guard} className={clsx("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px]", active(href) ? "bg-white font-medium text-ink" : "text-ink-soft")}>
            <I size={18} weight={active(href) ? "fill" : "regular"} />{label}</Link>))}
      </nav>
      {view}
    </StudioCtx.Provider>
  );
}
