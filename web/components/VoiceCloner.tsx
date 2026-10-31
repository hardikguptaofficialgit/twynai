"use client";
import { useMemo, useRef, useState } from "react";
import { Check, CircleNotch as Loader2, Microphone as Mic, Stop as Square, UploadSimple as Upload, SpeakerHigh as Volume2 } from "@phosphor-icons/react";
import { api, API, encodeWav, token } from "@/lib/api";
import { Orb } from "@/components/Orb";

/** Record in the browser (15 to 30 s, script to read) or upload a clip; clone with Gnani; re-clone any time. */
export function VoiceCloner({ d, set }: { d: any; set: (p: any) => void }) {
  const [rec, setRec] = useState(false); const [secs, setSecs] = useState(0); const [level, setLevel] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(""); const [pBusy, setPBusy] = useState(false);
  const mr = useRef<MediaRecorder | null>(null); const timer = useRef<any>(null);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ""), [blob]);
  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext(); const an = ctx.createAnalyser(); ctx.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.fftSize);
    const parts: Blob[] = []; const m = new MediaRecorder(stream); mr.current = m;
    m.ondataavailable = (e) => parts.push(e.data);
    m.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); ctx.close(); clearInterval(timer.current); setLevel(0); setBlob(await encodeWav(new Blob(parts))); };
    m.start(); setRec(true); setSecs(0); const t0 = Date.now();
    timer.current = setInterval(() => { an.getByteTimeDomainData(buf); let s = 0; buf.forEach((v) => (s += Math.abs(v - 128))); setLevel(Math.min(1, s / buf.length / 30)); const el = (Date.now() - t0) / 1000; setSecs(el); if (el >= 30) stop(); }, 80);
  }
  function stop() { mr.current?.state === "recording" && mr.current.stop(); setRec(false); }
  async function save(b: Blob, name = "sample.wav") {
    setBusy(true); setMsg(""); const fd = new FormData(); fd.append("file", b, name);
    try { const r = await api(`/api/personas/${d.id}/voice`, { method: "POST", body: fd }); set({ has_voice: true }); setPreview("");
      setMsg(r.mock ? "Saved. Cloning runs when a Gnani key is added." : `Voice cloned from a ${Math.round(r.seconds || 0)}s sample with Gnani Timbre.`); }
    catch (e: any) { setMsg(String(e?.message || "").includes("5 to 30") ? "Use a clip between 5 and 30 seconds." : "Cloning failed. Try a cleaner 10 to 30 second clip."); } finally { setBusy(false); }
  }
  async function listen() {
    setPBusy(true);
    try {
      const r = await fetch(`${API}/api/personas/${d.id}/voice/preview`, { method: "POST", headers: token() ? { Authorization: `Bearer ${token()}` } : {} });
      if (!r.ok) throw 0; const u = URL.createObjectURL(await r.blob()); setPreview(u);
      setTimeout(() => (document.getElementById("clone-preview") as HTMLAudioElement | null)?.play().catch(() => {}), 50);
    } catch { setMsg("Preview failed. Try again in a moment."); } finally { setPBusy(false); }
  }
  return (
    <div>
            <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="grid place-items-center"><Orb size={88} state={rec ? "listening" : busy ? "thinking" : "idle"} level={level} /></div>
        <div>
          <div className="glass p-5 text-sm leading-relaxed text-ink-soft" style={{ borderRadius: 20 }}>
            "Hi, this is {d.name || "me"}. Thanks for reaching out. I work as a {(d.headline || "freelancer").toLowerCase()}, and I am happy to help you figure out if we are a good fit. Tell me what you are working on, what you need help with, and when you would like to start. If it sounds like something I can do well, I will share a few times that work for a quick call, and we can take it from there."
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!rec ? <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-ink h-9 px-4 text-[13.5px] font-medium text-canvas"><Mic size={15} />{blob || d.has_voice ? "Record again" : "Start recording"}</button>
              : <button onClick={stop} className="inline-flex items-center gap-2 rounded-2xl bg-peach h-9 px-4 text-[13.5px] font-medium"><Square size={13} />Stop · {secs.toFixed(0)}s</button>}
            <label className="clay-sm inline-flex cursor-pointer items-center gap-2 bg-white h-9 px-4 text-[13.5px]"><Upload size={15} />Upload audio
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBlob(f); } }} /></label>
          </div>
          {blob && !rec && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <audio src={url} controls className="h-10" />
              <button onClick={() => save(blob)} disabled={busy} className="clay-sm inline-flex items-center gap-2 bg-lilac h-9 px-4 text-[13.5px] font-medium">{busy && <Loader2 size={14} className="animate-spin" />}Use this sample</button>
            </div>
          )}
          {(msg || d.has_voice) && <p className="mt-3 flex items-center gap-1.5 text-sm text-mint-deep"><Check size={14} />{msg || "A voice sample is saved."}</p>}
          {d.has_voice && !rec && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={listen} disabled={pBusy} className="clay-sm inline-flex items-center gap-2 bg-mint h-9 px-4 text-[13.5px] font-medium">{pBusy ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={15} />}Hear my Twyn voice</button>
              {preview && <audio id="clone-preview" src={preview} controls className="h-10" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

