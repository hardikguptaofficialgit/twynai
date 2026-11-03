import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from "remotion";

type Props = { vertical?: boolean };
const INK = "#302d3b";
const CANVAS = "#f5f1ea";
const PAPER = "#fffdf8";
const RULE = "#dcd4c6";
const LILAC = "#d9cdf6";
const LILAC_DEEP = "#8065c9";
const MINT = "#cdeadb";
const PEACH = "#f8dacb";

const ease = Easing.bezier(0.22, 1, 0.36, 1);

function FadeText({ children, start, duration = 18, style = {} }: { children: React.ReactNode; start: number; duration?: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const y = interpolate(frame, [start, start + duration], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return <div style={{ opacity, transform: `translateY(${y}px)`, ...style }}>{children}</div>;
}

function Progress({ label, index, vertical }: { label: string; index: string; vertical: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#6f6a78", fontFamily: "'JetBrains Mono', monospace", fontSize: vertical ? 18 : 14, letterSpacing: 1.8, textTransform: "uppercase" }}>
    <span style={{ color: LILAC_DEEP }}>{index}</span><span>{label}</span><span style={{ width: vertical ? 100 : 180, height: 1, background: RULE }} />
  </div>;
}

function BrowserShot({ file, start, duration, vertical, label }: { file: string; start: number; duration: number; vertical: boolean; label: string }) {
  const frame = useCurrentFrame();
  const local = frame - start;
  const scale = interpolate(local, [0, duration], [1.02, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const x = vertical ? 34 : 160;
  const width = vertical ? 1012 : 1600;
  const height = vertical ? 720 : 820;
  const y = vertical ? 470 : 130;
  return <div style={{ position: "absolute", left: x, top: y, width, height, borderRadius: vertical ? 26 : 30, overflow: "hidden", background: PAPER, border: `1px solid ${RULE}`, boxShadow: "0 24px 80px rgba(48,45,59,.18)", transform: `scale(${scale})`, transformOrigin: "center center" }}>
    <div style={{ height: 34, background: "#eee8dc", display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
      <i style={{ width: 9, height: 9, borderRadius: 99, background: "#df8b83" }} /><i style={{ width: 9, height: 9, borderRadius: 99, background: "#e1bd66" }} /><i style={{ width: 9, height: 9, borderRadius: 99, background: "#84b893" }} />
      <span style={{ marginLeft: 18, color: "#8d8790", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>twyn.ai / live product</span>
    </div>
    <Video src={staticFile(`footage/${file}`)} muted loop style={{ width: "100%", height: "calc(100% - 34px)", objectFit: "cover", objectPosition: "center top" }} />
    <div style={{ position: "absolute", left: 20, bottom: 18, padding: "7px 11px", borderRadius: 99, background: "rgba(255,253,248,.88)", color: INK, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.2 }}>{label}</div>
  </div>;
}

function Cursor({ x, y, start, vertical = false }: { x: number; y: number; start: number; vertical?: boolean }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const click = frame >= start + 20 && frame <= start + 28;
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(${interpolate(p, [0, 1], [vertical ? -50 : -90, 0])}px, ${interpolate(p, [0, 1], [vertical ? 30 : 40, 0])}px)`, zIndex: 8, opacity: p }}>
    {click && <div style={{ position: "absolute", left: -10, top: -10, width: 34, height: 34, border: `2px solid ${LILAC_DEEP}`, borderRadius: 99, opacity: .6, transform: "scale(1.3)" }} />}
    <div style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "3px solid transparent", borderTop: `22px solid ${INK}`, transform: "rotate(-24deg)", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.22))" }} />
  </div>;
}

function Hook({ vertical }: { vertical: boolean }) {
  const frame = useCurrentFrame();
  const intro = spring({ frame, fps: 30, config: { damping: 200, stiffness: 90 } });
  const cx = vertical ? 70 : 160;
  return <AbsoluteFill style={{ background: CANVAS, color: INK, padding: vertical ? "110px 64px" : "96px 160px" }}>
    <Img src={staticFile("brand/mark.svg")} style={{ width: vertical ? 72 : 62, height: vertical ? 72 : 62 }} />
    <div style={{ position: "absolute", left: cx, top: vertical ? 520 : 365, maxWidth: vertical ? 900 : 980, transform: `translateY(${(1 - intro) * 20}px)`, opacity: intro }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: vertical ? 18 : 15, letterSpacing: 2, color: LILAC_DEEP, textTransform: "uppercase", marginBottom: 28 }}>Twyn AI / product film</div>
      <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 400, fontSize: vertical ? 80 : 96, lineHeight: .96, letterSpacing: -4 }}>Your audience.<br />Your knowledge.<br /><em style={{ color: LILAC_DEEP }}>Your Twyn.</em></h1>
      <div style={{ marginTop: 38, fontFamily: "Hanken Grotesk, Arial, sans-serif", fontSize: vertical ? 30 : 25, color: "#686270" }}>What if they could talk to your digital twin?</div>
    </div>
    <div style={{ position: "absolute", right: vertical ? 70 : 160, bottom: vertical ? 120 : 90, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: 1.4, color: "#8c8590" }}>01 / 06</div>
  </AbsoluteFill>;
}

function Intelligence({ vertical }: { vertical: boolean }) {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 10), [-1, 1], [.75, 1]);
  const top = vertical ? 300 : 160;
  const left = vertical ? 60 : 160;
  const cardW = vertical ? 960 : 430;
  const cardH = vertical ? 170 : 150;
  const cards = [
    ["Creator knowledge", "FastEmbed / multilingual MiniLM", LILAC],
    ["Conversation brain", "Meta · NVIDIA NIM · Groq · OpenRouter", PEACH],
    ["Voice layer", "Gnani Prisma · Timbre · voice clone", MINT],
  ];
  return <AbsoluteFill style={{ background: CANVAS, color: INK, padding: vertical ? "90px 60px" : "80px 160px" }}>
    <Progress label="what powers the moment" index="04" vertical={vertical} />
    <h2 style={{ margin: 0, position: "absolute", top, left, fontFamily: "Georgia, serif", fontWeight: 400, fontSize: vertical ? 72 : 72, lineHeight: 1, letterSpacing: -3 }}>The intelligence<br /><em style={{ color: LILAC_DEEP }}>behind the voice.</em></h2>
    <div style={{ position: "absolute", left, top: vertical ? 690 : 425, display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: vertical ? 22 : 26 }}>
      {cards.map(([title, detail, color], i) => <React.Fragment key={title}>
        <div style={{ width: cardW, height: cardH, padding: vertical ? 26 : 24, borderRadius: 20, background: PAPER, border: `1px solid ${RULE}`, boxShadow: "0 12px 32px rgba(48,45,59,.08)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ width: 12, height: 12, borderRadius: 99, background: color as string, boxShadow: `0 0 0 ${pulse * 5}px ${(color as string)}44` }} />
          <div><div style={{ fontFamily: "Hanken Grotesk, Arial, sans-serif", fontSize: vertical ? 27 : 22, fontWeight: 700 }}>{title}</div><div style={{ marginTop: 6, color: "#77707f", fontFamily: "'JetBrains Mono', monospace", fontSize: vertical ? 15 : 12 }}>{detail}</div></div>
        </div>
        {i < 2 && <div style={{ width: vertical ? 2 : 60, height: vertical ? 34 : 2, background: LILAC_DEEP, opacity: .7 }} />}
      </React.Fragment>)}
    </div>
    <div style={{ position: "absolute", left, bottom: vertical ? 100 : 92, fontFamily: "Hanken Grotesk, Arial, sans-serif", fontSize: vertical ? 25 : 22, color: "#686270" }}>Gnani turns the answer into a voice people can actually hear.</div>
  </AbsoluteFill>;
}

function EndCard({ vertical }: { vertical: boolean }) {
  return <AbsoluteFill style={{ background: INK, color: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", padding: 60 }}>
    <Img src={staticFile("brand/wordmark-dark.svg")} style={{ width: vertical ? 300 : 250, marginBottom: 50 }} />
    <h2 style={{ margin: 0, fontFamily: "Georgia, serif", fontWeight: 400, fontSize: vertical ? 84 : 78, lineHeight: 1, letterSpacing: -3 }}>Create your Twyn.</h2>
    <p style={{ margin: "26px 0 0", color: "#c7c0cf", fontFamily: "Hanken Grotesk, Arial, sans-serif", fontSize: vertical ? 29 : 24 }}>Your digital presence, ready for conversations.</p>
    <div style={{ marginTop: 66, display: "flex", gap: 22, fontFamily: "'JetBrains Mono', monospace", fontSize: vertical ? 20 : 16, color: LILAC }}>{"#GnaniAI"} <span style={{ color: "#a49aa8" }}>·</span> {"#GreatIndianAIInternshipChallenge"}</div>
    <div style={{ marginTop: 36, fontFamily: "'JetBrains Mono', monospace", fontSize: vertical ? 16 : 13, color: "#958b9c" }}>twynai.vercel.app</div>
  </AbsoluteFill>;
}

export const TwynLaunchFilm: React.FC<Props> = ({ vertical = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sceneFade = (start: number) => interpolate(frame, [start, start + 12, start + 400, start + 420], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: CANVAS, fontFamily: "Arial, sans-serif" }}>
    <Audio src={staticFile("audio/twyn-score.wav")} volume={0.42} />
    <Sequence from={0} durationInFrames={120}><Hook vertical={vertical} /></Sequence>
    <Sequence from={120} durationInFrames={180} style={{ opacity: sceneFade(120) }}><AbsoluteFill><BrowserShot file="01-landing.webm" start={120} duration={180} vertical={vertical} label="REAL LANDING PAGE" /><Cursor x={vertical ? 760 : 1230} y={vertical ? 1060 : 640} start={145} vertical={vertical} /><div style={{ position: "absolute", left: vertical ? 60 : 160, top: vertical ? 160 : 95 }}><Progress label="discover" index="02" vertical={vertical} /></div></AbsoluteFill></Sequence>
    <Sequence from={300} durationInFrames={450} style={{ opacity: sceneFade(300) }}><AbsoluteFill><BrowserShot file="02-onboarding.webm" start={300} duration={450} vertical={vertical} label="REAL ONBOARDING FLOW" /><Cursor x={vertical ? 760 : 1220} y={vertical ? 1000 : 650} start={345} vertical={vertical} /><div style={{ position: "absolute", left: vertical ? 60 : 160, top: vertical ? 160 : 95 }}><Progress label="create your Twyn" index="03" vertical={vertical} /></div></AbsoluteFill></Sequence>
    <Sequence from={750} durationInFrames={390}><Intelligence vertical={vertical} /></Sequence>
    <Sequence from={1140} durationInFrames={420} style={{ opacity: sceneFade(1140) }}><AbsoluteFill><BrowserShot file="03-public-chat-book.webm" start={1140} duration={220} vertical={vertical} label="CHAT · TALK · BOOK" /><BrowserShot file="05-visitor-talk.webm" start={1360} duration={200} vertical={vertical} label="VISITOR VIEW" /><div style={{ position: "absolute", left: vertical ? 60 : 160, top: vertical ? 160 : 95 }}><Progress label="the visitor moment" index="05" vertical={vertical} /></div></AbsoluteFill></Sequence>
    <Sequence from={1560} durationInFrames={240}><EndCard vertical={vertical} /></Sequence>
    <div style={{ position: "absolute", right: vertical ? 45 : 70, top: vertical ? 70 : 45, color: "#8b8490", fontFamily: "'JetBrains Mono', monospace", fontSize: vertical ? 13 : 12, letterSpacing: 1.5 }}>{String(Math.min(60, Math.floor(frame / 30))).padStart(2, "0")} / 60</div>
  </AbsoluteFill>;
};
