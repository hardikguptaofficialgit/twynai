import asyncio, json
from playwright.async_api import async_playwright
B="http://localhost:3100"; O="/workspace/proxy/shots/"; G="/workspace/proxy/gnani_live/"
async def run(p, name, wav, secs):
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",f"--use-file-for-fake-audio-capture={G}{wav}%noloop","--autoplay-policy=no-user-gesture-required"])
    pg = await b.new_page(viewport={"width":1440,"height":900}); errs=[]; res={}
    pg.on("pageerror", lambda e: errs.append(str(e)))
    async def onresp(r):
        if r.url.endswith("/voice"):
            try: j=await r.json(); res.update({k:j.get(k) for k in ("transcript","language","reply","fallback","latency")})
            except Exception: pass
    pg.on("response", onresp)
    await pg.goto(B+"/p/hardik"); await pg.wait_for_timeout(1500)
    await pg.get_by_text("Talk", exact=True).click(); await pg.wait_for_timeout(1000)
    mic = pg.get_by_label("Talk to Proxy"); await mic.click(); await pg.wait_for_timeout(secs*1000); await mic.click()
    for _ in range(40):
        await pg.wait_for_timeout(500)
        if res: break
    await pg.wait_for_timeout(2500); await pg.screenshot(path=O+name)
    print(name, json.dumps(res, ensure_ascii=False), "errors:", errs); await b.close()
async def main():
    async with async_playwright() as p:
        await run(p, "3c-voice-hinglish.png", "q_hinglish.wav", 7)
        await asyncio.sleep(3)
        await run(p, "3d-voice-tamil.png", "q_tamil.wav", 7)
asyncio.run(main())
