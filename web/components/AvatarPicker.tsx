"use client";

import { Check, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ProfileAvatar, type AvatarStyle } from "@/components/ProfileAvatar";

export const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: "lorelei-neutral", label: "Lorelei" },
  { value: "notionists-neutral", label: "Notionists" },
  { value: "micah", label: "Micah" },
  { value: "big-smile", label: "Big Smile" },
  { value: "initial-face", label: "Initials" },
];

const AVATAR_BACKGROUNDS = ["d9cdf6", "cdeadb", "cfe2f5", "f8dacb", "f4eac3", "f5e7dc", "e5dff7", "d8eef0"];

export function AvatarStylePicker({ seed, value, background = "d9cdf6", onChange, onBackgroundChange }: { seed: string; value: AvatarStyle; background?: string; onChange: (value: AvatarStyle) => void; onBackgroundChange?: (value: string) => void }) {
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
    {AVATAR_STYLES.map((style) => <button key={style.value} type="button" onClick={() => onChange(style.value)} aria-pressed={value === style.value} className={clsx("flex items-center gap-2 rounded-full border px-2 py-1.5 text-[12px] transition-colors", value === style.value ? "border-ink bg-white text-ink" : "border-rule bg-white/50 text-ink-soft hover:bg-white")}>
      <ProfileAvatar seed={seed} style={style.value} background={background} size={30} />{style.label}{value === style.value && <Check size={13} weight="bold" className="text-mint-deep" />}
    </button>)}
    </div>
    {onBackgroundChange && <div><p className="mb-1.5 text-[11px] text-ink-mute">Color</p><div className="flex flex-wrap gap-2">{AVATAR_BACKGROUNDS.map((color) => <button key={color} type="button" aria-label={"Choose " + color + " avatar color"} aria-pressed={background === color} onClick={() => onBackgroundChange(color)} className={clsx("h-7 w-7 rounded-full border-2", background === color ? "border-ink ring-2 ring-ink/10" : "border-white/80")} style={{ backgroundColor: "#" + color }} />)}</div></div>}
  </div>;
}

export function AvatarPickerModal({ seed, value, background = "d9cdf6", onChange, onBackgroundChange }: { seed: string; value: AvatarStyle; background?: string; onChange: (value: AvatarStyle) => void; onBackgroundChange?: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; };
  }, [open]);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-rule bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-canvas">
      <ProfileAvatar seed={seed} style={value} background={background} size={24} /> Choose avatar
    </button>
    {open && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/20 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="avatar-picker-title" onMouseDown={(e) => { if (e.currentTarget === e.target) setOpen(false); }}>
      <div className="w-full max-w-[560px] rounded-t-[26px] border border-rule bg-canvas p-5 shadow-[0_18px_60px_oklch(22%_0.025_285/0.18)] sm:rounded-[26px]">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Profile picture</p><h2 id="avatar-picker-title" className="display mt-1 text-[24px]">Choose your avatar</h2><p className="mt-1 text-[12.5px] text-ink-soft">Pick a calm, illustrated style and a color that feels like you.</p></div><button type="button" aria-label="Close avatar picker" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-white text-ink-soft hover:text-ink"><X size={16} /></button></div>
        <div className="mt-5"><AvatarStylePicker seed={seed} value={value} background={background} onChange={(next) => { onChange(next); setOpen(false); }} onBackgroundChange={onBackgroundChange} /></div>
      </div>
    </div>}
  </>;
}
