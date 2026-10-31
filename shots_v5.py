import time, json, urllib.request
from playwright.sync_api import sync_playwright
S = "/workspace/proxy/shots/v5/"; B = "http://localhost:3100"; A = "http://localhost:8100"
def call(path, body=None, tok=None, method=None):
    r = urllib.request.Request(A + path, data=json.dumps(body).encode() if body is not None else None, method=method or ("POST" if body is not None else "GET"), headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {tok}"} if tok else {})})
    return json.loads(urllib.request.urlopen(r).read() or "null")
ts = int(time.time()); h = f"meera{ts%100000}"
tok = call("/api/auth/dev", {"email": f"meera{ts}@example.com", "name": "Meera Iyer"})["token"]
p = call("/api/personas", {"handle": h, "name": "Meera Iyer", "headline": "Product designer and brand strategist", "bio": "I help early-stage startups in Bengaluru shape their brand and product, from first sketch to design system.",
  "rates": "Brand sprints from 60,000 rupees. Intro calls are free.", "faqs": [{"q": "Do you work with pre-seed teams?", "a": "Yes, most of my clients are pre-seed or seed."}], "links": [{"label": "Portfolio", "url": "https://dribbble.com/meera"}], "published": True}, tok)
sl = call(f"/api/p/{h}/slots")["slots"]
for i, (n, e, t) in enumerate([("Riya Kapoor", "riya@example.com", "Brand sprint"), ("Kabir Shah", "kabir@example.com", "Design system audit")]):
    call(f"/api/p/{h}/book", {"start": sl[i * 3]["start"], "name": n, "email": e, "topic": t})
try: call(f"/api/p/{h}/chat", {"text": "Do you work with pre-seed teams?", "visitor_name": "Ananya"})
except Exception as ex: print("chat", ex)
pages = ["", "persona", "voice", "availability", "bookings", "leads", "conversations", "settings"]
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg = b.new_page(viewport={"width": 1280, "height": 820}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B + "/login", wait_until="load"); pg.evaluate(f"localStorage.setItem('proxy_token','{tok}')")
    for x in pages:
        pg.goto(f"{B}/studio/{x}".rstrip("/"), wait_until="load"); time.sleep(2.5)
        pg.screenshot(path=f"{S}studio-{x or 'overview'}.png", full_page=True)
    pg.goto(B + "/studio/persona", wait_until="load"); time.sleep(1.5)
    pg.locator("textarea").first.fill("Too short"); time.sleep(0.3); pg.get_by_role("button", name="Save").click(); time.sleep(0.8)
    pg.screenshot(path=S + "studio-persona-validation.png")
    pg.get_by_placeholder("Paste the answer here...").fill("## Bio\nI design brands for early-stage startups.\n\n## Skills\nBrand strategy, Figma, design systems.\n\n## FAQs\nQ: Do you do logos only?\nA: No, I do full brand systems.\n\n## How I talk\nWarm, direct, a little playful.")
    btn = pg.get_by_role("button", name="Preview"); 
    if btn.count(): btn.first.click(); time.sleep(0.8)
    pg.screenshot(path=S + "studio-persona-ai-import.png", full_page=True)
    m = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    m.goto(B + "/login", wait_until="load"); m.evaluate(f"localStorage.setItem('proxy_token','{tok}')")
    for x in ["", "conversations", "settings"]:
        m.goto(f"{B}/studio/{x}".rstrip("/"), wait_until="load"); time.sleep(2); m.screenshot(path=f"{S}mobile-studio-{x or 'overview'}.png")
    lp = b.new_page(viewport={"width": 1280, "height": 820}); lp.goto(B + "/onboarding", wait_until="load"); time.sleep(1)
    print("handle", h, "errors:", errs)
