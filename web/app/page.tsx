"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mic, CalendarCheck, Languages, BookOpen, Users, Hand, ArrowRight } from "lucide-react";
import { Nav, Backdrop, Pill, Card } from "@/components/ui";
import { Orb } from "@/components/Orb";

const fade = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };

const features = [
  { icon: Mic, tone: "bg-lilac", t: "Your cloned voice", d: "Upload 30 seconds of audio. Proxy answers callers in a voice that sounds like you, powered by Gnani Timbre." },
  { icon: Languages, tone: "bg-mint", t: "Speaks their language", d: "Hinglish, Tamil, Kannada, Bengali. Gnani Prisma detects the language and Proxy replies in kind." },
  { icon: BookOpen, tone: "bg-peach", t: "Only what you know", d: "Answers come from your bio, rates, FAQs and documents. If it is not in your notes, it says so." },
  { icon: CalendarCheck, tone: "bg-sky", t: "Books real meetings", d: "Connected to Google Calendar. It checks free slots and books the call while you sleep." },
  { icon: Users, tone: "bg-butter", t: "Captures every lead", d: "Contact details and intent are saved with a summary of every conversation." },
  { icon: Hand, tone: "bg-lilac", t: "Take over live", d: "Watch conversations in real time and jump in with one tap. Proxy steps aside." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden pb-24">
      <Backdrop />
      <Nav />
      <section className="mx-auto mt-14 grid w-[min(1180px,calc(100%-2rem))] items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <motion.div {...fade}>
          <Pill tone="white" className="mb-6"><span className="h-2 w-2 rounded-full bg-mint-deep" />Built on Gnani Prisma and Timbre</Pill>
          <h1 className="text-5xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-7xl">
            You, on call.<br /><span className="text-ink-soft">Even when you are not.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Proxy is your AI persona. Share one link and anyone can chat or talk with it. It answers in your voice, in their language, from your own knowledge, and books meetings on your calendar.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="clay-sm inline-flex items-center gap-2 bg-ink px-6 py-3.5 text-sm font-medium text-white">Create your Proxy <ArrowRight size={16} /></Link>
            <Link href="/p/hardik" className="clay-sm inline-flex items-center gap-2 bg-[#f7f7fb] px-6 py-3.5 text-sm font-medium">Talk to Hardik's Proxy</Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-ink-mute">
            <span>proxy.app/<span className="font-medium text-ink">hardik</span></span>
            <span className="h-1 w-1 rounded-full bg-ink-mute" />
            <span>11 Indian languages</span>
            <span className="h-1 w-1 rounded-full bg-ink-mute" />
            <span>Live takeover</span>
          </div>
        </motion.div>
        <motion.div {...fade} transition={{ duration: 0.8, delay: 0.1 }} className="relative">
          <div className="glass relative mx-auto max-w-md p-7">
            <div className="flex items-center gap-3">
              <div className="clay-sm grid h-12 w-12 place-items-center bg-peach text-base font-semibold">HG</div>
              <div><div className="font-semibold">Hardik Gupta</div><div className="text-sm text-ink-mute">Full-stack and AI engineer</div></div>
              <Pill tone="mint" className="ml-auto">Live</Pill>
            </div>
            <div className="my-4 flex justify-center"><Orb state="speaking" level={0.45} size={150} /></div>
            <div className="space-y-3 text-sm">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white">Bhai aapka rate kitna hai?</div>
              <div className="clay-sm w-fit max-w-[85%] bg-white/80 px-4 py-2.5">MVP builds 25,000 rupees per week se start hote hain. Discovery call free hai, slot book kar doon?</div>
              <div className="flex gap-2"><Pill tone="sky">check_availability</Pill><Pill tone="butter">Hinglish detected</Pill></div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto mt-28 w-[min(1180px,calc(100%-2rem))]">
        <motion.div {...fade} className="mb-10 max-w-2xl">
          <h2 className="text-4xl font-semibold tracking-[-0.03em]">A persona, not a chatbot.</h2>
          <p className="mt-3 text-ink-soft">Everything a busy founder, freelancer or creator needs to never miss a conversation again.</p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.t} {...fade} transition={{ duration: 0.5, delay: i * 0.05 }}>
              <Card className="h-full">
                <div className={`clay-sm mb-5 grid h-12 w-12 place-items-center ${f.tone}`}><f.icon size={20} strokeWidth={1.8} /></div>
                <h3 className="text-lg font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.d}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-28 w-[min(1180px,calc(100%-2rem))]">
        <div className="glass grid gap-8 p-10 md:grid-cols-3">
          {[["01", "Build", "Sign in with Google, add your bio, rates, FAQs, documents and a voice sample."],
            ["02", "Share", "Get proxy.app/you. Put it in your bio, email signature or missed-call SMS."],
            ["03", "Relax", "Proxy talks, books and captures leads. You read the summaries and step in when it matters."]].map(([n, t, d]) => (
            <div key={n}><div className="font-mono text-sm text-ink-mute">{n}</div><div className="mt-2 text-2xl font-semibold tracking-tight">{t}</div><p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p></div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-ink-mute">Built for the Great Indian AI Internship Challenge by Gnani AI.</p>
      </section>
    </main>
  );
}
