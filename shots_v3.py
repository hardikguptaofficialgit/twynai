import time
from playwright.sync_api import sync_playwright
S = "/workspace/proxy/shots/v3/"; B = "http://localhost:3100"
ts = int(time.time()); h = f"aarav{ts%100000}"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    pg = b.new_page(viewport={"width": 1280, "height": 820}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append("console: " + m.text))
    pg.goto(B + "/", wait_until="networkidle"); time.sleep(1.5); pg.screenshot(path=S + "landing-hero.png")
    for y in range(12): pg.mouse.wheel(0, 400); time.sleep(0.15)
    time.sleep(1); pg.screenshot(path=S + "landing-full.png", full_page=True)
    pg.goto(B + "/login", wait_until="networkidle"); time.sleep(0.8); pg.screenshot(path=S + "login.png")
    pg.evaluate(f"localStorage.removeItem('proxy_draft');localStorage.setItem('proxy_claim','{h}')")
    pg.locator("input[name=name]").fill("Aarav Mehta"); pg.locator("input[name=email]").fill(f"aarav{ts}@example.com")
    pg.get_by_role("button", name="Continue").click(); pg.wait_for_url("**/onboarding**"); time.sleep(2)
    def cont(): pg.get_by_role("button", name="Continue").click(); time.sleep(1.2)
    pg.screenshot(path=S + "onboarding.png"); cont()
    pg.get_by_placeholder("Full-stack and AI engineer").fill("Product designer and brand strategist")
    pg.locator("textarea").fill("I help early-stage startups in Bengaluru shape their brand and product. I run design sprints and build design systems.")
    pg.screenshot(path=S + "onboarding-basics.png"); cont()
    pg.get_by_placeholder("MVP builds from 25,000 rupees per week. Discovery calls are free.").fill("Brand sprints from 60,000 rupees. Intro calls are free.")
    pg.get_by_role("button", name="Add").nth(1).click(); pg.get_by_placeholder("Label").fill("Portfolio"); pg.get_by_placeholder("https://").fill("https://dribbble.com/aarav")
    cont()
    pg.get_by_role("button", name="Skip for now").click(); time.sleep(1)  # voice: skip to save Gnani credits
    pg.get_by_role("button", name="Skip for now").click(); time.sleep(1)  # calendar
    pg.get_by_role("button", name="Review").click(); time.sleep(1.2)
    pg.get_by_role("button", name="Publish my Twyn").click(); time.sleep(2); pg.screenshot(path=S + "onboarding-live.png")
    pg.goto(f"{B}/p/{h}", wait_until="networkidle"); time.sleep(1.5); pg.screenshot(path=S + "profile.png")
    pg.get_by_role("button", name="What do you work on?").click()
    pg.wait_for_selector("text=Something went wrong", timeout=1500, state="detached") if False else None
    time.sleep(6); pg.screenshot(path=S + "profile-chat.png")
    pg.get_by_role("button", name="Book", exact=True).click(); time.sleep(1.5)
    pg.locator("button:has-text(':')").filter(has_text="M").first.click()
    pg.get_by_placeholder("Your name").fill("Riya Kapoor"); pg.get_by_placeholder("you@email.com").fill("riya@example.com"); pg.get_by_placeholder("What is it about? (optional)").fill("Brand sprint")
    pg.screenshot(path=S + "profile-book.png"); pg.get_by_role("button", name="Confirm booking").click(); time.sleep(1.5)
    pg.screenshot(path=S + "profile-booked.png")
    print("booked:", pg.locator("text=You’re booked.").count())
    pg.goto(B + "/dashboard", wait_until="networkidle"); time.sleep(3); pg.screenshot(path=S + "dashboard.png", full_page=True)
    m = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    m.goto(B + "/", wait_until="networkidle"); time.sleep(1.2); m.screenshot(path=S + "mobile-landing.png")
    m.goto(f"{B}/p/{h}", wait_until="networkidle"); time.sleep(1.2); m.screenshot(path=S + "mobile-profile.png", full_page=True)
    print("handle", h, "errors:", errs)
