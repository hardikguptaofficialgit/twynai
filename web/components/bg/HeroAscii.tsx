"use client";
import { useEffect, useRef } from "react";

// Crisp blocky pixel field. Flat pastel squares only: no gradients, no glow, no blur.
const COLORS = ["#a99fe0", "#9cc6e4", "#a8dcc3", "#c9c1f0"];
const CELL = 16, GAP = 3;

export default function HeroAscii() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    let w = 0, h = 0, raf = 0, last = 0;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seed = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    function size() { const d = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    function draw(t: number) {
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL), T = t / 1000;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const r = seed(x, y);
        // rolling hills of pixels rising from the bottom and right edge
        const wave = Math.sin(x * 0.11 + T * 0.6) * 0.5 + Math.sin(x * 0.05 - T * 0.35 + y * 0.04) * 0.5;
        const fy = y / rows, fx = x / cols;
        const v = fy * 1.1 + fx * 0.55 + wave * 0.18 + (r - 0.5) * 0.35 - 0.62;
        if (v < 0) continue;
        const tw = Math.sin(T * 1.6 + r * 40) > 0.85 ? 0.45 : 1; // occasional twinkle
        ctx.globalAlpha = Math.min(1, 0.35 + v * 1.6) * tw;
        ctx.fillStyle = COLORS[Math.floor(r * 97) % COLORS.length];
        ctx.fillRect(x * CELL, y * CELL, CELL - GAP, CELL - GAP);
      }
      ctx.globalAlpha = 1;
    }
    function loop(t: number) { if (t - last > 90) { draw(t); last = t; } raf = requestAnimationFrame(loop); }
    size(); draw(0); if (!reduce) raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { size(); draw(performance.now()); }); ro.observe(c);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-90" />;
}
