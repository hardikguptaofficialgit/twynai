"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";

export default function BackendStatus() {
  const [unavailable, setUnavailable] = useState(false);
  const failures = useRef(0);

  const check = useCallback(async () => {
    if (!navigator.onLine) {
      setUnavailable(true);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${API}/api/health`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok) {
        failures.current = 0;
        setUnavailable(false);
      } else if (++failures.current >= 2) setUnavailable(true);
    } catch {
      if (++failures.current >= 2) setUnavailable(true);
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    void check();
    const interval = window.setInterval(() => void check(), 20000);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [check]);

  if (!unavailable) return null;

  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-peach-deep/20 bg-peach/70 px-4 py-2 text-center text-[13px] text-ink">
      <span>Twyn’s backend or database is temporarily unreachable. It runs on a self-hosted server, so it may be restarting or offline.</span>
      <button onClick={() => void check()} className="font-semibold underline underline-offset-2 hover:text-ink-soft">Retry</button>
    </div>
  );
}
