"use client";
import Image from "next/image";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API } from "@/lib/api";
import { Backdrop, Logo } from "@/components/ui";

function Login() {
  const r = useRouter(); const sp = useSearchParams();
  useEffect(() => { const nx = sp.get("next"); if (nx && nx.startsWith("/") && !nx.startsWith("//") && !sp.get("token")) localStorage.setItem("proxy_next", nx); if (sp.get("handle")) localStorage.setItem("proxy_claim", sp.get("handle")!); const t = sp.get("token"); if (t) { localStorage.setItem("proxy_token", t); const n = sp.get("next") || "/onboarding"; const back = localStorage.getItem("proxy_next"); localStorage.removeItem("proxy_next"); r.replace(n === "/studio" && back && back.startsWith("/studio") ? back : n); } }, [sp, r]);
  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-10">
      <Backdrop />
      <div className="reveal w-full max-w-[380px]">
        <div className="flex justify-center"><Logo /></div>
        <div className="glass mt-6 p-6">
          <h1 className="display text-center text-[24px]">Create your Twin</h1>
          <p className="mt-1 text-center text-[13px] text-ink-soft">Sign in with Google to build, customize, and publish your AI Twin.</p>
          <a href={`${API}/api/auth/google/login?${new URLSearchParams({ next: sp.get("next") || "/onboarding", handle: sp.get("handle") || "", calendar: "1" }).toString()}`} className="clay-sm mt-6 flex h-9 w-full items-center justify-center gap-2 bg-white text-[13.5px] font-medium hover:bg-canvas">
            <Image src="/brands/google.svg" alt="" width={15} height={15} />
            Continue with Google
          </a>
          {sp.get("error") && <p className="mt-2 text-center text-[12px] text-peach-deep">{sp.get("error")}</p>}
          {sp.get("mock") && <p className="mt-2 text-center text-[12px] text-peach-deep">Google sign-in is not configured yet. Check the app&apos;s OAuth settings.</p>}
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-ink-mute">Voice by Gnani · LLM by <Image src="/brands/groq.svg" alt="Groq" width={11} height={11} /> Groq</p>
      </div>
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
