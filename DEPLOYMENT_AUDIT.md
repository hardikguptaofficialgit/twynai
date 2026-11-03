# Twyn AI production deployment audit

## Scope and observed architecture

- `web/` is a Next.js 15 App Router application intended for Vercel. It calls `NEXT_PUBLIC_API_URL`, derives/accepts `NEXT_PUBLIC_WS_URL`, uses bearer tokens from local storage, and opens `/ws/conversations/{id}` for live updates.
- `api/` is a FastAPI application at `app.main:app`, served by Uvicorn. Routes include Google login/callback, session login/logout, persona/studio APIs, public chat/booking, voice REST and NDJSON streaming, document/knowledge uploads, avatar/voice uploads, health, and conversation WebSockets.
- SQLAlchemy 2 models are in `api/app/db.py`. The existing schema and `Base.metadata.create_all`/small compatibility additions are preserved. `DATABASE_URL` is normalized to Psycopg 3 with `sslmode=require` for Neon URLs.
- FastEmbed uses `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, ONNX-backed local embeddings, JSON vectors in the `chunks` table, and Hinglish glossing before similarity search.
- `api/app/storage.py` already supports private S3-compatible object storage with local disk fallback. R2 variable aliases were added without removing the old names. New Cloud Run instances must use R2 because `/tmp` is ephemeral.
- AI/voice/calendar integrations are outbound HTTP clients already present: Meta, NVIDIA, Groq, OpenRouter, mock fallback; Gnani Prisma/Timbre/voice cloning; Google Calendar v3.

## Required changes implemented

- Python 3.13 Cloud Run container, port 8080, non-root user, baked FastEmbed cache, health check, no reload, and Uvicorn graceful SIGTERM behavior.
- Cloud Run template and an explicit PowerShell deployment script targeting project `ultimate-rig-513313-j5`, region `asia-south1`, 1 vCPU, 2 GiB, request CPU, min 0/max 1, 900-second timeout.
- Neon connection pool defaults changed to 2 connections and no overflow per instance; override with `DB_POOL_SIZE`/`DB_MAX_OVERFLOW` only after checking Neon limits.
- CORS is explicit, credential-safe, and defaults to `WEB_ORIGIN`; wildcard credentials are not allowed. Local origins can be added explicitly.
- Dashboard WebSockets can pass the existing bearer session as a query parameter; invalid owner tokens are rejected. Public visitor sockets remain compatible.
- R2 names `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_ENDPOINT` are documented and accepted.
- Original uploaded documents now create additive `document_assets` metadata records, are stored under private R2 keys, can be downloaded only through owner authorization and short-lived signed URLs, and are deleted with their RAG chunks.
- WebSocket clients now reconnect with bounded exponential backoff; the studio reloads persisted conversation state after reconnect.

## Problems and risks remaining

- The actual Vercel-provided production hostname is not discoverable from this checkout. It must be copied from Vercel and used verbatim as `WEB_ORIGIN` and a `CORS_ORIGINS` entry. Do not use the old Cloudflare/custom-domain values in `api/deploy-server.sh`.
- The Cloud Run `run.app` hostname does not exist until deployment. It must be inserted into `GOOGLE_REDIRECT_URI`, then registered in Google OAuth, and set as the frontend API/WS URL.
- Cloud Run local storage is temporary. New document, avatar, and audio writes must use R2; legacy local path references need a separately approved migration if production data exists there. No destructive migration was run.
- The in-memory WebSocket hub is safe only for the requested max-one-instance test. Scaling beyond one instance requires shared pub/sub or a managed realtime layer.
- `init_db()` performs compatibility DDL at startup. Do not use it as a replacement for the project’s migration process in production.
- The current public avatar endpoint streams bytes through FastAPI. It is not public R2 access, but high traffic increases Cloud Run egress/CPU. Document retrieval uses signed URLs for R2; avatars/audio retain their existing authenticated/proxied behavior.
- Dev login must remain disabled in production. The OAuth session token is currently returned in a redirect query parameter; validate this flow and consider a secure cookie/token exchange in a later security hardening change.

## Environment variables

See `api/.env.production.example` and `web/.env.example`. Production secrets should be Secret Manager references. The complete backend variable set is: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEB_ORIGIN`, `CORS_ORIGINS`, `GNANI_API_KEY`, `GNANI_BASE_URL`, `GNANI_TTS_MODEL`, `GNANI_DEFAULT_VOICE`, `META_API_KEY`, `META_MODEL`, `META_MONTHLY_BUDGET_USD`, `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_REGION`, `ALLOW_DEV_LOGIN`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `EMBED_MODEL`, `RAG_MIN_SCORE`, `VECTOR_STORE`, `RATE_LIMIT_PER_MIN`, `MAX_AUDIO_BYTES`, `MAX_IMAGE_BYTES`, `MAX_DOC_BYTES`, `MAX_TEXT_CHARS`, `SESSION_DAYS`, `PORT`, and `UPLOAD_DIR`. `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are the only public frontend variables. There is no separate `SESSION_SECRET` in this codebase; Google client secret signs OAuth state and database sessions are random IDs stored in Neon.

## Security findings

- Never commit `api/.env`, `web/.env.production` with real values, keys, OAuth secrets, database URLs, or service-account files.
- Keep the R2 bucket private and grant the runtime identity only object read/write/delete on that bucket; do not grant project-owner/editor roles.
- Grant the Cloud Run runtime identity `roles/secretmanager.secretAccessor` only on the named secret versions and a narrowly scoped R2 S3 token with object read/write/delete only for the Twyn bucket prefix. Build/deploy identity and runtime identity should be separate.
- Register only the exact Vercel origin and Cloud Run OAuth callback. Do not use `*` with credentials.
- Restrict public upload sizes and rate limits as already implemented; monitor Gnani/LLM spend separately.

## Cost risks and tests

Potential charges include Cloud Run CPU/memory/request/egress outside free allowances, Artifact Registry storage/egress, Cloud Build minutes, Secret Manager operations/storage, R2 storage/operations/egress, Neon usage, provider API calls, and Google Calendar/Maps-related quotas. Promotional credits and budget alerts do not guarantee a zero bill.

Run the test checklist in `DEPLOYMENT.md`. Local R2-compatible storage flow, upload metadata, authorized retrieval, and deletion were verified with the local fallback; real R2, Neon, OAuth, Gnani, provider, Docker, and Cloud Run tests remain unavailable until credentials/services are supplied.

## Second-audit findings

- Docker CLI is installed, but Docker Desktop's `desktop-linux` engine is unavailable. No Docker build or container startup result is claimed.
- The existing `.env` was inspected by variable name only; secret values were not printed.
- `init_db()` is additive (`create_all` plus existing persona compatibility columns). There is no Alembic migration directory in the repository. The new `document_assets` table is additive and does not remove or rewrite existing chunks.
- OAuth login and Calendar authorization use separate scope decisions in the existing callback flow. The production callback cannot be finalized until the generated Cloud Run URL is known.
- The in-memory hub remains a one-instance limitation. Conversation messages and takeover state are persisted in Neon, so reconnecting clients reload state; cross-instance realtime is not supported.
