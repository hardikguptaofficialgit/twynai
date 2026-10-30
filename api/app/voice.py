"""Gnani (vachana.ai) voice: Prisma v3 STT, Timbre TTS, voice-clone embeddings. Mock mode when GNANI_API_KEY is unset."""
import io, json, math, struct, wave, httpx, logging
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
    texts, lang = [], "en-IN"
    async with httpx.AsyncClient(timeout=60) as c:
        for part in _split_wav(audio):
            r = await c.post(f"{config.GNANI_BASE}/stt/v3", headers=H(),
                files={"audio_file": (filename, part, "audio/wav")},
                data={"model": "prisma-v3.0", "language_code": "indic-auto", "format": "codemix"})
            r.raise_for_status(); j = r.json()
            texts.append(j.get("transcript", "")); lang = j.get("detected_language_code") or lang
    return {"transcript": " ".join(t for t in texts if t).strip(), "language": lang, "mock": False}

async def tts(text: str, language="hi-IN", speaker_embedding: str = ""):
    if not config.GNANI_API_KEY:
        return _mock_wav(text), True
    body = {"text": text, "audio_config": {"sample_rate": 24000, "encoding": "linear_pcm", "container": "wav"}}
    if speaker_embedding:
        body.update(model="vachana-vc-v1", speaker_embedding=json.loads(speaker_embedding))
    else:
        body.update(model=config.GNANI_TTS_MODEL, voice=LANG_VOICES.get(language, config.GNANI_DEFAULT_VOICE), language=language if language else "hi-IN")
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{config.GNANI_BASE}/api/v1/tts/inference", headers=H(), json=body)
    r.raise_for_status()
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
