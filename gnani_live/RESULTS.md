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
