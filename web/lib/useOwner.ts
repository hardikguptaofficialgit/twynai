"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, token, Persona } from "./api";

export function useOwner() {
  const r = useRouter();
  const [me, setMe] = useState<any>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const reload = useCallback(async () => setPersonas(await api("/api/me/personas")), []);
  useEffect(() => {
    if (!token()) { r.push("/login"); return; }
    api("/api/me").then(setMe).then(reload).catch(() => { localStorage.removeItem("proxy_token"); r.push("/login"); });
  }, [r, reload]);
  return { me, personas, reload };
}
