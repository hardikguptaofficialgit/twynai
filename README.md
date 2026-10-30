# Proxy: your AI persona, on call

Share one link (`/p/<handle>`) and visitors can chat or talk to your AI persona. It answers from your own knowledge, in your cloned voice and in the caller's language, and it books meetings and captures leads. Built for the Gnani AI Internship Challenge.

## Stack
- web/: Next.js 15 (App Router, TS), Tailwind v4, Framer Motion
- api/: FastAPI with WebSockets, SQLAlchemy (SQLite now, Supabase/Postgres via DATABASE_URL)
- Voice: Gnani Prisma v3 STT (`/stt/v3`), Timbre TTS, voice-clone embeddings
- LLM: Groq, then OpenRouter, then a built-in mock (OpenAI-compatible tool calls)
- Calendar: Google freeBusy/events, with a mock fallback

## Setup
```
cp .env.example .env            # fill in the keys you have; anything missing runs in mock mode
python -m venv .venv && .venv/bin/pip install fastapi uvicorn sqlalchemy httpx python-multipart pypdf
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
- Next step once a key is available: switch to Gnani's STT Realtime WebSocket and TTS Streaming (SSE) for sub-second first audio.

## Tests
```bash
cd api && ../.venv/bin/python -m pytest -q          # retrieval thresholds, language detection, voice fallbacks
LIVE=1 ../.venv/bin/python -m pytest -q -k live      # real LLM replies stay in the caller's language
```
