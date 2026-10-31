"use client";
import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, API } from "@/lib/api";
import { Backdrop, Button, Logo, Field } from "@/components/ui";

function Login() {
  const r = useRouter(); const sp = useSearchParams();
  const [email, setEmail] = useState("hardikgupta8792@gmail.com");
  const [name, setName] = useState("Hardik Gupta");
  const [err, setErr] = useState("");
  useEffect(() => { const nx = sp.get("next"); if (nx && nx.startsWith("/") && !nx.startsWith("//") && !sp.get("token")) localStorage.setItem("proxy_next", nx); if (sp.get("handle")) localStorage.setItem("proxy_claim", sp.get("handle")!); const t = sp.get("token"); if (t) { localStorage.setItem("proxy_token", t); const n = sp.get("next") || "/onboarding"; const back = localStorage.getItem("proxy_next"); localStorage.removeItem("proxy_next"); r.replace(n === "/studio" && back && back.startsWith("/studio") ? back : n); } }, [sp, r]);
  const [devOk, setDevOk] = useState(true);
  useEffect(() => { api("/api/health").then((h) => setDevOk(h?.modes?.dev_login !== false)).catch(() => {}); }, []);
  async function dev() {
    try { const d = await api("/api/auth/dev", { method: "POST", body: JSON.stringify({ email, name }) }); localStorage.setItem("proxy_token", d.token); const h = sp.get("handle"); if (h) localStorage.setItem("proxy_claim", h); const back = localStorage.getItem("proxy_next"); localStorage.removeItem("proxy_next"); r.push(back && back.startsWith("/") && !back.startsWith("//") ? back : "/onboarding"); }
    catch (e: any) { setErr(e.message); }
  }
  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-10">
      <Backdrop />
      <div className="reveal w-full max-w-[380px]">
        <div className="flex justify-center"><Logo /></div>
        <div className="glass mt-6 p-6">
          <h1 className="display text-center text-[24px]">Welcome to Twyn</h1>
          <p className="mt-1 text-center text-[13px] text-ink-soft">Sign in to build your persona and share your link.</p>
          <a href={`${API}/api/auth/google/login`} className="clay-sm mt-6 flex h-9 w-full items-center justify-center gap-2 bg-white text-[13.5px] font-medium hover:bg-canvas">
            <Image src="/brands/google.svg" alt="" width={15} height={15} />
            Continue with Google
          </a>
          {sp.get("error") && <p className="mt-2 text-center text-[12px] text-peach-deep">{sp.get("error")}</p>}
          {sp.get("mock") && <p className="mt-2 text-center text-[12px] text-peach-deep">Google OAuth is not configured yet. Use email below.</p>}
          {devOk && <><div className="my-5 flex items-center gap-3 text-[11px] text-ink-mute"><span className="h-px flex-1 bg-rule" />or with email<span className="h-px flex-1 bg-rule" /></div>
          <form onSubmit={(e) => { e.preventDefault(); dev(); }} className="space-y-3">
            <Field label="Name"><input name="name" className="field clay-pressed" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email"><input name="email" type="email" className="field clay-pressed" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Button type="submit" className="mt-1 w-full">Continue</Button>
            {err && <p className="text-[12px] text-peach-deep">{err}</p>}
          </form></>}
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-ink-mute">Voice by Gnani · LLM by <Image src="/brands/groq.svg" alt="Groq" width={11} height={11} /> Groq</p>
      </div>
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
