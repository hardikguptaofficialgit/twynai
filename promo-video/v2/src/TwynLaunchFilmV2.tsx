import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { V2Sound } from "./components/Sound";
import { CreateV2 } from "./scenes/CreateV2";
import { EndV2 } from "./scenes/EndV2";
import { HookV2 } from "./scenes/HookV2";
import { IntelligenceV2 } from "./scenes/IntelligenceV2";
import { VisitorV2 } from "./scenes/VisitorV2";
import { BEATS, C } from "./tokens";

export const TwynLaunchFilmV2: React.FC = () => {
  const frame = useCurrentFrame();
  const paper = interpolate(frame, [136, 150, 1580, 1590], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
    <V2Sound />
    <Sequence from={BEATS.hook.from} durationInFrames={BEATS.hook.duration}><HookV2 /></Sequence>
    <div style={{ position: "absolute", inset: 0, opacity: paper, pointerEvents: "none", background: C.paper }} />
    <Sequence from={BEATS.create.from} durationInFrames={BEATS.create.duration}><CreateV2 /></Sequence>
    <Sequence from={BEATS.intelligence.from} durationInFrames={BEATS.intelligence.duration}><IntelligenceV2 /></Sequence>
    <Sequence from={BEATS.visitor.from} durationInFrames={BEATS.visitor.duration}><VisitorV2 /></Sequence>
    <Sequence from={BEATS.end.from} durationInFrames={BEATS.end.duration}><EndV2 /></Sequence>
    <div style={{ position: "absolute", top: 42, right: 62, color: frame < 150 || frame >= 1590 ? "rgba(245,241,234,.42)" : "rgba(48,45,59,.4)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".13em" }}>{String(Math.floor(frame / 30)).padStart(2, "0")} / 60</div>
  </AbsoluteFill>;
};
