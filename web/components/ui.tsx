    "use client";
    import Link from "next/link";
    import { motion } from "motion/react";
    import clsx from "clsx";
    import { ReactNode } from "react";

    export const W = "mx-auto w-[min(1040px,calc(100%-2rem))]";

    export function Button({ children, variant = "primary", size = "md", className, ...p }: any) {
      const styles: Record<string, string> = {
        primary: "bg-ink text-canvas hover:bg-ink-soft",
        clay: "clay-sm bg-white text-ink hover:bg-canvas",
        lilac: "clay-sm bg-lilac text-ink",
        mint: "clay-sm bg-mint text-ink",
        ghost: "text-ink-soft hover:text-ink hover:bg-ink/[0.04]",
      };
      const sizes: Record<string, string> = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-4 text-[13.5px]", lg: "h-10 px-5 text-sm" };
      return (
        <motion.button whileTap={{ scale: 0.98 }}
          className={clsx("inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50", sizes[size], styles[variant], className)} {...p}>
          {children}
        </motion.button>
      );
    }

    export function Card({ children, className, glass }: { children: ReactNode; className?: string; glass?: boolean }) {
      return <div className={clsx(glass ? "glass" : "clay", "p-5", className)}>{children}</div>;
    }

    export function Pill({ children, tone = "lilac", className }: { children: ReactNode; tone?: string; className?: string }) {
      const m: Record<string, string> = { lilac: "bg-lilac", mint: "bg-mint", peach: "bg-peach", sky: "bg-sky", butter: "bg-butter", white: "bg-white hairline" };
      return <span className={clsx("inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-ink", m[tone], className)}>{children}</span>;
    }

    export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
      return (
        <label className="block">
          <div className="mb-1.5 flex items-baseline justify-between"><span className="text-[13px] font-medium text-ink">{label}</span>{hint && <span className="text-[11px] text-ink-mute">{hint}</span>}</div>
          {children}
        </label>
      );
    }

    export function Mark({ size = 24, className }: { size?: number; className?: string }) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src="/brand/mark.svg" alt="" width={size} height={size} className={className} />;
    }

    export function TwynLoader({ label = "Getting things ready", compact = false }: { label?: string; compact?: boolean }) {
      return (
        <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center ${compact ? "gap-2 py-8" : "min-h-[70vh] gap-3"}`}>
          <span className={`twyn-loader-mark grid place-items-center rounded-full bg-white/80 ${compact ? "h-12 w-12" : "h-16 w-16"}`}>
            <Mark size={compact ? 23 : 29} />
          </span>
          <span className="text-[12.5px] font-medium text-ink-soft">{label}</span>
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => <i key={i} className="twyn-loader-dot h-1.5 w-1.5 rounded-full bg-lilac-deep" style={{ animationDelay: `${i * 160}ms` }} />)}
          </span>
        </div>
      );
    }

    export function Logo({ href = "/" }: { href?: string }) {
      return (
        <Link href={href} aria-label="Twyn home" className="group flex items-center gap-1.5">
          <Mark size={22} className="transition-transform duration-300 ease-out group-hover:-rotate-6" />
          <span className="font-display text-[17px] leading-none tracking-[-0.01em]">Twyn</span>
        </Link>
      );
    }

    /** Quiet page backdrop: two flat pastel shapes and a faint dot grid. No gradients. */
    export function Backdrop() {
      return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute right-[-160px] top-[-200px] h-[420px] w-[420px] rounded-full bg-lilac/45" />
          <div className="absolute bottom-[-220px] left-[-160px] h-[380px] w-[380px] rounded-full bg-mint/45" />
        </div>
      );
    }

    export function Nav({ right }: { right?: ReactNode }) {
      const a = "hidden rounded-full px-2.5 py-1 text-[13px] text-ink-soft transition-colors hover:text-ink sm:block";
      return (
        <header className="nav-shell sticky top-0 z-30 bg-canvas/82 backdrop-blur-xl">
          <div className={`${W} flex h-12 items-center justify-between`}>
            <div className="flex items-center gap-5">
              <Logo />
              {!right && <nav className="flex items-center"><Link className={a} href="/#how">How it works</Link><Link className={a} href="/#features">Features</Link><Link className={a} href="/#faq">FAQ</Link></nav>}
            </div>
            <nav className="flex items-center gap-1 text-[13px]">
              {right ?? (<>
                <Link className="rounded-full px-2.5 py-1 text-ink-soft transition-colors hover:text-ink" href="/login">Sign in</Link>
                <Link href="/login?next=/onboarding" className="ml-1 inline-flex h-7 items-center rounded-full bg-ink px-3 text-[12.5px] font-medium text-canvas transition-colors hover:bg-ink-soft">Create Your Twin</Link>
              </>)}
            </nav>
          </div>
        </header>
      );
    }

    export function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
      return (
        <div className="mb-8 max-w-xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="display mt-2 text-[28px] md:text-[34px]">{title}</h2>
          {children && <p className="mt-2 text-[15px] text-ink-soft">{children}</p>}
        </div>
      );
    }
