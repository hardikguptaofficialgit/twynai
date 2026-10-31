"use client";
import { motion } from "motion/react";

/** Voice orb: solid clay sphere + concentric solid rings driven by audio level. No glow, no gradients. */
export function Orb({ level = 0, state = "idle", color = "var(--color-lilac)", deep = "var(--color-lilac-deep)", size = 220 }:
  { level?: number; state?: "idle" | "listening" | "thinking" | "speaking"; color?: string; deep?: string; size?: number }) {
  const l = Math.min(1, level);
  const active = state !== "idle";
  return (
    <div className="relative grid place-items-center" style={{ width: size * 1.6, height: size * 1.6 }}>
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: size, height: size, border: `1.5px solid ${deep}`, opacity: 0.18 }}
          animate={active ? { scale: [1, 1.25 + i * 0.12 + l * 0.3], opacity: [0.28, 0] } : { scale: 1 + i * 0.09, opacity: 0.12 }}
          transition={active ? { duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" } : { duration: 0.6 }} />
      ))}
      <motion.div className="relative rounded-full"
        style={{ width: size, height: size, background: color,
          boxShadow: `18px 22px 40px oklch(45% 0.04 70 / .2), -12px -12px 28px rgba(255,255,255,.9)` }}
        animate={{ scale: 1 + l * 0.12 + (state === "thinking" ? 0.02 : 0) }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        <div className="absolute left-[22%] top-[18%] h-[22%] w-[30%] rounded-full bg-white/55" />
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} className="w-2 rounded-full" style={{ background: "var(--color-ink)" }}
              animate={{ height: state === "speaking" || state === "listening" ? 10 + l * 50 * [0.5, 0.8, 1, 0.8, 0.5][i] + 6 : state === "thinking" ? [8, 18, 8] : 8 }}
              transition={state === "thinking" ? { duration: 0.9, repeat: Infinity, delay: i * 0.12 } : { type: "spring", stiffness: 400, damping: 20 }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
