"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, CalendarCheck } from "lucide-react";
import { Logo } from "@/components/ui";
import { Orb } from "@/components/Orb";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const W = "mx-auto w-[min(1200px,calc(100%-2.5rem))]";

function ClaimBar() {
  const r = useRouter(); const [h, setH] = useState("");
  const go = () => r.push(`/login?handle=${encodeURIComponent(h.toLowerCase().replace(/[^a-z0-9-]/g, ""))}`);
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className="clay flex w-full max-w-[26rem] items-center gap-1 p-1.5" style={{ borderRadius: 999 }}>
      <label htmlFor="claim" className="pl-5 text-[15px] text-ink-mute">proxy.app/</label>
      <input id="claim" name="handle" autoComplete="username" value={h} onChange={(e) => setH(e.target.value)} placeholder="yourname"
        className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium text-ink outline-none placeholder:text-ink-mute/60" />
      <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-[15px] font-medium text-canvas transition-colors duration-150 hover:bg-ink-soft">
        Claim it <ArrowRight size={16} />
      </button>
    </form>
  );
}

function Call() {
  const lines: [string, string][] = [
    ["them", "Bhai aapka rate kitna hai?"],
    ["proxy", "MVP builds 25,000 rupees per week se start hote hain. Discovery call free hai."],
    ["them", "Kal 3 baje ho sakta hai?"],
  ];
  return (
    <div className="relative">
      <div aria-hidden className="absolute -right-6 -top-8 h-44 w-44 rounded-full bg-lilac" />
      <div aria-hidden className="absolute -bottom-6 -left-8 h-28 w-52 rounded-full bg-mint" />
      <div className="glass relative p-3" style={{ borderRadius: 34 }}>
        <div className="clay flex items-center gap-4 p-4" style={{ borderRadius: 24 }}>
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-visible"><Orb size={44} state="speaking" level={0.3} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Hardik&rsquo;s Proxy</p>
            <p className="text-sm text-ink-mute">On a call with Ravi, Hinglish</p>
          </div>
          <span className="tnum rounded-full bg-paper-2 px-3 py-1 font-mono text-[13px] text-ink-soft">01:42</span>
        </div>
        <ol className="space-y-2.5 px-3 pb-2 pt-5">
          {lines.map(([who, t], i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 + i * 0.09, ease }}
              className={who === "them" ? "ml-auto w-fit max-w-[80%] rounded-[20px] rounded-br-md bg-ink px-4 py-2.5 text-[15px] text-canvas" : "w-fit max-w-[85%] rounded-[20px] rounded-bl-md bg-canvas px-4 py-2.5 text-[15px]"}>
              {t}
            </motion.li>
          ))}
        </ol>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.55, ease }}
          className="clay-sm m-2 mt-3 flex items-center gap-3 bg-mint px-4 py-3.5">
          <CalendarCheck size={18} className="shrink-0 text-mint-deep" />
          <div className="min-w-0"><p className="font-medium">Discovery call booked</p><p className="text-sm text-ink-soft">Sun 1 Nov, 3:00 PM IST. Invite sent to Ravi.</p></div>
        </motion.div>
      </div>
    </div>
  );
}

const langs: [string, boolean][] = [["English", true], ["हिन्दी", false], ["Hinglish", true], ["தமிழ்", false], ["मराठी", false], ["and more", true]];

const steps: [string, string, string, string][] = [
  ["Thirty seconds of you", "Read a short paragraph out loud. Gnani Timbre clones the voice, Prisma hears every caller.", "bg-lilac", "Voice"],
  ["Your notes, nothing else", "Bio, rates, FAQs and docs. If the answer is not in there, it says so and takes a message.", "bg-peach", "Knowledge"],
  ["Your calendar, your hours", "It reads free slots from Google Calendar and books the call before it hangs up.", "bg-sky", "Calendar"],
];

export default function Landing() {
  return (
    <main className="min-h-screen overflow-x-clip">
      <header className={`${W} flex h-20 items-center justify-between`}>
        <Logo />
        <nav className="flex items-center gap-1 text-[15px]">
          <Link href="/p/hardik" className="hidden rounded-full px-3.5 py-2 text-ink-soft hover:text-ink sm:block">Live demo</Link>
          <Link href="#how" className="hidden rounded-full px-3.5 py-2 text-ink-soft hover:text-ink sm:block">How it works</Link>
          <Link href="/login" className="rounded-full px-3.5 py-2 text-ink-soft hover:text-ink">Sign in</Link>
        </nav>
      </header>

      <section className={`${W} grid items-center gap-14 pb-24 pt-10 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20`}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
          <h1 className="display max-w-[11ch] text-[clamp(3.25rem,7.4vw,6.5rem)]">You, on call. Even when you&rsquo;re not.</h1>
          <p className="mt-7 max-w-[34ch] text-lg leading-relaxed text-ink-soft md:text-xl">
            A link where anyone can talk to an AI you, in your voice and their language.
          </p>
          <div className="mt-10"><ClaimBar /></div>
          <Link href="/p/hardik" className="mt-5 inline-flex items-center gap-1 text-[15px] text-ink-soft underline decoration-ink/25 underline-offset-4 hover:text-ink">
            Talk to Hardik&rsquo;s Proxy first <ArrowUpRight size={15} />
          </Link>
        </motion.div>
        <Call />
      </section>

      <section aria-label="Languages" className="border-y border-rule">
        <div className={`${W} flex flex-wrap items-baseline gap-x-10 gap-y-3 py-7`}>
          <p className="text-[15px] text-ink-mute">It answers in</p>
          {langs.map(([l, lat]) => <span key={l} className={lat ? "font-display text-2xl text-ink md:text-3xl" : "text-xl font-medium text-ink md:text-2xl"}>{l}</span>)}
        </div>
      </section>

      <section id="how" className={`${W} grid gap-12 py-28 lg:grid-cols-[0.8fr_1.2fr]`}>
        <div className="lg:sticky lg:top-12 lg:self-start">
          <h2 className="display max-w-[12ch] text-5xl md:text-6xl">Five minutes to a second you.</h2>
          <p className="mt-5 max-w-[36ch] text-lg text-ink-soft">Teach it once. It handles the calls you would have missed.</p>
        </div>
        <ol className="space-y-5">
          {steps.map(([t, d, tone, tag], i) => (
            <li key={t} className="clay grid grid-cols-[auto_1fr] gap-6 p-7 md:p-9">
              <span className={`clay-sm grid h-14 w-14 place-items-center font-display text-2xl ${tone}`}>{i + 1}</span>
              <div>
                <p className="label">{tag}</p>
                <h3 className="mt-1 text-3xl">{t}</h3>
                <p className="mt-2 max-w-[48ch] text-ink-soft">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${W} pb-28`}>
        <div className="clay-pressed grid gap-10 p-8 md:grid-cols-2 md:p-14" style={{ borderRadius: 32 }}>
          <div>
            <h2 className="display max-w-[14ch] text-4xl md:text-5xl">Read every call. Take over any time.</h2>
          </div>
          <dl className="grid content-start gap-6 sm:grid-cols-2">
            {[["Live transcript", "Every chat and call lands on your dashboard as it happens."], ["One-tap takeover", "Jump into a chat and reply as yourself."], ["Leads, sorted", "Names, asks and follow-ups, without a spreadsheet."], ["Credits guarded", "Rate limits stop strangers from burning your voice minutes."]].map(([t, d]) => (
              <div key={t} className="border-t border-rule pt-4"><dt className="font-bold">{t}</dt><dd className="mt-1 text-ink-soft">{d}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section className={`${W} relative pb-28`}>
        <div aria-hidden className="absolute right-[6%] top-2 h-40 w-40 rotate-12 rounded-[44px] bg-butter" />
        <div className="glass relative flex flex-col items-start gap-8 p-8 md:flex-row md:items-end md:justify-between md:p-14" style={{ borderRadius: 34 }}>
          <div>
            <h2 className="display text-5xl md:text-7xl">Claim your link.</h2>
            <p className="mt-4 text-lg text-ink-soft">Free while in beta. No card.</p>
          </div>
          <ClaimBar />
        </div>
      </section>

      <footer className={`${W} flex flex-col items-start justify-between gap-4 border-t border-rule py-8 text-[15px] text-ink-mute sm:flex-row sm:items-center`}>
        <div className="flex items-center gap-4"><Logo /><span>Built for the Gnani AI Internship Challenge</span></div>
        <div className="flex gap-6"><Link href="/p/hardik" className="hover:text-ink">Demo</Link><Link href="/login" className="hover:text-ink">Sign in</Link></div>
      </footer>
    </main>
  );
}
