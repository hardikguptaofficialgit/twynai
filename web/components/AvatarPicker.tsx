"use client";

import { Check } from "@phosphor-icons/react";
import clsx from "clsx";
import { ProfileAvatar, type AvatarStyle } from "@/components/ProfileAvatar";

export const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: "notionists-neutral", label: "Soft" },
  { value: "adventurer-neutral", label: "Friendly" },
  { value: "bottts-neutral", label: "Pixel" },
];

export function AvatarStylePicker({ seed, value, onChange }: { seed: string; value: AvatarStyle; onChange: (value: AvatarStyle) => void }) {
  return <div className="flex flex-wrap gap-2">
    {AVATAR_STYLES.map((style) => <button key={style.value} type="button" onClick={() => onChange(style.value)} aria-pressed={value === style.value} className={clsx("flex items-center gap-2 rounded-full border px-2 py-1.5 text-[12px] transition-colors", value === style.value ? "border-ink bg-white text-ink" : "border-rule bg-white/50 text-ink-soft hover:bg-white")}>
      <ProfileAvatar seed={seed} style={style.value} size={26} />{style.label}{value === style.value && <Check size={13} weight="bold" className="text-mint-deep" />}
    </button>)}
  </div>;
}
