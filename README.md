<div align="center">

<img src="https://twynai.vercel.app/brand/mark.svg" alt="Twyn AI logo" width="96" height="96" />

# Twyn AI

### Your AI persona, on call.

Share one link and visitors can **chat or talk** to your AI persona.
It answers from your own knowledge, in your cloned voice, in the caller's language.
It also books meetings and captures leads.

[![Live](https://img.shields.io/badge/live-twynai.vercel.app-000000?style=for-the-badge)](https://twynai.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

Built for the **Gnani AI Internship Challenge**.

[Features](#features) · [Architecture](#architecture) · [Gnani APIs](#gnani-apis-used) · [Latency](#latency) · [Setup](#setup) · [Deploy](#deploy) · [Tests](#tests)

</div>

---

## Features

| | |
|---|---|
| **One link** | Every persona lives at `/p/<handle>`. Share it anywhere. |
| **Chat and Talk** | Text chat or live voice conversation with streaming audio. |
| **Your knowledge** | Answers come from your own text and PDFs through multilingual RAG. |
| **Your voice** | A 5 to 30 s sample is enough to clone your voice. |
| **Speaks the caller's language** | Auto language detection, Hinglish handling, and a rewrite pass if the LLM answers in the wrong language. |
| **Books meetings** | Reads Google Calendar free/busy and creates events, with a mock fallback. |
| **Captures leads** | Collects visitor details through tool calls during the conversation. |
| **Owner takeover** | Watch conversations live in the Studio and jump in at any time. |

---

## Stack

| Layer | Tech |
|---|---|
| **Web** (`web/`) | Next.js 15 (App Router, TypeScript), Tailwind v4, Framer Motion |
| **API** (`api/`) | FastAPI with WebSockets, SQLAlchemy (SQLite now, Supabase/Postgres via `DATABASE_URL`) |
| **Voice** | Gnani Prisma v3 STT (`/stt/v3`), Timbre TTS, voice-clone embeddings |
| **LLM** | NVIDIA NIM, Groq, OpenRouter, Meta Model API, then a built-in mock (OpenAI-compatible tool calls) |
| **Calendar** | Google freeBusy/events, with a mock fallback |

---

## Architecture

```
Browser (Next.js, /p/<handle>)                 FastAPI (api/, port 8100)
  Chat  ── POST /api/p/{h}/chat ─────────────►  handle_turn: RAG (fastembed, multilingual) -> LLM with tools
  Talk  ── POST /api/p/{h}/voice/stream ─────►  Gnani Prisma STT -> NVIDIA/Groq/OpenRouter/Meta tokens (streamed) -> Gnani Timbre SSE
        ◄─ NDJSON: transcript, text, audio (PCM16 24 kHz), done{latency}     tools: get_slots, book, capture_lead
Studio/Dashboard ── WS /ws/conversations/{id} ►  live view + owner takeover
                                                SQLite (SQLAlchemy; Postgres/Supabase via DATABASE_URL)
```

**Onboarding (7 steps):** handle, basics, knowledge (text/PDF), voice clone, calendar, availability, review and publish.

**Language handling**
- Language follows the caller: Prisma's detected language plus a Hinglish rule (Devanagari with 2+ English words).
- A rewrite pass runs if the LLM answers in the wrong language.
- Slots are rendered server-side in the caller's language and repaired if the model garbles them.

---

## Gnani APIs used

Base URL: `https://api.vachana.ai` · Auth header: `X-API-Key-ID`

| Purpose | Endpoint | Notes |
|---|---|---|
| Speech to text | `POST /stt/v3` (Prisma v3.0) | `indic-auto` + codemix, clips of 30 s or less (longer audio is split) |
| Text to speech (stream) | `POST /api/v1/tts/sse` (Timbre v3.0, voice Shivani) | Raw PCM16 chunks, first chunk in about 0.56 s |
| Text to speech (batch) | Timbre v2.5 (Nalini) / v3.0 (Shivani) | Voice is matched to the model. v3.0 supports audio tags like `<laugh>` |
| Voice clone | `POST /api/v1/tts/voice-clone/embeddings` | 5 to 30 s sample gives a `[1,768]` embedding, used with `vachana-vc-v1` |

429 is retried with backoff. 402 and 5xx fall back to browser speech and are reported in the response's `fallback` list. No Gnani Agent Builder is used.

---

## Voice pipeline

- **STT:** audio longer than 30 s (the Prisma REST limit) is split and the chunks are transcribed in parallel. One retry on timeouts, 5xx and 429. On failure the turn continues from the text hint instead of erroring.
- **TTS:** the reply is split into sentences and each one is synthesized in parallel. The browser plays them as a queue, so the first sentence starts while the rest are still queued. If Gnani errors, the reply falls back to the browser's speech engine.
- **Telemetry:** every voice response carries `latency` (`stt_ms`, `llm_ms`, `tts_ms`, `total_ms`) and a `fallback` list. The Talk view shows Hear, Think, Speak and First audio.
- **Streaming path** (`/voice/stream`, used by the Talk tab): the first sentence goes to Timbre SSE while the LLM is still writing. A cached filler line plays while a calendar tool runs.

---

## Latency

Measured live on 30 Oct 2026.

| Turn | First audio | Full turn |
|---|---|---|
| Batch REST (before) | 6.5 to 9.3 s | 6.5 to 9.3 s |
| Streaming, Hinglish | **1.85 to 2.1 s** | 6.5 to 7.1 s |
| Streaming, Tamil | **2.0 to 2.5 s** | 8.6 to 8.7 s |

Full numbers in [`gnani_live/RESULTS.md`](gnani_live/RESULTS.md).

---

## Setup

```bash
cp .env.example api/.env        # fill in the keys you have; anything missing runs in mock mode
python -m venv .venv && .venv/bin/pip install -r api/requirements.txt pytest
cd web && npm install && echo NEXT_PUBLIC_API_URL=http://localhost:8100 > .env.local
```

## Run

```bash
# terminal 1: API
cd api && ../.venv/bin/uvicorn app.main:app --port 8100

# terminal 2: web
cd web && npx next dev -p 3100
```

Open <http://localhost:3100>. The demo persona is at `/p/hardik`. Use the dev sign-in on `/login`.
`GET /api/health` shows which services are real and which are mocked.

## Environment

See `.env.example`. Mock modes:

| Missing | Fallback |
|---|---|
| `GNANI_API_KEY` | Mock STT/TTS tone |
| Google credentials | Mock calendar slots (11:00, 15:00 and 17:00 IST) |
| LLM keys | Rule-based mock |

---

## Security and limits

- Public turns are rate-limited per IP (`RATE_LIMIT_PER_MIN`, default 30) to protect Gnani credits. The API answers 429.
- Uploads are size-capped (`MAX_AUDIO_BYTES` 8 MB, `MAX_DOC_BYTES` 10 MB), filenames are sanitized, and chat text is capped at `MAX_TEXT_CHARS`.
- Dev sign-in is for local demos. Set `ALLOW_DEV_LOGIN=0` in production once Google sign-in is configured.
- Keys live only in `api/.env` (gitignored) and are never logged.

### LLM provider order

NVIDIA, then Groq, OpenRouter, Meta. A provider failure before output starts falls through to the next configured provider.

| Provider | Default | Notes |
|---|---|---|
| NVIDIA | `openai/gpt-oss-20b` | Low reasoning effort, 700-token output cap |
| Meta | `muse-spark-1.3` | 700-token output cap, guarded by a persistent app-side monthly budget (`META_MONTHLY_BUDGET_USD`, default `$30`). Calls that could exceed it are skipped |

Override model IDs in `api/.env`.

---

## Deploy

The web app is live at [twynai.vercel.app](https://twynai.vercel.app).

### API (Docker, any host: Fly, Railway, Render, Cloud Run)

```bash
docker build -t proxy-api ./api
docker run -p 8100:8100 --env-file .env -v proxy-data:/data proxy-api
```

The image bakes in the embedding model, runs as a non-root user, keeps SQLite and uploads on the `/data` volume, and has a healthcheck on `/api/health`.

- For Postgres, set `DATABASE_URL=postgresql+psycopg://...`
- Set `CORS_ORIGINS=https://your-web.vercel.app`
- Set `WEB_ORIGIN` to the web URL (used for OAuth redirects)

### Web (Vercel)

Import the repo with root directory `web/` and set `NEXT_PUBLIC_API_URL` to the API URL. `web/vercel.json` sets security headers and allows the microphone on the page. `next build` passes locally.

---

## Tests

```bash
# retrieval, language detection, voice fallbacks, rate limit, upload safety
cd api && ../.venv/bin/python -m pytest -q

# real LLM replies stay in the caller's language
LIVE=1 ../.venv/bin/python -m pytest -q -k live
```

---

## Brand

<img src="https://twynai.vercel.app/brand/mark.svg" alt="Twyn mark" width="48" height="48" align="left" />

Brand assets live in `web/public/brand/` (`mark.svg`, `icon.svg`, `wordmark-light/dark.svg`, `favicon.ico`, `icon-192/512`, `apple-touch-icon`, `og.png`) and are generated by `brand_src/build.py`.

<br clear="left" />

---

<div align="center">

Built by [Hardik Gupta](https://github.com/hardikguptaofficialgit)

</div>
