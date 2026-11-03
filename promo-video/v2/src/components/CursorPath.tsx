import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, type Point } from "../tokens";

const Pointer: React.FC = () => (
  <svg width="30" height="40" viewBox="0 0 30 40" fill="none" style={{ filter: "drop-shadow(0 5px 7px rgba(16,13,22,.3))" }}>
    <path d="M3 2.5 4.8 34.6c.05.92 1.22 1.23 1.71.45l6.02-9.52 7.45 10.34a1.2 1.2 0 0 0 1.67.27l3.2-2.3a1.2 1.2 0 0 0 .27-1.68L17.6 21.8l10.97-4.36c.86-.34.83-1.57-.04-1.87L4.59 1.39C3.75 1.1 2.95 1.6 3 2.5Z" fill="#fffdf8" stroke="#1e1b29" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);

export const CursorPath: React.FC<{ points: Point[]; from: number; until: number }> = ({ points, from, until }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const visible = interpolate(local, [0, 8, until - from - 8, until - from], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const frames = points.map((p) => p.frame);
  const x = interpolate(local, frames, points.map((p) => p.x), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(...EASE) });
  const y = interpolate(local, frames, points.map((p) => p.y), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(...EASE) });
  const click = points.find((p) => p.click && Math.abs(local - p.frame) < 11);
  const pulse = click ? interpolate(Math.abs(local - click.frame), [0, 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return <div style={{ position: "absolute", left: x, top: y, zIndex: 50, opacity: visible, transform: "translate(-2px,-2px)", pointerEvents: "none" }}>
    {pulse > 0 && <span style={{ position: "absolute", left: -11, top: -11, width: 34, height: 34, border: `1.5px solid ${C.lilacDeep}`, borderRadius: "50%", opacity: pulse * .7, transform: `scale(${1 + (1 - pulse) * .75})` }} />}
    <Pointer />
  </div>;
};
