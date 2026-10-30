import asyncio
from playwright.async_api import async_playwright
B="http://localhost:3100"; O="/workspace/proxy/shots/"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
        pg = await b.new_page(viewport={"width":1440,"height":900})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(B+"/"); await pg.wait_for_timeout(800)
        for y in range(0,4000,400): await pg.mouse.wheel(0,400); await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(800); await pg.screenshot(path=O+"1-landing.png", full_page=True)
        await pg.goto(B+"/p/hardik"); await pg.wait_for_timeout(1500)
        await pg.fill("input", "Bhai aapka rate kitna hai?"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(9000)
        await pg.fill("input", "Can we book a call this week?"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(9000)
        await pg.screenshot(path=O+"2-public-chat.png")
        await pg.get_by_text("Talk", exact=True).click(); await pg.wait_for_timeout(1200); await pg.screenshot(path=O+"3-public-voice.png")
        await pg.goto(B+"/login"); await pg.wait_for_timeout(1000); await pg.screenshot(path=O+"4-login.png")
        await pg.get_by_role("button", name="Continue").click(); await pg.wait_for_url("**/studio"); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=O+"5-studio.png", full_page=True)
        await pg.goto(B+"/dashboard"); await pg.wait_for_timeout(3000); await pg.screenshot(path=O+"6-dashboard.png", full_page=True)
        print("errors:", errs); await b.close()
asyncio.run(main())
