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
