"use client";
import { ReactLenis } from "lenis/react";
import { ReactNode, useEffect, useState } from "react";
import "lenis/dist/lenis.css";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)"); setReduce(m.matches);
    const f = () => setReduce(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f);
  }, []);
  if (reduce) return <>{children}</>;
  return <ReactLenis root options={{ lerp: 0.1, anchors: { offset: -64 }, smoothWheel: true }}>{children}</ReactLenis>;
}
