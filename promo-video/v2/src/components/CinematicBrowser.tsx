import React from "react";
import { Easing, Img, Video, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, EASE } from "../tokens";

type Props = {
  clip: string;
  from: number;
  duration: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  zoom?: [number, number];
  focus?: { x: number; y: number };
  muted?: boolean;
  startFrom?: number;
  playbackRate?: number;
};

export const CinematicBrowser: React.FC<Props> = ({ clip, from, duration, x, y, width, height, label, zoom = [1.04, 1], focus = { x: 50, y: 50 }, muted = true, startFrom = 0, playbackRate = 1 }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const opacity = interpolate(local, [0, 12, duration - 12, duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(...EASE) });
  const scale = interpolate(local, [0, duration], zoom, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(...EASE) });
  const tilt = interpolate(local, [0, 18, duration - 18, duration], [1.2, 0, 0, -1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", left: x, top: y, width, height, opacity, transform: `perspective(1800px) rotateX(${tilt}deg) scale(${scale})`, transformOrigin: `${focus.x}% ${focus.y}%`, borderRadius: 30, overflow: "hidden", background: C.paperBright, border: "1px solid rgba(255,255,255,.72)", boxShadow: "0 38px 100px rgba(17,14,26,.27), 0 2px 4px rgba(17,14,26,.12)" }}>
    <div style={{ height: 38, background: "rgba(238,232,220,.95)", display: "flex", alignItems: "center", padding: "0 16px", gap: 7, borderBottom: `1px solid ${C.rule}` }}>
      {['#df8b83','#e1bd66','#84b893'].map((color) => <i key={color} style={{ width: 9, height: 9, borderRadius: 9, background: color }} />)}
      <span style={{ marginLeft: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#817a87", letterSpacing: ".06em" }}>twyn.ai</span>
    </div>
    {clip.endsWith(".png")
      ? <Img src={staticFile(`v2/stills/${clip}`)} style={{ width: "100%", height: "calc(100% - 38px)", objectFit: "cover", objectPosition: "center top" }} />
      : <Video src={staticFile(`v2/footage/${clip}`)} muted={muted} startFrom={startFrom} playbackRate={playbackRate} style={{ width: "100%", height: "calc(100% - 38px)", objectFit: "cover", objectPosition: "center top" }} />}
    {label && <div style={{ position: "absolute", left: 18, bottom: 16, padding: "7px 10px", borderRadius: 999, color: C.ink, background: "rgba(255,253,248,.82)", backdropFilter: "blur(9px)", border: "1px solid rgba(255,255,255,.86)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em" }}>{label}</div>}
  </div>;
};
