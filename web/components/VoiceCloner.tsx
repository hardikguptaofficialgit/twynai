"use client";
import { useMemo, useRef, useState } from "react";
import { Check, CircleNotch as Loader2, Microphone as Mic, Stop as Square, UploadSimple as Upload, SpeakerHigh as Volume2, X } from "@phosphor-icons/react";
import { api, API, encodeWav, token } from "@/lib/api";
import { Orb } from "@/components/Orb";

/** Record in the browser (15 to 30 s, script to read) or upload a clip; clone with Gnani; re-clone any time. */
export function VoiceCloner({ d, set, ensurePersona, script }: { d: any; set: (p: any) => void; ensurePersona?: () => Promise<string | null>; script: string }) {
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState("");
  const [pBusy, setPBusy] = useState(false);
  const mr = useRef<MediaRecorder | null>(null);
  const timer = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ""), [blob]);

  async function start() {
    setErr("");
    setMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const parts: Blob[] = [];
      const m = new MediaRecorder(stream);
      mr.current = m;
      m.ondataavailable = (e) => parts.push(e.data);
      m.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        clearInterval(timer.current);
        setLevel(0);
        try {
          const wav = await encodeWav(new Blob(parts));
          setBlob(wav);
        } catch {
          setBlob(new Blob(parts));
        }
      };
      m.start();
      setRec(true);
      setSecs(0);
      const t0 = Date.now();
      timer.current = setInterval(() => {
        an.getByteTimeDomainData(buf);
        let s = 0;
        buf.forEach((v) => (s += Math.abs(v - 128)));
        setLevel(Math.min(1, s / buf.length / 30));
        const el = (Date.now() - t0) / 1000;
        setSecs(el);
        if (el >= 30) stop();
      }, 80);
    } catch {
      setErr("Microphone access was denied. Please allow mic permissions or upload an audio file.");
    }
  }

  function stop() {
    mr.current?.state === "recording" && mr.current.stop();
    setRec(false);
  }

  async function save(b: Blob, name = "sample.wav") {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      if (secs > 0 && secs < 5) {
        setErr("Recording is too short. Gnani voice cloning requires at least 5 to 30 seconds.");
        return;
      }

      let pid = d.id;
      if (!pid && ensurePersona) {
        pid = await ensurePersona();
      }
      if (!pid) {
        setErr("Please complete Step 1 (Handle) before cloning your voice.");
        return;
      }

      let uploadBlob = b;
      try {
        uploadBlob = await encodeWav(b);
      } catch {}

      const fd = new FormData();
      fd.append("file", uploadBlob, name);

      const r = await api(`/api/personas/${pid}/voice`, { method: "POST", body: fd });
      set({ has_voice: true });
      setPreview("");
      setMsg(
        r.mock
          ? "Saved. Voice sample recorded."
          : `Voice cloned from a ${Math.round(r.seconds || secs || 0)}s sample with Gnani Timbre.`
      );
    } catch (e: any) {
      const m = e?.message || "";
      if (m.includes("5 to 30") || m.includes("422")) {
        setErr("Use an audio clip between 5 and 30 seconds.");
      } else if (m.includes("sign in") || m.includes("401")) {
        setErr("Session expired. Please sign in or refresh.");
      } else {
        setErr(m || "Cloning failed. Try a cleaner 10 to 30 second clip.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function listen() {
    if (!d.id) return;
    setPBusy(true);
    try {
      const r = await fetch(`${API}/api/personas/${d.id}/voice/preview`, {
        method: "POST",
        headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      });
      if (!r.ok) throw new Error("Preview generation failed");
      const u = URL.createObjectURL(await r.blob());
      setPreview(u);
      setTimeout(() => (document.getElementById("clone-preview") as HTMLAudioElement | null)?.play().catch(() => {}), 50);
    } catch {
      setErr("Preview failed. Try again in a moment.");
    } finally {
      setPBusy(false);
    }
  }

  return (
    <div>
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="grid place-items-center">
          <Orb size={88} state={rec ? "listening" : busy ? "thinking" : "idle"} level={level} />
        </div>
        <div>
          <div className="glass p-5 text-sm leading-relaxed text-ink-soft" style={{ borderRadius: 20 }}>
            &ldquo;{script}&rdquo;
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!rec ? (
              <button
                type="button"
                onClick={start}
                className="inline-flex items-center gap-2 rounded-full bg-ink h-9 px-4 text-[13.5px] font-medium text-canvas"
              >
                <Mic size={15} />
                {blob || d.has_voice ? "Record again" : "Start recording"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-2xl bg-peach h-9 px-4 text-[13.5px] font-medium"
              >
                <Square size={13} />
                Stop · {secs.toFixed(0)}s
              </button>
            )}
            <label className="clay-sm inline-flex cursor-pointer items-center gap-2 bg-white h-9 px-4 text-[13.5px]">
              <Upload size={15} />
              Upload audio
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setErr("");
                    setMsg("");
                    try {
                      const wav = await encodeWav(f);
                      setBlob(wav);
                    } catch {
                      setBlob(f);
                    }
                  }
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            </label>
          </div>
          {blob && !rec && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <audio src={url} controls className="h-10" />
              <button
                type="button"
                onClick={() => save(blob)}
                disabled={busy}
                className="clay-sm inline-flex items-center gap-2 bg-lilac h-9 px-4 text-[13.5px] font-medium disabled:opacity-60"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Use this sample
              </button>
            </div>
          )}

          {/* Success Status */}
          {msg && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-mint-deep">
              <Check size={14} weight="bold" />
              {msg}
            </p>
          )}

          {/* Error Status - Never green checkmark! */}
          {err && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-peach-deep">
              <X size={14} weight="bold" />
              {err}
            </p>
          )}

          {/* Existing voice status */}
          {d.has_voice && !msg && !err && !rec && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-mint-deep">
              <Check size={14} weight="bold" />
              A voice sample is saved.
            </p>
          )}

          {d.has_voice && !rec && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={listen}
                disabled={pBusy}
                className="clay-sm inline-flex items-center gap-2 bg-mint h-9 px-4 text-[13.5px] font-medium"
              >
                {pBusy ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={15} />}
                Hear my Twyn voice
              </button>
              {preview && <audio id="clone-preview" src={preview} controls className="h-10" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
