import React from "react";
import { Audio, interpolate, staticFile, useCurrentFrame } from "remotion";

export const V2Sound: React.FC = () => {
  const frame = useCurrentFrame();
  const music = interpolate(frame, [0, 28, 148, 150, 800, 810, 1135, 1140, 1588, 1595, 1770, 1800], [0, .52, .52, .42, .46, .32, .5, .42, .54, .36, .36, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <><Audio src={staticFile("v2/audio/twyn-v2-bed.wav")} volume={music} /><Audio src={staticFile("v2/audio/twyn-v2-fx.wav")} volume={.8} /></>;
};
