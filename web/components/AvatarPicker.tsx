"use client";

import { Check, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProfileAvatar, type AvatarStyle } from "@/components/ProfileAvatar";

export const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: "twyn-01", label: "Aster" }, { value: "twyn-02", label: "Milo" },
  { value: "twyn-03", label: "Nova" }, { value: "twyn-04", label: "Sage" },
  { value: "twyn-05", label: "Rumi" }, { value: "twyn-06", label: "Iris" },
  { value: "twyn-07", label: "Arlo" }, { value: "twyn-08", label: "Zoya" },
  { value: "twyn-09", label: "Kian" }, { value: "twyn-10", label: "Mina" },
  { value: "twyn-11", label: "Eli" }, { value: "twyn-12", label: "Tara" },
  { value: "critters-01", label: "Mochi" }, { value: "critters-02", label: "Sunny" },
  { value: "critters-03", label: "Pip" }, { value: "critters-04", label: "Miso" },
  { value: "critters-05", label: "Clover" }, { value: "critters-06", label: "Bean" },
  { value: "critters-07", label: "Nori" }, { value: "critters-08", label: "Pogo" },
  { value: "critters-09", label: "Maple" }, { value: "critters-10", label: "Luna" },
  { value: "critters-11", label: "Cosmo" }, { value: "critters-12", label: "Bubbles" },
];

export function AvatarStylePicker({ seed, value, background = "d9cdf6", onChange }: { seed: string; value: AvatarStyle; background?: string; onChange: (value: AvatarStyle) => void }) {
  const groups = [["Pixel faces", AVATAR_STYLES.filter((avatar) => avatar.value.startsWith("twyn-"))], ["Critters", AVATAR_STYLES.filter((avatar) => avatar.value.startsWith("critters-"))]] as const;
  return <div className="space-y-7">
    {groups.map(([title, avatars]) => <section key={title}><div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">{title}</div><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {avatars.map((avatar) => <button key={avatar.value} type="button" onClick={() => onChange(avatar.value)} aria-label={`Choose ${avatar.label} avatar`} aria-pressed={value === avatar.value} className={clsx("group relative rounded-2xl border bg-white/70 p-2 text-center transition duration-200 hover:-translate-y-0.5 hover:bg-white", value === avatar.value ? "border-ink ring-2 ring-ink/10" : "border-rule")}>
        <ProfileAvatar seed={seed} style={avatar.value} background={background} size={64} className="mx-auto shadow-sm transition group-hover:scale-[1.03]" />
        <span className="mt-1.5 block text-[11px] font-medium text-ink-soft">{avatar.label}</span>
        {value === avatar.value && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-canvas"><Check size={12} weight="bold" /></span>}
      </button>)}
    </div></section>)}
  </div>;
}

export function AvatarPickerModal({ seed, value, background = "d9cdf6", onChange }: { seed: string; value: AvatarStyle; background?: string; onChange: (value: AvatarStyle) => void }) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const selected = AVATAR_STYLES.find((avatar) => avatar.value === value) || AVATAR_STYLES[0];
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButton.current?.focus(), 0);
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; };
  }, [open]);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-rule bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-canvas">
      <ProfileAvatar seed={seed} style={value} background={background} size={24} /> Change avatar
    </button>
    {open && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[999] bg-[#fcfaf7]" role="dialog" aria-modal="true" aria-labelledby="avatar-picker-title">
      <div className="flex h-[100dvh] w-full flex-col">
        <div className="shrink-0 border-b border-rule/80 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-10 sm:pb-5 sm:pt-7">
          <div className="mx-auto flex w-full max-w-[860px] items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <ProfileAvatar seed={seed} style={value} background={background} size={64} className="shrink-0 ring-4 ring-white/80 sm:h-[76px] sm:w-[76px]" />
              <div className="min-w-0"><p className="eyebrow">Profile picture</p><h2 id="avatar-picker-title" className="display mt-1 text-[24px] sm:text-[32px]">Choose your avatar</h2><p className="mt-1 truncate text-[12px] text-ink-soft sm:text-[13px]">{selected.label} · saved to your profile</p></div>
            </div>
            <button ref={closeButton} type="button" aria-label="Close avatar picker" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rule bg-white text-ink-soft transition hover:text-ink sm:h-11 sm:w-11"><X size={18} /></button>
          </div>
        </div>
        <div data-lenis-prevent="true" className="twyn-scrollbar min-h-0 flex-1 overflow-y-scroll overscroll-contain px-5 py-6 sm:px-10 sm:py-10 [touch-action:pan-y]" onWheel={(event) => event.stopPropagation()}>
          <div className="mx-auto w-full max-w-[860px]">
            <p className="mb-5 max-w-xl text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">Pick a friendly pixel face or a soft Critter. Every option is deterministic, so your profile stays consistent everywhere.</p>
            <AvatarStylePicker seed={seed} value={value} background={background} onChange={onChange} />
          </div>
        </div>
        <div className="shrink-0 border-t border-rule/80 bg-white/45 px-5 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-10 sm:py-4 sm:pb-4">
          <div className="mx-auto flex w-full max-w-[860px] justify-end"><button type="button" onClick={() => setOpen(false)} className="h-10 min-w-32 rounded-full bg-ink px-5 text-[13px] font-medium text-canvas transition hover:bg-ink-soft">Done</button></div>
        </div>
      </div>
    </div>, document.body) : null}
  </>;
}
