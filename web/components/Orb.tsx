"use client";
import { motion, useReducedMotion } from "motion/react";

/** Voice orb: solid clay sphere + concentric solid rings driven by audio level. No glow, no gradients. */
export function Orb({ level = 0, state = "idle", color = "var(--color-lilac)", deep = "var(--color-lilac-deep)", size = 220 }:
  { level?: number; state?: "idle" | "listening" | "thinking" | "speaking"; color?: string; deep?: string; size?: number }) {
  const shouldReduce = useReducedMotion();
  const l = Math.min(1, level);
  const active = state !== "idle";
  const isSmall = size < 48;

  // Scale outer clay shadows proportionally with size (soft outer shadows only, no inset, no glow)
  const scale = size / 220;
  const shadow = `${Math.max(1, Math.round(18 * scale))}px ${Math.max(2, Math.round(22 * scale))}px ${Math.max(4, Math.round(40 * scale))}px oklch(45% 0.04 70 / .2), -${Math.max(1, Math.round(12 * scale))}px -${Math.max(1, Math.round(12 * scale))}px ${Math.max(3, Math.round(28 * scale))}px rgba(255,255,255,.9)`;

  const smallMinH = Math.max(3, Math.round(size * 0.12));
  const smallMaxH = Math.round(size * 0.42);

  return (
    <div className="relative grid place-items-center" style={{ width: size * 1.6, height: size * 1.6 }}>
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="pointer-events-none absolute rounded-full"
          style={{ width: size, height: size, border: `${isSmall ? 1 : 1.5}px solid ${deep}`, opacity: 0.18 }}
          animate={active && !shouldReduce ? { scale: [1, 1.25 + i * 0.12 + l * 0.3], opacity: [0.28, 0] } : { scale: 1 + i * 0.09, opacity: 0.12 }}
          transition={active && !shouldReduce ? { duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" } : { duration: 0.6 }} />
      ))}
      <motion.div className="relative rounded-full"
        style={{ width: size, height: size, background: color, boxShadow: shadow }}
        animate={{ scale: shouldReduce ? 1 : 1 + l * 0.12 + (state === "thinking" ? 0.02 : 0) }}
        transition={shouldReduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 18 }}>
        <div className="absolute left-[22%] top-[18%] h-[22%] w-[30%] rounded-full bg-white/55" />
        <div className={`absolute inset-0 flex items-center justify-center ${isSmall ? "gap-[2.5px]" : "gap-1.5"}`}>
          {[0, 1, 2, 3, 4].map((i) => {
            const weights = [0.5, 0.8, 1, 0.8, 0.5];
            const targetHeight = isSmall
              ? state === "speaking" || state === "listening"
                ? smallMinH + l * (smallMaxH - smallMinH) * weights[i]
                : state === "thinking"
                ? shouldReduce
                  ? Math.round(size * 0.25)
                  : [smallMinH, Math.round(size * 0.35), smallMinH]
                : smallMinH
              : state === "speaking" || state === "listening"
              ? 10 + l * 50 * weights[i] + 6
              : state === "thinking"
              ? shouldReduce
                ? 12
                : [8, 18, 8]
              : 8;

            return (
              <motion.span key={i} className={isSmall ? "w-[2px] rounded-full" : "w-2 rounded-full"}
                style={{
                  background: isSmall ? deep : "var(--color-ink)",
                  opacity: isSmall ? 0.65 : 1,
                }}
                animate={{ height: targetHeight }}
                transition={state === "thinking" && !shouldReduce
                  ? { duration: 0.9, repeat: Infinity, delay: i * 0.12 }
                  : shouldReduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 400, damping: 20 }} />
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
