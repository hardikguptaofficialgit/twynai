import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { KineticLine } from "../components/KineticLine";
import { C } from "../tokens";

export const HookV2: React.FC = () => {
  const frame = useCurrentFrame();
  const mark = interpolate(frame, [0, 14, 104, 132], [.35, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const signal = interpolate(frame, [16, 45, 114, 140], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 142, top: 118, display: "flex", alignItems: "center", gap: 16, opacity: mark }}>
      <Img src={staticFile("brand/mark.svg")} style={{ width: 38, height: 38 }} />
      <span style={{ color: "rgba(245,241,234,.74)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: ".18em" }}>TWYN AI</span>
    </div>
    <div style={{ position: "absolute", left: 142, right: 142, top: 300 }}>
      <KineticLine from={18} size={102} mono exitAt={105}>YOU CAN&apos;T BE EVERYWHERE.</KineticLine>
      <KineticLine from={66} size={120} accent exitAt={128} style={{ marginTop: 26 }}>YOUR TWYN CAN.</KineticLine>
    </div>
    <div style={{ position: "absolute", left: 142, bottom: 156, width: 530, height: 1, background: "rgba(217,205,246,.19)" }}><div style={{ width: `${signal * 100}%`, height: 2, background: C.lilac, transformOrigin: "left" }} /></div>
    <div style={{ position: "absolute", right: 142, bottom: 144, color: "rgba(245,241,234,.5)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: ".15em", opacity: signal }}>AN AI YOU, AT A LINK</div>
  </AbsoluteFill>;
};
