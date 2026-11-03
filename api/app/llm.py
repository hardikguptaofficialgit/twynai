"""LLM provider chain: Meta -> NVIDIA -> Groq -> OpenRouter -> mock."""
import json, re, httpx, logging, math, time
from datetime import datetime, timezone
from . import config
from .db import SessionLocal, ProviderSpend, engine
from sqlalchemy import update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
log = logging.getLogger("llm")

META_OUTPUT_LIMIT = 700
META_INPUT_PER_MILLION_USD = 1.25
META_OUTPUT_PER_MILLION_USD = 4.25
COMPLETE_DEADLINE_SECONDS = 12

def _reserve_meta(messages, tools=None):
    # Reserve by UTF-8 byte count (a conservative token upper bound) before sending.
    payload = json.dumps({"messages": messages, "tools": tools}, ensure_ascii=False).encode("utf-8")
    reserve = len(payload) * 2 + math.ceil(META_OUTPUT_LIMIT * META_OUTPUT_PER_MILLION_USD)
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    insert = sqlite_insert if engine.dialect.name == "sqlite" else postgres_insert
    s = SessionLocal()
    try:
        stmt = insert(ProviderSpend).values(month=month, spent_micros=0, reserved_micros=reserve)
        stmt = stmt.on_conflict_do_update(
            index_elements=[ProviderSpend.month],
            set_={"reserved_micros": ProviderSpend.reserved_micros + reserve},
        ).returning(ProviderSpend.month)
        allowed = s.execute(stmt).first() is not None
        s.commit()
        return (month, reserve) if allowed else None
    except Exception:
        s.rollback()
        log.exception("Meta spend reservation failed")
        return None
    finally:
        s.close()

def _settle_meta(reservation, usage=None, charge_reserve=False):
    if not reservation: return
    month, reserved = reservation
    if usage and isinstance(usage, dict):
        input_tokens = int(usage.get("prompt_tokens", usage.get("input_tokens", 0)) or 0)
        output_tokens = int(usage.get("completion_tokens", usage.get("output_tokens", 0)) or 0)
        actual = math.ceil(input_tokens * META_INPUT_PER_MILLION_USD + output_tokens * META_OUTPUT_PER_MILLION_USD)
    else:
        actual = reserved if charge_reserve else 0
    s = SessionLocal()
    try:
        s.execute(update(ProviderSpend).where(ProviderSpend.month == month).values(spent_micros=ProviderSpend.spent_micros + actual, reserved_micros=ProviderSpend.reserved_micros - reserved))
        s.commit()
    except Exception:
        s.rollback()
        log.exception("Meta spend settlement failed")
    finally:
        s.close()

TOOLS = [
    {"type": "function", "function": {"name": "check_availability", "description": "List the owner's free meeting slots for the next days.",
        "parameters": {"type": "object", "properties": {"days": {"type": "integer", "description": "How many days ahead, default 5"}}}}},
    {"type": "function", "function": {"name": "book_meeting", "description": "Book a meeting on the owner's calendar in one of the free slots.",
        "parameters": {"type": "object", "properties": {"start": {"type": "string", "description": "ISO start time from check_availability"},
            "guest_name": {"type": "string"}, "guest_email": {"type": "string"}, "topic": {"type": "string"}}, "required": ["start", "guest_name"]}}},
    {"type": "function", "function": {"name": "capture_lead", "description": "Save the visitor as a lead when they share contact details or show buying intent.",
        "parameters": {"type": "object", "properties": {"name": {"type": "string"}, "contact": {"type": "string"}, "intent": {"type": "string"}}, "required": ["intent"]}}},
]

def providers():
    out = []
    if config.META_API_KEY: out.append(("meta", "https://api.meta.ai/v1/chat/completions", config.META_API_KEY, config.META_MODEL))
    if config.NVIDIA_API_KEY: out.append(("nvidia", "https://integrate.api.nvidia.com/v1/chat/completions", config.NVIDIA_API_KEY, config.NVIDIA_MODEL))
    if config.GROQ_API_KEY: out.append(("groq", "https://api.groq.com/openai/v1/chat/completions", config.GROQ_API_KEY, config.GROQ_MODEL))
    if config.OPENROUTER_API_KEY: out.append(("openrouter", "https://openrouter.ai/api/v1/chat/completions", config.OPENROUTER_API_KEY, config.OPENROUTER_MODEL))
    return out

async def complete(messages, tools=None):
    """Returns (assistant_message_dict, provider_name)."""
    deadline = time.perf_counter() + COMPLETE_DEADLINE_SECONDS
    for name, url, key, model in providers():
        remaining = deadline - time.perf_counter()
        if remaining <= 0:
            log.warning("LLM completion deadline reached; using fallback")
            break
        reservation = None
        try:
            body = {"model": model, "messages": messages, "temperature": 0.4}
            if name in ("nvidia", "meta"): body["max_tokens"] = META_OUTPUT_LIMIT
            if name == "nvidia": body["reasoning_effort"] = "low"
            if tools: body["tools"] = tools
            reservation = _reserve_meta(messages, tools) if name == "meta" else None
            timeout = min(12 if name == "nvidia" else 30, max(1.0, remaining))
            async with httpx.AsyncClient(timeout=timeout) as c:
                r = await c.post(url, headers={"Authorization": f"Bearer {key}"}, json=body)
            r.raise_for_status()
            data = r.json()
            if name == "meta":
                _settle_meta(reservation, data.get("usage"), charge_reserve=True)
                reservation = None
            message = data["choices"][0]["message"]
            if not message.get("content") and not message.get("tool_calls"):
                log.warning("provider %s returned an empty completion; trying the next provider", name)
                continue
            return message, name
        except Exception as e:
            if name == "meta" and reservation: _settle_meta(reservation)
            log.warning("provider %s failed: %s", name, e)
    return mock_complete(messages, tools), "mock"

# ---------- mock brain: deterministic, uses retrieved context + emits real tool calls ----------
def _last(messages, role):
    for m in reversed(messages):
        if m["role"] == role: return m
    return None

def mock_complete(messages, tools=None):
    last = messages[-1]
    sysm = messages[0]["content"]
    if last["role"] == "tool":
        data = json.loads(last["content"])
        if "slots" in data:
            s = data["slots"][:3]
            return {"role": "assistant", "content": "Here are a few open slots: " + "; ".join(x.get("say") or x.get("label", "") for x in s) + ". Tell me which works and your name and email, and I will book it."}
        if data.get("booked"):
            return {"role": "assistant", "content": f"Done. You are booked for {data['label']}. A calendar invite is on its way."}
        if data.get("saved"):
            return {"role": "assistant", "content": "Thanks, I have noted your details and will make sure this reaches me personally."}
    user = (_last(messages, "user") or {}).get("content", "")
    low = user.lower()
    email = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", user)
    phone = re.search(r"\+?\d[\d\s-]{8,}\d", user)
    def call(name, args):
        return {"role": "assistant", "content": None, "tool_calls": [{"id": "call_" + name, "type": "function", "function": {"name": name, "arguments": json.dumps(args)}}]}
    if tools:
        slot = re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", user)
        if slot and any(w in low for w in ("book", "confirm", "lock", "kar do", "fix")):
            nm = re.search(r"(?:i am|i'm|name is|mera naam)\s+([A-Za-z]+)", user, re.I)
            return call("book_meeting", {"start": slot.group(0), "guest_name": nm.group(1) if nm else "Guest", "guest_email": email.group(0) if email else "", "topic": "Intro call"})
        if any(w in low for w in ("meet", "call", "book", "slot", "available", "free", "schedule", "milna", "baat"))and not (email or phone):
            return call("check_availability", {"days": 5})
        if email or phone:
            return call("capture_lead", {"name": "", "contact": (email or phone).group(0), "intent": user[:200]})
    ctx = re.findall(r"<k>(.*?)</k>", sysm, re.S)
    hinglish = any(w in low.split() for w in ("kya", "hai", "aap", "kitna", "kaise", "mujhe", "bhai", "kar", "ho"))
    if ctx:
        ans = ctx[0].strip()
        ans = re.sub(r"^(Q:.*?A:\s*)", "", ans)
        ans = ans[:320].rsplit(" ", 1)[0] if len(ans) > 320 else ans
        return {"role": "assistant", "content": ("Haan, bilkul. " if hinglish else "") + ans}
    return {"role": "assistant", "content": ("Iske baare mein mere paas abhi info nahi hai. " if hinglish else "I do not have that in my notes yet. ") + "Want me to pass it on, or book a quick call?"}

async def summarize(transcript: str):
    msgs = [{"role": "system", "content": "Summarize this conversation for the owner in 2 short sentences: who, what they want, next step."},
            {"role": "user", "content": transcript[-6000:]}]
    if providers():
        m, _ = await complete(msgs)
        if m.get("content"): return m["content"].strip()
    lines = [l for l in transcript.splitlines() if l.startswith("visitor:")]
    first = lines[0][8:].strip() if lines else "No visitor messages"
    return f"Visitor asked: {first[:140]}. {len(lines)} visitor message(s)."

async def stream(messages, tools=None):
    """Streaming chat completion. Yields ("text", delta) as tokens arrive, then exactly one
    ("done", {"content", "tool_calls", "provider"}). Falls back to complete() if streaming fails
    before any token was sent."""
    for name, url, key, model in providers():
        sent, content, calls = False, "", {}
        reservation, usage = None, None
        try:
            body = {"model": model, "messages": messages, "temperature": 0.4, "stream": True}
            if name in ("nvidia", "meta"): body["max_tokens"] = META_OUTPUT_LIMIT
            if name == "nvidia": body["reasoning_effort"] = "low"
            if tools: body["tools"] = tools
            if name == "meta":
                reservation = _reserve_meta(messages, tools)
                body["stream_options"] = {"include_usage": True}
            timeout = 12 if name == "nvidia" else 30
            async with httpx.AsyncClient(timeout=httpx.Timeout(timeout, read=timeout)) as c:
                async with c.stream("POST", url, headers={"Authorization": f"Bearer {key}"}, json=body) as r:
                    r.raise_for_status()
                    async for line in r.aiter_lines():
                        if not line.startswith("data:"): continue
                        data = line[5:].strip()
                        if data == "[DONE]": break
                        packet = json.loads(data)
                        if packet.get("usage"): usage = packet["usage"]
                        ch = (packet.get("choices") or [{}])[0].get("delta") or {}
                        if ch.get("content"):
                            content += ch["content"]; sent = True; yield "text", ch["content"]
                        for tc in ch.get("tool_calls") or []:
                            slot = calls.setdefault(tc.get("index", 0), {"id": "", "type": "function", "function": {"name": "", "arguments": ""}})
                            if tc.get("id"): slot["id"] = tc["id"]
                            f = tc.get("function") or {}
                            slot["function"]["name"] += f.get("name") or ""
                            slot["function"]["arguments"] += f.get("arguments") or ""
            if name == "meta":
                _settle_meta(reservation, usage, charge_reserve=True)
                reservation = None
            yield "done", {"content": content, "tool_calls": [calls[i] for i in sorted(calls)], "provider": name}
            return
        except Exception as e:
            if name == "meta" and reservation:
                _settle_meta(reservation, usage, charge_reserve=sent)
            log.warning("stream %s failed: %s", name, e)
            if sent:
                yield "done", {"content": content, "tool_calls": [], "provider": name}; return
    m, prov = await complete(messages, tools)
    if m.get("content") and not m.get("tool_calls"): yield "text", m["content"]
    yield "done", {"content": m.get("content") or "", "tool_calls": m.get("tool_calls") or [], "provider": prov}
