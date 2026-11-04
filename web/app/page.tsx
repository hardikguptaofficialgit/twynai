"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, CalendarCheck, ChatCircle, Microphone, BookOpenText, Hand, Users, ShieldCheck, Translate, Waveform, UserPlus, MagnifyingGlass } from "@phosphor-icons/react";
import { Backdrop, Logo, Nav, SectionHead, W } from "@/components/ui";
import { token } from "@/lib/api";
import HeroAscii from "@/components/bg/HeroAscii";
import { Marquee } from "@/components/ui-kit/marquee";
import { AnimatedList } from "@/components/ui-kit/animated-list";
import { NumberTicker } from "@/components/ui-kit/number-ticker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui-kit/accordion";
import { ModelStack } from "@/components/ModelStack";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fade = (d = 0) => ({ initial: { opacity: 0, y: 8 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.5, delay: d, ease } });
const pixelColors = ["#a99fe0", "#9cc6e4", "#a8dcc3", "#c9c1f0"];

function PixelField({ className = "" }: { className?: string }) {
  const pixels = Array.from({ length: 72 }, (_, i) => {
    const x = (i * 37) % 101;
    const y = (i * 61) % 101;
    return { x, y, color: pixelColors[i % pixelColors.length], size: 7 + (i % 3) * 2 };
  });
  return (
    <div aria-hidden className={`pixel-field ${className}`}>
      {pixels.map((pixel, i) => (
        <motion.span
          key={i}
          className="pixel-field__cell"
          style={{ left: `${pixel.x}%`, top: `${pixel.y}%`, width: pixel.size, height: pixel.size, backgroundColor: pixel.color }}
          animate={{ opacity: [0.28, 0.8, 0.28], y: [0, -3, 0] }}
          transition={{ duration: 3.2 + (i % 4) * 0.35, repeat: Infinity, delay: (i % 7) * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function SoundWave() {
  const shouldReduce = useReducedMotion();
  const bars = [
    { min: 4, mid: 12, max: 6 },
    { min: 6, mid: 15, max: 8 },
    { min: 8, mid: 17, max: 10 },
    { min: 5, mid: 14, max: 7 },
    { min: 4, mid: 10, max: 5 },
  ];
  return (
    <div aria-hidden="true" className="flex h-4 items-center gap-[2.5px] px-0.5">
      {bars.map((b, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full"
          style={{ backgroundColor: "var(--color-lilac-deep)", opacity: 0.6 }}
          animate={shouldReduce ? { height: b.min + 4 } : { height: [b.min, b.mid, b.max, b.mid * 0.75, b.min] }}
          transition={
            shouldReduce
              ? { duration: 0 }
              : { duration: 1.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.14 }
          }
        />
      ))}
    </div>
  );
}

function ClaimBar({ className = "" }: { className?: string }) {
  const r = useRouter(); const [h, setH] = useState("");
  const go = () => {
    const clean = h.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const target = token() ? `/onboarding?handle=${encodeURIComponent(clean)}` : `/login?next=${encodeURIComponent(`/onboarding?handle=${clean}`)}&handle=${encodeURIComponent(clean)}`;
    r.push(target);
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className={`clay flex w-full max-w-[22rem] items-center gap-1 p-1 ${className}`} style={{ borderRadius: 999 }}>
      <label htmlFor="claim" className="pl-3.5 font-mono text-[12.5px] text-ink-mute">twyn.ai/</label>
      <input id="claim" name="handle" autoComplete="username" value={h} onChange={(e) => setH(e.target.value)} placeholder="yourname"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-[13.5px] font-medium text-ink outline-none placeholder:text-ink-mute/60" />
      <button type="submit" className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3.5 text-[13px] font-medium text-canvas transition-colors hover:bg-ink-soft">
        Claim <ArrowRight size={13} weight="bold" />
      </button>
    </form>
  );
}

function CallCard() {
 const lines: [string, string][] = [
  ["them", "Bhai, ek app banwana tha. Kitna charge karte ho?"],
  ["twyn", "Depends on the scope. Usually we start with a quick discovery call to understand what you need."],
  ["them", "Achha, kal 3 baje baat kar sakte hain?"],
];
  return (
    <div className="glass p-2" style={{ borderRadius: 22 }}>
      <div className="clay flex items-center gap-3 p-3" style={{ borderRadius: 16 }}>
       <div className="clay-sm relative grid h-9 w-9 shrink-0 place-items-center overflow-visible rounded-full bg-lilac">
  <Image
    src="/images/profile.png"
    alt="Profile"
    fill
    className="rounded-full object-cover"
    sizes="36px"
  />

  <span
    aria-label="Live"
    className="absolute -bottom-0.5 -right-0.5 z-10 h-3 w-3 rounded-full border-[1.5px] border-white bg-mint shadow-[0_1px_2px_oklch(40%_0.03_70_/_0.1)]"
  />
</div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Hardik&rsquo;s Twyn</p>
          <p className="text-[12px] text-ink-mute">On a call with Ravi · Hinglish</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SoundWave />
          <span className="tnum rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[11px] text-ink-soft">01:42</span>
        </div>
      </div>
      <ol className="space-y-2 px-2 pb-1 pt-3">
        {lines.map(([who, t], i) => (
          <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 + i * 0.12, ease }}
            className={who === "them" ? "ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[13px] text-canvas" : "w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] hairline"}>
            {t}
          </motion.li>
        ))}
      </ol>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7, ease }}
        className="clay-sm m-1.5 mt-2.5 flex items-center gap-2.5 bg-mint px-3 py-2.5">
        <CalendarCheck size={16} weight="duotone" className="shrink-0 text-mint-deep" />
        <div className="min-w-0"><p className="text-[13px] font-medium">Discovery call booked</p><p className="text-[12px] text-ink-soft">Sun 1 Nov, 3:00 PM IST · invite sent</p></div>
      </motion.div>
    </div>
  );
}

function CalendarMockup() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.65, delay: 0.35, ease }}
      className="glass ml-auto w-full max-w-[340px] p-2"
      style={{ borderRadius: 20 }}
    >
      <div className="clay p-3" style={{ borderRadius: 15 }}>
        <div className="flex items-center justify-between">
          <div><p className="text-[12px] font-medium">Your calendar</p><p className="text-[11px] text-ink-mute">November 2025</p></div>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-mint-deep"><CalendarCheck size={14} weight="duotone" /></span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-ink-mute">
          {days.map((day, i) => <span key={`${day}-${i}`} className="py-1">{day}</span>)}
          {Array.from({ length: 21 }, (_, i) => <span key={i} className={`grid h-6 place-items-center rounded-md ${i === 11 ? "bg-ink text-canvas" : i === 15 ? "bg-lilac text-ink" : "text-ink-soft"}`}>{i + 1}</span>)}
        </div>
        <motion.div initial={{ scaleX: 0.8, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.45, delay: 0.9, ease }} className="mt-3 flex origin-left items-center justify-between rounded-xl bg-mint px-3 py-2">
          <div><p className="text-[11px] font-medium">Discovery call</p><p className="text-[10px] text-ink-soft">Sun · 3:00 PM IST</p></div>
          <span className="text-[10px] font-medium text-mint-deep">Booked</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

const langs = ["English", "हिन्दी", "Hinglish", "தமிழ்", "मराठी", "తెలుగు", "ಕನ್ನಡ", "বাংলা"];

const steps: [string, string, any][] = [
  ["Record 30 seconds", "Read a paragraph aloud. Gnani Timbre clones your voice.", Microphone],
  ["Add what you know", "Bio, rates, FAQs and docs. Unknowns become a message for you.", BookOpenText],
  ["Share your link", "It answers, qualifies and books from your Google Calendar.", CalendarCheck],
];

const events: [string, string, any, string][] = [
  ["Ravi asked about rates", "Hinglish · chat", ChatCircle, "bg-lilac"],
  ["Checked your calendar", "3 free slots tomorrow", MagnifyingGlass, "bg-sky"],
  ["Meeting booked", "Sun 3:00 PM IST", CalendarCheck, "bg-mint"],
  ["New lead saved", "Priya · design agency", UserPlus, "bg-butter"],
  ["Voice call answered", "Tamil · 2m 10s", Waveform, "bg-peach"],
];

const faqs: [string, string][] = [
  ["Does it really sound like me?", "Yes. Your 30 second sample is cloned with Gnani Timbre. Callers hear your voice, in their language."],
  ["What if it doesn't know an answer?", "It only answers from what you gave it. Anything else, it says so and saves a message for you."],
  ["Can I jump in?", "Any time. Open the dashboard, hit Take over, and you are replying live as yourself."],
  ["Which languages work?", "English, Hindi, Hinglish, Tamil, Marathi, Telugu, Kannada and Bengali, detected automatically."],
];

export default function Landing() {
  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <Nav />

      <div className="relative isolate">
      <HeroAscii />
      <section className={`${W} grid items-center gap-10 pb-14 pt-14 md:pt-20 lg:grid-cols-[1.1fr_0.9fr]`}>
        <div className="rounded-[28px] bg-white/55 p-5 backdrop-blur-md md:-ml-5 md:p-6" style={{ boxShadow: "0 10px 30px -12px rgba(60,50,110,.18)" }}>
          <motion.a href="/p/hardik" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white/70 pl-1 pr-2.5 text-[12px] text-ink-soft hairline hover:text-ink">
            <span className="rounded-full bg-mint px-1.5 text-[11px] font-medium text-ink">New</span> Voice in 8 Indian languages <ArrowRight size={11} />
          </motion.a>
          <h1 className="display mt-4 max-w-[14ch] text-[40px] md:text-[52px]">{"You, on call. Even when you’re not.".split(" ").map((w, i) => (
            <motion.span key={i} className="mr-[0.22em] inline-block" initial={{ opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.5, delay: 0.05 + i * 0.06, ease }}>{w}</motion.span>))}</h1>
          <motion.p {...fade(0.15)} className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-ink-soft">
            Twyn AI gives you a link where anyone can chat or talk to an AI you, in your voice and their language. It answers, qualifies and books calls while you work.
          </motion.p>
          <motion.div {...fade(0.25)} className="mt-6"><ClaimBar /></motion.div>
          <motion.div {...fade(0.3)} className="mt-3 flex items-center gap-4 text-[12.5px] text-ink-mute">
            <Link href="/p/hardik" className="inline-flex items-center gap-1 text-ink-soft underline decoration-ink/20 underline-offset-4 hover:text-ink">Try Hardik’s Twyn <ArrowUpRight size={12} /></Link>
            <span>Free in beta · no card</span>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="mx-auto w-full max-w-[400px]"><CallCard /></motion.div>
      </section>
      </div>

      <section aria-label="Languages" className="border-y border-rule bg-white/40">
        <div className={`${W} flex items-center gap-6 py-3`}>
          <p className="eyebrow shrink-0">Answers in</p>
          <Marquee pauseOnHover className="[--duration:28s] [--gap:2.5rem] p-0">
            {langs.map((l) => <span key={l} className="text-[15px] font-medium text-ink-soft">{l}</span>)}
          </Marquee>
        </div>
      </section>

      <section id="how" className={`${W} scroll-mt-16 py-16`}>
        <motion.div {...fade()}><SectionHead eyebrow="How it works" title="Five minutes to a second you.">Teach it once. It handles the calls you would have missed.</SectionHead></motion.div>
        <ol className="grid overflow-hidden rounded-[18px] hairline bg-white/50 md:grid-cols-3">
          {steps.map(([t, d, I], i) => (
            <motion.li key={t} {...fade(i * 0.06)} className={`p-5 ${i ? "border-t border-rule md:border-l md:border-t-0" : ""}`}>
              <div className="flex items-center justify-between"><span className="clay-sm grid h-8 w-8 place-items-center bg-white"><I size={16} weight="duotone" /></span><span className="tnum font-mono text-[11px] text-ink-mute">0{i + 1}</span></div>
              <h3 className="mt-5 text-[15px] font-medium" style={{ fontFamily: "var(--font-sans)", letterSpacing: 0 }}>{t}</h3>
              <p className="mt-1 text-[13.5px] text-ink-soft">{d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section id="features" className="border-t border-rule">
        <div className={`${W} scroll-mt-16 py-16`}>
          <motion.div {...fade()}><SectionHead eyebrow="Features" title="Read every call. Take over any time." /></motion.div>
          <div className="grid gap-3 md:grid-cols-6">
            <motion.div {...fade()} className="clay p-5 md:col-span-3 md:row-span-2">
              <p className="text-[15px] font-medium">Live activity</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">Every chat, call, lead and booking lands on your dashboard as it happens.</p>
              <div className="mt-4 h-[236px] overflow-hidden">
                <AnimatedList delay={1600}>
                  {events.map(([t, s, I, bg]) => (
                    <div key={t} className="flex w-full items-center gap-3 rounded-xl bg-white p-2.5 hairline">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${bg}`}><I size={15} /></span>
                      <div className="min-w-0"><p className="text-[13px] font-medium">{t}</p><p className="text-[12px] text-ink-mute">{s}</p></div>
                    </div>
                  ))}
                </AnimatedList>
              </div>
            </motion.div>
            <motion.div {...fade(0.06)} className="clay p-5 md:col-span-3 md:row-span-2">
              <p className="text-[15px] font-medium">Calendar handoff</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">Twyn finds a time, books the call and sends the invite while you stay focused.</p>
              <div className="mt-4"><CalendarMockup /></div>
            </motion.div>
            {([["One-tap takeover", "Jump into any conversation and reply as yourself, live.", Hand, "bg-peach"], ["Auto language", "Detects Hindi, Tamil or Hinglish and replies in kind, by voice or text.", Translate, "bg-sky"]] as const).map(([t, d, I, bg], i) => (
              <motion.div key={t} {...fade(0.05 * i)} className="clay p-5 md:col-span-3">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${bg}`}><I size={15} /></span>
                <p className="mt-6 text-[14px] font-medium">{t}</p><p className="mt-0.5 text-[13px] text-ink-soft">{d}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {([["Leads, sorted", "Names, asks and follow-ups.", Users, "bg-butter"], ["Credits guarded", "Rate limits on voice minutes.", ShieldCheck, "bg-lilac"]] as const).map(([t, d, I, bg], i) => (
              <motion.div key={t} {...fade()} className="clay p-4">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${bg}`}><I size={15} /></span>
                <p className="mt-3 text-[14px] font-medium">{t}</p><p className="mt-0.5 text-[13px] text-ink-soft">{d}</p>
              </motion.div>
            ))}
            {([[1.2, "s", "to first audio"], [8, "", "Indian languages"]] as const).map(([v, u, l]) => (
              <motion.div key={l} {...fade()} className="glass p-4">
                <p className="display tnum text-[30px]"><NumberTicker value={v} decimalPlaces={v % 1 ? 1 : 0} className="tracking-tight text-ink" />{u}</p>
                <p className="mt-1 text-[12.5px] text-ink-mute">{l}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-rule">
        <div className={`${W} grid scroll-mt-16 gap-8 py-16 md:grid-cols-[0.8fr_1.2fr]`}>
          <SectionHead eyebrow="FAQ" title="Questions, answered." />
          <Accordion type="single" collapsible defaultValue="0" className="rounded-[18px] bg-white/60 px-5 hairline">
            {faqs.map(([q, a], i) => (
              <AccordionItem key={q} value={String(i)}>
                <AccordionTrigger className="py-3.5 text-[14px]">{q}</AccordionTrigger>
                <AccordionContent className="text-[13.5px] text-ink-soft">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="pixel-section relative overflow-hidden border-t border-rule">
        <PixelField className="inset-y-0 left-0 w-full opacity-60" />
        <div className={`${W} relative z-10 py-16`}>
          <motion.div {...fade()} className="glass flex flex-col items-start gap-5 p-7 md:flex-row md:items-center md:justify-between md:p-9">
            <div>
              <h2 className="display text-[28px] md:text-[34px]">Claim your link.</h2>
              <p className="mt-1 text-[14px] text-ink-soft">Set up in five minutes. Free while in beta.</p>
            </div>
            <ClaimBar />
          </motion.div>
        </div>
      </section>

      <footer className="pixel-section relative overflow-hidden border-t border-rule">
        <PixelField className="inset-0 opacity-45" />
        <div className={`${W} relative z-10 flex flex-col items-start justify-between gap-4 py-7 text-[12.5px] text-ink-mute sm:flex-row sm:items-center`}>
          <div className="flex flex-wrap items-center gap-3"><Logo /><span>Built for the Gnani AI  Challenge</span></div>
          <div className="flex items-center gap-5">
            <ModelStack />
            <span className="flex items-center gap-2 border-l border-rule pl-5">Voice by <img src="https://cdn.prod.website-files.com/6848bfb15c1067d1b767ceb1/6a28e9711abd50da5dabc294_Layer_1.svg" alt="Gnani AI" className="h-5 w-auto" /></span>
            <Link href="/p/hardik" className="hover:text-ink">Demo</Link><Link href="/login" className="hover:text-ink">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
