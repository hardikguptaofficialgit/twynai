import httpx, json, sys, base64, time
sys.path.insert(0, "api"); from app import config
B=config.GNANI_BASE; H={"X-API-Key-ID":config.GNANI_API_KEY}; d="gnani_live"
Q={"q_hinglish":("Bhai, kya Hardik is week ek quick call ke liye free hai? Thursday shaam ko slot hai kya?","hi-IN"),
   "q_tamil":("வணக்கம், ஹார்திக் இந்த வாரம் ஒரு சிறிய அழைப்புக்கு நேரம் இருக்கிறதா?","ta-IN")}
out={}
for n,(t,l) in Q.items():
    import os
    if os.path.exists(f"{d}/{n}.wav"): r=type("R",(),{"content":open(f"{d}/{n}.wav","rb").read(),"raise_for_status":lambda self:None})()
    else: r=httpx.post(f"{B}/api/v1/tts/inference",headers=H,timeout=60,json={"text":t,"model":"timbre-v3.0","voice":"Devansh","language":l,"audio_config":{"sample_rate":16000,"encoding":"linear_pcm","container":"wav"}})
    r.raise_for_status(); open(f"{d}/{n}.wav","wb").write(r.content)
    t0=time.perf_counter()
    v=httpx.post("http://localhost:8100/api/p/hardik/voice",timeout=120,files={"audio":("turn.wav",r.content,"audio/wav")}).json()
    for i,s in enumerate(v.get("segments") or []): open(f"{d}/{n}_reply{i}.wav","wb").write(base64.b64decode(s))
    out[n]={k:v.get(k) for k in ("transcript","language","reply","provider","mock_stt","mock_tts","fallback","latency")}|{"segments":len(v.get("segments") or []),"wall_ms":round((time.perf_counter()-t0)*1000)}
print(json.dumps(out,indent=1,ensure_ascii=False))
