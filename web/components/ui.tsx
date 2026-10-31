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

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="clay-sm relative grid h-9 w-9 place-items-center bg-lilac" style={{ borderRadius: 12 }}><span className="h-3 w-3 rounded-full bg-ink" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-mint-deep" /></span>
      <span className="font-display text-[22px] leading-none tracking-[-0.02em]">Proxy</span>
    </Link>
  );
}

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="blob left-[-6%] top-[-8%] h-[360px] w-[360px] bg-lilac" />
      <div className="absolute right-[8%] top-[14%] h-[220px] w-[220px] rotate-12 rounded-[56px] bg-mint" />
      <div className="blob bottom-[-14%] left-[30%] h-[340px] w-[340px] bg-peach" />
      <div className="absolute bottom-[12%] right-[-3%] h-[160px] w-[260px] rounded-full bg-butter" />
    </div>
  );
}

export function Nav({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-4 z-30 mx-auto mt-4 w-[min(1180px,calc(100%-2rem))]">
      <div className="glass flex items-center justify-between rounded-[22px] px-5 py-3">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          {right ?? (<>
            <Link className="rounded-xl px-3 py-2 text-ink-soft hover:text-ink" href="/p/hardik">Live demo</Link>
            <Link className="rounded-xl px-3 py-2 text-ink-soft hover:text-ink" href="/studio">Studio</Link>
            <Link className="rounded-xl px-3 py-2 text-ink-soft hover:text-ink" href="/dashboard">Dashboard</Link>
            <Link href="/login" className="ml-2 rounded-full bg-ink px-4 py-2 text-canvas">Get your Proxy</Link>
          </>)}
        </nav>
      </div>
    </header>
  );
}
