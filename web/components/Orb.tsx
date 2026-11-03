"use client";
import { motion, useReducedMotion } from "motion/react";

/** Voice orb / avatar: solid clay sphere with concentric rings and audio wave. No glow, no gradients. */
export function Orb({
  level = 0,
  state = "idle",
  color = "var(--color-lilac)",
  deep = "var(--color-lilac-deep)",
  size = 220,
  initials,
  image,
}: {
  level?: number;
  state?: "idle" | "listening" | "thinking" | "speaking";
  color?: string;
  deep?: string;
  size?: number;
  initials?: string;
  image?: string;
}) {
  const shouldReduce = useReducedMotion();
  const l = Math.min(1, Math.max(0, level));
  const active = state !== "idle";
  const isSmall = size < 56;

  // Scale outer clay shadows proportionally with size (soft outer shadows only, no inset, no glow)
  const scale = size / 220;
  const shadow = `${Math.max(1, Math.round(18 * scale))}px ${Math.max(2, Math.round(22 * scale))}px ${Math.max(4, Math.round(40 * scale))}px oklch(45% 0.04 70 / .16), -${Math.max(1, Math.round(10 * scale))}px -${Math.max(1, Math.round(10 * scale))}px ${Math.max(3, Math.round(24 * scale))}px rgba(255,255,255,.9)`;

  const barCount = 5;
  const weights = [0.45, 0.8, 1, 0.8, 0.45];
  const barWidth = isSmall ? 2.5 : Math.max(3, Math.round(size * 0.035));
  const minBarH = isSmall ? 3 : Math.max(6, Math.round(size * 0.08));
  const maxBarH = isSmall ? 18 : Math.max(24, Math.round(size * 0.38));

  return (
    <div className="relative grid place-items-center select-none" style={{ width: size * 1.5, height: size * 1.5 }}>
      {/* Concentric rings pulsing with audio level */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{ width: size, height: size, border: `${isSmall ? 1 : 1.5}px solid ${deep}`, opacity: 0.16 }}
          animate={
            active && !shouldReduce
              ? { scale: [1, 1.22 + i * 0.12 + l * 0.28], opacity: [0.35, 0] }
              : { scale: 1 + i * 0.08, opacity: 0.1 }
          }
          transition={
            active && !shouldReduce
              ? { duration: 2.2, repeat: Infinity, delay: i * 0.55, ease: "easeOut" }
              : { duration: 0.6 }
          }
        />
      ))}

      {/* Main clay orb */}
      <motion.div
        className="relative grid place-items-center rounded-full overflow-hidden"
        style={{ width: size, height: size, background: color, boxShadow: shadow }}
        animate={{
          scale: shouldReduce ? 1 : 1 + l * 0.1 + (state === "thinking" ? 0.03 : 0),
          borderRadius: active && !shouldReduce
            ? ["46% 54% 52% 48% / 48% 45% 55% 52%", "54% 46% 48% 52% / 54% 50% 50% 46%", "48% 52% 55% 45% / 50% 56% 44% 50%", "46% 54% 52% 48% / 48% 45% 55% 52%"]
            : "50%",
        }}
        transition={shouldReduce ? { duration: 0 } : { scale: { type: "spring", stiffness: 280, damping: 20 }, borderRadius: { duration: state === "thinking" ? 2.8 : 4.5, repeat: Infinity, ease: "easeInOut" } }}
      >
        {/* Soft specular highlight */}
        <div className="pointer-events-none absolute left-[18%] top-[15%] h-[26%] w-[32%] rounded-full bg-white/60 blur-[1px]" />

        {/* Center content: initials / avatar or sound wave */}
        {initials ? (
          <div className="relative flex flex-col items-center justify-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="rounded-full object-cover" style={{ width: size * 0.55, height: size * 0.55 }} />
            ) : (
              <span
                className="font-display font-semibold tracking-tight"
                style={{
                  fontSize: Math.round(size * 0.32),
                  color: deep,
                  lineHeight: 1,
                }}
              >
                {initials}
              </span>
            )}
            {/* Small active soundwave beneath initials */}
            <div className="mt-1.5 flex items-center justify-center gap-1">
              {[0, 1, 2, 3].map((i) => {
                const h = active
                  ? shouldReduce
                    ? 6
                    : [3, Math.round(minBarH + l * (maxBarH * 0.4 - minBarH)), 3]
                  : 3;
                return (
                  <motion.span
                    key={i}
                    className="rounded-full"
                    style={{ width: 2.5, backgroundColor: deep, opacity: active ? 0.85 : 0.35 }}
                    animate={{ height: h }}
                    transition={
                      active && !shouldReduce
                        ? { duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }
                        : { duration: 0.3 }
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`relative flex items-center justify-center ${isSmall ? "gap-[3px]" : "gap-2"}`}>
            {Array.from({ length: barCount }).map((_, i) => {
              const targetHeight =
                state === "speaking" || state === "listening"
                  ? minBarH + l * (maxBarH - minBarH) * weights[i]
                  : state === "thinking"
                  ? shouldReduce
                    ? Math.round(size * 0.2)
                    : [minBarH, Math.round(size * 0.28), minBarH]
                  : minBarH;

              return (
                <motion.span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: barWidth,
                    backgroundColor: deep,
                    opacity: active ? 0.9 : 0.55,
                  }}
                  animate={{ height: targetHeight }}
                  transition={
                    state === "thinking" && !shouldReduce
                      ? { duration: 0.9, repeat: Infinity, delay: i * 0.12 }
                      : shouldReduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 350, damping: 22 }
                  }
                />
              );
            })}
          </div>
        )}

        {/* Live indicator dot */}
        {active && (
          <span
            className="absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-white bg-mint"
            style={{ width: Math.max(8, Math.round(size * 0.1)), height: Math.max(8, Math.round(size * 0.1)) }}
          />
        )}
      </motion.div>
    </div>
  );
}
