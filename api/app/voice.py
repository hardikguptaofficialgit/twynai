"""Gnani (vachana.ai) voice: Prisma v3 STT, Timbre TTS, voice-clone embeddings. Mock mode when GNANI_API_KEY is unset."""
import io, json, math, re, struct, wave, time, asyncio, httpx, logging
from . import config
log = logging.getLogger("voice")
H = lambda: {"X-API-Key-ID": config.GNANI_API_KEY}

LANG_VOICES = {"hi-IN": "Nalini", "en-IN": "Nalini"}

def _split_wav(data: bytes, max_s=29):
    try:
        w = wave.open(io.BytesIO(data))
    except Exception:
        return [data]
    rate, n = w.getframerate(), w.getnframes()
    per = rate * max_s
    if n <= per: return [data]
    out = []
    for _ in range(0, n, per):
        frames = w.readframes(per)
        b = io.BytesIO(); o = wave.open(b, "wb"); o.setparams(w.getparams()); o.writeframes(frames); o.close()
        out.append(b.getvalue())
    return out

async def stt(audio: bytes, filename="audio.wav"):
    if not config.GNANI_API_KEY:
        return {"transcript": "", "language": "en-IN", "mock": True}
    parts = _split_wav(audio)  # REST accepts <=30 s, so long takes are cut and sent in parallel
    async with httpx.AsyncClient(timeout=30) as c:
        async def one(part):
            r = await retry(lambda: c.post(f"{config.GNANI_BASE}/stt/v3", headers=H(),
                files={"audio_file": (filename, part, "audio/wav")},
                data={"model": "prisma-v3.0", "language_code": "indic-auto", "format": "codemix"}))
            return r.json()
        js = await asyncio.gather(*(one(p) for p in parts))
    lang = next((j.get("detected_language_code") for j in js if j.get("detected_language_code")), "en-IN")
    return {"transcript": " ".join(j.get("transcript", "") for j in js).strip(), "language": lang, "mock": False, "chunks": len(parts)}

async def retry(call, tries=2):
    """One retry on timeouts and 5xx / 429; 4xx (bad key, bad input) fail fast."""
    for i in range(tries):
        try:
            r = await call()
            if r.status_code < 500 and r.status_code != 429: r.raise_for_status(); return r
            if i == tries - 1: r.raise_for_status()
        except (httpx.TimeoutException, httpx.TransportError):
            if i == tries - 1: raise
        await asyncio.sleep(0.4 * (i + 1))

def sentences(text: str, max_len=220):
    """Split a reply into speakable segments so the first one can play while the rest synthesize."""
    parts = [p.strip() for p in re.split(r"(?<=[.!?\u0964])\s+", text or "") if p.strip()]
    out = []
    for p in parts:
        if out and len(out[-1]) + len(p) < 60: out[-1] += " " + p
        else: out.append(p[:max_len])
    return out or ([text] if text else [])

async def speak(text, language, embedding=""):
    """Synthesize sentence segments in parallel. Any Gnani failure falls back cleanly to the
    mock tone (client then uses browser speech) instead of failing the turn."""
    t0 = time.perf_counter(); segs = sentences(text)
    try:
        res = await asyncio.gather(*(tts(s, language, embedding) for s in segs))
        return [r[0] for r in res], any(r[1] for r in res), None, round((time.perf_counter() - t0) * 1000)
    except Exception as e:
        log.warning("TTS failed, falling back: %s", e)
        return [_mock_wav(text)], True, f"tts:{type(e).__name__}", round((time.perf_counter() - t0) * 1000)

async def tts(text: str, language="hi-IN", speaker_embedding: str = ""):
    if not config.GNANI_API_KEY:
        return _mock_wav(text), True
    language = {"hinglish": "hi-IN"}.get(language, language)  # Gnani has no separate Hinglish code
    body = {"text": text, "audio_config": {"sample_rate": 24000, "encoding": "linear_pcm", "container": "wav"}}
    if speaker_embedding:
        body.update(model="vachana-vc-v1", speaker_embedding=json.loads(speaker_embedding))
    else:
        body.update(model=config.GNANI_TTS_MODEL, voice=LANG_VOICES.get(language, config.GNANI_DEFAULT_VOICE), language=language if language else "hi-IN")
    async with httpx.AsyncClient(timeout=20) as c:
        r = await retry(lambda: c.post(f"{config.GNANI_BASE}/api/v1/tts/inference", headers=H(), json=body))
    return r.content, False

async def clone_embedding(audio: bytes, filename="sample.wav"):
    if not config.GNANI_API_KEY:
        return json.dumps({"embedding": "mock", "shape": [1, 768], "dtype": "torch.bfloat16"})
    async with httpx.AsyncClient(timeout=90) as c:
        r = await c.post(f"{config.GNANI_BASE}/api/v1/tts/voice-clone/embeddings", headers=H(), files={"audio_file": (filename, audio)})
    r.raise_for_status()
    return json.dumps(r.json()["data"]["voice_clone_embedding"])

def _mock_wav(text: str):
    """Soft syllable-like hum so the voice orb has real audio to react to without a key."""
    rate = 16000; dur = min(6.0, 0.35 + len(text) * 0.045)
    b = io.BytesIO(); w = wave.open(b, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
    frames = bytearray()
    for i in range(int(rate * dur)):
        t = i / rate
        env = max(0.0, math.sin(math.pi * (t * 4.2 % 1))) ** 2
        s = 0.18 * env * (math.sin(2 * math.pi * 180 * t) + 0.4 * math.sin(2 * math.pi * 360 * t))
        frames += struct.pack("<h", int(s * 32767 * 0.6))
    w.writeframes(bytes(frames)); w.close()
    return b.getvalue()
