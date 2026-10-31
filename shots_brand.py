import asyncio
from playwright.async_api import async_playwright
B="http://localhost:3100"; O="/workspace/proxy/shots/brand/"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        pg = await b.new_page(viewport={"width":1440,"height":900})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(B+"/"); await pg.wait_for_timeout(1500)
        for y in range(0,4000,400): await pg.mouse.wheel(0,400); await pg.wait_for_timeout(150)
        await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(900); await pg.screenshot(path=O+"landing-full.png", full_page=True)
        await pg.goto(B+"/p/hardik"); await pg.wait_for_timeout(2500); await pg.screenshot(path=O+"public.png")
        await pg.goto(B+"/login"); await pg.wait_for_timeout(1200); await pg.screenshot(path=O+"login.png")
        await pg.get_by_role("button", name="Continue").click(); await pg.wait_for_url("**/onboarding"); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=O+"onboarding.png")
        await pg.goto(B+"/dashboard"); await pg.wait_for_timeout(3000); await pg.screenshot(path=O+"dashboard.png", full_page=True)
        m = await b.new_page(viewport={"width":390,"height":844}, device_scale_factor=2)
        await m.goto(B+"/"); await m.wait_for_timeout(1500)
        for y in range(0,6000,400): await m.mouse.wheel(0,400); await m.wait_for_timeout(120)
        await m.evaluate("window.scrollTo(0,0)"); await m.wait_for_timeout(800); await m.screenshot(path=O+"mobile-landing.png", full_page=True)
        await m.goto(B+"/p/hardik"); await m.wait_for_timeout(2500); await m.screenshot(path=O+"mobile-public.png")
        print("errors:", errs); await b.close()
asyncio.run(main())
