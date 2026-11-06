"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";

export default function BackendStatus() {
  const [unavailable, setUnavailable] = useState(false);
  const [slow, setSlow] = useState(false);
  const failures = useRef(0);
  const slowTimer = useRef<number | null>(null);

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
    const onLatency = (event: Event) => {
      const ms = (event as CustomEvent<{ ms?: number }>).detail?.ms || 0;
      if (ms < 4500) return;
      setSlow(true);
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
      slowTimer.current = window.setTimeout(() => setSlow(false), 9000);
    };
    window.addEventListener("twyn:latency", onLatency);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
      window.removeEventListener("twyn:latency", onLatency);
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
    };
  }, [check]);

  const visible = unavailable || slow;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={`pointer-events-none fixed left-1/2 top-4 z-[100] w-[min(calc(100vw-2rem),30rem)] -translate-x-1/2 transition-all duration-300 ease-out ${visible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}
    >
      <div className={`pointer-events-auto flex items-center justify-center gap-3 rounded-full border px-4 py-2.5 text-center text-[12.5px] leading-5 shadow-[0_10px_30px_rgba(36,31,48,0.12)] backdrop-blur-md ${unavailable ? "border-peach-deep/30 bg-peach/95 text-ink" : "border-lilac-deep/25 bg-lilac/95 text-ink"}`}>
        <span>{unavailable ? "Twyn’s backend or database is temporarily unreachable. It may be restarting or offline." : "Twyn is running on a lightweight, cost-conscious server, so some responses may take a moment."}</span>
        {unavailable && <button onClick={() => void check()} className="shrink-0 font-semibold underline underline-offset-2 hover:text-ink-soft">Retry</button>}
      </div>
    </div>
  );
}
