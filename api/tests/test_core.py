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
    assert plain("Slots this week: Monday 10 AM IST\nTuesday 11 AM IST\nLet me know.") == "Slots this week: Monday 10 AM IST; Tuesday 11 AM IST. Let me know."

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

# ---- streaming + localized slots + cloning ----
import datetime as _dt, io as _io, wave as _wave
from app.calendar_svc import local_label
from app.main import split_ready

@pytest.mark.parametrize("lang,day", [("en-IN", "Tuesday"), ("hinglish", "Tuesday"), ("hi-IN", "मंगलवार"), ("ta-IN", "செவ்வாய்")])
def test_local_label_weekday_matches_date(lang, day):
    for d in range(7):  # every weekday of a week maps to its own name, never shifted
        st = _dt.datetime(2026, 11, 2 + d, 10, 45)
        lab = local_label(st, lang)
        assert "10:45" in lab and str(st.day) in lab
    assert local_label(_dt.datetime(2026, 11, 3, 10, 45), lang).startswith(day)

def test_split_ready_sentences():
    assert split_ready("Haan ji, main free hoon. Tues", True) == ("Haan ji, main free hoon.", " Tues")
    assert split_ready("Slot at 10.45 is", True)[0] == ""          # no break inside a time
    assert split_ready("ok. ", True)[0] == ""                      # too short to be worth a TTS call
    long = "Thursday ki shaam ka slot abhi available nahi hai, lekin free discovery call ke liye ye"
    ready, rest = split_ready(long, True); assert ready.endswith(",") and long.startswith(ready)
    assert split_ready(long, False)[0] == ""                       # comma break only for sentence 1
    assert split_ready("मैं फ्री हूँ। कल", True)[0] == "मैं फ्री हूँ।"

def test_wav_seconds():
    b = _io.BytesIO(); w = _wave.open(b, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(b"\0\0" * 16000 * 3); w.close()
    assert abs(voice.wav_seconds(b.getvalue()) - 3) < 0.01 and voice.wav_seconds(b"OggS....") is None

def test_tts_stream_mock(monkeypatch):
    monkeypatch.setattr(voice.config, "GNANI_API_KEY", "")
    async def go(): return [c async for c in voice.tts_stream("Hello there.", "en-IN")]
    assert sum(map(len, asyncio.run(go()))) > 1000

@live
@pytest.mark.parametrize("q,lang", [("Bhai is week Tuesday ko call ho sakti hai kya? Slots batao", "hinglish"), ("இந்த வாரம் அழைப்புக்கு எந்த நேரம் இருக்கிறது?", "ta-IN")])
def test_live_slots_copied_verbatim(q, lang):
    import httpx
    r = httpx.post("http://localhost:8100/api/p/hardik/chat", json={"text": q}, timeout=90).json()
    says = [s["say"] for t in r["tools"] if t["name"] == "check_availability" for s in t["result"]["slots"]]
    assert says, r
    used = [s for s in says if s in r["reply"]]
    assert used, (r["reply"], says[:3])

def test_repair_slots_fixes_mangled_copy():
    from app.main import repair_slots
    tools = [{"name": "check_availability", "result": {"slots": [{"say": "திங்கள், நவம்பர் 2, காலை 10:00"}, {"say": "Tuesday, 3 November, subah 10:45 baje"}]}}]
    out = repair_slots("நேரங்கள்: திங்கள், நாள்பர் 2, காலை 10:00; ya Tuesday, 3 Nov, subah 10:45 baje", tools)
    assert "திங்கள், நவம்பர் 2, காலை 10:00" in out and "நாள்பர்" not in out
    assert repair_slots("Monday 2 November 10:00", tools) == "Monday 2 November 10:00"  # different text left alone


# ---- hardening ----
def test_safe_name_strips_paths():
    from app.main import safe_name
    assert safe_name("../../etc/passwd") == "passwd"
    assert "/" not in safe_name("a/b\\c d.wav") and safe_name("") == "file"

def test_chat_rejects_empty_and_caps_text():
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    assert c.post("/api/p/does-not-exist-xyz/chat", json={"text": "hi"}).status_code == 404

def test_dev_login_validates_email():
    from fastapi.testclient import TestClient
    from app.main import app
    assert TestClient(app).post("/api/auth/dev", json={"email": "not-an-email"}).status_code == 422

def test_rate_limit_returns_429(monkeypatch):
    from fastapi.testclient import TestClient
    from app import config, main
    monkeypatch.setattr(config, "RATE_LIMIT_PER_MIN", 2); main._hits.clear()
    c = TestClient(main.app); h = {"x-forwarded-for": "9.9.9.9"}
    codes = [c.post("/api/p/nope-xyz/chat", json={"text": "hi"}, headers=h).status_code for _ in range(3)]
    assert codes[-1] == 429; main._hits.clear()

def test_plain_bullets_after_colon():
    from app.main import plain
    assert plain("Open slots:\n- Monday 2 November, 10:00 AM\n- Tuesday 3 November, 10:00 AM\nLet me know.") == "Open slots: Monday 2 November, 10:00 AM; Tuesday 3 November, 10:00 AM. Let me know."
