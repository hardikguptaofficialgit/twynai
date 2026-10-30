"""Calendar behind an interface. MockCalendar now; GoogleCalendar uses freeBusy + events.insert once OAuth tokens exist."""
import datetime as dt, json, httpx
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))

class MockCalendar:
    def __init__(self, busy=None): self.busy = busy or []
    def free_slots(self, days=5):
        now = dt.datetime.now(IST); out = []
        for d in range(1, days + 1):
            day = (now + dt.timedelta(days=d)).date()
            if day.weekday() == 6: continue
            for h in (11, 15, 17):
                s = dt.datetime(day.year, day.month, day.day, h, 0, tzinfo=IST)
                if s.isoformat()[:16] in self.busy: continue
                out.append({"start": s.isoformat()[:16], "label": s.strftime("%a %d %b, %I:%M %p IST")})
        return out
    def book(self, start, minutes, summary, attendee):
        return "mock-" + start.replace(":", "")

class GoogleCalendar(MockCalendar):
    def __init__(self, tokens: dict): super().__init__(); self.tok = tokens.get("access_token", "")
    def _h(self): return {"Authorization": f"Bearer {self.tok}"}
    def free_slots(self, days=5):
        now = dt.datetime.now(IST)
        body = {"timeMin": now.isoformat(), "timeMax": (now + dt.timedelta(days=days + 1)).isoformat(), "items": [{"id": "primary"}]}
        r = httpx.post("https://www.googleapis.com/calendar/v3/freeBusy", headers=self._h(), json=body, timeout=15); r.raise_for_status()
        busy = r.json()["calendars"]["primary"]["busy"]
        slots = MockCalendar().free_slots(days)
        def clash(s):
            st = dt.datetime.fromisoformat(s["start"]).replace(tzinfo=IST); en = st + dt.timedelta(minutes=30)
            return any(dt.datetime.fromisoformat(b["start"].replace("Z", "+00:00")) < en and dt.datetime.fromisoformat(b["end"].replace("Z", "+00:00")) > st for b in busy)
        return [s for s in slots if not clash(s)]
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
