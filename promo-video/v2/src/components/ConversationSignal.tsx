import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, EASE } from "../tokens";

export const ConversationSignal: React.FC<{ from: number; width?: number; y?: number }> = ({ from, width = 1240, y = 750 }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const draw = interpolate(local, [0, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(...EASE) });
  const pulse = Math.max(0, Math.sin((local - 42) / 7)) * .45 + .55;
  return <svg width={width} height="100" viewBox={`0 0 ${width} 100`} style={{ position: "absolute", left: (1920 - width) / 2, top: y, overflow: "visible" }}>
    <path d={`M0 50 H${width * .19} C${width*.27} 50 ${width*.28} 10 ${width*.36} 10 S${width*.45} 90 ${width*.53} 90 S${width*.62} 50 ${width*.7} 50 H${width}`} fill="none" stroke="rgba(217,205,246,.26)" strokeWidth="2" />
    <path d={`M0 50 H${width * .19} C${width*.27} 50 ${width*.28} 10 ${width*.36} 10 S${width*.45} 90 ${width*.53} 90 S${width*.62} 50 ${width*.7} 50 H${width}`} fill="none" stroke={C.lilac} strokeWidth="3" strokeLinecap="round" strokeDasharray={width * 1.35} strokeDashoffset={width * 1.35 * (1 - draw)} />
    {draw > .72 && <circle cx={width * .7} cy="50" r={8 + pulse * 5} fill={C.lilac} opacity=".17" />}
  </svg>;
};
