import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { KineticLine } from "../components/KineticLine";
import { C } from "../tokens";

export const EndV2: React.FC = () => {
  const frame = useCurrentFrame();
  const lockup = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hold = interpolate(frame, [150, 205], [1, .94], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.ink, color: C.paper, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", opacity: lockup }}><Img src={staticFile("brand/wordmark-dark.svg")} style={{ width: 235, transform: `scale(${.94 + lockup*.06})` }} /></div>
    <div style={{ width: 1110, transform: `scale(${hold})` }}>
      <KineticLine from={24} size={106} align="center" mono>YOU, ON CALL.</KineticLine>
      <KineticLine from={70} size={98} accent align="center">EVEN WHEN YOU&apos;RE NOT.</KineticLine>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 145, display: "flex", flexDirection: "column", alignItems: "center", opacity: interpolate(frame, [108, 126], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
      <div style={{ fontFamily: "Hanken Grotesk,Arial,sans-serif", fontSize: 24, color: "rgba(245,241,234,.78)" }}>Create your Twyn.</div>
      <div style={{ marginTop: 32, color: C.lilac, fontFamily: "'JetBrains Mono',monospace", fontSize: 15, letterSpacing: ".08em" }}>#GnaniAI&nbsp;&nbsp; · &nbsp;&nbsp;#GreatIndianAIInternshipChallenge</div>
      <div style={{ marginTop: 22, color: "rgba(245,241,234,.48)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: ".12em" }}>twynai.vercel.app</div>
    </div>
  </AbsoluteFill>;
};
