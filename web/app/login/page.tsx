"use client";
import Image from "next/image";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API } from "@/lib/api";
import { Backdrop, Logo } from "@/components/ui";
import { ModelStack } from "@/components/ModelStack";

function Login() {
  const r = useRouter(); const sp = useSearchParams();
  useEffect(() => { const nx = sp.get("next"); if (nx && nx.startsWith("/") && !nx.startsWith("//") && !sp.get("token")) localStorage.setItem("proxy_next", nx); if (sp.get("handle")) localStorage.setItem("proxy_claim", sp.get("handle")!); const t = sp.get("token"); if (t) { localStorage.setItem("proxy_token", t); const n = sp.get("next") || "/onboarding"; const back = localStorage.getItem("proxy_next"); localStorage.removeItem("proxy_next"); r.replace(n === "/studio" && back && back.startsWith("/studio") ? back : n); } }, [sp, r]);
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12 md:py-16">
      <Backdrop />
      <div className="reveal w-full max-w-[460px]">
        <div className="flex justify-center"><Logo /></div>
        <div className="glass mt-8 rounded-[28px] p-8 md:p-10">
          <p className="eyebrow text-center">Your presence, multiplied</p>
          <h1 className="display mt-3 text-center text-[30px] md:text-[34px]">Create your Twin</h1>
          <p className="mx-auto mt-3 max-w-[32ch] text-center text-[14px] leading-relaxed text-ink-soft">Sign in with Google to build, customize, and publish your AI Twin.</p>
          <a href={`${API}/api/auth/google/login?${new URLSearchParams({ next: sp.get("next") || "/onboarding", handle: sp.get("handle") || "", calendar: "1" }).toString()}`} className="clay-sm mt-8 flex h-12 w-full items-center justify-center gap-2.5 bg-white text-[14px] font-medium transition-colors hover:bg-canvas">
            <Image src="/brands/google.svg" alt="" width={15} height={15} />
            Continue with Google
          </a>
          {sp.get("error") && <p className="mt-2 text-center text-[12px] text-peach-deep">{sp.get("error")}</p>}
          {sp.get("mock") && <p className="mt-2 text-center text-[12px] text-peach-deep">Google sign-in is not configured yet. Check the app&apos;s OAuth settings.</p>}
          <p className="mt-5 text-center text-[11.5px] text-ink-mute">Secure sign-in · No card required while in beta</p>
        </div>
        <div className="mt-6 space-y-2 text-center text-[12px] text-ink-mute">
          <p>Voice by Gnani AI</p>
          <ModelStack compact />
        </div>
      </div>
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
