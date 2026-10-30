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

# Localized slot strings. The LLM is told to copy these verbatim so the weekday can never drift from the date.
_L = {
 "en-IN": (["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], ["January","February","March","April","May","June","July","August","September","October","November","December"], "{wd} {d} {mo}, {t}"),
 "hinglish": (["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], ["January","February","March","April","May","June","July","August","September","October","November","December"], "{wd}, {d} {mo}, {t} baje"),
 "hi-IN": (["सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार","रविवार"], ["जनवरी","फ़रवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितंबर","अक्टूबर","नवंबर","दिसंबर"], "{wd}, {d} {mo}, {t} बजे"),
 "ta-IN": (["திங்கள்","செவ்வாய்","புதன்","வியாழன்","வெள்ளி","சனி","ஞாயிறு"], ["ஜனவரி","பிப்ரவரி","மார்ச்","ஏப்ரல்","மே","ஜூன்","ஜூலை","ஆகஸ்ட்","செப்டம்பர்","அக்டோபர்","நவம்பர்","டிசம்பர்"], "{wd}, {mo} {d}, {t}"),
 "te-IN": (["సోమవారం","మంగళవారం","బుధవారం","గురువారం","శుక్రవారం","శనివారం","ఆదివారం"], ["జనవరి","ఫిబ్రవరి","మార్చి","ఏప్రిల్","మే","జూన్","జూలై","ఆగస్టు","సెప్టెంబర్","అక్టోబర్","నవంబర్","డిసెంబర్"], "{wd}, {mo} {d}, {t}"),
 "kn-IN": (["ಸೋಮವಾರ","ಮಂಗಳವಾರ","ಬುಧವಾರ","ಗುರುವಾರ","ಶುಕ್ರವಾರ","ಶನಿವಾರ","ಭಾನುವಾರ"], ["ಜನವರಿ","ಫೆಬ್ರವರಿ","ಮಾರ್ಚ್","ಏಪ್ರಿಲ್","ಮೇ","ಜೂನ್","ಜುಲೈ","ಆಗಸ್ಟ್","ಸೆಪ್ಟೆಂಬರ್","ಅಕ್ಟೋಬರ್","ನವೆಂಬರ್","ಡಿಸೆಂಬರ್"], "{wd}, {mo} {d}, {t}"),
 "bn-IN": (["সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার","রবিবার"], ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"], "{wd}, {d} {mo}, {t}"),
}

def local_label(st, lang="en-IN"):
    wds, mos, fmt = _L.get(lang, _L["en-IN"])
    h = st.hour % 12 or 12
    t = f"{h}:{st.minute:02d} {'AM' if st.hour < 12 else 'PM'}" if lang == "en-IN" else f"{h}:{st.minute:02d}"
    if lang not in ("en-IN",):  # spoken day-part, so 4:00 is unambiguous
        part = {"hinglish": ["subah", "dopahar", "shaam"], "hi-IN": ["सुबह", "दोपहर", "शाम"], "ta-IN": ["காலை", "மதியம்", "மாலை"],
                "te-IN": ["ఉదయం", "మధ్యాహ్నం", "సాయంత్రం"], "kn-IN": ["ಬೆಳಿಗ್ಗೆ", "ಮಧ್ಯಾಹ್ನ", "ಸಂಜೆ"], "bn-IN": ["সকাল", "দুপুর", "সন্ধ্যা"]}.get(lang)
        if part: t = f"{part[0 if st.hour < 12 else 1 if st.hour < 16 else 2]} {t}"
    return fmt.format(wd=wds[st.weekday()], d=st.day, mo=mos[st.month - 1], t=t)

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
