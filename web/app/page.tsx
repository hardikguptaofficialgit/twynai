"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, AudioLines, BookOpenCheck, CalendarCheck, Languages, Hand } from "lucide-react";
import { Logo } from "@/components/ui";
import { Orb } from "@/components/Orb";

const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } };

function ClaimBar({ big }: { big?: boolean }) {
  const r = useRouter(); const [h, setH] = useState("");
  const go = () => r.push(`/login?handle=${encodeURIComponent(h.toLowerCase().replace(/[^a-z0-9-]/g, ""))}`);
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className={`clay mx-auto flex w-full max-w-md items-center gap-1 p-1.5 ${big ? "" : ""}`} style={{ borderRadius: 20 }}>
      <span className="pl-4 text-sm text-ink-mute">proxy.app/</span>
      <input value={h} onChange={(e) => setH(e.target.value)} placeholder="yourname" aria-label="Your handle"
        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium text-ink outline-none placeholder:text-ink-mute/70" />
      <button className="inline-flex items-center gap-1.5 rounded-[14px] bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-[#33334f]">
        Claim <ArrowRight size={15} />
      </button>
    </form>
  );
}

function Preview() {
  return (
    <div className="glass mx-auto w-full max-w-4xl p-2.5" style={{ borderRadius: 30 }}>
      <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-1">
        {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-ink/10" />)}
        <span className="mx-auto rounded-lg bg-white/70 px-3 py-1 text-[11px] text-ink-mute">proxy.app/hardik</span>
      </div>
      <div className="grid gap-2.5 md:grid-cols-[1fr_1.35fr]">
        <div className="clay grid place-items-center px-6 py-8" style={{ borderRadius: 22 }}>
          <Orb size={120} state="speaking" level={0.35} />
          <p className="mt-1 text-sm font-medium">Hardik's Proxy</p>
          <p className="text-xs text-ink-mute">Speaking in his voice, in Hinglish</p>
        </div>
        <div className="clay flex flex-col gap-3 p-5" style={{ borderRadius: 22 }}>
          <div className="self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">Bhai aapka rate kitna hai?</div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-ink shadow-[0_4px_14px_rgba(104,98,150,.10)]">MVP builds 25,000 rupees per week se start hote hain. Discovery call free hai, kal 3 baje slot book kar doon?</div>
          <div className="self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">Haan, book kar do.</div>
          <div className="flex items-center gap-3 rounded-2xl bg-mint px-4 py-3 text-sm">
            <CalendarCheck size={17} className="text-mint-deep" />
            <div><p className="font-medium">Discovery call booked</p><p className="text-xs text-ink-soft">Sat 31 Oct, 3:00 PM IST · invite sent</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: AudioLines, tone: "bg-lilac", t: "Your voice", d: "Thirty seconds of audio and Proxy speaks like you, powered by Gnani Timbre." },
  { icon: Languages, tone: "bg-sky", t: "Their language", d: "Hindi, Hinglish, Tamil, Bengali and more. It replies in whatever the caller speaks." },
  { icon: BookOpenCheck, tone: "bg-peach", t: "Only what you know", d: "Grounded in your bio, rates, FAQs and documents. If it is not in your notes, it says so." },
  { icon: CalendarCheck, tone: "bg-mint", t: "Books the meeting", d: "Checks your Google Calendar and confirms a slot before the conversation ends." },
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-[min(1080px,calc(100%-2.5rem))] items-center justify-between py-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/p/hardik" className="rounded-xl px-3 py-2 text-ink-soft hover:text-ink">Demo</Link>
          <Link href="#how" className="hidden rounded-xl px-3 py-2 text-ink-soft hover:text-ink sm:block">How it works</Link>
          <Link href="/login" className="rounded-xl px-3 py-2 text-ink-soft hover:text-ink">Sign in</Link>
          <Link href="/login" className="clay-sm ml-1 bg-white px-4 py-2 font-medium text-ink">Get started</Link>
        </nav>
      </header>

      <section className="mx-auto w-[min(1080px,calc(100%-2.5rem))] pb-20 pt-16 text-center md:pt-24">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-mint-deep" /> Voice by Gnani Prisma and Timbre
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-7xl">
            You, on call.<br /><span className="text-ink-mute">Even when you are not.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            One link where anyone can talk to an AI version of you, in your voice and their language.
          </p>
          <div className="mt-9"><ClaimBar /></div>
          <Link href="/p/hardik" className="mt-4 inline-block text-sm text-ink-soft underline decoration-ink/20 underline-offset-4 hover:text-ink">or talk to Hardik's Proxy</Link>
        </motion.div>
        <motion.div className="mt-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
          <Preview />
        </motion.div>
      </section>

      <section id="how" className="mx-auto w-[min(1080px,calc(100%-2.5rem))] py-20">
        <motion.div {...fade} className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-mute">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Live in five minutes.</h2>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[["01", "Teach it", "Add your bio, rates, FAQs and a voice sample."], ["02", "Connect your calendar", "Set the hours you take calls. Proxy handles the rest."], ["03", "Share your link", "Put it in your bio, email signature or missed-call SMS."]].map(([n, t, d], i) => (
            <motion.div key={n} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="clay p-7">
              <span className="font-mono text-xs text-ink-mute">{n}</span>
              <h3 className="mt-6 text-lg font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-[min(1080px,calc(100%-2.5rem))] py-20">
        <motion.div {...fade} className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-mute">Why Proxy</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">A persona, not a chatbot.</h2>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div key={f.t} {...fade} transition={{ ...fade.transition, delay: i * 0.06 }} className="clay flex gap-5 p-7">
              <span className={`clay-sm grid h-11 w-11 shrink-0 place-items-center ${f.tone}`}><f.icon size={19} /></span>
              <div><h3 className="font-semibold">{f.t}</h3><p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.d}</p></div>
            </motion.div>
          ))}
        </div>
        <motion.div {...fade} className="glass mt-4 flex items-center gap-4 p-6">
          <span className="clay-sm grid h-11 w-11 shrink-0 place-items-center bg-butter"><Hand size={19} /></span>
          <p className="text-sm text-ink-soft"><span className="font-semibold text-ink">You stay in control.</span> Read every conversation as it happens and take over with one tap.</p>
        </motion.div>
      </section>

      <section className="mx-auto w-[min(1080px,calc(100%-2.5rem))] py-24 text-center">
        <motion.div {...fade}>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Claim your link.</h2>
          <p className="mx-auto mt-4 max-w-md text-ink-soft">Free while in beta. No card required.</p>
          <div className="mt-8"><ClaimBar /></div>
        </motion.div>
      </section>

      <footer className="mx-auto flex w-[min(1080px,calc(100%-2.5rem))] flex-col items-center justify-between gap-4 border-t border-ink/8 py-8 text-sm text-ink-mute sm:flex-row">
        <div className="flex items-center gap-3"><Logo /><span>Built for the Gnani AI Internship Challenge</span></div>
        <div className="flex gap-5"><Link href="/p/hardik" className="hover:text-ink">Demo</Link><Link href="/login" className="hover:text-ink">Sign in</Link><a href="https://github.com" className="hover:text-ink">GitHub</a></div>
      </footer>
    </main>
  );
}
