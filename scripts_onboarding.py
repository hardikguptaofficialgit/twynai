import time, json, urllib.request
from playwright.sync_api import sync_playwright
S = "/workspace/proxy/shots/"
req = urllib.request.Request("http://localhost:8100/api/auth/dev", data=json.dumps({"email": f"neha{int(time.time())}@example.com", "name": "Neha Sharma"}).encode(), headers={"Content-Type": "application/json"})
tok = json.load(urllib.request.urlopen(req))["token"]
h = f"neha{int(time.time())%100000}"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    pg = b.new_page(viewport={"width": 1280, "height": 860}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3100/", wait_until="networkidle"); time.sleep(1.5)
    pg.screenshot(path=S + "landing-hero.png")
    for y in range(0, 4000, 400): pg.mouse.wheel(0, 400); time.sleep(0.15)
    time.sleep(1); pg.screenshot(path=S + "landing-full.png", full_page=True)
    pg.goto("http://localhost:3100/login"); pg.evaluate(f"localStorage.setItem('proxy_token','{tok}');localStorage.removeItem('proxy_draft');localStorage.setItem('proxy_claim','{h}')")
    pg.goto("http://localhost:3100/onboarding", wait_until="networkidle"); time.sleep(2)
    def shot(n): time.sleep(0.9); pg.screenshot(path=S + f"onb-{n}.png", full_page=True)
    def cont(): pg.get_by_role("button", name="Continue").click(); time.sleep(1.2)
    shot("1-handle"); cont()
    pg.get_by_placeholder("Full-stack and AI engineer").fill("Product designer and brand strategist")
    pg.locator("textarea").fill("I help early-stage startups in Bengaluru shape their brand and product. I run design sprints, build design systems and mentor junior designers.")
    pg.get_by_role("button", name="Tamil", exact=True).click()
    shot("2-basics"); cont()
    pg.get_by_placeholder("MVP builds from 25,000 rupees per week. Discovery calls are free.").fill("Brand sprints from 60,000 rupees. Intro calls are free.")
    pg.get_by_role("button", name="Add").first.click(); pg.get_by_placeholder("Question").fill("Do you work with early-stage startups?"); pg.get_by_placeholder("Answer").fill("Yes, mostly pre-seed and seed.")
    pg.get_by_role("button", name="Add").nth(1).click(); pg.get_by_placeholder("Label").fill("Portfolio"); pg.get_by_placeholder("https://").fill("https://dribbble.com/neha")
    shot("3-knowledge"); cont()
    pg.get_by_role("button", name="Start recording").click(); time.sleep(2.5); shot("4-voice-recording")
    pg.get_by_role("button", name="Stop").click(); time.sleep(1.5); pg.get_by_role("button", name="Use this sample").click(); time.sleep(2); shot("4-voice"); cont()
    shot("5-calendar"); pg.get_by_role("button", name="Skip for now").click(); time.sleep(1.2)
    pg.get_by_role("button", name="Sat", exact=True).click(); pg.get_by_role("button", name="45 min").click()
    shot("6-availability"); pg.get_by_role("button", name="Review").click(); time.sleep(1.2)
    shot("7-review"); pg.get_by_role("button", name="Publish my Proxy").click(); time.sleep(1.5); shot("8-live")
    print("errors:", errs)
