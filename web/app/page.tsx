"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, CalendarCheck } from "lucide-react";
import { Backdrop, Logo, Nav, SectionHead, W } from "@/components/ui";
import { Orb } from "@/components/Orb";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function ClaimBar() {
  const r = useRouter(); const [h, setH] = useState("");
  const go = () => r.push(`/login?handle=${encodeURIComponent(h.toLowerCase().replace(/[^a-z0-9-]/g, ""))}`);
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className="clay flex w-full max-w-[26rem] items-center gap-1 p-1.5" style={{ borderRadius: 999 }}>
      <label htmlFor="claim" className="pl-5 text-[15px] text-ink-mute">twyn.ai/</label>
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
    ["twyn", "MVP builds 25,000 rupees per week se start hote hain. Discovery call free hai."],
    ["them", "Kal 3 baje ho sakta hai?"],
  ];
  return (
    <div className="relative">
            <div className="glass relative p-3" style={{ borderRadius: 34 }}>
        <div className="clay flex items-center gap-4 p-4" style={{ borderRadius: 24 }}>
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-visible"><Orb size={44} state="speaking" level={0.3} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Hardik&rsquo;s Twyn</p>
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

const features: [string, string][] = [
  ["Live transcript", "Every chat and call lands on your dashboard as it happens."],
  ["One-tap takeover", "Jump into a chat and reply as yourself."],
  ["Leads, sorted", "Names, asks and follow-ups, without a spreadsheet."],
  ["Credits guarded", "Rate limits stop strangers from burning your voice minutes."],
];

const fade = (d = 0) => ({ initial: { opacity: 0, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.6, delay: d, ease } });

export default function Landing() {
  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <Nav />

      <section className={`${W} grid items-center gap-14 py-16 md:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16`}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          <h1 className="display min-w-0 max-w-[11ch] text-[clamp(3.1rem,6.8vw,6rem)] [overflow-wrap:break-word]">You, on call. Even when you&rsquo;re not.</h1>
          <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-ink-soft md:text-xl">
            Twyn AI is a link where anyone can talk to an AI you, in your voice and their language.
          </p>
          <div className="mt-9"><ClaimBar /></div>
          <Link href="/p/hardik" className="mt-5 inline-flex items-center gap-1.5 text-[15px] text-ink-soft underline decoration-ink/25 underline-offset-4 transition-colors hover:text-ink">
            Talk to Hardik&rsquo;s Twyn first <ArrowUpRight size={15} />
          </Link>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease }}><Call /></motion.div>
      </section>

      <section aria-label="Languages" className="border-y border-rule bg-canvas/60">
        <div className={`${W} grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7`}>
          <p className="col-span-2 flex items-center py-6 text-[15px] text-ink-mute sm:col-span-3 lg:col-span-1">It answers in</p>
          {langs.map(([l, lat]) => <span key={l} className={`flex items-center border-rule py-6 lg:border-l lg:pl-6 ${lat ? "font-display text-2xl md:text-3xl" : "text-xl font-medium md:text-2xl"}`}>{l}</span>)}
        </div>
      </section>

      <section id="how" className={`${W} scroll-mt-20 py-24`}>
        <motion.div {...fade()}><SectionHead n="01" title="Five minutes to a second you."><p className="max-w-[36ch] text-ink-soft">Teach it once. It handles the calls you would have missed.</p></SectionHead></motion.div>
        <ol className="grid md:grid-cols-3">
          {steps.map(([t, d, tone, tag], i) => (
            <motion.li key={t} {...fade(i * 0.08)} className={`border-rule py-10 md:px-8 ${i ? "border-t md:border-l md:border-t-0" : "md:pl-0"} ${i === 2 ? "md:pr-0" : ""}`}>
              <div className="flex items-center gap-3">
                <span className={`clay-sm grid h-11 w-11 place-items-center font-display text-xl ${tone}`}>{i + 1}</span>
                <span className="label">{tag}</span>
              </div>
              <h3 className="mt-7 text-[1.9rem] leading-tight">{t}</h3>
              <p className="mt-3 max-w-[38ch] text-ink-soft">{d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="border-t border-rule">
        <div className={`${W} grid gap-12 py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}>
          <motion.div {...fade()}>
            <p className="tnum font-mono text-[13px] text-ink-mute">02</p>
            <h2 className="display mt-3 max-w-[13ch] text-4xl md:text-5xl">Read every call. Take over any time.</h2>
          </motion.div>
          <dl className="grid sm:grid-cols-2">
            {features.map(([t, d], i) => (
              <motion.div key={t} {...fade(i * 0.06)} className={`border-t border-rule py-6 sm:pr-8 ${i % 2 ? "sm:border-l sm:pl-8" : ""}`}>
                <dt className="font-bold">{t}</dt><dd className="mt-1.5 text-ink-soft">{d}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-rule">
        <div className={`${W} py-24`}>
          <motion.div {...fade()} className="glass flex flex-col items-start gap-8 p-8 md:flex-row md:items-end md:justify-between md:p-14" style={{ borderRadius: 32 }}>
            <div>
              <h2 className="display text-5xl md:text-7xl">Claim your link.</h2>
              <p className="mt-4 text-lg text-ink-soft">Free while in beta. No card.</p>
            </div>
            <ClaimBar />
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className={`${W} flex flex-col items-start justify-between gap-4 py-8 text-[15px] text-ink-mute sm:flex-row sm:items-center`}>
          <div className="flex flex-wrap items-center gap-4"><Logo /><span>Twyn AI · Built for the Gnani AI Internship Challenge</span></div>
          <div className="flex gap-6"><Link href="/p/hardik" className="hover:text-ink">Demo</Link><Link href="/login" className="hover:text-ink">Sign in</Link></div>
        </div>
      </footer>
    </main>
  );
}
