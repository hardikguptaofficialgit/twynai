# Gnani live test, 30 Oct 2026 (IST)

Scripts: `probe.py` (model checks), `e2e.py` (full /api/p/hardik/voice turns). Audio outputs are gitignored.

## Model checks (direct API, 16 kHz WAV)
| Call | Result | Latency |
|---|---|---|
| Timbre v2.5, Nalini, hi-IN | 200 | 2.23 s |
| Timbre v3.0, Shivani, hi-IN | 200 | 2.18 s |
| Timbre v3.0 with a v2.5 voice (Nalini) | 400, voice not supported (this was our old default: fixed) | 0.31 s |
| Timbre v3.0 audio tags `<laugh>`, `<sigh>` | 200 | 2.84 s |
| Timbre v3.0, Shivani, ta-IN | 200 | 2.53 s |
| Prisma v3.0 indic-auto codemix, Hindi clip | "नमस्ते, मैं हार्दिक का proxy हूँ। कल शाम पाँच बजे free हूँ।" hi-IN | 1.10 s (server 0.36 s) |
| Prisma v3.0 indic-auto codemix, Tamil clip | Tamil transcript, ta-IN | 0.86 s (server 0.34 s) |
| Voice-clone embedding from a Timbre-generated synthetic clip (~14 s) | 200, shape [1, 768] | 1.95 s |
| vachana-vc-v1 TTS with that embedding | 200 | 2.77 s |

## End-to-end voice turns (STT -> Groq LLM -> Timbre v3.0)
| Caller | Detected | STT | LLM | TTS | Total |
|---|---|---|---|---|---|
| Hinglish (Devanagari + English words) | hinglish | 0.8 s | 2.1-2.2 s | 4.0-4.6 s | 7.1-7.5 s |
| Tamil | ta-IN | 1.0-1.7 s | 1.6-1.9 s | 3.0-6.3 s | 6.5-9.3 s |

TTS is the bottleneck. The next step is Timbre SSE streaming so first audio plays in about 1 s.

## Round 3: streaming voice (Timbre SSE, 30 Oct 2026)
Endpoint `POST /api/p/{handle}/voice/stream` (NDJSON). Prisma STT, then Groq tokens streamed. The first sentence (or a cached "checking the calendar" filler when a tool runs) goes straight to Timbre `/api/v1/tts/sse` (raw PCM16 at 24 kHz). The browser schedules the chunks with Web Audio.

| Turn | STT | First LLM token | First audio (server) | First audio (browser) | Full turn |
|---|---|---|---|---|---|
| Hinglish (old, batch REST) | 0.7 s | n/a | 6.5–9.3 s | 6.5–9.3 s | 6.5–9.3 s |
| Hinglish, stream | 0.71 s | 1.98 s | 1.84 s | 1.85 s | 6.5 s |
| Tamil, stream | 1.62 s | 2.73 s | 2.48 s | 2.51 s | 8.7 s |
| Hinglish, stream (UI run) | 0.82 s | 2.28 s | 2.10 s | 2.1 s | 7.1 s |
| Tamil, stream (UI run) | 0.97 s | 2.04 s | 1.98 s | n/a | 8.6 s |

On its own, Timbre SSE delivers its first chunk in 0.56 s. First audio comes about 1.1 s after the transcript is ready. Measured from the end of the caller's speech, the remaining floor is STT (0.7–1.6 s) plus one LLM tool round.

Clone: the 14 s synthetic clip `v30_clone_src.wav` produced an embedding of shape [1,768] in 1.45 s. The preview line took 4.2 s on the first call and 3 ms when cached.
