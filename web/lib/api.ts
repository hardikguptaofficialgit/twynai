export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100";
export const WS = process.env.NEXT_PUBLIC_WS_URL || API.replace(/^http/, "ws");

export function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("proxy_token") || "";
}

export function wsUrl(path: string) {
  const t = token();
  return `${WS}${path}${t ? `${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(t)}` : ""}`;
}

export function connectWs(path: string, onMessage: (data: any) => void) {
  let stopped = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | undefined;
  const open = () => {
    if (stopped) return;
    socket = new WebSocket(wsUrl(path));
    socket.onopen = () => { attempt = 0; };
    socket.onmessage = (event) => onMessage(JSON.parse(event.data));
    socket.onclose = () => {
      if (stopped) return;
      const delay = Math.min(1000 * 2 ** attempt++, 10000);
      timer = setTimeout(open, delay);
    };
  };
  open();
  return () => { stopped = true; if (timer) clearTimeout(timer); socket?.close(); };
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (!(opts.body instanceof FormData) && opts.body) headers["Content-Type"] = "application/json";
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const r = await fetch(API + path, { ...opts, headers });
  if (typeof window !== "undefined" && (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_PERF === "1")) {
    const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
    console.debug(`[twyn-perf] api ${opts.method || "GET"} ${path} ${Math.round(elapsed)}ms status=${r.status}`);
  }
  if (!r.ok) {
    const t = await r.text();
    let msg = t || r.statusText;
    try { const j = JSON.parse(t); if (typeof j.detail === "string") msg = j.detail; } catch {}
    if (r.status === 429) msg = "Too many requests, try again in a minute.";
    throw new Error(msg);
  }
  return r.json();
}

export type Owner = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  google_connected?: boolean;
  google_tokens?: boolean;
  calendar_status?: "connected" | "disconnected" | "needs_reconnect" | "revoked" | "api_disabled" | "not_connected";
  calendar_connected?: boolean;
  created_at?: string;
};

export type Persona = {
  id: string; handle: string; name: string; headline: string; bio: string; rates: string;
  faqs: { q: string; a: string }[]; links: { label: string; url: string }[]; tone: string; accent: string; has_voice: boolean; languages?: string[];
  avatar_url?: string;
};

export const ACCENTS: Record<string, { soft: string; deep: string }> = {
  lilac: { soft: "#d9cdf6", deep: "#8b74d6" },
  mint: { soft: "#cdeadb", deep: "#3f9a72" },
  peach: { soft: "#f8dacb", deep: "#d27a52" },
  sky: { soft: "#cfe2f5", deep: "#4c84bf" },
  butter: { soft: "#f4eac3", deep: "#b08f22" },
};

/** Record mic audio and encode as 16 kHz mono WAV (what Gnani Prisma expects). */
export async function encodeWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.ceil(buf.duration * rate), rate);
  const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start();
  const out = await off.startRendering();
  const pcm = out.getChannelData(0);
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); view.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, "data"); view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  ctx.close();
  return new Blob([view], { type: "audio/wav" });
}
