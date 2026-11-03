# Twyn AI deployment guide

No APIs, billing links, secrets, or billable resources are enabled by this repository. The commands below are operator commands and must be run only after approval.

## 1. Preflight

```powershell
gcloud auth list
gcloud config set project ultimate-rig-513313-j5
gcloud services list --enabled --filter="name:(run.googleapis.com OR artifactregistry.googleapis.com OR cloudbuild.googleapis.com OR secretmanager.googleapis.com)"
```

If an API is missing, stop and request approval before running `gcloud services enable`.

Confirm the existing Vercel production hostname in Vercel. Keep it unchanged; do not add DNS or a custom domain.

## 2. Database migration (operator-owned)

The API does not run schema DDL or seed data during application startup. Run migrations explicitly from `api/` using the same `DATABASE_URL` that will be supplied to Cloud Run. Do not run these commands against Neon until a verified backup and an approved maintenance window exist.

### Read-only production preflight

Before any `stamp` or migration command, stop the application rollout and run the strictly read-only preflight:

```powershell
cd api
$env:DATABASE_URL = '<approved Neon connection string with sslmode=require>'
..\.venv\Scripts\python.exe scripts/neon_preflight.py
```

The preflight checks PostgreSQL connectivity, SSL/TLS, `alembic_version`, any recorded revision, all ten expected tables, columns, types, nullability, defaults, primary keys, foreign keys, unique constraints, indexes, the `avatar_path` NULL count, and the baseline schema match. It never stamps, migrates, inserts, updates, deletes, or alters anything.

Operator checkpoints:

1. Stop if connectivity, SSL, table, object, baseline, or NULL-count checks fail.
2. Confirm a tested Neon backup/PITR restore path.
3. Confirm the preflight schema matches `20261103_0001` and that any existing `alembic_version` state is known.
4. Obtain explicit approval to write the Alembic revision and run the migration.

For an existing database that has the current Twyn schema, record the current revision without recreating tables, then apply the nullability migration:

```powershell
cd api
$env:DATABASE_URL = '<approved Neon connection string with sslmode=require>'
..\.venv\Scripts\python.exe -m alembic stamp 20261103_0001
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m alembic current
```

The migration verifies `personas.avatar_path` NULL values, replaces any with an empty string, and then applies `NOT NULL`. `stamp` is safe only after the existing schema has been independently verified against `20261103_0001`; never stamp an unknown database.

For a new database, use:

```powershell
cd api
$env:DATABASE_URL = '<approved PostgreSQL connection string with sslmode=require>'
..\.venv\Scripts\python.exe -m alembic upgrade head
```

Rollback of the nullability migration, if required:

```powershell
cd api
$env:DATABASE_URL = '<same approved connection string>'
..\.venv\Scripts\python.exe -m alembic downgrade 20261103_0001
```

Rollback does not restore NULL values that were normalized; use the verified database backup for data restoration. Do not use `downgrade base` against production because it drops the schema.

Seed data is separate from schema initialization and is never run by API startup. If the demo persona is intentionally needed, run it explicitly from `api/` after migration:

```powershell
..\.venv\Scripts\python.exe -m app --seed-demo
```

Embedding rewrites are opt-in and potentially expensive:

```powershell
..\.venv\Scripts\python.exe -m app --seed-demo --reindex
```

## 3. Build and local verification

```powershell
cd api
..\.venv\Scripts\python.exe -m pytest -q
docker build -t twyn-api:local .
docker run -d --rm --name twyn-api-test --user 10001 -p 8080:8080 -e DATABASE_URL=sqlite:////tmp/twyn-test.db -e UPLOAD_DIR=/tmp/twyn-uploads -e EMBED_MODEL=hash -e ALLOW_DEV_LOGIN=1 -e WEB_ORIGIN=http://localhost:3100 -e CORS_ORIGINS=http://localhost:3100 twyn-api:local
curl http://localhost:8080/api/health
docker inspect --format '{{.Config.User}}' twyn-api-test
docker exec twyn-api-test python --version
docker exec twyn-api-test python -c "import fastembed, onnxruntime; from fastembed import TextEmbedding; print(fastembed.__version__, onnxruntime.__version__); print(TextEmbedding(model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', cache_dir='/opt/fastembed').dim)"
docker stop twyn-api-test
```

The example env is deliberately nonfunctional. The command above is an offline container smoke test using SQLite/hash embeddings; it does not test Neon/R2/providers. Use a private local env file for real credentials and never print it. Verify the image reports Python 3.13, the process user is non-root, the FastEmbed model is available under `/opt/fastembed`, and `/api/health` answers on port 8080. Docker Desktop must be running; if it is unavailable, the Docker checks are unavailable, not passed.

## 4. Secret and identity preparation (operator-owned)

Create only the nine credential secrets named in `api/deploy-cloud-run.ps1` after approval. The mapping is: `twyn-database-url` → `DATABASE_URL`; `twyn-google-client-secret` → `GOOGLE_CLIENT_SECRET`; `twyn-gnani-api-key` → `GNANI_API_KEY`; `twyn-meta-api-key` → `META_API_KEY`; `twyn-nvidia-api-key` → `NVIDIA_API_KEY`; `twyn-groq-api-key` → `GROQ_API_KEY`; `twyn-openrouter-api-key` → `OPENROUTER_API_KEY`; `twyn-r2-access-key-id` → `R2_ACCESS_KEY_ID`; and `twyn-r2-secret-access-key` → `R2_SECRET_ACCESS_KEY`. Grant the Cloud Run runtime service account only `roles/secretmanager.secretAccessor` on those secrets. `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, `WEB_ORIGIN`, `CORS_ORIGINS`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, and `R2_REGION` are ordinary Cloud Run environment variables. Do not put secret values in command history or deployment logs.

Set `WEB_ORIGIN` to the unchanged Vercel hostname and `CORS_ORIGINS` to that hostname plus any explicitly needed local development origins. Set `GOOGLE_REDIRECT_URI` only after Cloud Run returns its `https://...run.app` URL.

## 5. Build and deploy

```powershell
cd api
./deploy-cloud-run.ps1
gcloud run services describe twyn-api --region asia-south1 --format='value(status.url)'
```

The script builds to Artifact Registry and deploys only when explicitly invoked. It uses min 0/max 1, request CPU, 1 vCPU, 2 GiB, port 8080, and a 900-second timeout for WebSocket/NDJSON testing.

## 6. Configure Vercel and Google OAuth

Set Vercel project-root to `web/` and set only these public variables: `NEXT_PUBLIC_API_URL=https://<cloud-run-service>.run.app` and `NEXT_PUBLIC_WS_URL=wss://<cloud-run-service>.run.app`. Keep the existing Vercel hostname unchanged; do not invent or add a custom domain. Redeploy Vercel. Register `https://<cloud-run-service>.run.app/api/auth/google/callback` as an authorized redirect URI in Google OAuth, then update the Secret Manager value for `GOOGLE_REDIRECT_URI` if needed. The exact Vercel origin must be the `WEB_ORIGIN`/`CORS_ORIGINS` value.

## 7. Rollback

```powershell
gcloud run revisions list --service twyn-api --region asia-south1
gcloud run services update-traffic twyn-api --region asia-south1 --to-revisions PREVIOUS_REVISION=100
```

Rollback changes traffic only. Do not roll back database schema or delete R2 objects. Database changes must use the existing migration procedure and a tested backup/restore plan.

## 8. Verification checklist

- `GET /api/health` and `GET /api/health/db` return success.
- Neon TLS connection works and pool metrics stay within limits.
- Vercel REST calls have no localhost URL; CORS preflight returns the exact origin and credentials are accepted.
- Google login, callback state, session creation/expiry/logout, bearer auth, owner/persona association, and calendar authorization are tested independently.
- Public chat/booking, studio overview, authenticated WebSocket, takeover, reconnect/session recovery, NDJSON streaming, audio chunks, and provider fallbacks are tested.
- FastEmbed startup/model reuse, PDF parsing, chunk/embed/retrieval, and memory are measured inside the image.
- R2 upload/read/delete behavior is tested with a private bucket; no user media is made public.
- Frontend `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.

The local fallback test covers document upload, metadata listing, owner-scoped download, RAG chunk preservation, and deletion. Real R2 signed-URL behavior, Docker build/startup, Neon connectivity, Google OAuth, live provider/voice calls, Cloud Run WebSocket timeout behavior, and production NDJSON delivery remain unavailable until the corresponding services/credentials exist.

## Spend controls

Keep min instances 0 and max instances 1 during testing. Review Cloud Run free-tier quotas and current promotional-credit balance/expiry in Cloud Billing before provisioning; neither prevents residual charges. Monitor Cloud Run, Artifact Registry, Cloud Build, Secret Manager, R2, Neon, Gnani, and LLM provider usage. Configure a billing budget alert after confirming the project billing account, but treat alerts as notifications rather than a hard cap. Cloud Run spend-cap eligibility is account/product dependent and must be checked in the Google Cloud console; this repository does not enable it.
