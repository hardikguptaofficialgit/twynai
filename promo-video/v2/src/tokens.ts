export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 1800;

export const C = {
  ink: "#1e1b29",
  ink2: "#302d3b",
  paper: "#f5f1ea",
  paperBright: "#fffdf8",
  rule: "#dcd4c6",
  muted: "#77707f",
  lilac: "#d9cdf6",
  lilacDeep: "#8065c9",
  mint: "#cdeadb",
  peach: "#f8dacb",
  sky: "#d9e9f3",
} as const;

export const EASE = [0.22, 1, 0.36, 1] as const;

export const BEATS = {
  hook: { from: 0, duration: 150 },
  create: { from: 150, duration: 660 },
  intelligence: { from: 810, duration: 330 },
  visitor: { from: 1140, duration: 450 },
  end: { from: 1590, duration: 210 },
} as const;

export type Point = { frame: number; x: number; y: number; click?: boolean };
