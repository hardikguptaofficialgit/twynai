import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C } from "../tokens";

export const VoiceWave: React.FC<{ from: number; x: number; y: number; width?: number; height?: number }> = ({ from, x, y, width = 260, height = 74 }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const p = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bars = Array.from({ length: 29 }, (_, i) => {
    const energy = .25 + .75 * Math.abs(Math.sin(local / 5 + i * .72) * Math.cos(local / 13 + i));
    return Math.max(7, energy * height);
  });
  return <div style={{ position: "absolute", left: x, top: y, width, height, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: p }}>
    {bars.map((h, i) => <i key={i} style={{ width: 4, height: h, borderRadius: 4, background: i % 3 === 0 ? C.lilacDeep : C.lilac, transform: `scaleY(${p})` }} />)}
  </div>;
};
