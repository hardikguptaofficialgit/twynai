# Kadi: your AI persona, on call

Share one link (`/p/<handle>`) and visitors can chat or talk to your AI persona. It answers from your own knowledge, in your cloned voice and in the caller's language, and it books meetings and captures leads. Built for the Gnani AI Internship Challenge.

## Stack
- web/: Next.js 15 (App Router, TS), Tailwind v4, Framer Motion
- api/: FastAPI with WebSockets, SQLAlchemy (SQLite now, Supabase/Postgres via DATABASE_URL)
- Voice: Gnani Prisma v3 STT (`/stt/v3`), Timbre TTS, voice-clone embeddings
- LLM: Groq, then OpenRouter, then a built-in mock (OpenAI-compatible tool calls)
- Calendar: Google freeBusy/events, with a mock fallback

## Architecture
```
Browser (Next.js, /p/<handle>)                 FastAPI (api/, port 8100)
  Chat  ── POST /api/p/{h}/chat ─────────────►  handle_turn: RAG (fastembed, multilingual) -> LLM with tools
  Talk  ── POST /api/p/{h}/voice/stream ─────►  Gnani Prisma STT -> Groq tokens (streamed) -> Gnani Timbre SSE
        ◄─ NDJSON: transcript, text, audio (PCM16 24 kHz), done{latency}     tools: get_slots, book, capture_lead
Studio/Dashboard ── WS /ws/conversations/{id} ►  live view + owner takeover
                                                SQLite (SQLAlchemy; Postgres/Supabase via DATABASE_URL)
```
- Onboarding (7 steps): handle, basics, knowledge (text/PDF), voice clone, calendar, availability, review and publish.
- Language follows the caller: Prisma's detected language plus a Hinglish rule (Devanagari with 2+ English words), and a rewrite pass if the LLM answers in the wrong language.
- Slots are rendered server-side in the caller's language and repaired if the model garbles them.

## Gnani APIs used
| Purpose | Endpoint | Notes |
|---|---|---|
| Speech to text | `POST /stt/v3` (Prisma v3.0) | `indic-auto` + codemix, clips of 30 s or less (longer audio is split) |
| Text to speech (stream) | `POST /api/v1/tts/sse` (Timbre v3.0, voice Shivani) | raw PCM16 chunks, first chunk in about 0.56 s |
| Text to speech (batch) | Timbre v2.5 (Nalini) / v3.0 (Shivani) | voice is matched to the model; v3.0 supports audio tags like `<laugh>` |
| Voice clone | `POST /api/v1/tts/voice-clone/embeddings` | 5-30 s sample gives a [1,768] embedding, used with `vachana-vc-v1` |

Base URL `https://api.vachana.ai`, header `X-API-Key-ID`. 429 is retried with backoff; 402/5xx fall back to browser speech and are reported in the response's `fallback` list. No Gnani Agent Builder is used.

## Latency (live, 30 Oct 2026)
| Turn | First audio | Full turn |
|---|---|---|
| Batch REST (before) | 6.5-9.3 s | 6.5-9.3 s |
| Streaming, Hinglish | 1.85-2.1 s | 6.5-7.1 s |
| Streaming, Tamil | 2.0-2.5 s | 8.6-8.7 s |

Full numbers in `gnani_live/RESULTS.md`.

## Security and limits
- Public turns are rate-limited per IP (`RATE_LIMIT_PER_MIN`, default 30) to protect Gnani credits; the API answers 429.
- Uploads are size-capped (`MAX_AUDIO_BYTES` 8 MB, `MAX_DOC_BYTES` 10 MB), filenames are sanitized, chat text is capped at `MAX_TEXT_CHARS`.
- Dev sign-in is for local demos; set `ALLOW_DEV_LOGIN=0` in production once Google sign-in is configured.
- Keys live only in `api/.env` (gitignored) and are never logged.

## Setup
```
cp .env.example api/.env        # fill in the keys you have; anything missing runs in mock mode
python -m venv .venv && .venv/bin/pip install -r api/requirements.txt pytest
cd web && npm install && echo NEXT_PUBLIC_API_URL=http://localhost:8100 > .env.local
```
## Run
```
cd api && ../.venv/bin/uvicorn app.main:app --port 8100
cd web && npx next dev -p 3100
```
Open http://localhost:3100. The demo persona is at /p/hardik. Use the dev sign-in on /login.
`GET /api/health` shows which services are real and which are mocked.

## Env
See `.env.example`. Mock modes: no GNANI_API_KEY means a mock STT/TTS tone, no Google creds means mock calendar slots (11:00, 15:00 and 17:00 IST), and no LLM keys means a rule-based mock.

## Deploy (not deployed yet)

**API (Docker, any host: Fly, Railway, Render, Cloud Run)**
```bash
docker build -t proxy-api ./api
docker run -p 8100:8100 --env-file .env -v proxy-data:/data proxy-api
```
The image bakes in the embedding model, runs as a non-root user, keeps SQLite and uploads on the `/data` volume, and has a healthcheck on `/api/health`. For Postgres, set `DATABASE_URL=postgresql+psycopg://...`. Set `CORS_ORIGINS=https://your-web.vercel.app` and `WEB_ORIGIN` to the web URL (used for OAuth redirects).

**Web (Vercel)**: import the repo with root directory `web/`, and set `NEXT_PUBLIC_API_URL` to the API URL. `web/vercel.json` sets security headers and allows the microphone on the page. `next build` passes locally.

## Voice pipeline
- STT: audio longer than 30 s (the Prisma REST limit) is split and the chunks are transcribed in parallel. There is one retry on timeouts, 5xx and 429. On failure the turn continues from the text hint instead of erroring.
- TTS: the reply is split into sentences and each one is synthesized in parallel. The browser plays them as a queue, so the first sentence starts while the rest are still queued. If Gnani errors, the reply falls back to the browser's speech engine.
- Every voice response carries `latency` (`stt_ms`, `llm_ms`, `tts_ms`, `total_ms`) and a `fallback` list. The Talk view shows Hear, Think, Speak and First audio.
- Streaming path (`/voice/stream`, used by the Talk tab): the first sentence goes to Timbre SSE while the LLM is still writing; a cached filler line plays while a calendar tool runs.

## Tests
```bash
cd api && ../.venv/bin/python -m pytest -q          # retrieval, language detection, voice fallbacks, rate limit, upload safety
LIVE=1 ../.venv/bin/python -m pytest -q -k live      # real LLM replies stay in the caller's language
```

## Brand

Kadi (कड़ी) means "link" in Hindi: one link in a chain that connects a caller to you. Brand assets live in `web/public/brand/` (mark.svg, icon.svg, wordmark-light/dark.svg, favicon.ico, icon-192/512, apple-touch-icon, og.png) and are generated by `brand_src/build.py`.
