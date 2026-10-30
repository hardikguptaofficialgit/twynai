"""Calendar: slots follow the persona's availability rules (days, IST hours, length, buffer, notice),
minus busy time from existing bookings and, when connected, Google Calendar free/busy."""
import datetime as dt, json, httpx

IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
DEFAULT_RULES = {"days": [0, 1, 2, 3, 4], "start": "10:00", "end": "18:00", "duration": 30, "buffer": 15, "notice": 12}

def rules_of(persona):
    r = dict(DEFAULT_RULES)
    try: r.update(json.loads(persona.availability or "{}") if persona is not None else {})
    except Exception: pass
    return r

def _hm(s): h, m = s.split(":"); return int(h), int(m)
def label(st): return st.strftime("%a %d %b, %I:%M %p IST")

def generate(rules, busy, days=7, now=None, limit=12, per_day=None):
    """busy: list of (start, end) aware datetimes. Returns [{start:'YYYY-MM-DDTHH:MM', label}] in IST."""
    now = now or dt.datetime.now(IST)
    dur = dt.timedelta(minutes=int(rules["duration"])); buf = dt.timedelta(minutes=int(rules["buffer"]))
    earliest = now + dt.timedelta(hours=int(rules["notice"]))
    out = []
    for d in range(0, days + 1):
        day = (now + dt.timedelta(days=d)).date()
        if day.weekday() not in rules["days"]: continue
        sh, sm = _hm(rules["start"]); eh, em = _hm(rules["end"])
        st = dt.datetime(day.year, day.month, day.day, sh, sm, tzinfo=IST)
        end = dt.datetime(day.year, day.month, day.day, eh, em, tzinfo=IST)
        n_day = 0
        while st + dur <= end and (per_day is None or n_day < per_day):
            if st >= earliest and not any(b0 < st + dur + buf and b1 + buf > st for b0, b1 in busy):
                out.append({"start": st.isoformat()[:16], "label": label(st)}); n_day += 1
                if len(out) >= limit: return out
            st += dur + buf
    return out

def is_valid(rules, busy, start, now=None):
    return any(s["start"] == start[:16] for s in generate(rules, busy, days=30, now=now, limit=10_000))

class MockCalendar:
    connected = False
    def busy(self, t0, t1): return []
    def book(self, start, minutes, summary, attendee): return "mock-" + start.replace(":", "")

class GoogleCalendar(MockCalendar):
    connected = True
    def __init__(self, tokens: dict): self.tok = tokens.get("access_token", "")
    def _h(self): return {"Authorization": f"Bearer {self.tok}"}
    def busy(self, t0, t1):
        r = httpx.post("https://www.googleapis.com/calendar/v3/freeBusy", headers=self._h(), json={"timeMin": t0.isoformat(), "timeMax": t1.isoformat(), "items": [{"id": "primary"}]}, timeout=15)
        r.raise_for_status()
        return [(dt.datetime.fromisoformat(b["start"].replace("Z", "+00:00")), dt.datetime.fromisoformat(b["end"].replace("Z", "+00:00"))) for b in r.json()["calendars"]["primary"]["busy"]]
    def book(self, start, minutes, summary, attendee):
        st = dt.datetime.fromisoformat(start).replace(tzinfo=IST)
        ev = {"summary": summary, "start": {"dateTime": st.isoformat()}, "end": {"dateTime": (st + dt.timedelta(minutes=minutes)).isoformat()}}
        if attendee: ev["attendees"] = [{"email": attendee}]
        r = httpx.post("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", headers=self._h(), json=ev, timeout=15); r.raise_for_status()
        return r.json()["id"]

def for_owner(owner):
    if owner and owner.google_tokens:
        try: return GoogleCalendar(json.loads(owner.google_tokens))
        except Exception: pass
    return MockCalendar()

def all_busy(cal, bookings, days):
    now = dt.datetime.now(IST)
    busy = [(dt.datetime.fromisoformat(b.start).replace(tzinfo=IST), dt.datetime.fromisoformat(b.end).replace(tzinfo=IST)) for b in bookings]
    try: busy += cal.busy(now, now + dt.timedelta(days=days + 1))
    except Exception: pass  # expired token etc.: fall back to rules + local bookings
    return busy
