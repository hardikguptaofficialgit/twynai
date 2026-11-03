import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CinematicBrowser } from "../components/CinematicBrowser";
import { CursorPath } from "../components/CursorPath";
import { KineticLine } from "../components/KineticLine";
import { C } from "../tokens";

const Eyebrow: React.FC<{ index: string; text: string }> = ({ index, text }) => <div style={{ display: "flex", alignItems: "center", gap: 13, color: C.muted, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: ".16em" }}><b style={{ color: C.lilacDeep, fontWeight: 400 }}>{index}</b><span>{text}</span><i style={{ width: 110, height: 1, background: C.rule }} /></div>;

export const CreateV2: React.FC = () => {
  const frame = useCurrentFrame();
  const landingOpacity = interpolate(frame, [0, 14, 165, 190], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 122, top: 78 }}><Eyebrow index="01" text="MAKE IT YOURS" /></div>
    <div style={{ position: "absolute", left: 122, top: 168, color: C.ink }}><KineticLine from={16} size={73} accent={false} exitAt={140} style={{ color: C.ink }}>CREATE YOUR TWYN.</KineticLine></div>
    <div style={{ opacity: landingOpacity }}>
      <CinematicBrowser clip="v2-01-landing.png" from={0} duration={190} x={385} y={248} width={1270} height={714} label="THE REAL LANDING PAGE" zoom={[1.09, 1.01]} focus={{ x: 39, y: 60 }} />
      <CursorPath from={0} until={175} points={[{ frame: 20, x: 1010, y: 700 }, { frame: 58, x: 905, y: 624 }, { frame: 85, x: 908, y: 624, click: true }, { frame: 140, x: 1050, y: 700 }]} />
    </div>
    <div style={{ position: "absolute", left: 122, top: 115, opacity: interpolate(frame, [180, 198], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}><Eyebrow index="02" text="SHAPE THE PRESENCE" /></div>
    <div style={{ position: "absolute", left: 122, top: 190, opacity: interpolate(frame, [194, 212], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}><div style={{ fontFamily: "Georgia,serif", fontSize: 68, letterSpacing: "-.05em", color: C.ink }}>Make it <em style={{ color: C.lilacDeep }}>yours.</em></div><p style={{ margin: "18px 0 0", fontFamily: "Hanken Grotesk,Arial,sans-serif", color: C.muted, fontSize: 19 }}>Identity, knowledge and voice—built in the real product.</p></div>
    <CinematicBrowser clip="v2-02-onboarding.mp4" from={185} duration={305} x={285} y={330} width={1370} height={665} label="IDENTITY · STYLE · KNOWLEDGE" zoom={[1.075, 1.015]} focus={{ x: 52, y: 54 }} />
    <CursorPath from={185} until={475} points={[{ frame: 14, x: 840, y: 735 }, { frame: 55, x: 1140, y: 760, click: true }, { frame: 132, x: 790, y: 555 }, { frame: 168, x: 1115, y: 760, click: true }, { frame: 240, x: 830, y: 545 }, { frame: 270, x: 1108, y: 758, click: true }]} />
    <div style={{ position: "absolute", left: 122, top: 112, opacity: interpolate(frame, [475, 493], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}><Eyebrow index="03" text="KNOWLEDGE BECOMES A VOICE" /></div>
    <CinematicBrowser clip="v2-03-voice-knowledge.mp4" from={470} duration={190} x={470} y={250} width={1080} height={700} label="KNOWLEDGE · VOICE" zoom={[1.045, 1.015]} focus={{ x: 50, y: 54 }} />
    <CursorPath from={470} until={650} points={[{ frame: 18, x: 1165, y: 670 }, { frame: 54, x: 1170, y: 720, click: true }, { frame: 100, x: 1045, y: 610 }, { frame: 125, x: 1090, y: 760, click: true }]} />
    <div style={{ position: "absolute", left: 122, bottom: 72, opacity: interpolate(frame, [500, 516, 642, 660], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), color: C.ink, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: ".13em" }}>YOUR KNOWLEDGE, ON CALL.</div>
  </AbsoluteFill>;
};
