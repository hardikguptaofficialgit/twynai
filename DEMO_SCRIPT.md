# Proxy: 60-second demo script

Goal: show a working AI persona that answers callers in their own language with Gnani Prisma (STT) and Timbre (TTS), and books a slot. Record at 1440x900 with screen and mic audio. Tags for the post: #GnaniAI #GreatIndianAIInternshipChallenge

| Time | On screen | Voiceover / action |
|---|---|---|
| 0:00-0:06 | Landing page | "Freelancers miss calls. Proxy picks up for you, in any Indian language." |
| 0:06-0:14 | Studio: persona, rates, Availability card | "I give it my bio, rates, documents and working hours. It answers only from what I gave it." |
| 0:14-0:30 | Public page /p/hardik, Talk tab. Say: "Bhai, kya Hardik is week ek quick call ke liye free hai? Thursday shaam ko slot hai kya?" | Proxy starts speaking in about 2 s, in Hinglish, with real open slots (Timbre SSE). Point at the First audio pill. |
| 0:30-0:42 | Same page. Say: "வணக்கம், ஹார்திக் இந்த வாரம் ஒரு சிறிய அழைப்புக்கு நேரம் இருக்கிறதா?" | Prisma detects Tamil, Proxy replies in Tamil. "No language picker. It just follows the caller." |
| 0:42-0:50 | Chat: "Book Tuesday 10:45", then the confirmation | "It books into my calendar and captures the lead." |
| 0:50-0:57 | Dashboard: conversations (voice + chat), leads, bookings, takeover toggle | "I see every conversation and can take over any time." |
| 0:57-1:00 | Logo + URL | "Proxy. Your voice, always on. Built on Gnani." |

Tips
- Use the Hinglish + Tamil lines above; both were tested end to end on 30 Oct 2026 with streaming: first audio in about 2 s, full turn 6.5-8.7 s.
- Do a warm-up turn before recording so the first request isn't cold.
- If a voice turn ever fails, the page falls back to browser speech and says so; re-take rather than ship that clip.
- Category fit: Hinglish / code-mixed, and best 60-second demo.
- Pre-flight: API on 8100, web on 3100, `GET /api/health` shows gnani and groq as live (not mock). Each take uses a few Gnani credits; the public page is rate-limited to 30 turns/min per IP.
- Once Hardik records his own 15-30 s clip in onboarding step 4, re-shoot 0:14-0:42 in his cloned voice (strong "Demo Day Drop" moment).
- Optional 5 s cut-in: onboarding voice-clone preview playing his voice.
