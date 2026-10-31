"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ReactNode } from "react";

export function Button({ children, variant = "primary", className, ...p }: any) {
  const styles: Record<string, string> = {
    primary: "bg-ink text-canvas hover:bg-ink-soft",
    clay: "clay-sm bg-canvas text-ink hover:bg-white",
    lilac: "clay-sm bg-lilac text-ink",
    mint: "clay-sm bg-mint text-ink",
    ghost: "text-ink-soft hover:text-ink hover:bg-white/60",
  };
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97, y: 1 }}
      className={clsx("inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-5 py-2.5 text-[15px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55", styles[variant], className)} {...p}>
      {children}
    </motion.button>
  );
}

export function Card({ children, className, glass }: { children: ReactNode; className?: string; glass?: boolean }) {
  return <div className={clsx(glass ? "glass" : "clay", "p-6", className)}>{children}</div>;
}

export function Pill({ children, tone = "lilac", className }: { children: ReactNode; tone?: string; className?: string }) {
  const m: Record<string, string> = { lilac: "bg-lilac", mint: "bg-mint", peach: "bg-peach", sky: "bg-sky", butter: "bg-butter", white: "bg-white/70" };
  return <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-ink", m[tone], className)}>{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between"><span className="text-sm font-medium text-ink">{label}</span>{hint && <span className="text-xs text-ink-mute">{hint}</span>}</div>
      {children}
    </label>
  );
}

export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mark.svg" alt="" width={size} height={size} className={className} />;
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} aria-label="Kadi home" className="group flex items-center gap-2">
      <Mark size={34} className="transition-transform duration-300 ease-out group-hover:-rotate-6" />
      <span className="font-display text-[24px] leading-none tracking-[-0.02em]">Kadi</span>
    </Link>
  );
}

/** Page frame: two hairline rails at the container edges plus two quiet pastel shapes. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute right-[-120px] top-[-140px] h-[380px] w-[380px] rounded-full bg-lilac/60" />
      <div className="absolute bottom-[-160px] left-[-120px] h-[340px] w-[340px] rounded-full bg-mint/60" />
      <div className="frame-rails absolute inset-0" />
    </div>
  );
}

export const W = "mx-auto w-[min(1200px,calc(100%-2.5rem))]";

export function Nav({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-canvas/70 backdrop-blur-xl">
      <div className={`${W} flex h-16 items-center justify-between`}>
        <Logo />
        <nav className="flex items-center gap-1 text-[15px]">
          {right ?? (<>
            <Link className="hidden rounded-full px-3.5 py-2 text-ink-soft transition-colors hover:text-ink sm:block" href="/p/hardik">Live demo</Link>
            <Link className="hidden rounded-full px-3.5 py-2 text-ink-soft transition-colors hover:text-ink sm:block" href="/#how">How it works</Link>
            <Link className="rounded-full px-3.5 py-2 text-ink-soft transition-colors hover:text-ink" href="/login">Sign in</Link>
            <Link href="/login" className="ml-1 rounded-full bg-ink px-4 py-2 text-canvas transition-colors hover:bg-ink-soft">Get your link</Link>
          </>)}
        </nav>
      </div>
    </header>
  );
}

export function SectionHead({ n, title, children }: { n?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
      <div className="flex items-baseline gap-4">{n && <span className="tnum font-mono text-[13px] text-ink-mute">{n}</span>}<h2 className="display text-3xl md:text-4xl">{title}</h2></div>
      {children}
    </div>
  );
}
