import httpx, time, json, sys, os
sys.path.insert(0, "/workspace/proxy/api")
from app import config
B=config.GNANI_BASE; H={"X-API-Key-ID":config.GNANI_API_KEY}
out="/workspace/proxy/gnani_live"; R={}
def tts(name, text, model, voice, lang):
    t=time.perf_counter()
    r=httpx.post(f"{B}/api/v1/tts/inference",headers=H,timeout=60,json={"text":text,"model":model,"voice":voice,"language":lang,
      "audio_config":{"sample_rate":16000,"encoding":"linear_pcm","container":"wav"}})
    ms=round((time.perf_counter()-t)*1000)
    R[name]={"status":r.status_code,"ms":ms,"bytes":len(r.content)}
    if r.status_code==200: open(f"{out}/{name}.wav","wb").write(r.content)
    else: R[name]["err"]=r.text[:200]
tts("v25_hi","Namaste, main Hardik ka Proxy hoon. Kal shaam paanch baje free hoon.","timbre-v2.5","Nalini","hi-IN")
tts("v30_hi","Namaste, main Hardik ka Proxy hoon. Kal shaam paanch baje free hoon.","timbre-v3.0","Shivani","hi-IN")
tts("v30_wrongvoice","Test.","timbre-v3.0","Nalini","hi-IN")
tts("v30_tags","Haan bilkul! <laugh> Main aapka meeting book kar deta hoon. <sigh> Thoda busy hafta hai.","timbre-v3.0","Shivani","hi-IN")
tts("v30_ta","வணக்கம், நான் ஹார்திக்கின் ப்ராக்ஸி. நாளை மாலை ஐந்து மணிக்கு நேரம் இருக்கிறது.","timbre-v3.0","Shivani","ta-IN")
tts("v30_clone_src","Hello, this is a synthetic reference voice for testing voice cloning. It speaks clearly, at a steady pace, with simple sentences, so the model can learn its tone. One, two, three, four, five.","timbre-v3.0","Avinash","en-IN")
def stt(name,f):
    t=time.perf_counter()
    r=httpx.post(f"{B}/stt/v3",headers=H,timeout=60,files={"audio_file":(f,open(f"{out}/{f}","rb"),"audio/wav")},
      data={"model":"prisma-v3.0","language_code":"indic-auto","format":"codemix"})
    R[name]={"status":r.status_code,"ms":round((time.perf_counter()-t)*1000),"resp":r.json() if r.headers.get("content-type","").startswith("application/json") else r.text[:200]}
for n in ("v30_hi","v30_ta"):
    if os.path.exists(f"{out}/{n}.wav"): stt("stt_"+n, n+".wav")
if os.path.exists(f"{out}/v30_clone_src.wav"):
    t=time.perf_counter()
    r=httpx.post(f"{B}/api/v1/tts/voice-clone/embeddings",headers=H,timeout=90,files={"audio_file":("s.wav",open(f"{out}/v30_clone_src.wav","rb"),"audio/wav")})
    R["clone"]={"status":r.status_code,"ms":round((time.perf_counter()-t)*1000)}
    if r.status_code==200:
        j=r.json(); R["clone"]["keys"]=list(j.keys()); d=j.get("data",{}); R["clone"]["data_keys"]=list(d.keys()) if isinstance(d,dict) else str(type(d))
        emb=d.get("voice_clone_embedding") if isinstance(d,dict) else None
        if emb:
            R["clone"]["shape"]=emb.get("shape"); json.dump(emb,open(f"{out}/synthetic_embedding.json","w"))
            t=time.perf_counter()
            r2=httpx.post(f"{B}/api/v1/tts/inference",headers=H,timeout=60,json={"text":"Haan ji, yeh cloned synthetic awaaz hai.","model":"vachana-vc-v1","speaker_embedding":emb,"language":"hi-IN",
              "audio_config":{"sample_rate":16000,"encoding":"linear_pcm","container":"wav"}})
            R["clone_tts"]={"status":r2.status_code,"ms":round((time.perf_counter()-t)*1000),"bytes":len(r2.content)}
            if r2.status_code==200: open(f"{out}/clone_out.wav","wb").write(r2.content)
            else: R["clone_tts"]["err"]=r2.text[:200]
    else: R["clone"]["err"]=r.text[:200]
print(json.dumps(R,indent=1,ensure_ascii=False))
