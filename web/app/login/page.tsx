"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, API } from "@/lib/api";
import { Backdrop, Button, Logo, Field } from "@/components/ui";

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
    <main className="relative grid min-h-screen place-items-center p-6">
      <Backdrop />
      <div className="glass w-full max-w-md p-9">
        <Logo />
        <h1 className="mt-8 text-3xl">Welcome to Proxy</h1>
        <p className="mt-2 text-sm text-ink-soft">Sign in to build your persona and connect your calendar.</p>
        <a href={`${API}/api/auth/google/start`} className="clay-sm mt-8 flex w-full items-center justify-center gap-3 bg-canvas px-5 py-3.5 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4c84bf" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg>
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
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
