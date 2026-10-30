import httpx, json, time, sys
for n in sys.argv[1:] or ["q_hinglish","q_tamil"]:
    t0=time.perf_counter(); first_audio=None; text=""; done=None; nb=0
    with httpx.stream("POST","http://localhost:8100/api/p/hardik/voice/stream",timeout=120,files={"audio":("turn.wav",open(f"gnani_live/{n}.wav","rb").read(),"audio/wav")}) as r:
        for line in r.iter_lines():
            e=json.loads(line)
            if e["type"]=="audio":
                nb+=len(e["pcm"])*3//4
                if first_audio is None: first_audio=round((time.perf_counter()-t0)*1000)
            elif e["type"]=="text": text+=e["delta"]
            elif e["type"] in("done","transcript","speak_fallback","error"): print(n, e["type"], json.dumps({k:v for k,v in e.items() if k not in("type","tools")},ensure_ascii=False))
    print(n,"client_first_audio_ms",first_audio,"audio_s",round(nb/48000,1),"wall_ms",round((time.perf_counter()-t0)*1000))
