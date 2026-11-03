import time
import hashlib
import hashlib
import hmac
import re
import json, base64, re, datetime as dt, asyncio, urllib.parse, uuid
from collections import defaultdict
import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Cookie, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from . import config, rag, llm, voice, calendar_svc, storage
from .db import SessionLocal, Owner, Persona, Chunk, DocumentAsset, Conversation, Message, Lead, Booking, AuthSession, row, now, avatar_marker

import logging
log = logging.getLogger("proxy")
app = FastAPI(title="Twyn AI API")

# ---------------- realtime hub (visitor + owner sockets per conversation) ----------------
class Hub:
    def __init__(self): self.rooms = defaultdict(set)
    async def send(self, cid, payload):
        for ws in list(self.rooms[cid]):
            try: await ws.send_json(payload)
            except Exception: self.rooms[cid].discard(ws)
hub = Hub()

# ---------------- hardening: per-IP rate limit on public turns, size caps, safe names ----------------
from pathlib import Path as _P
_hits = defaultdict(list)
@app.middleware("http")
async def rate_limit(request, call_next):
    path = request.url.path
    if request.method == "POST" and path.startswith("/api/p/"):
        ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?"))
        nowt = time.time(); q = [t for t in _hits[ip] if nowt - t < 60]
        if len(q) >= config.RATE_LIMIT_PER_MIN:
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Too many requests, try again in a minute."}, status_code=429, headers={"Retry-After": "60"})
        q.append(nowt); _hits[ip] = q
    return await call_next(request)

def safe_name(name: str) -> str:
    n = re.sub(r"[^A-Za-z0-9._-]", "_", _P(name or "file").name)[:80].lstrip(".")
    return n or "file"

async def read_capped(f: UploadFile, cap: int) -> bytes:
    data = await f.read(cap + 1)
    if len(data) > cap: raise HTTPException(413, f"File too large (max {cap // (1024*1024)} MB).")
    return data

def db():
    s = SessionLocal()
    try: yield s
    finally: s.close()

def current_owner(authorization: str = Header(default=""), s=Depends(db)):
    tok = authorization.replace("Bearer ", "").strip()
    sess = s.get(AuthSession, tok) if tok else None
    if sess and (now() - sess.created_at).days >= config.SESSION_DAYS:
        s.delete(sess); s.commit(); raise HTTPException(401, "session expired")
    o = s.get(Owner, sess.owner_id) if sess else (s.get(Owner, tok) if tok and config.ALLOW_DEV_LOGIN else None)
    if not o: raise HTTPException(401, "sign in required")
    return o

def owned(s, pid, owner):
    p = s.get(Persona, pid)
    if not p or p.owner_id != owner.id: raise HTTPException(404, "persona not found")
    return p

# ---------------- auth ----------------
def public_owner(o):
    st = calendar_svc.status_of(o)
    pic = ""
    try: pic = json.loads(o.google_tokens or "{}").get("picture", "")
    except Exception: pass
    is_google = False
    try:
        tok = json.loads(o.google_tokens or "{}")
        is_google = bool(tok.get("google_email") or tok.get("refresh_token") or tok.get("access_token") or tok.get("picture") or o.google_tokens)
    except Exception: pass
    return {k: v for k, v in row(o).items() if k != "google_tokens"} | {"google_tokens": st == "connected", "google_connected": is_google, "calendar_status": st, "calendar_connected": st == "connected", "picture": pic}
class DevLogin(BaseModel):
    email: str
    name: str = ""

@app.get("/")
def root():
    return {"ok": True, "service": "Twyn AI API", "docs": "/docs", "version": "1.0.0"}

@app.get("/api/health")
def health(): return {"ok": True, "modes": config.modes()}

@app.get("/api/health/db")
def health_db():
    from sqlalchemy import text
    from .db import engine
    with engine.connect() as c:
        c.execute(text("SELECT 1"))
    return {"ok": True, "db": config.modes()["db"]}

@app.post("/api/auth/dev")
def dev_login(b: DevLogin, s=Depends(db)):
    if not config.ALLOW_DEV_LOGIN: raise HTTPException(403, "dev sign-in disabled")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", b.email.strip()): raise HTTPException(422, "valid email required")
    o = s.scalar(select(Owner).where(Owner.email == b.email.lower()))
    if not o:
        o = Owner(email=b.email.lower(), name=b.name or b.email.split("@")[0]); s.add(o); s.commit()
    sess = AuthSession(owner_id=o.id); s.add(sess); s.commit()
    return {"token": sess.id, "owner": public_owner(o)}

AUTH_SCOPES = "openid email profile"
CALENDAR_SCOPES = "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly"
OAUTH_STATE_COOKIE = "twyn_oauth_state"
OAUTH_STATE_TTL = 600

def _redirect_uri(): return config.GOOGLE_REDIRECT_URI

def _safe_next(value: str) -> str:
    return value if value.startswith("/") and not value.startswith("//") else ""

def _oauth_state(next_path: str, calendar: bool = False) -> str:
    """A signed, short-lived state value. The matching HttpOnly cookie binds it to the browser."""
    import secrets
    payload = json.dumps({"iat": int(time.time()), "next": _safe_next(next_path), "calendar": calendar, "nonce": secrets.token_urlsafe(12)}, separators=(",", ":")).encode()
    raw = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    sig = hmac.new(config.GOOGLE_CLIENT_SECRET.encode(), raw.encode(), hashlib.sha256).digest()
    return raw + "." + base64.urlsafe_b64encode(sig).decode().rstrip("=")

def _read_oauth_state(state: str) -> dict | None:
    try:
        raw, supplied_sig = state.split(".", 1)
        expected_sig = base64.urlsafe_b64encode(hmac.new(config.GOOGLE_CLIENT_SECRET.encode(), raw.encode(), hashlib.sha256).digest()).decode().rstrip("=")
        if not hmac.compare_digest(supplied_sig, expected_sig): return None
        payload = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)))
        if not isinstance(payload.get("iat"), int) or time.time() - payload["iat"] > OAUTH_STATE_TTL: return None
        return {"next": _safe_next(str(payload.get("next", ""))), "calendar": payload.get("calendar") is True}
    except (ValueError, TypeError, json.JSONDecodeError):
        return None

@app.get("/api/auth/google/login")
def google_login(next: str = "", calendar: bool = True, auth_only: bool = False):
    if not (config.GOOGLE_CLIENT_ID and config.GOOGLE_CLIENT_SECRET): return RedirectResponse(config.WEB_ORIGIN + "/login?mock=1", status_code=302)
    want_calendar = calendar and not auth_only
    st = _oauth_state(next, want_calendar)
    q = urllib.parse.urlencode({"client_id": config.GOOGLE_CLIENT_ID, "redirect_uri": _redirect_uri(), "response_type": "code",
        # Google still shows consent when it is needed, but do not force the
        # full consent screen on every reconnect once access is already granted.
        "scope": CALENDAR_SCOPES if want_calendar else AUTH_SCOPES, "access_type": "offline", "prompt": "consent select_account", "include_granted_scopes": "true", "state": st})
    response = RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + q, status_code=302)
    response.set_cookie(OAUTH_STATE_COOKIE, st, httponly=True, secure=config.WEB_ORIGIN.startswith("https://"), samesite="lax", max_age=OAUTH_STATE_TTL, path="/api/auth/google")
    return response

app.get("/api/auth/google/start")(google_login)   # old links in the web app keep working

@app.get("/api/auth/google/callback")
def google_callback(code: str = "", state: str = "", error: str = "", oauth_cookie: str = Cookie(default="", alias=OAUTH_STATE_COOKIE), s=Depends(db)):
    def fail(why: str):
        response = RedirectResponse(f"{config.WEB_ORIGIN}/login?error={urllib.parse.quote(why)}", status_code=302)
        response.delete_cookie(OAUTH_STATE_COOKIE, path="/api/auth/google")
        return response
    log.info("google_oauth_stage=callback error_present=%s code_present=%s state_present=%s cookie_present=%s", bool(error), bool(code), bool(state), bool(oauth_cookie))
    if error: return fail(error)
    requested = _read_oauth_state(state) if oauth_cookie and hmac.compare_digest(state, oauth_cookie) else None
    if not code or requested is None: return fail("Sign-in expired, please try again.")
    try:
        r = httpx.post("https://oauth2.googleapis.com/token", data={"code": code, "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET, "redirect_uri": _redirect_uri(), "grant_type": "authorization_code"}, timeout=15)
        if r.is_error:
            try: detail = r.json()
            except Exception: detail = {}
            log.warning("google_oauth_stage=token_exchange status=%s error=%s error_description=%s", r.status_code, detail.get("error", ""), detail.get("error_description", ""))
        r.raise_for_status(); t = r.json()
    except Exception:
        log.exception("google_oauth_stage=token_exchange_failed"); return fail("Google sign-in failed, please try again.")
    log.info("google_oauth_stage=token_exchange_success")
    try:
        profile = httpx.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {t['access_token']}"}, timeout=15)
        if profile.is_error:
            try: detail = profile.json()
            except Exception: detail = {}
            log.warning("google_oauth_stage=userinfo status=%s error=%s error_description=%s", profile.status_code, detail.get("error", ""), detail.get("error_description", ""))
        profile.raise_for_status()
        info = profile.json()
    except Exception:
        log.exception("google_oauth_stage=userinfo_failed"); return fail("Google sign-in failed, please try again.")
    log.info("google_oauth_stage=userinfo_success email_present=%s", bool(info.get("email")))
    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified", True): return fail("Google account has no verified email.")
    o = s.scalar(select(Owner).where(Owner.email == email))
    if not o: o = Owner(email=email, name=info.get("name", "") or email.split("@")[0]); s.add(o); s.flush()
    old = json.loads(o.google_tokens or "{}") if o.google_tokens else {}
    granted = t.get("scope", "")
    has_cal = ("calendar" in granted)
    rt = t.get("refresh_token") or old.get("refresh_token", "")
    pic = info.get("picture", "") or old.get("picture", "")
    if has_cal and rt:
        cal_status = "connected"
    elif requested.get("calendar") and not has_cal:
        cal_status = "needs_reconnect"
    else:
        cal_status = "disconnected"
    tok = {
        "access_token": t.get("access_token", "") if has_cal else old.get("access_token", ""),
        "refresh_token": rt if has_cal else (old.get("refresh_token", "") if old.get("status") == "connected" else ""),
        "expires_at": int(time.time()) + int(t.get("expires_in", 3600)),
        "scope": granted,
        "picture": pic,
        "status": cal_status,
        "google_email": email
    }
    o.google_tokens = json.dumps(tok)   # server-side only; never returned to the browser
    sess = AuthSession(owner_id=o.id); s.add(sess); s.commit()
    log.info("google_oauth_stage=session_created owner_exists=%s", bool(o))
    has = s.scalar(select(Persona).where(Persona.owner_id == o.id))
    if has and has.published:
        nxt = requested["next"] if requested["next"] and not requested["next"].startswith("/onboarding") else "/studio"
    else:
        nxt = requested["next"] or "/onboarding"
    response = RedirectResponse(f"{config.WEB_ORIGIN}/login?token={sess.id}&next={urllib.parse.quote(nxt, safe='/')}", status_code=302)
    response.delete_cookie(OAUTH_STATE_COOKIE, path="/api/auth/google")
    return response

@app.post("/api/me/google/disconnect")
def google_disconnect(o=Depends(current_owner), s=Depends(db)):
    try:
        t = json.loads(o.google_tokens or "{}")
        if t.get("refresh_token") or t.get("access_token"):
            httpx.post("https://oauth2.googleapis.com/revoke", data={"token": t.get("refresh_token") or t.get("access_token")}, timeout=10)
    except Exception: pass
    o = s.get(Owner, o.id); pic = ""; g_email = o.email
    try:
        old_tok = json.loads(o.google_tokens or "{}")
        pic = old_tok.get("picture", "")
        g_email = old_tok.get("google_email", o.email)
    except Exception: pass
    o.google_tokens = json.dumps({"status": "disconnected", "picture": pic, "google_email": g_email}); s.commit()
    return public_owner(o)

@app.delete("/api/me")
def delete_account(o=Depends(current_owner), s=Depends(db)):
    from sqlalchemy import delete
    try:
        tokens = json.loads(o.google_tokens or "{}")
        revoke_token = tokens.get("refresh_token") or tokens.get("access_token")
        if revoke_token: httpx.post("https://oauth2.googleapis.com/revoke", data={"token": revoke_token}, timeout=10)
    except Exception:
        log.warning("Google token revoke failed during account deletion", exc_info=True)
    pids = [p.id for p in s.scalars(select(Persona).where(Persona.owner_id == o.id))]
    personas = list(s.scalars(select(Persona).where(Persona.owner_id == o.id)))
    assets = list(s.scalars(select(DocumentAsset).where(DocumentAsset.persona_id.in_(pids))))
    for asset in assets:
        try: storage.delete(asset.object_path)
        except Exception: log.exception("Failed to remove document object during account deletion: %s", asset.id)
    for persona in personas:
        for path in (persona.avatar_path, persona.voice_sample_path):
            if path and not path.startswith("avatar://"):
                try: storage.delete(path)
                except Exception: log.exception("Failed to remove persona object during account deletion: %s", persona.id)
    for M in (Chunk, DocumentAsset, Lead, Booking):
        s.execute(delete(M).where(M.persona_id.in_(pids)))
    cids = [c.id for c in s.scalars(select(Conversation).where(Conversation.persona_id.in_(pids)))]
    s.execute(delete(Message).where(Message.conversation_id.in_(cids)))
    s.execute(delete(Conversation).where(Conversation.id.in_(cids)))
    s.execute(delete(Persona).where(Persona.id.in_(pids)))
    s.execute(delete(AuthSession).where(AuthSession.owner_id == o.id))
    s.execute(delete(Owner).where(Owner.id == o.id)); s.commit()
    return {"deleted": True}

@app.post("/api/auth/logout")
def logout(authorization: str = Header(default=""), s=Depends(db)):
    x = s.get(AuthSession, authorization.replace("Bearer ", "").strip())
    if x: s.delete(x); s.commit()
    return {"ok": True}

@app.get("/api/me")
def me(o=Depends(current_owner)): return public_owner(o)

# ---------------- personas ----------------
class PersonaIn(BaseModel):
    handle: str; name: str; headline: str = ""; bio: str = ""; rates: str = ""
    faqs: list = []; links: list = []; tone: str = "warm, concise, professional"; accent: str = "lilac"
    languages: list = ["en", "hi"]; availability: dict = {}; published: bool = False; onboarding_step: int = 0; avatar_seed: str = "twyn-01"

def reindex_profile(s, p):
    for c in s.scalars(select(Chunk).where(Chunk.persona_id == p.id, Chunk.source.like("profile:%"))): s.delete(c)
    parts = [("profile:bio", f"About {p.name}: {p.headline}. {p.bio}"), ("profile:rates", f"Rates and pricing: {p.rates}")]
    parts += [(f"profile:faq", f"Q: {f.get('q','')} A: {f.get('a','')}") for f in json.loads(p.faqs)]
    parts += [("profile:links", "Links: " + ", ".join(f"{l.get('label')}: {l.get('url')}" for l in json.loads(p.links)))] if json.loads(p.links) else []
    parts = [(a, t) for a, t in parts if t.strip()]
    for (src, text), v in zip(parts, rag.embed_many([t for _, t in parts])): s.add(Chunk(persona_id=p.id, source=src, text=text, embedding=json.dumps(v)))

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
    payload = b.model_dump(exclude={"avatar_seed"})
    p = Persona(owner_id=o.id, **(payload | {"handle": h, "faqs": json.dumps(b.faqs), "links": json.dumps(b.links), "languages": json.dumps(b.languages), "availability": json.dumps(b.availability), "avatar_path": avatar_marker(b.avatar_seed)}))
    s.add(p); s.flush(); reindex_profile(s, p); s.commit(); return p.to_dict()

@app.put("/api/personas/{pid}")
def update_persona(pid: str, b: PersonaIn, o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o)
    for k, v in b.model_dump(exclude={"avatar_seed"}).items():
        if k == "handle": continue
        setattr(p, k, json.dumps(v) if k in ("faqs", "links", "languages", "availability") else v)
    if b.avatar_seed and (not (p.avatar_path or "").strip() or (p.avatar_path or "").startswith("avatar://")):
        p.avatar_path = avatar_marker(b.avatar_seed)
    reindex_profile(s, p); s.commit(); return p.to_dict()

@app.get("/api/personas/{pid}/docs")
def list_docs(pid: str, o=Depends(current_owner), s=Depends(db)):
    owned(s, pid, o); out = defaultdict(int)
    for c in s.scalars(select(Chunk).where(Chunk.persona_id == pid, Chunk.source.like("doc:%"))): out[c.source[4:]] += 1
    assets = {a.original_name: a for a in s.scalars(select(DocumentAsset).where(DocumentAsset.persona_id == pid)).all()}
    return [{"name": k, "chunks": v, "document_id": assets[k].id if k in assets else None,
             "size_bytes": assets[k].size_bytes if k in assets else None,
             "content_type": assets[k].content_type if k in assets else None,
             "download_url": f"/api/personas/{pid}/docs/{assets[k].id}/download" if k in assets else None}
            for k, v in out.items()]

class KnowledgeIn(BaseModel):
    entries: list   # [{title, text}]

@app.post("/api/personas/{pid}/knowledge")
def import_knowledge(pid: str, b: KnowledgeIn, o=Depends(current_owner), s=Depends(db)):
    """Pasted answers from ChatGPT/Claude/etc, already split into sections client-side. Re-imports replace earlier ones."""
    p = owned(s, pid, o)
    items = [(str(e.get("title", "")).strip()[:80] or "Note", str(e.get("text", "")).strip()[:4000]) for e in b.entries[:60] if isinstance(e, dict)]
    items = [(t, x) for t, x in items if x]
    if not items: raise HTTPException(422, "Nothing to import.")
    for c in s.scalars(select(Chunk).where(Chunk.persona_id == p.id, Chunk.source.like("doc:AI import%"))): s.delete(c)
    texts = [f"{t}: {x}" for t, x in items]
    for t, v in zip(texts, rag.embed_many(texts)): s.add(Chunk(persona_id=p.id, source="doc:AI import", text=t, embedding=json.dumps(v)))
    s.commit(); return {"name": "AI import", "chunks": len(texts)}

@app.delete("/api/personas/{pid}/docs/{name}")
def delete_doc(pid: str, name: str, o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o); n = 0
    assets = list(s.scalars(select(DocumentAsset).where(DocumentAsset.persona_id == p.id, DocumentAsset.original_name == name)))
    # Delete remote objects before committing the DB deletion. If storage fails,
    # keep the metadata/chunks so the operator can retry without an orphan.
    for asset in assets: storage.delete(asset.object_path)
    for c in s.scalars(select(Chunk).where(Chunk.persona_id == p.id, Chunk.source == "doc:" + name)): s.delete(c); n += 1
    for asset in assets: s.delete(asset)
    s.commit(); return {"deleted": n}

@app.get("/api/personas/{pid}/docs/{document_id}/download")
def download_doc(pid: str, document_id: str, o=Depends(current_owner), s=Depends(db)):
    from fastapi.responses import Response
    p = owned(s, pid, o)
    asset = s.scalar(select(DocumentAsset).where(DocumentAsset.id == document_id, DocumentAsset.persona_id == p.id))
    if not asset or not storage.exists(asset.object_path): raise HTTPException(404, "document not found")
    signed = storage.presigned_get(asset.object_path, content_type=asset.content_type, filename=safe_name(asset.original_name))
    if signed: return RedirectResponse(signed, status_code=307)
    return Response(storage.get(asset.object_path), media_type=asset.content_type,
                    headers={"Content-Disposition": f'attachment; filename="{safe_name(asset.original_name)}"'})

@app.post("/api/personas/{pid}/docs")
async def upload_doc(pid: str, file: UploadFile = File(...), o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o); data = await read_capped(file, config.MAX_DOC_BYTES)
    original_name = safe_name(file.filename or "document")
    if original_name.lower().endswith(".pdf"):
        import io; from pypdf import PdfReader
        text = "\n".join((pg.extract_text() or "") for pg in PdfReader(io.BytesIO(data)).pages)
    else: text = data.decode("utf-8", "ignore")
    if not text.strip(): raise HTTPException(422, "No readable text found in document.")
    chunks = rag.chunk_text(text)
    object_path = storage.put(f"personas/{p.id}/documents/{uuid.uuid4().hex}-{original_name}", data, file.content_type or "application/octet-stream")
    try:
        s.add(DocumentAsset(persona_id=p.id, original_name=original_name, object_path=object_path,
                            content_type=file.content_type or "application/octet-stream", size_bytes=len(data),
                            checksum_sha256=hashlib.sha256(data).hexdigest()))
        for c, v in zip(chunks, rag.embed_many(chunks)):
            s.add(Chunk(persona_id=p.id, source="doc:" + original_name, text=c, embedding=json.dumps(v)))
        s.commit()
    except Exception:
        s.rollback()
        try: storage.delete(object_path)
        except Exception: log.exception("Failed to clean up document object after DB failure")
        raise
    return {"name": original_name, "chunks": len(chunks)}

@app.post("/api/personas/{pid}/voice")
async def upload_voice(pid: str, file: UploadFile = File(...), o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o); data = await read_capped(file, config.MAX_AUDIO_BYTES); file.filename = safe_name(file.filename)
    secs = voice.wav_seconds(data)
    if secs is not None and not 5 <= secs <= 31: raise HTTPException(422, f"Sample is {secs:.0f}s. Gnani cloning needs 5 to 30 seconds.")
    old_sample = p.voice_sample_path
    new_sample = storage.put(f"personas/{p.id}/voice/{uuid.uuid4().hex}-{file.filename}", data, file.content_type or "application/octet-stream")
    try: p.voice_embedding = await voice.clone_embedding(data, file.filename)
    except Exception as e:
        try: storage.delete(new_sample)
        except Exception: log.exception("Failed to clean up an unsuccessful voice upload")
        log.exception("Voice clone error: %s", e)
        if isinstance(e, (httpx.ConnectError, httpx.TimeoutException)):
            raise HTTPException(503, "Voice cloning service is temporarily unavailable. Please try again.")
        raise HTTPException(502, f"voice clone failed: {getattr(e, 'message', str(e)) or type(e).__name__}")
    p.voice_sample_path = new_sample
    preview_key = f"personas/{p.id}/voice-preview.wav"
    preview_ref = f"object://{preview_key}" if config.OBJECT_STORAGE_ENABLED else str(config.UPLOAD_DIR / preview_key)
    if storage.exists(preview_ref): storage.delete(preview_ref)
    s.commit()
    if old_sample and old_sample != new_sample:
        try: storage.delete(old_sample)
        except Exception: log.exception("Failed to remove the replaced voice sample")
    return {"ok": True, "mock": not config.GNANI_API_KEY, "seconds": secs, "dims": (json.loads(p.voice_embedding).get("shape") if p.voice_embedding else None)}

@app.post("/api/personas/{pid}/avatar")
async def upload_avatar(pid: str, file: UploadFile = File(...), o=Depends(current_owner), s=Depends(db)):
    p = owned(s, pid, o)
    data = await read_capped(file, config.MAX_IMAGE_BYTES)
    kinds = {
        b"\xff\xd8\xff": ("jpg", "image/jpeg"),
        b"\x89PNG\r\n\x1a\n": ("png", "image/png"),
    }
    ext = media = None
    for signature, value in kinds.items():
        if data.startswith(signature): ext, media = value; break
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP": ext, media = "webp", "image/webp"
    if not ext or not media: raise HTTPException(422, "Upload a JPG, PNG, or WebP image.")
    old = p.avatar_path
    p.avatar_path = storage.put(f"personas/{p.id}/avatar.{ext}", data, media)
    s.commit()
    if old and old != p.avatar_path:
        try: storage.delete(old)
        except Exception: log.exception("Failed to remove the replaced avatar")
    return {"avatar_url": f"/api/p/{p.handle}/avatar"}

@app.post("/api/personas/{pid}/voice/preview")
async def preview_voice(pid: str, o=Depends(current_owner), s=Depends(db)):
    """Short line in the owner's cloned voice (Timbre vachana-vc-v1). Cached per embedding so
    replaying the preview costs no extra credits."""
    from fastapi.responses import Response
    p = owned(s, pid, o)
    if not p.voice_embedding: raise HTTPException(400, "No voice sample yet")
    path = f"personas/{p.id}/voice-preview.wav"
    ref = f"object://{path}" if config.OBJECT_STORAGE_ENABLED else str(config.UPLOAD_DIR / path)
    if not storage.exists(ref):
        line = f"Hi, this is {p.name.split()[0] if p.name else 'me'}'s Twyn. Thanks for reaching out, how can I help you today?"
        emb = "" if "mock" in p.voice_embedding else p.voice_embedding
        try: wav, mock = await voice.tts(line, "en-IN", emb)
        except Exception as e: raise HTTPException(502, f"preview failed: {type(e).__name__}")
        if mock: return Response(wav, media_type="audio/wav", headers={"X-Mock": "1"})
        ref = storage.put(path, wav, "audio/wav")
    return Response(storage.get(ref), media_type="audio/wav")

# ---------------- public persona + agent loop ----------------
@app.get("/api/p/{handle}")
def public_persona(handle: str, s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p: raise HTTPException(404, "not found")
    return p.to_dict(public=True)

@app.get("/api/p/{handle}/avatar")
def public_avatar(handle: str, s=Depends(db)):
    from fastapi.responses import Response
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    path = p.avatar_path if p and p.avatar_path else ""
    if not path or not storage.exists(path): raise HTTPException(404, "avatar not found")
    ext = _P(path.removeprefix("object://")).suffix.lower()
    media = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(ext, "application/octet-stream")
    return Response(storage.get(path), media_type=media, headers={"Cache-Control": "public, max-age=3600"})

class DirectBook(BaseModel):
    start: str; name: str = ""; email: str = ""; topic: str = ""; conversation_id: str = ""

@app.get("/api/p/{handle}/slots")
def public_slots(handle: str, days: int = 14, s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p or not p.published: raise HTTPException(404, "not found")
    owner = s.get(Owner, p.owner_id); cal = calendar_svc.for_owner(owner, s); rules = calendar_svc.rules_of(p)
    bookings = list(s.scalars(select(Booking).where(Booking.persona_id == p.id)))
    try: days = max(1, min(int(days), 370))
    except (TypeError, ValueError): days = 14
    slots = calendar_svc.generate(rules, calendar_svc.all_busy(cal, bookings, days), days=days, limit=500, per_day=8)
    return {"minutes": int(rules["duration"]), "slots": [{"start": x["start"], "label": calendar_svc.label(dt.datetime.fromisoformat(x["start"]))} for x in slots]}

@app.post("/api/p/{handle}/book")
def public_book(handle: str, b: DirectBook, s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p or not p.published: raise HTTPException(404, "not found")
    context = None
    if b.conversation_id:
        context = s.get(Conversation, b.conversation_id)
        if not context or context.persona_id != p.id: context = None
    known = booking_context(s, context) if context else {"name": "", "email": ""}
    name, email = (b.name.strip() or known["name"])[:60], (b.email.strip() or known["email"])[:120]
    if not name or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email): raise HTTPException(422, "Add your name and a valid email.")
    owner = s.get(Owner, p.owner_id); cal = calendar_svc.for_owner(owner, s); rules = calendar_svc.rules_of(p); dur = int(rules["duration"])
    bookings = list(s.scalars(select(Booking).where(Booking.persona_id == p.id)))
    start = b.start[:16] if isinstance(b.start, str) else ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", start): raise HTTPException(422, "Choose a valid time slot.")
    if s.scalar(select(Booking).where(Booking.persona_id == p.id, Booking.start == start)):
        raise HTTPException(409, "That time was just taken. Pick another.")
    if not calendar_svc.is_valid(rules, calendar_svc.all_busy(cal, bookings, 30), start): raise HTTPException(409, "That time was just taken. Pick another.")
    topic = b.topic.strip()[:120]
    try: ev = calendar_svc.book_safe(cal, start, dur, f"{topic or 'Meeting'} with {name}", email)
    except Exception:
        raise HTTPException(502, "The calendar could not confirm this booking. Please try again.")
    st = dt.datetime.fromisoformat(start)
    s.add(Booking(persona_id=p.id, conversation_id=b.conversation_id or "direct", guest_name=name, guest_email=email, start=start,
                  end=(st + dt.timedelta(minutes=dur)).isoformat()[:16], topic=topic, calendar_event_id=ev))
    s.add(Lead(persona_id=p.id, conversation_id=b.conversation_id or "direct", name=name, contact=email, intent=topic or "Booked a meeting"))
    s.commit(); return {"booked": True, "label": calendar_svc.label(st), "minutes": dur, "meet": getattr(cal, "meet_link", "")}

LANG_NAMES = {"hinglish": "Hinglish: Hindi and English mixed, written ONLY in Latin script (e.g. \"Haan, main free hoon, kal 10 baje call kar lete hain\"). Never Devanagari, never pure English",
              "hi-IN": "Hindi in Devanagari script", "ta-IN": "Tamil", "te-IN": "Telugu",
              "kn-IN": "Kannada", "bn-IN": "Bengali", "mr-IN": "Marathi", "gu-IN": "Gujarati", "ml-IN": "Malayalam", "en-IN": "English"}

def system_prompt(p, ctx, lang, voice_mode):
    k = "\n".join(f"<k>{c.text}</k>" for _, c in ctx) or "(no matching notes)"
    faqs = json.loads(p.faqs or "[]")
    links = json.loads(p.links or "[]")
    faq_text = "\n".join(f"Q: {f.get('q', '')} A: {f.get('a', '')}" for f in faqs if f.get('q') or f.get('a')) or "(none)"
    link_text = ", ".join(f"{l.get('label') or 'Website'}: {l.get('url')}" for l in links if l.get('url')) or "(none)"
    return f"""You are Twyn, the AI persona of {p.name} ({p.headline}). Speak in first person as {p.name}. Tone: {p.tone}.
Profile: {p.headline}. {p.bio} {("Rates: " + p.rates) if p.rates else ""}
Answer ONLY from the profile and knowledge below. If the answer is not there, say you do not know yet and offer to pass a message or book a call. Never invent prices, dates or facts.
Reply in the caller's language: {LANG_NAMES.get(lang, lang)}. {"Keep replies under 2 short sentences; this will be spoken aloud." if voice_mode else "Keep replies short and clear."}
No emojis, no markdown, no bullet lists, plain sentences. When offering times, name at most three, and copy each slot's 'say' text from check_availability exactly. Use tools to check availability, book meetings and capture leads. Today is {dt.datetime.now(calendar_svc.IST).strftime('%A %d %B %Y')} (IST).
Profile FAQs:
{faq_text}
Profile links:
{link_text}
Knowledge:
{k}"""

def booking_context(s, conv):
    """Extract reversible booking context from the active conversation."""
    email = ""
    name = conv.visitor_name if conv.visitor_name not in ("", "Visitor", "Voice caller") else ""
    for m in conv.messages:
        text = m.text or ""
        hit = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
        if hit: email = hit.group(0)
        if not name:
            hit = re.search(r"(?:my name is|i am|i'm|mera naam)\s+([A-Za-z][A-Za-z .'-]{1,59})", text, re.I)
            if hit: name = hit.group(1).strip(" .")[:60]
    return {"name": name, "email": email}

async def run_tool(s, p, conv, name, args):
    owner = s.get(Owner, p.owner_id); cal = calendar_svc.for_owner(owner, s)
    rules = calendar_svc.rules_of(p); dur = int(rules["duration"])
    bookings = list(s.scalars(select(Booking).where(Booking.persona_id == p.id)))
    # Do not hold a database connection while checking or writing to Google Calendar.
    s.commit()
    if name == "check_availability":
        try: days = max(0, min(int(args.get("days") or 7), 30))
        except (TypeError, ValueError): days = 7
        requested_date = str(args.get("date") or "")[:10]
        slots = calendar_svc.generate(rules, calendar_svc.all_busy(cal, bookings, days), days=days, limit=200, per_day=8)
        if requested_date:
            slots = [x for x in slots if x["start"].startswith(requested_date)]
        tod = str(args.get("time_of_day") or "").lower()
        if tod:
            bounds = (5, 12) if "morning" in tod else (12, 17) if "afternoon" in tod else (17, 22) if "evening" in tod else None
            if bounds: slots = [x for x in slots if bounds[0] <= int(x["start"][11:13]) < bounds[1]]
        slots = slots[:8]
        lang = conv.language or "en-IN"
        for x in slots: x["say"] = calendar_svc.local_label(dt.datetime.fromisoformat(x["start"]), lang)
        return {"slots": [{"start": x["start"], "say": x["say"]} for x in slots], "meeting_minutes": dur,
                "note": "When naming a slot, copy its 'say' text exactly, character for character. Do not translate, reorder or recompute days, dates or times." if slots else "No free slots in that range."}
    if name == "book_meeting":
        context = booking_context(s, conv)
        guest_name = str(args.get("guest_name") or context["name"]).strip()[:60]
        guest_email = str(args.get("guest_email") or context["email"]).strip()[:160]
        if not guest_name or not guest_email:
            missing = "name" if not guest_name else "email address"
            return {"booked": False, "booking_status": "needs_details", "missing": missing,
                    "message": f"I need your {missing} before I can book this."}
        start = str(args.get("start") or "")[:16]
        if not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$", start):
            return {"booked": False, "booking_status": "needs_slot", "message": "Please select one of the available slots."}
        duplicate = s.scalar(select(Booking).where(Booking.persona_id == p.id, Booking.start == start))
        if duplicate:
            return {"booked": False, "booking_status": "conflict", "error": "That slot has already been booked. Please choose another available slot."}
        if not calendar_svc.is_valid(rules, calendar_svc.all_busy(cal, bookings, 30), start):
            alt = calendar_svc.generate(rules, calendar_svc.all_busy(cal, bookings, 7), limit=4)
            return {"booked": False, "booking_status": "conflict", "error": "That time is outside availability or already taken.", "alternatives": alt}
        try:
            ev = calendar_svc.book_safe(cal, start, dur, f"{args.get('topic') or 'Meeting'} with {guest_name}", guest_email)
        except Exception as e:
            log.warning("calendar booking failed: %s", type(e).__name__)
            return {"booked": False, "booking_status": "calendar_error", "error": "The calendar could not confirm that booking. Please choose another slot or try again."}
        st = dt.datetime.fromisoformat(start)
        s.add(Booking(persona_id=p.id, conversation_id=conv.id, guest_name=guest_name, guest_email=guest_email,
                      start=start, end=(st + dt.timedelta(minutes=dur)).isoformat()[:16], topic=args.get("topic", ""), calendar_event_id=ev))
        if conv.visitor_name in ("", "Visitor", "Voice caller") and guest_name: conv.visitor_name = guest_name
        if not s.scalar(select(Lead).where(Lead.conversation_id == conv.id)):  # a booking is always a lead
            s.add(Lead(persona_id=p.id, conversation_id=conv.id, name=guest_name, contact=guest_email, intent=args.get("topic") or "Booked a meeting"))
        s.commit(); return {"booked": True, "booking_status": "confirmed", "label": st.strftime("%a %d %b, %I:%M %p IST"), "minutes": dur, "timezone": "Asia/Kolkata", "calendar_event_id": ev}
    if name == "capture_lead":
        s.add(Lead(persona_id=p.id, conversation_id=conv.id, name=args.get("name", ""), contact=args.get("contact", ""), intent=args.get("intent", "")))
        if conv.visitor_name in ("", "Visitor", "Voice caller") and args.get("name"): conv.visitor_name = args["name"][:60]
        s.commit()
        return {"saved": True}
    return {"error": "unknown tool"}

def repair_slots(text: str, tools) -> str:
    """The LLM is told to copy each slot's 'say' string, but small models still mangle words
    (seen: Tamil 'நவம்பர்' -> 'நாள்பர்'). Find near-copies that keep the same date number and time
    and swap in the exact string, so the caller always hears the tool's day+date+time."""
    import difflib
    says = [x["say"] for t in tools or [] if t.get("name") == "check_availability" for x in (t.get("result") or {}).get("slots", [])]
    for say in says:
        if say in text: continue
        nums = re.findall(r"\d+(?::\d+)?", say)
        for n in range(len(say) + 4, len(say) - 5, -1):
            best = None
            for i in range(0, max(0, len(text) - n) + 1):
                w = text[i:i + n]
                if re.findall(r"\d+(?::\d+)?", w) != nums: continue
                r = difflib.SequenceMatcher(None, w, say).ratio()
                if r >= 0.8 and (not best or r > best[0]): best = (r, i)
            if best: text = text[:best[1]] + say + text[best[1] + n:]; break
    return text

def plain(t: str) -> str:
    """Strip markdown so replies read as plain sentences in chat and TTS."""
    t = re.sub(r"\*\*|__|`|^#+\s*", "", t or "", flags=re.M)
    t = re.sub(r"(?<![.!?:;,])[ \t]*\n+[ \t]*(?=\S)", "; ", t.strip())  # line-per-item lists become one sentence
    t = re.sub(r"\n+", " ", t)
    t = re.sub(r"\s*(?:^|\s)[-*\u2022]\s+(?=[A-Z0-9])", lambda m: "; " if m.start() else "", t)
    t = re.sub(r"\s{2,}", " ", t)
    t = re.sub(r"(?:;\s*){2,}", "; ", t)
    t = re.sub(r"(AM|PM|IST|\d);\s+(?=(?:Let|Tell|Which|Please|Pick|Reply|Just|Share)\b)", r"\1. ", t)  # list end, new sentence
    return re.sub(r":\s*;\s*", ": ", t).strip()

async def agent_reply(s, p, conv, text, voice_mode=False):
    history = [m for m in conv.messages if m.role in ("visitor", "persona", "owner")][-12:]
    ctx = rag.search(list(s.scalars(select(Chunk).where(Chunk.persona_id == p.id))), text)
    # Do not hold a Neon connection while waiting on an external model. The
    # RAG read is complete; tool execution and the model call can acquire a
    # connection only when they actually need one.
    s.commit()
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
            if c["function"]["name"] == "book_meeting":
                if res.get("booked"):
                    return (f"Your meeting is confirmed for {res['label']} ({res.get('timezone', 'Asia/Kolkata')}).", tools_used, provider, [c.source for _, c in ctx])
                if res.get("booking_status") in {"needs_details", "needs_slot", "calendar_error", "conflict"}:
                    return (res.get("message") or res.get("error") or "I could not confirm that slot. Please choose another available time.", tools_used, provider, [c.source for _, c in ctx])
            msgs.append({"role": "tool", "tool_call_id": c["id"], "content": json.dumps(res)})
    return "Let me get back to you on that.", tools_used, provider, []

def get_conv(s, p, cid, visitor_name, channel):
    conv = s.get(Conversation, cid) if cid else None
    if not conv or conv.persona_id != p.id:
        conv = Conversation(persona_id=p.id, visitor_name=visitor_name or "Visitor", channel=channel)
        s.add(conv)
        # Assign the id without an extra round-trip. The visitor message and
        # conversation row are committed together in handle_turn().
        s.flush()
    return conv

HINGLISH = set("""kya hai hain aap aapka aapki apka tum tera mera meri mujhe hum kitna kitne kaise kaisa kab kahan kyun kaun
nahi nahin haan bhai yaar kar karo karna karte karta sakte sakta chahiye hoga hogi ho tha thi bata batao bolo dekho
acha accha theek thik matlab abhi kal aaj wala wali liye se ko ka ki ke mein bhi toh par lekin aur ya jaldi baat milte""".split())

def guess_lang(text):
    if re.search(r"[\u0B80-\u0BFF]", text): return "ta-IN"
    if re.search(r"[\u0C00-\u0C7F]", text): return "te-IN"
    if re.search(r"[\u0C80-\u0CFF]", text): return "kn-IN"
    if re.search(r"[\u0980-\u09FF]", text): return "bn-IN"
    if re.search(r"[\u0900-\u097F]", text): return "hi-IN"
    return "hinglish" if is_hinglish(text) else "en-IN"

def is_hinglish(text):
    w = re.findall(r"[a-z]+", text.lower())
    hits = sum(x in HINGLISH for x in w)
    return hits >= 2 or (hits == 1 and len(w) <= 4)

def matches_lang(reply, lang):
    if lang == "hinglish": return not re.search(r"[\u0900-\u097F]", reply) and is_hinglish(reply)
    if lang == "en-IN": return not re.search(r"[\u0900-\u0DFF]", reply) and not is_hinglish(reply)
    return guess_lang(reply) == lang

async def rewrite_lang(reply, lang):
    """Second pass when the model drifts from the caller's language (e.g. Hinglish in, English out)."""
    try:
        m, prov = await llm.complete([{"role": "system", "content": f"Rewrite the message in {LANG_NAMES[lang]}. Keep every fact, number, time and name exactly. Output only the rewritten message."},
                                  {"role": "user", "content": reply}], None)
        return (m.get("content") or "").strip() if prov != "mock" else None
    except Exception: return None

async def handle_turn(s, p, conv, text, voice_mode=False):
    turn_started = time.perf_counter()
    visitor_message = Message(conversation_id=conv.id, role="visitor", text=text); s.add(visitor_message); conv.updated_at = now(); s.commit()
    log.info("chat_stage=visitor_saved latency_ms=%s", round((time.perf_counter() - turn_started) * 1000))
    await hub.send(conv.id, {"type": "message", "id": visitor_message.id, "role": "visitor", "text": text})
    if conv.takeover:
        return None, [], "owner", []
    reply, tools, provider, sources = await agent_reply(s, p, conv, text, voice_mode)
    log.info("chat_stage=agent_reply latency_ms=%s provider=%s", round((time.perf_counter() - turn_started) * 1000), provider)
    reply = repair_slots(plain(reply), tools)
    if reply and conv.language in LANG_NAMES and not matches_lang(reply, conv.language):
        reply = repair_slots(plain(await rewrite_lang(reply, conv.language) or reply), tools)
    persona_message = Message(conversation_id=conv.id, role="persona", text=reply, meta=json.dumps({"tools": tools, "provider": provider, "sources": sources})); s.add(persona_message)
    s.commit()
    log.info("chat_stage=response_saved latency_ms=%s", round((time.perf_counter() - turn_started) * 1000))
    await hub.send(conv.id, {"type": "message", "id": persona_message.id, "role": "persona", "text": reply, "tools": tools})
    # Summarization is dashboard metadata, not part of the visitor's response.
    # Run it after the response path so a second provider call cannot hold the
    # chat request open or make a normal greeting feel stalled.
    asyncio.create_task(refresh_conversation_summary(conv.id))
    return reply, tools, provider, sources

async def refresh_conversation_summary(conversation_id):
    """Refresh dashboard summary without delaying chat or voice responses."""
    summary_session = SessionLocal()
    try:
        conversation = summary_session.get(Conversation, conversation_id)
        if not conversation:
            return
        transcript = "\n".join(f"{m.role}: {m.text}" for m in conversation.messages)
    except Exception:
        summary_session.rollback()
        log.exception("conversation summary read failed")
        return
    finally:
        # Never hold a pool connection while waiting on an external model.
        summary_session.close()
    try:
        summary = await llm.summarize(transcript)
        save_session = SessionLocal()
        try:
            conversation = save_session.get(Conversation, conversation_id)
            if conversation:
                conversation.summary = summary
                save_session.commit()
        finally:
            save_session.close()
    except Exception:
        log.exception("conversation summary refresh failed")

class ChatIn(BaseModel):
    text: str; conversation_id: str = ""; visitor_name: str = ""

@app.post("/api/p/{handle}/chat")
async def chat(handle: str, b: ChatIn, s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p: raise HTTPException(404)
    b.text = b.text.strip()[:config.MAX_TEXT_CHARS]; b.visitor_name = b.visitor_name.strip()[:60]
    if not b.text: raise HTTPException(422, "empty message")
    conv = get_conv(s, p, b.conversation_id, b.visitor_name, "chat")
    conv.language = guess_lang(b.text)
    reply, tools, provider, sources = await handle_turn(s, p, conv, b.text)
    return {"conversation_id": conv.id, "reply": reply, "tools": tools, "provider": provider, "sources": sources, "takeover": bool(conv.takeover)}

@app.post("/api/p/{handle}/chat/stream")
async def chat_stream(handle: str, b: ChatIn):
    """Stream the same agent/tool flow used by voice, without adding another model call."""
    async def gen():
        s = SessionLocal()
        try:
            p = s.scalar(select(Persona).where(Persona.handle == handle))
            if not p:
                yield json.dumps({"type": "error", "message": "not found"}) + "\n"; return
            text = b.text.strip()[:config.MAX_TEXT_CHARS]
            if not text:
                yield json.dumps({"type": "error", "message": "empty message"}) + "\n"; return
            conv = get_conv(s, p, b.conversation_id, b.visitor_name.strip()[:60], "chat")
            conv.language = guess_lang(text)
            visitor = Message(conversation_id=conv.id, role="visitor", text=text); s.add(visitor); conv.updated_at = now(); s.commit(); s.refresh(conv)
            await hub.send(conv.id, {"type": "message", "id": visitor.id, "role": "visitor", "text": text})
            yield json.dumps({"type": "conversation", "conversation_id": conv.id}) + "\n"
            if conv.takeover:
                yield json.dumps({"type": "done", "reply": "", "tools": [], "takeover": True}) + "\n"; return
            reply_parts = []; tools_used = []; info = None
            try:
                async for kind, value in agent_stream(s, p, conv, text, voice_mode=False):
                    if kind == "text":
                        reply_parts.append(value); yield json.dumps({"type": "text", "delta": value}, ensure_ascii=False) + "\n"
                    elif kind == "tool":
                        tools_used.append(value); yield json.dumps({"type": "tool", **value}, ensure_ascii=False) + "\n"
                    else: info = value
            except Exception as e:
                log.warning("chat stream failed: %s", type(e).__name__)
                reply_parts = reply_parts or ["Sorry, I missed that. Could you try again?"]
                info = {"content": "".join(reply_parts), "tools": tools_used, "provider": "fallback", "sources": []}
            info = info or {"content": "".join(reply_parts), "tools": tools_used, "provider": "fallback", "sources": []}
            reply = repair_slots(plain(info.get("content") or "".join(reply_parts)), info.get("tools", tools_used))
            persona_message = Message(conversation_id=conv.id, role="persona", text=reply, meta=json.dumps({"tools": info.get("tools", tools_used), "provider": info.get("provider", "fallback"), "sources": info.get("sources", [])})); s.add(persona_message); s.commit()
            await hub.send(conv.id, {"type": "message", "id": persona_message.id, "role": "persona", "text": reply, "tools": info.get("tools", tools_used)})
            yield json.dumps({"type": "done", "reply": reply, "tools": info.get("tools", tools_used), "provider": info.get("provider", "fallback"), "conversation_id": conv.id, "takeover": bool(conv.takeover)}, ensure_ascii=False) + "\n"
            asyncio.create_task(refresh_conversation_summary(conv.id))
        finally:
            s.close()
    return StreamingResponse(gen(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

def voice_lang(text, r):
    """Prisma codemix writes Hindi in Devanagari and keeps English words in Latin. A Hindi
    transcript with 2+ English words is a Hinglish caller, so the reply goes back in Hinglish."""
    if r.get("mock") or r.get("language") == "en-IN": return guess_lang(text)
    if r.get("language") == "hi-IN" and len(re.findall(r"\b[A-Za-z]{2,}\b", text)) >= 2: return "hinglish"
    return r.get("language") or guess_lang(text)

@app.post("/api/p/{handle}/voice")
async def voice_turn(handle: str, audio: UploadFile = File(...), conversation_id: str = Form(""), text_hint: str = Form(""), s=Depends(db)):
    p = s.scalar(select(Persona).where(Persona.handle == handle))
    if not p: raise HTTPException(404)
    t0 = time.perf_counter(); ms = lambda a: round((time.perf_counter() - a) * 1000)
    data = await read_capped(audio, config.MAX_AUDIO_BYTES); fallback = []; text_hint = text_hint[:config.MAX_TEXT_CHARS]
    try: r = await voice.stt(data, audio.filename or "audio.wav")
    except Exception as e:
        log.warning("STT failed: %s", e); fallback.append(f"stt:{type(e).__name__}")
        r = {"transcript": "", "language": "en-IN", "mock": True}
    stt_ms = ms(t0)
    text = r["transcript"] or text_hint or ("Hi, are you free for a quick call this week?" if r["mock"] else "")
    if not text: return {"conversation_id": conversation_id, "transcript": "", "reply": "", "audio": None, "segments": [], "fallback": fallback or ["stt:empty"]}
    conv = get_conv(s, p, conversation_id, "Voice caller", "voice"); conv.channel = "voice"
    conv.language = voice_lang(text, r); s.commit()
    t1 = time.perf_counter()
    reply, tools, provider, sources = await handle_turn(s, p, conv, text, voice_mode=True)
    llm_ms = ms(t1); segs, mock_audio, tts_ms = [], True, 0
    if reply:
        emb = p.voice_embedding if p.voice_embedding and "mock" not in p.voice_embedding else ""
        wavs, mock_audio, fb, tts_ms = await voice.speak(reply, conv.language, emb)
        if fb: fallback.append(fb)
        segs = [base64.b64encode(w).decode() for w in wavs]
    return {"conversation_id": conv.id, "transcript": text, "language": conv.language, "reply": reply, "tools": tools,
            "provider": provider, "audio": segs[0] if segs else None, "segments": segs, "mock_stt": r["mock"], "mock_tts": mock_audio,
            "fallback": fallback, "latency": {"stt_ms": stt_ms, "llm_ms": llm_ms, "tts_ms": tts_ms, "total_ms": ms(t0)}}

FILLERS = {"en-IN": "One sec, checking the calendar.", "hinglish": "Ek second, calendar dekh raha hoon.",
           "hi-IN": "एक सेकंड, कैलेंडर देख रहा हूँ।", "ta-IN": "ஒரு நிமிடம், காலெண்டரைப் பார்க்கிறேன்.",
           "te-IN": "ఒక్క క్షణం, క్యాలెండర్ చూస్తున్నాను.", "kn-IN": "ಒಂದು ಕ್ಷಣ, ಕ್ಯಾಲೆಂಡರ್ ನೋಡುತ್ತಿದ್ದೇನೆ.", "bn-IN": "এক সেকেন্ড, ক্যালেন্ডার দেখছি।"}
FILLER_CACHE = {}
SENT_END = re.compile(r"[.!?\u0964](?=\s)|[.!?\u0964]$")

def split_ready(buf, first):
    """Return (speakable, rest). A sentence is ready at . ! ? or the Devanagari danda followed by
    space. The first chunk may also break at a comma once it is long enough, so audio starts sooner."""
    m = None
    for m in SENT_END.finditer(buf): pass
    if m and m.end() >= 12: return buf[:m.end()].strip(), buf[m.end():]
    if first and len(buf) > 70:
        i = buf.rfind(", ", 30)
        if i > 0: return buf[:i + 1].strip(), buf[i + 1:]
    return "", buf

async def agent_stream(s, p, conv, text, voice_mode=True):
    """Like agent_reply, but yields ("text", delta) tokens from the final answer round."""
    history = [m for m in conv.messages if m.role in ("visitor", "persona", "owner")][-12:]
    ctx = rag.search(list(s.scalars(select(Chunk).where(Chunk.persona_id == p.id))), text)
    # Streaming provider calls must not reserve a DB connection for their duration.
    s.commit()
    msgs = [{"role": "system", "content": system_prompt(p, ctx, conv.language, voice_mode)}]
    msgs += [{"role": "user" if m.role == "visitor" else "assistant", "content": m.text} for m in history[:-1]]
    msgs.append({"role": "user", "content": text})
    tools_used = []
    for _ in range(4):
        final = None
        async for kind, val in llm.stream(msgs, llm.TOOLS):
            if kind == "text": yield "text", val
            else: final = val
        calls = final["tool_calls"]
        if not calls:
            yield "done", {"content": final["content"], "tools": tools_used, "provider": final["provider"], "sources": [c.source for _, c in ctx]}; return
        msgs.append({"role": "assistant", "content": final["content"] or None, "tool_calls": calls})
        for c in calls:
            try: args = json.loads(c["function"].get("arguments") or "{}")
            except Exception: args = {}
            res = await run_tool(s, p, conv, c["function"]["name"], args)
            yield "tool", {"name": c["function"]["name"], "result": res}
            tools_used.append({"name": c["function"]["name"], "args": args, "result": res})
            msgs.append({"role": "tool", "tool_call_id": c["id"] or "call_0", "content": json.dumps(res, ensure_ascii=False)})
    yield "text", "Let me get back to you on that."
    yield "done", {"content": "Let me get back to you on that.", "tools": tools_used, "provider": "fallback", "sources": []}

@app.post("/api/p/{handle}/voice/stream")
async def voice_stream(handle: str, audio: UploadFile = File(...), conversation_id: str = Form(""), text_hint: str = Form("")):
    """Streaming voice turn as NDJSON events: transcript, text (LLM tokens), audio (raw PCM16
    chunks from Timbre SSE, sentence by sentence), done (latency). TTS of sentence 1 starts as
    soon as the LLM finishes it, while later tokens are still arriving."""
    data = await read_capped(audio, config.MAX_AUDIO_BYTES); fname = safe_name(audio.filename or "audio.wav"); text_hint = text_hint[:config.MAX_TEXT_CHARS]
    async def gen():
        s = SessionLocal(); t0 = time.perf_counter(); ms = lambda: round((time.perf_counter() - t0) * 1000)
        ev = lambda o: json.dumps(o, ensure_ascii=False) + "\n"
        lat = {}; fallback = []
        try:
            p = s.scalar(select(Persona).where(Persona.handle == handle))
            if not p: yield ev({"type": "error", "message": "not found"}); return
            try: r = await voice.stt(data, fname)
            except Exception as e:
                log.warning("STT failed: %s", e); fallback.append(f"stt:{type(e).__name__}"); r = {"transcript": "", "language": "en-IN", "mock": True}
            lat["stt_ms"] = ms()
            text = r["transcript"] or text_hint or ("Hi, are you free for a quick call this week?" if r["mock"] else "")
            if not text: yield ev({"type": "done", "reply": "", "fallback": fallback or ["stt:empty"], "latency": lat}); return
            conv = get_conv(s, p, conversation_id, "Voice caller", "voice"); conv.channel = "voice"; conv.language = voice_lang(text, r)
            s.add(Message(conversation_id=conv.id, role="visitor", text=text)); conv.updated_at = now(); s.commit(); s.refresh(conv)
            await hub.send(conv.id, {"type": "message", "role": "visitor", "text": text})
            yield ev({"type": "transcript", "text": text, "language": conv.language, "conversation_id": conv.id, "mock_stt": r["mock"], "rate": voice.STREAM_RATE})
            if conv.takeover:
                yield ev({"type": "done", "reply": "", "takeover": True, "latency": lat | {"total_ms": ms()}}); return
            emb = p.voice_embedding if p.voice_embedding and "mock" not in p.voice_embedding else ""
            out = asyncio.Queue(); sentences_q = asyncio.Queue()
            async def tts_worker():
                seq = 0; mock = not config.GNANI_API_KEY
                while (sent := await sentences_q.get()) is not None:
                    key = None
                    if isinstance(sent, tuple):  # cached filler: same text every time, so pay for it once
                        sent = sent[1]; key = (sent, conv.language, emb[:32])
                        if key in FILLER_CACHE:
                            if "first_audio_ms" not in lat: lat["first_audio_ms"] = ms()
                            for pcm in FILLER_CACHE[key]:
                                await out.put({"type": "audio", "seq": seq, "pcm": base64.b64encode(pcm).decode(), "mock": mock}); seq += 1
                            continue
                    got = []
                    try:
                        async for pcm in voice.tts_stream(sent, conv.language, emb):
                            got.append(pcm)
                            if "first_audio_ms" not in lat: lat["first_audio_ms"] = ms()
                            await out.put({"type": "audio", "seq": seq, "pcm": base64.b64encode(pcm).decode(), "mock": mock}); seq += 1
                    except Exception as e:
                        log.warning("stream TTS failed: %s", e); fallback.append(f"tts:{type(e).__name__}")
                        await out.put({"type": "speak_fallback", "text": sent})  # client speaks it with the browser voice
                    else:
                        if key and not mock: FILLER_CACHE[key] = got
                await out.put(None)
            worker = asyncio.create_task(tts_worker())
            async def llm_worker():
                buf, first, info, filled, seen = "", True, None, False, []
                try:
                    async for kind, val in agent_stream(s, p, conv, text):
                        if kind == "text":
                            if "first_token_ms" not in lat: lat["first_token_ms"] = ms()
                            await out.put({"type": "text", "delta": val}); buf += val
                            ready, buf = split_ready(buf, first)
                            if ready:
                                if first: lat["first_sentence_ms"] = ms()
                                first = False; await sentences_q.put(repair_slots(plain(ready), seen))
                        elif kind == "tool":
                            seen.append(val)
                            if first and not buf.strip() and not filled:
                                filled = True; lat["filler_ms"] = ms(); await sentences_q.put(("filler", FILLERS.get(conv.language, FILLERS["en-IN"])))
                        else: info = val
                except Exception as e:
                    log.warning("LLM stream failed: %s", e); fallback.append(f"llm:{type(e).__name__}")
                    info = {"content": buf or "Sorry, I missed that. Could you say it again?", "tools": [], "provider": "fallback", "sources": []}
                    if not buf: await out.put({"type": "text", "delta": info["content"]}); buf = info["content"]
                if buf.strip(): await sentences_q.put(repair_slots(plain(buf.strip()), seen))
                lat["llm_ms"] = ms() - lat["stt_ms"]
                await sentences_q.put(None)
                return info
            llm_task = asyncio.create_task(llm_worker())
            while (item := await out.get()) is not None:
                yield ev(item)
            info = await llm_task; await worker
            reply = repair_slots(plain(info["content"]), info["tools"])
            s.add(Message(conversation_id=conv.id, role="persona", text=reply, meta=json.dumps({"tools": info["tools"], "provider": info["provider"], "sources": info["sources"], "latency": lat})))
            s.commit()
            await hub.send(conv.id, {"type": "message", "role": "persona", "text": reply, "tools": info["tools"]})
            lat["total_ms"] = ms()
            yield ev({"type": "done", "reply": reply, "tools": info["tools"], "provider": info["provider"], "fallback": fallback, "latency": lat, "conversation_id": conv.id})
            asyncio.create_task(refresh_conversation_summary(conv.id))
        finally:
            s.close()
    return StreamingResponse(gen(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

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
    message = Message(conversation_id=cid, role="owner", text=b.text); s.add(message); c.updated_at = now(); s.commit()
    await hub.send(cid, {"type": "message", "id": message.id, "role": "owner", "text": b.text}); return {"ok": True}

@app.websocket("/ws/conversations/{cid}")
async def ws_conv(ws: WebSocket, cid: str, token: str = ""):
    if token:
        s = SessionLocal()
        try:
            sess = s.get(AuthSession, token); conv = s.get(Conversation, cid)
            if not sess or not conv or not s.scalar(select(Persona).where(Persona.id == conv.persona_id, Persona.owner_id == sess.owner_id)):
                await ws.close(code=1008); return
        finally:
            s.close()
    await ws.accept(); hub.rooms[cid].add(ws)
    try:
        while True: await ws.receive_text()
    except WebSocketDisconnect: hub.rooms[cid].discard(ws)

def seed_demo_data(reindex=False):
    """Explicitly seed the demo persona; never run this from application startup.

    Profile reindexing and stale embedding rewrites are opt-in because they
    delete/rewrite application data and can load the embedding model.
    """
    s = SessionLocal()
    try:
        if not s.scalar(select(Persona).where(Persona.handle == "hardik")):
            o = s.scalar(select(Owner).where(Owner.email == "hardikgupta8792@gmail.com")) or Owner(email="hardikgupta8792@gmail.com", name="Hardik Gupta")
            s.add(o); s.flush()
            p = Persona(owner_id=o.id, handle="hardik", name="Hardik Gupta", headline="Full-stack and AI engineer, KIIT University",
                bio="I build AI products end to end: Next.js frontends, Python backends and voice agents for Indian languages. I take freelance builds and I am open to internships.",
                rates="Freelance MVP builds start at 25,000 rupees per week. A 30 minute discovery call is free.",
                faqs=json.dumps([{"q": "What do you work on?", "a": "Voice AI agents, full-stack web apps and LLM tooling, mostly with Next.js, FastAPI and Postgres."},
                                 {"q": "Are you available for internships?", "a": "Yes, I am open to AI and full-stack internships starting January 2027."},
                                 {"q": "Which languages can I talk to you in?", "a": "English, Hindi and Hinglish work best. My Twyn also understands Tamil, Telugu, Kannada and other Indian languages."}]),
                links=json.dumps([{"label": "GitHub", "url": "https://github.com/"}, {"label": "LinkedIn", "url": "https://linkedin.com/"}]))
            s.add(p); s.commit(); s.refresh(p); reindex_profile(s, p); s.commit()
        h = s.scalar(select(Persona).where(Persona.handle == "hardik"))
        if h and not h.published:
            h.published = True; h.onboarding_step = 6; s.commit()
        if reindex:
            n = rag.reembed_stale(s, Chunk)
            if n: log.info("re-embedded %s chunks with %s", n, rag.embedder().name)
    finally:
        s.close()

# Wrap the complete application so CORS headers are also present on responses
# generated by outer error handling, not only on successful route responses.
app = CORSMiddleware(
    app,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
