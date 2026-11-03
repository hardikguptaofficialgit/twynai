import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ConversationSignal } from "../components/ConversationSignal";
import { KineticLine } from "../components/KineticLine";
import { C } from "../tokens";

const Node: React.FC<{ x: number; title: string; detail: string; color: string; from: number }> = ({ x, title, detail, color, from }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [from, from + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", left: x, top: 545, width: 330, opacity: p, transform: `translateY(${(1-p)*18}px)` }}>
    <div style={{ width: 14, height: 14, borderRadius: 14, background: color, marginBottom: 20, boxShadow: `0 0 0 8px ${color}22` }} />
    <div style={{ fontFamily: "Hanken Grotesk,Arial,sans-serif", fontWeight: 700, fontSize: 25, color: C.ink }}>{title}</div>
    <div style={{ marginTop: 9, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, lineHeight: 1.45, color: C.muted }}>{detail}</div>
  </div>;
};

export const IntelligenceV2: React.FC = () => {
  const frame = useCurrentFrame();
  const gnani = interpolate(frame, [144, 166], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 122, top: 78, display: "flex", gap: 13, color: C.muted, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: ".16em" }}><span style={{ color: C.lilacDeep }}>04</span><span>POWERED BY INTELLIGENCE</span></div>
    <div style={{ position: "absolute", left: 122, top: 164, color: C.ink }}><KineticLine from={14} size={75} exitAt={260} style={{ color: C.ink }}>BUILT FOR CONVERSATION.</KineticLine></div>
    <Node from={68} x={220} title="Creator context" detail="FASTEMBED · MULTILINGUAL MINILM · ONNX" color={C.lilac} />
    <Node from={92} x={790} title="Twyn intelligence" detail="META · NVIDIA NIM · GROQ · OPENROUTER" color={C.peach} />
    <Node from={118} x={1370} title="Voice, in motion" detail="GNANI PRISMA STT · TIMBRE TTS · STREAMING" color={C.mint} />
    <ConversationSignal from={72} y={710} />
    <div style={{ position: "absolute", left: 122, right: 122, bottom: 77, opacity: gnani, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div><div style={{ fontFamily: "Georgia,serif", fontSize: 46, letterSpacing: "-.04em", color: C.ink }}>Gnani AI gives Twyn its voice layer.</div><div style={{ marginTop: 10, fontFamily: "Hanken Grotesk,Arial,sans-serif", fontSize: 18, color: C.muted }}>Prisma hears. Timbre speaks. Streaming carries the response forward.</div></div>
      <Img src={staticFile("brand/mark.svg")} style={{ width: 66, height: 66, opacity: .9 }} />
    </div>
  </AbsoluteFill>;
};
