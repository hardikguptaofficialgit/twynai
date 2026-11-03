import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, EASE } from "../tokens";

type Props = {
  children: string;
  from: number;
  size: number;
  accent?: boolean;
  mono?: boolean;
  exitAt?: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
};

export const KineticLine: React.FC<Props> = ({
  children,
  from,
  size,
  accent = false,
  mono = false,
  exitAt,
  align = "left",
  style,
}) => {
  const frame = useCurrentFrame();
  const words = children.split(" ");
  const out = exitAt === undefined ? 1 : interpolate(frame, [exitAt, exitAt + 10], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad),
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", gap: "0 .18em", opacity: out, ...style }}>
      {words.map((word, index) => {
        const start = from + index * (mono ? 1.7 : 2.5);
        const p = interpolate(frame, [start, start + 11], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(...EASE),
        });
        const blur = interpolate(p, [0, 1], [8, 0]);
        return <span key={`${word}-${index}`} style={{
          display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 26}px)`, filter: `blur(${blur}px)`,
          fontFamily: mono ? "'JetBrains Mono', monospace" : "Georgia, 'Times New Roman', serif",
          fontWeight: mono ? 500 : 400, fontSize: size, lineHeight: mono ? 1.1 : .92,
          letterSpacing: mono ? ".03em" : "-.055em", color: accent ? C.lilac : C.paper,
        }}>{word}</span>;
      })}
    </div>
  );
};
