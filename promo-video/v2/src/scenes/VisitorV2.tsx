import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CinematicBrowser } from "../components/CinematicBrowser";
import { CursorPath } from "../components/CursorPath";
import { VoiceWave } from "../components/VoiceWave";
import { C } from "../tokens";

export const VisitorV2: React.FC = () => {
  const frame = useCurrentFrame();
  const chatCopy = interpolate(frame, [18, 34, 200, 216], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const talkCopy = interpolate(frame, [235, 251, 426, 446], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 122, top: 78, display: "flex", gap: 13, color: C.muted, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: ".16em" }}><span style={{ color: C.lilacDeep }}>05</span><span>THE VISITOR MOMENT</span></div>
    <div style={{ position: "absolute", left: 122, top: 155, opacity: chatCopy }}><div style={{ fontFamily: "Georgia,serif", letterSpacing: "-.06em", color: C.ink, fontSize: 74 }}>One link. <em style={{ color: C.lilacDeep }}>Real conversations.</em></div></div>
    <CinematicBrowser clip="v2-04-public-chat.mp4" from={0} duration={235} x={185} y={265} width={1550} height={720} label="CHAT · ANSWER · BOOK" zoom={[1.055, 1.01]} focus={{ x: 58, y: 57 }} startFrom={180} playbackRate={0.68} />
    <CursorPath from={0} until={225} points={[{ frame: 36, x: 1090, y: 835 }, { frame: 77, x: 1085, y: 835, click: true }, { frame: 135, x: 1240, y: 425 }, { frame: 164, x: 1242, y: 425, click: true }]} />
    <div style={{ position: "absolute", left: 122, top: 155, opacity: talkCopy }}><div style={{ fontFamily: "Georgia,serif", letterSpacing: "-.06em", color: C.ink, fontSize: 74 }}>Your voice. <em style={{ color: C.lilacDeep }}>Your presence.</em></div><div style={{ marginTop: 15, fontFamily: "Hanken Grotesk,Arial,sans-serif", fontSize: 19, color: C.muted }}>A visitor enters a digital presence built from the creator&apos;s real setup.</div></div>
    <CinematicBrowser clip="v2-05-talk.mp4" from={225} duration={225} x={360} y={300} width={1200} height={655} label="THE REAL TALK UI" zoom={[1.075, 1.02]} focus={{ x: 55, y: 56 }} startFrom={60} playbackRate={0.24} />
    <CursorPath from={225} until={440} points={[{ frame: 25, x: 1190, y: 470 }, { frame: 60, x: 1225, y: 470, click: true }, { frame: 118, x: 980, y: 685 }, { frame: 150, x: 980, y: 685, click: true }]} />
    <VoiceWave from={315} x={830} y={840} />
  </AbsoluteFill>;
};
