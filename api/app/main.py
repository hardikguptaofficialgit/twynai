import json, base64, re, datetime as dt, asyncio, urllib.parse
from collections import defaultdict
import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from . import config, rag, llm, voice, calendar_svc
from .db import SessionLocal, init_db, Owner, Persona, Chunk, Conversation, Message, Lead, Booking, row, now

app = FastAPI(title="Proxy API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------------- realtime hub (visitor + owner sockets per conversation) ----------------
class Hub:
    def __init__(self): self.rooms = defaultdict(set)
    async def send(self, cid, payload):
        for ws in list(self.rooms[cid]):
            try: await ws.send_json(payload)
            except Exception: self.rooms[cid].discard(ws)
hub = Hub()

def db():
    s = SessionLocal()
    try: yield s
    finally: s.close()

def current_owner(authorization: str = Header(default=""), s=Depends(db)):
    tok = authorization.replace("Bearer ", "").strip()
    o = s.get(Owner, tok) if tok else None
    if not o: raise HTTPException(401, "sign in required")
    return o

def owned(s, pid, owner):
    p = s.get(Persona, pid)
    if not p or p.owner_id != owner.id: raise HTTPException(404, "persona not found")
    return p

# ---------------- auth ----------------
class DevLogin(BaseModel):
    email: str
    name: str = ""

@app.get("/api/health")
def health(): return {"ok": True, "modes": config.modes()}

@app.post("/api/auth/dev")
def dev_login(b: DevLogin, s=Depends(db)):
    o = s.scalar(select(Owner).where(Owner.email == b.email.lower()))
    if not o:
        o = Owner(email=b.email.lower(), name=b.name or b.email.split("@")[0]); s.add(o); s.commit()
    return {"token": o.id, "owner": row(o) | {"google_tokens": bool(o.google_tokens)}}

SCOPES = "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy"
API_ORIGIN = "http://localhost:8100"

@app.get("/api/auth/google/start")
def google_start():
    if not config.GOOGLE_CLIENT_ID: return RedirectResponse(config.WEB_ORIGIN + "/login?mock=1")
    q = urllib.parse.urlencode({"client_id": config.GOOGLE_CLIENT_ID, "redirect_uri": API_ORIGIN + "/api/auth/google/callback",
        "response_type": "code", "scope": SCOPES, "access_type": "offline", "prompt": "consent"})
    return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + q)

@app.get("/api/auth/google/callback")
def google_callback(code: str, s=Depends(db)):
    t = httpx.post("https://oauth2.googleapis.com/token", data={"code": code, "client_id": config.GOOGLE_CLIENT_ID,
        "client_secret": config.GOOGLE_CLIENT_SECRET, "redirect_uri": API_ORIGIN + "/api/auth/google/callback", "grant_type": "authorization_code"}).json()
    info = httpx.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {t['access_token']}"}).json()
    o = s.scalar(select(Owner).where(Owner.email == info["email"].lower())) or Owner(email=info["email"].lower(), name=info.get("name", ""))
    o.google_tokens = json.dumps(t); s.add(o); s.commit()
    return RedirectResponse(f"{config.WEB_ORIGIN}/login?token={o.id}")

@app.get("/api/me")
def me(o=Depends(current_owner)): return row(o) | {"google_tokens": bool(o.google_tokens)}

# ---------------- personas ----------------
class PersonaIn(BaseModel):
    handle: str; name: str; headline: str = ""; bio: str = ""; rates: str = ""
    faqs: list = []; links: list = []; tone: str = "warm, concise, professional"; accent: str = "lilac"
    languages: list = ["en", "hi"]; availability: dict = {}; published: bool = False; onboarding_step: int = 0

def reindex_profile(s, p):
    for c in s.scalars(select(Chunk).where(Chunk.persona_id == p.id, Chunk.source.like("profile:%"))): s.delete(c)
    parts = [("profile:bio", f"About {p.name}: {p.headline}. {p.bio}"), ("profile:rates", f"Rates and pricing: {p.rates}")]
    parts += [(f"profile:faq", f"Q: {f.get('q','')} A: {f.get('a','')}") for f in json.loads(p.faqs)]
    parts += [("profile:links", "Links: " + ", ".join(f"{l.get('label')}: {l.get('url')}" for l in json.loads(p.links)))] if json.loads(p.links) else []
    for src, text in parts:
        if text.strip(): s.add(Chunk(persona_id=p.id, source=src, text=text, embedding=json.dumps(rag.embed(text))))

@app.get("/api/handles/{h}")
def handle_check(h: str, s=Depends(db)):
    c = re.sub(r"[^a-z0-9-]", "", h.lower())
    ok = 3 <= len(c) <= 30 and c not in ("api", "login", "studio", "dashboard", "onboarding", "admin") and not s.scalar(select(Persona).where(Persona.handle == c))
    return {"handle": c, "available": ok}

@app.get("/api/me/personas")
def my_personas(o=Depends(current_owner), s=Depends(db)):
    return [p.to_dict() for p in s.scalars(select(Persona).where(Persona.owner_id == o.id))]

@app.post("/api/personas")
def create_persona(b: PersonaIn, o=Depends(current_owner), s=Depends(db)):
    h = re.sub(r"[^a-z0-9-]", "", b.handle.lower())
    if not h or s.scalar(select(Persona).where(Persona.handle == h)): raise HTTPException(409, "handle taken")
    p = Persona(owner_id=o.id, **(b.model_dump() | {"handle": h, "faqs": json.dumps(b.faqs), "links": json.dumps(b.links), "languages": json.dumps(b.languages), "availability": json.dumps(b.availability)}))
    s.add(p); s.flush(); reindex_profile(s, p); s.commit(); return p.to_dict()

@app.put("/api/personas/{pid}")
def update_persona(pid: str, b: PersonaIn, o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o)
    for k, v in b.model_dump().items():
        if k == "handle": continue
        setattr(p, k, json.dumps(v) if k in ("faqs", "links", "languages", "availability") else v)
    reindex_profile(s, p); s.commit(); return p.to_dict()

@app.get("/api/personas/{pid}/docs")
def list_docs(pid: str, o=Depends(current_owner), s=Depends(db)):
    owned(s, pid, o); out = defaultdict(int)
    for c in s.scalars(select(Chunk).where(Chunk.persona_id == pid, Chunk.source.like("doc:%"))): out[c.source[4:]] += 1
    return [{"name": k, "chunks": v} for k, v in out.items()]

@app.post("/api/personas/{pid}/docs")
async def upload_doc(pid: str, file: UploadFile = File(...), o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o); data = await file.read()
    if file.filename.lower().endswith(".pdf"):
        import io; from pypdf import PdfReader
        text = "\n".join((pg.extract_text() or "") for pg in PdfReader(io.BytesIO(data)).pages)
    else: text = data.decode("utf-8", "ignore")
    chunks = rag.chunk_text(text)
    for c in chunks: s.add(Chunk(persona_id=p.id, source="doc:" + file.filename, text=c, embedding=json.dumps(rag.embed(c))))
    s.commit(); return {"name": file.filename, "chunks": len(chunks)}

@app.post("/api/personas/{pid}/voice")
async def upload_voice(pid: str, file: UploadFile = File(...), o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o); data = await file.read()
    path = config.UPLOAD_DIR / f"{p.id}-voice-{file.filename}"; path.write_bytes(data)
    p.voice_sample_path = str(path)
    try: p.voice_embedding = await voice.clone_embedding(data, file.filename)
    except Exception as e: raise HTTPException(502, f"voice clone failed: {e}")
    s.commit(); return {"ok": True, "mock": not config.GNANI_API_KEY}

# ---------------- public persona + agent loop ----------------
@app.get("/api/p/{handle}")
def public_persona(handle: str, s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p: raise HTTPException(404, "not found")
    return p.to_dict(public=True)

LANG_NAMES = {"hi-IN": "Hindi or Hinglish (match the caller's mix of Hindi and English, Latin script if they used it)", "ta-IN": "Tamil", "te-IN": "Telugu",
              "kn-IN": "Kannada", "bn-IN": "Bengali", "mr-IN": "Marathi", "gu-IN": "Gujarati", "ml-IN": "Malayalam", "en-IN": "English"}

def system_prompt(p, ctx, lang, voice_mode):
    k = "\n".join(f"<k>{c.text}</k>" for _, c in ctx) or "(no matching notes)"
    return f"""You are Proxy, the AI persona of {p.name} ({p.headline}). Speak in first person as {p.name}. Tone: {p.tone}.
Answer ONLY from the knowledge below. If the answer is not there, say you do not know yet and offer to pass a message or book a call. Never invent prices, dates or facts.
Reply in the caller's language: {LANG_NAMES.get(lang, lang)}. {"Keep replies under 2 short sentences; this will be spoken aloud." if voice_mode else "Keep replies short and clear."}
No emojis, no markdown, plain sentences. Use tools to check availability, book meetings and capture leads. Today is {dt.datetime.now(calendar_svc.IST).strftime('%A %d %B %Y')} (IST).
Knowledge:
{k}"""

async def run_tool(s, p, conv, name, args):
    owner = s.get(Owner, p.owner_id); cal = calendar_svc.for_owner(owner)
    if name == "check_availability":
        return {"slots": cal.free_slots(int(args.get("days") or 5))[:8]}
    if name == "book_meeting":
        start = args["start"][:16]
        ev = cal.book(start, 30, f"{args.get('topic') or 'Meeting'} with {args.get('guest_name')}", args.get("guest_email", ""))
        st = dt.datetime.fromisoformat(start)
        s.add(Booking(persona_id=p.id, conversation_id=conv.id, guest_name=args.get("guest_name", ""), guest_email=args.get("guest_email", ""),
                      start=start, end=(st + dt.timedelta(minutes=30)).isoformat()[:16], topic=args.get("topic", ""), calendar_event_id=ev))
        s.commit(); return {"booked": True, "label": st.strftime("%a %d %b, %I:%M %p IST")}
    if name == "capture_lead":
        s.add(Lead(persona_id=p.id, conversation_id=conv.id, name=args.get("name", ""), contact=args.get("contact", ""), intent=args.get("intent", ""))); s.commit()
        return {"saved": True}
    return {"error": "unknown tool"}

async def agent_reply(s, p, conv, text, voice_mode=False):
    history = [m for m in conv.messages if m.role in ("visitor", "persona", "owner")][-12:]
    ctx = rag.search(list(s.scalars(select(Chunk).where(Chunk.persona_id == p.id))), text)
    msgs = [{"role": "system", "content": system_prompt(p, ctx, conv.language, voice_mode)}]
    msgs += [{"role": "user" if m.role == "visitor" else "assistant", "content": m.text} for m in history]
    msgs.append({"role": "user", "content": text})
    tools_used, provider = [], "mock"
    for _ in range(4):
        m, provider = await llm.complete(msgs, llm.TOOLS)
        calls = m.get("tool_calls") or []
        if not calls: return (m.get("content") or "").strip(), tools_used, provider, [c.source for _, c in ctx]
        msgs.append({"role": "assistant", "content": m.get("content"), "tool_calls": calls})
        for c in calls:
            args = json.loads(c["function"].get("arguments") or "{}")
            res = await run_tool(s, p, conv, c["function"]["name"], args)
            tools_used.append({"name": c["function"]["name"], "args": args, "result": res})
            msgs.append({"role": "tool", "tool_call_id": c["id"], "content": json.dumps(res)})
    return "Let me get back to you on that.", tools_used, provider, []

def get_conv(s, p, cid, visitor_name, channel):
    conv = s.get(Conversation, cid) if cid else None
    if not conv or conv.persona_id != p.id:
        conv = Conversation(persona_id=p.id, visitor_name=visitor_name or "Visitor", channel=channel); s.add(conv); s.commit()
    return conv

def guess_lang(text):
    if re.search(r"[\u0B80-\u0BFF]", text): return "ta-IN"
    if re.search(r"[\u0900-\u097F]", text): return "hi-IN"
    if any(w in text.lower().split() for w in ("kya", "hai", "aap", "kitna", "kaise", "mujhe", "bhai", "kar", "nahi", "hoga")): return "hi-IN"
    return "en-IN"

async def handle_turn(s, p, conv, text, voice_mode=False):
    s.add(Message(conversation_id=conv.id, role="visitor", text=text)); conv.updated_at = now(); s.commit(); s.refresh(conv)
    await hub.send(conv.id, {"type": "message", "role": "visitor", "text": text})
    if conv.takeover:
        return None, [], "owner", []
    reply, tools, provider, sources = await agent_reply(s, p, conv, text, voice_mode)
    s.add(Message(conversation_id=conv.id, role="persona", text=reply, meta=json.dumps({"tools": tools, "provider": provider, "sources": sources})))
    s.commit(); s.refresh(conv)
    await hub.send(conv.id, {"type": "message", "role": "persona", "text": reply, "tools": tools})
    transcript = "\n".join(f"{m.role}: {m.text}" for m in conv.messages)
    conv.summary = await llm.summarize(transcript); s.commit()
    return reply, tools, provider, sources

class ChatIn(BaseModel):
    text: str; conversation_id: str = ""; visitor_name: str = ""

@app.post("/api/p/{handle}/chat")
async def chat(handle: str, b: ChatIn, s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p: raise HTTPException(404)
    conv = get_conv(s, p, b.conversation_id, b.visitor_name, "chat")
    if conv.language == "en-IN": conv.language = guess_lang(b.text)
    reply, tools, provider, sources = await handle_turn(s, p, conv, b.text)
    return {"conversation_id": conv.id, "reply": reply, "tools": tools, "provider": provider, "sources": sources, "takeover": bool(conv.takeover)}

@app.post("/api/p/{handle}/voice")
async def voice_turn(handle: str, audio: UploadFile = File(...), conversation_id: str = Form(""), text_hint: str = Form(""), s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p: raise HTTPException(404)
    data = await audio.read()
    try: r = await voice.stt(data, audio.filename or "audio.wav")
    except Exception as e: raise HTTPException(502, f"stt failed: {e}")
    text = r["transcript"] or text_hint or ("Hi, are you free for a quick call this week?" if r["mock"] else "")
    if not text: return {"conversation_id": conversation_id, "transcript": "", "reply": "", "audio": None}
    conv = get_conv(s, p, conversation_id, "Voice caller", "voice")
    conv.language = r["language"] if not r["mock"] else guess_lang(text); s.commit()
    reply, tools, provider, sources = await handle_turn(s, p, conv, text, voice_mode=True)
    audio_b64, mock_audio = None, True
    if reply:
        try:
            wav, mock_audio = await voice.tts(reply, conv.language, p.voice_embedding if p.voice_embedding and "mock" not in p.voice_embedding else "")
            audio_b64 = base64.b64encode(wav).decode()
        except Exception as e:
            audio_b64 = None
    return {"conversation_id": conv.id, "transcript": text, "language": conv.language, "reply": reply, "tools": tools,
            "provider": provider, "audio": audio_b64, "mock_stt": r["mock"], "mock_tts": mock_audio}

# ---------------- dashboard ----------------
@app.get("/api/personas/{pid}/overview")
def overview(pid: str, o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o)
    convs = list(s.scalars(select(Conversation).where(Conversation.persona_id == pid).order_by(Conversation.updated_at.desc())))
    return {"persona": p.to_dict(),
            "conversations": [row(c) | {"message_count": len(c.messages), "last": c.messages[-1].text if c.messages else ""} for c in convs],
            "leads": [row(l) for l in s.scalars(select(Lead).where(Lead.persona_id == pid).order_by(Lead.created_at.desc()))],
            "bookings": [row(b) for b in s.scalars(select(Booking).where(Booking.persona_id == pid).order_by(Booking.start))]}

@app.get("/api/conversations/{cid}")
def conversation(cid: str, o=Depends(current_owner), s=Depends(db)):
    c = s.get(Conversation, cid)
    if not c: raise HTTPException(404)
    owned(s, c.persona_id, o)
    return row(c) | {"messages": [row(m) | {"meta": json.loads(m.meta)} for m in c.messages]}

class TakeoverIn(BaseModel):
    on: bool

@app.post("/api/conversations/{cid}/takeover")
async def takeover(cid: str, b: TakeoverIn, o=Depends(current_owner), s=Depends(db)):
    c = s.get(Conversation, cid); owned(s, c.persona_id, o)
    c.takeover = int(b.on); s.commit()
    await hub.send(cid, {"type": "takeover", "on": b.on}); return {"ok": True}

class OwnerMsg(BaseModel):
    text: str

@app.post("/api/conversations/{cid}/reply")
async def owner_reply(cid: str, b: OwnerMsg, o=Depends(current_owner), s=Depends(db)):
    c = s.get(Conversation, cid); owned(s, c.persona_id, o)
    s.add(Message(conversation_id=cid, role="owner", text=b.text)); c.updated_at = now(); s.commit()
    await hub.send(cid, {"type": "message", "role": "owner", "text": b.text}); return {"ok": True}

@app.websocket("/ws/conversations/{cid}")
async def ws_conv(ws: WebSocket, cid: str):
    await ws.accept(); hub.rooms[cid].add(ws)
    try:
        while True: await ws.receive_text()
    except WebSocketDisconnect: hub.rooms[cid].discard(ws)

# ---------------- seed ----------------
@app.on_event("startup")
def seed():
    init_db(); s = SessionLocal()
    if not s.scalar(select(Persona).where(Persona.handle == "hardik")):
        o = s.scalar(select(Owner).where(Owner.email == "hardikgupta8792@gmail.com")) or Owner(email="hardikgupta8792@gmail.com", name="Hardik Gupta")
        s.add(o); s.flush()
        p = Persona(owner_id=o.id, handle="hardik", name="Hardik Gupta", headline="Full-stack and AI engineer, KIIT University",
            bio="I build AI products end to end: Next.js frontends, Python backends and voice agents for Indian languages. I take freelance builds and I am open to internships.",
            rates="Freelance MVP builds start at 25,000 rupees per week. A 30 minute discovery call is free.",
            faqs=json.dumps([{"q": "What do you work on?", "a": "Voice AI agents, full-stack web apps and LLM tooling, mostly with Next.js, FastAPI and Postgres."},
                             {"q": "Are you available for internships?", "a": "Yes, I am open to AI and full-stack internships starting January 2027."},
                             {"q": "Which languages can I talk to you in?", "a": "English, Hindi and Hinglish work best. My Proxy also understands Tamil, Telugu, Kannada and other Indian languages."}]),
            links=json.dumps([{"label": "GitHub", "url": "https://github.com/"}, {"label": "LinkedIn", "url": "https://linkedin.com/"}]))
        s.add(p); s.flush(); reindex_profile(s, p); s.commit()
    s.close()
