"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, token, Persona } from "./api";

/** Protected-route guard: no/expired session -> /login, remembering where to come back to. */
export function toLogin(r: { replace: (u: string) => void }) {
  localStorage.removeItem("proxy_token");
  const back = location.pathname + location.search;
  localStorage.setItem("proxy_next", back);
  r.replace(`/login?next=${encodeURIComponent(back)}`);
}

export function useOwner() {
  const r = useRouter();
  const [me, setMe] = useState<any>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => { const p = await api("/api/me/personas"); setPersonas(p); setLoaded(true); return p; }, []);
  const reloadMe = useCallback(async () => setMe(await api("/api/me")), []);
  useEffect(() => {
    if (!token()) { toLogin(r); return; }
    api("/api/me").then((owner) => {
      // Older onboarding builds created a placeholder account without Google auth.
      if (/^creator_\d+@twyn\.app$/i.test(owner.email || "")) {
        localStorage.removeItem("proxy_token");
        r.replace("/onboarding");
        return null;
      }
      setMe(owner);
      return reload();
    }).catch(() => toLogin(r));
  }, [r, reload]);
  return { me, setMe, reloadMe, personas, reload, loaded };
}
