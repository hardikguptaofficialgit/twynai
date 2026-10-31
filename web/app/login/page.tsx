"use client";
import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, API } from "@/lib/api";
import { Backdrop, Button, Logo, Field, Mark } from "@/components/ui";

function Login() {
  const r = useRouter(); const sp = useSearchParams();
  const [email, setEmail] = useState("hardikgupta8792@gmail.com");
  const [name, setName] = useState("Hardik Gupta");
  const [err, setErr] = useState("");
  useEffect(() => { if (sp.get("handle")) localStorage.setItem("proxy_claim", sp.get("handle")!); const t = sp.get("token"); if (t) { localStorage.setItem("proxy_token", t); r.push("/onboarding"); } }, [sp, r]);
  async function dev() {
    try { const d = await api("/api/auth/dev", { method: "POST", body: JSON.stringify({ email, name }) }); localStorage.setItem("proxy_token", d.token); const h = sp.get("handle"); if (h) localStorage.setItem("proxy_claim", h); r.push("/onboarding"); }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      <Backdrop />
      <section className="hidden flex-col justify-between border-r border-rule p-12 lg:flex">
        <Logo />
        <div>
          <Mark size={120} />
          <h2 className="display mt-10 max-w-[12ch] text-6xl">One link. A second you.</h2>
          <p className="mt-5 max-w-[34ch] text-lg text-ink-soft">Chats, calls and bookings in Hindi, Hinglish, Tamil and English, in your own voice.</p>
        </div>
        <p className="flex items-center gap-2 text-sm text-ink-mute">Voice by Gnani Timbre and Prisma · LLM by <Image src="/brands/groq.svg" alt="Groq" width={14} height={14} /> Groq</p>
      </section>
      <section className="grid place-items-center p-6">
      <div className="glass reveal w-full max-w-md p-9">
        <div className="lg:hidden"><Logo /></div>
        <h1 className="mt-8 text-3xl lg:mt-0">Welcome to Twyn</h1>
        <p className="mt-2 text-sm text-ink-soft">Sign in to build your persona and connect your calendar.</p>
        <a href={`${API}/api/auth/google/start`} className="clay-sm mt-8 flex w-full items-center justify-center gap-3 bg-canvas px-5 py-3.5 text-sm font-medium">
          <Image src="/brands/google.svg" alt="" width={18} height={18} />
          Continue with Google
        </a>
        {sp.get("mock") && <p className="mt-3 text-xs text-peach-deep">Google OAuth is not configured yet. Use dev sign-in below.</p>}
        <div className="my-7 flex items-center gap-3 text-xs text-ink-mute"><span className="h-px flex-1 bg-ink/10" />dev sign-in<span className="h-px flex-1 bg-ink/10" /></div>
        <div className="space-y-4">
          <Field label="Name"><input className="field clay-pressed" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><input className="field clay-pressed" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button className="w-full" onClick={dev}>Continue</Button>
          {err && <p className="text-xs text-peach-deep">{err}</p>}
        </div>
      </div>
      </section>
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
