"use client";
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { Check, Warning, X } from "@phosphor-icons/react";
import { api, Persona } from "@/lib/api";

type Toast = { id: number; text: string; tone: "ok" | "err" };
type Ctx = {
  me: any; reloadMe: () => Promise<any>; setMe: (m: any) => void;
  persona?: Persona & any; reload: () => Promise<any>;
  ov: any; loadOv: () => Promise<void>;
  toast: (text: string, tone?: "ok" | "err") => void;
  dirty: boolean; setDirty: (d: boolean) => void;
};
export const StudioCtx = createContext<Ctx>(null as any);
export const useStudio = () => useContext(StudioCtx);

export function useToasts() {
  const [list, setList] = useState<Toast[]>([]);
  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random(); setList((l) => [...l, { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3200);
  }, []);
  const view = (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2">
      {list.map((t) => (
        <div key={t.id} role="status" className="glass pointer-events-auto flex items-center gap-2 px-3 py-2 text-[13px]" style={{ borderRadius: 14 }}>
          {t.tone === "ok" ? <Check size={14} className="text-mint-deep" /> : <Warning size={14} className="text-peach-deep" />}{t.text}
          <button aria-label="Dismiss" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))} className="text-ink-mute"><X size={12} /></button>
        </div>))}
    </div>);
  return { toast, view };
}

/** Warn before leaving with unsaved edits (tab close/reload); sidebar links check `dirty` too. */
export function useUnsavedGuard(dirty: boolean) {
  const { setDirty } = useStudio();
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty, setDirty]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}

export function useOverview(persona?: Persona) {
  const [ov, setOv] = useState<any>(null);
  const pid = persona?.id; const ref = useRef(pid); ref.current = pid;
  const loadOv = useCallback(async () => { if (ref.current) { try { setOv(await api(`/api/personas/${ref.current}/overview`)); } catch { setOv((o: any) => o ?? { error: true }); } } }, []);
  useEffect(() => { loadOv(); const t = setInterval(loadOv, 15000); return () => clearInterval(t); }, [pid, loadOv]);
  return { ov, loadOv };
}

export function Page({ title, sub, actions, children }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-5 md:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>{sub && <p className="mt-0.5 text-[13px] text-ink-soft">{sub}</p>}</div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>);
}

export function Empty({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-[18px] border border-dashed border-ink/10 bg-white/40 px-6 py-10 text-center">
      <span className="clay-sm grid h-10 w-10 place-items-center bg-white text-ink-soft">{icon}</span>
      <p className="mt-3 text-[14px] font-medium">{title}</p>{sub && <p className="mt-1 max-w-sm text-[12.5px] text-ink-soft">{sub}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>);
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-ink/[0.05]" />)}</div>;
}

export const ago = (iso: string) => { const s = (Date.now() - new Date(iso).getTime()) / 1000; return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };
export const fmtIST = (s: string) => new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";

export async function savePersona(p: any, patch: any) {
  const x = { ...p, ...patch };
  const body = { handle: x.handle, name: x.name, headline: x.headline || "", bio: x.bio || "", rates: x.rates || "", faqs: (x.faqs || []).filter((f: any) => f.q?.trim()),
    links: (x.links || []).filter((l: any) => l.url?.trim()), tone: x.tone || "", accent: x.accent || "lilac", languages: x.languages || ["en"], availability: x.availability || {},
    published: !!x.published, onboarding_step: x.onboarding_step || 0 };
  return api(`/api/personas/${p.id}`, { method: "PUT", body: JSON.stringify(body) });
}
