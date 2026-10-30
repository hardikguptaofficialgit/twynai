"""Run: cd api && ../.venv/bin/python -m pytest -q   (LIVE=1 also exercises the real LLM)"""
import os, json, asyncio, pytest
from app import rag, voice
from app.main import guess_lang, matches_lang, plain

KNOW = {
    "rates": "Rates and pricing: Freelance MVP builds start at 25,000 rupees per week. A 30 minute discovery call is free.",
    "bio": "I build AI products end to end: Next.js frontends, Python backends and voice agents for Indian languages. I take freelance builds and I am open to internships.",
    "faq1": "Q: Are you available for internships? A: Yes, I am open to AI and full-stack internships starting January.",
    "faq2": "Q: Which languages can I talk to you in? A: English, Hindi and Hinglish work best.",
    "faq3": "Q: What do you work on? A: Voice AI agents, full-stack web apps and LLM tooling.",
    "links": "Links: GitHub https://github.com/hardik LinkedIn https://linkedin.com/in/hardik",
}
class C:  # minimal chunk
    def __init__(s, src, t): s.source, s.text, s.embedding = src, t, json.dumps(rag.embed(t))
CH = [C(k, v) for k, v in KNOW.items()]

RELEVANT = {"What do you charge?": "rates", "Bhai aapka rate kitna hai?": "rates", "kya aap internship ke liye available ho": "faq1", "aapki bhashayein kaunsi hain": "faq2", "Are you open to internships?": "faq1",
            "Which languages can I talk in?": "faq2", "what tech stack do you use": None, "GitHub link?": "links",
            "kya aap freelance karte ho": None}
UNRELATED = ["best movie this year", "weather in Delhi", "recipe for biryani", "who won the cricket match",
             "capital of France", "tell me a joke", "aaj mausam kaisa hai", "stock market tips", "write me a poem about the sea"]

@pytest.mark.parametrize("q,src", RELEVANT.items())
def test_relevant_queries_retrieve(q, src):
    hits = rag.search(CH, q)
    assert hits, f"no context for {q!r}"
    if src: assert src in [c.source for _, c in hits]

@pytest.mark.parametrize("q", UNRELATED)
def test_unrelated_queries_get_nothing(q):
    assert rag.search(CH, q) == [], [(round(s, 3), c.source) for s, c in rag.search(CH, q)]

@pytest.mark.parametrize("t,lang", [("Bhai aapka rate kitna hai?", "hinglish"), ("kal free ho kya", "hinglish"), ("Can we book a call this week?", "en-IN"),
    ("आपका रेट क्या है?", "hi-IN"), ("உங்கள் கட்டணம் என்ன?", "ta-IN"), ("Is the rate per week?", "en-IN"), ("Hi, are you free tomorrow?", "en-IN")])
def test_guess_lang(t, lang): assert guess_lang(t) == lang

def test_matches_lang():
    assert matches_lang("Haan, mera rate 25,000 per week hai.", "hinglish")
    assert not matches_lang("My rate is 25,000 per week.", "hinglish")
    assert not matches_lang("मेरा रेट 25,000 है", "hinglish")
    assert matches_lang("My rate is 25,000 per week.", "en-IN")

def test_plain_strips_markdown():
    assert plain("Slots: - Monday 10 AM - Tuesday **11 AM**") == "Slots: Monday 10 AM; Tuesday 11 AM"

def test_sentence_segments():
    segs = voice.sentences("Haan bilkul. Kal 10 baje free hoon! Aapka email kya hai? Main invite bhej dunga.")
    assert len(segs) >= 2 and "".join(segs).replace(" ", "") == "Haanbilkul.Kal10bajefreehoon!Aapkaemailkyahai?Maininvitebhejdunga."

def test_speak_falls_back_without_key(monkeypatch):
    monkeypatch.setattr(voice.config, "GNANI_API_KEY", "")
    wavs, mock, fb, ms = asyncio.run(voice.speak("Hello there. How can I help?", "hinglish"))
    assert wavs and mock and fb is None

def test_speak_falls_back_on_gnani_error(monkeypatch):
    monkeypatch.setattr(voice.config, "GNANI_API_KEY", "x")
    async def boom(*a, **k): raise RuntimeError("down")
    monkeypatch.setattr(voice, "tts", boom)
    wavs, mock, fb, _ = asyncio.run(voice.speak("Hi.", "en-IN"))
    assert wavs and mock and fb == "tts:RuntimeError"

live = pytest.mark.skipif(not os.getenv("LIVE"), reason="set LIVE=1 to hit the real LLM via the running API on :8100")
@live
@pytest.mark.parametrize("q,lang", [("Bhai aapka rate kitna hai?", "hinglish"), ("Kya aap internship ke liye available ho?", "hinglish"),
    ("kal call kar sakte hain kya?", "hinglish"), ("What do you charge for an MVP?", "en-IN"), ("आप किन भाषाओं में बात करते हैं?", "hi-IN")])
def test_live_reply_language(q, lang):
    import httpx
    r = httpx.post("http://localhost:8100/api/p/hardik/chat", json={"text": q}, timeout=90).json()
    assert matches_lang(r["reply"], lang), r["reply"]

def test_plain_joins_line_lists():
    assert plain("Slots this week: Monday 10 AM IST\nTuesday 11 AM IST\nLet me know.") == "Slots this week: Monday 10 AM IST; Tuesday 11 AM IST; Let me know."

def test_voice_lang_codemix():
    from app.main import voice_lang
    assert voice_lang("भाई, क्या हार्दिक is week एक quick call के लिए free है?", {"language": "hi-IN"}) == "hinglish"
    assert voice_lang("नमस्ते, आप कैसे हैं?", {"language": "hi-IN"}) == "hi-IN"
    assert voice_lang("வணக்கம்", {"language": "ta-IN"}) == "ta-IN"

def test_split_streamed_wav():
    import io, wave
    from app.voice import _split_wav
    b = io.BytesIO(); w = wave.open(b, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b"\0\0" * 8000 * 61); w.close()
    raw = bytearray(b.getvalue()); raw[4:8] = b"\xff\xff\xff\xff"; raw[40:44] = b"\xff\xff\xff\xff"  # streamed header
    parts = _split_wav(bytes(raw))
    assert len(parts) == 3 and all(wave.open(io.BytesIO(p)).getnframes() <= 8000 * 29 for p in parts)
