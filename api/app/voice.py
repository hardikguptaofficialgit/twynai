"""Gnani (vachana.ai) voice: Prisma v3 STT, Timbre TTS, voice-clone embeddings. Mock mode when GNANI_API_KEY is unset."""
import io, base64, json, math, re, struct, wave, time, asyncio, httpx, logging
from . import config
log = logging.getLogger("voice")
H = lambda: {"X-API-Key-ID": config.GNANI_API_KEY}

# Voices are model-specific (a v2.5 voice sent to v3.0 is a 400). v3.0 voices speak all 10 languages.
V25_VOICES = {"hi-IN": "Nalini", "en-IN": "Kaveri", "ta-IN": "Asmita", "te-IN": "Suhana", "kn-IN": "Saanvi", "bn-IN": "Kirra", "ml-IN": "Reshma", "mr-IN": "Zahira", "gu-IN": "Falak", "pa-IN": "Mehuli"}
V3_VOICES = {"Avinash", "Shivani", "Lakshmi", "Kalpana", "Chetana", "Vasudha", "Riyaa", "Tarika", "Shubham", "Prakash", "Devansh", "Yashraj", "Harshad"}

def pick_voice(model, language):
    want = config.GNANI_DEFAULT_VOICE
    if model.startswith("timbre-v3"):
        return want if want in V3_VOICES else "Shivani"
    return want if want and want not in V3_VOICES and language == "hi-IN" else V25_VOICES.get(language, "Nalini")

def _split_wav(data: bytes, max_s=29):
    """Cut a WAV into <=29 s parts. Streamed WAVs (Gnani TTS, some browsers) carry a bogus
    0xFFFFFFFF length, so frame counts come from the bytes actually present, and every part
    is re-written with a correct header."""
    try:
        w = wave.open(io.BytesIO(data)); ch, sw, rate = w.getnchannels(), w.getsampwidth(), w.getframerate()
        frames = w.readframes(2**31 - 1)
    except Exception:
        return [data]
    step = rate * max_s * ch * sw
    out = []
    for i in range(0, max(len(frames), 1), step):
        b = io.BytesIO(); o = wave.open(b, "wb"); o.setnchannels(ch); o.setsampwidth(sw); o.setframerate(rate)
        o.writeframes(frames[i:i + step]); o.close(); out.append(b.getvalue())
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

async def retry(call, tries=3):
    """Retry timeouts, 5xx and 429 (honouring Retry-After, capped); other 4xx fail fast."""
    for i in range(tries):
        wait = 0.8 * (i + 1)
        try:
            r = await call()
            if r.status_code < 500 and r.status_code != 429: r.raise_for_status(); return r
            if i == tries - 1: r.raise_for_status()
            try: wait = min(3.0, float(r.headers.get("retry-after", wait)))
            except ValueError: pass
        except (httpx.TimeoutException, httpx.TransportError):
            if i == tries - 1: raise
        await asyncio.sleep(wait)

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
        sem = asyncio.Semaphore(1)  # Gnani rate-limits bursts (429), so segments go one at a time
        async def one(s):
            async with sem: return await tts(s, language, embedding)
        res = await asyncio.gather(*(one(s) for s in segs))
        return [r[0] for r in res], any(r[1] for r in res), None, round((time.perf_counter() - t0) * 1000)
    except Exception as e:
        log.warning("Segmented TTS failed (%s); trying one full-text call", e)
        try:
            await asyncio.sleep(1.0)
            wav, mock = await tts(text, language, embedding)
            return [wav], mock, None, round((time.perf_counter() - t0) * 1000)
        except Exception as e2:
            e = e2
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
        body.update(model=config.GNANI_TTS_MODEL, voice=pick_voice(config.GNANI_TTS_MODEL, language), language=language if language else "hi-IN")
    async with httpx.AsyncClient(timeout=20) as c:
        r = await retry(lambda: c.post(f"{config.GNANI_BASE}/api/v1/tts/inference", headers=H(), json=body))
    return r.content, False

async def clone_embedding(audio: bytes, filename="sample.wav"):
    if not config.GNANI_API_KEY:
        return json.dumps({"embedding": "mock", "shape": [1, 768], "dtype": "torch.bfloat16"})
    async with httpx.AsyncClient(timeout=90) as c:
        r = await c.post(f"{config.GNANI_BASE}/api/v1/tts/voice-clone/embeddings", headers=H(), files={"audio_file": (filename, audio)})
    if r.status_code != 200:
        log.error("Gnani voice clone error %s: %s", r.status_code, r.text)
        try:
            err_msg = r.json().get("message") or r.text
        except Exception:
            err_msg = r.text
        raise RuntimeError(f"Gnani API error ({r.status_code}): {err_msg}")
    return json.dumps(r.json()["data"]["voice_clone_embedding"])

def wav_seconds(data: bytes):
    """Duration of a WAV clip from its bytes (None when it is not a WAV we can read)."""
    if data[:4] != b"RIFF": return None
    try:
        w = wave.open(io.BytesIO(data)); rate, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        i = data.find(b"data", 12)
        return (len(data) - i - 8) / (rate * ch * sw) if i > 0 else w.getnframes() / rate
    except Exception: return None

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

STREAM_RATE = 24000

async def tts_stream(text: str, language="hi-IN", speaker_embedding: str = ""):
    """Timbre SSE: yields raw 16-bit mono PCM at STREAM_RATE as chunks are generated, so the
    browser can start playing well before the sentence is fully synthesized."""
    if not config.GNANI_API_KEY:
        w = wave.open(io.BytesIO(_mock_wav(text))); yield w.readframes(w.getnframes()); return
    language = {"hinglish": "hi-IN"}.get(language, language) or "hi-IN"
    body = {"text": text, "audio_config": {"sample_rate": STREAM_RATE, "encoding": "linear_pcm", "container": "raw", "num_channels": 1, "sample_width": 2}}
    if speaker_embedding:
        body.update(model="vachana-vc-v1", speaker_embedding=json.loads(speaker_embedding), language=language)
    else:
        body.update(model=config.GNANI_TTS_MODEL, voice=pick_voice(config.GNANI_TTS_MODEL, language), language=language)
    for attempt in range(3):
        got = False
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(20, read=20)) as c:
                async with c.stream("POST", f"{config.GNANI_BASE}/api/v1/tts/sse", headers=H(), json=body) as r:
                    if r.status_code == 429 or r.status_code >= 500:
                        await r.aread(); raise httpx.HTTPStatusError("retryable", request=r.request, response=r)
                    r.raise_for_status()
                    event = ""
                    async for line in r.aiter_lines():
                        if line.startswith("event:"): event = line[6:].strip()
                        elif line.startswith("data:"):
                            d = json.loads(line[5:].strip() or "{}")
                            if event == "error": raise RuntimeError(d.get("message", "tts error"))
                            if d.get("audio"):
                                a = base64.b64decode(d["audio"])
                                if a[:4] == b"RIFF": a = a[44:]  # guard: some servers prepend a WAV header
                                got = True; yield a
                            if d.get("is_final"): return
            return
        except httpx.HTTPStatusError as e:
            if got or attempt == 2 or e.response.status_code not in (429,) and e.response.status_code < 500: raise
            await asyncio.sleep(0.8 * (attempt + 1))
