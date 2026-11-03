#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$(realpath "$0")")"

if [[ ! -s .env ]]; then
  echo "Missing production api/.env; refusing to start Twyn."
  exit 1
fi

python3 - .env <<'PY'
from pathlib import Path
import sys

env = {}
for raw in Path(sys.argv[1]).read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if line.startswith("export "):
        line = line[7:].lstrip()
    if "=" not in line:
        continue
    key, value = line.split("=", 1)
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    env[key.strip()] = value

required = [
    "DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI", "WEB_ORIGIN", "CORS_ORIGINS",
    "GNANI_API_KEY", "CLOUDFLARE_TUNNEL_TOKEN",
]
missing = [key for key in required if not env.get(key)]
if not env.get("OBJECT_STORAGE_ENDPOINT") and not env.get("AWS_ENDPOINT_URL_S3"):
    missing.append("OBJECT_STORAGE_ENDPOINT (or AWS_ENDPOINT_URL_S3)")
if not env.get("OBJECT_STORAGE_ACCESS_KEY_ID") and not env.get("AWS_ACCESS_KEY_ID"):
    missing.append("OBJECT_STORAGE_ACCESS_KEY_ID (or AWS_ACCESS_KEY_ID)")
if not env.get("OBJECT_STORAGE_SECRET_ACCESS_KEY") and not env.get("AWS_SECRET_ACCESS_KEY"):
    missing.append("OBJECT_STORAGE_SECRET_ACCESS_KEY (or AWS_SECRET_ACCESS_KEY)")
if not env.get("OBJECT_STORAGE_BUCKET"):
    missing.append("OBJECT_STORAGE_BUCKET")
if not any(env.get(key) for key in ("NVIDIA_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "META_API_KEY")):
    missing.append("one LLM provider key (NVIDIA/GROQ/OPENROUTER/META)")

if missing:
    print("Production configuration is incomplete; missing or empty:")
    for key in missing:
        print(f"  - {key}")
    sys.exit(1)

if not env["DATABASE_URL"].startswith(("postgres://", "postgresql://", "postgresql+psycopg://")):
    print("DATABASE_URL must use Postgres in production; refusing to start with SQLite.")
    sys.exit(1)
if env.get("ALLOW_DEV_LOGIN", "1") != "0":
    print("Set ALLOW_DEV_LOGIN=0 before production deployment.")
    sys.exit(1)
if env["WEB_ORIGIN"].rstrip("/") != "https://twynai.arclabs.page":
    print("WEB_ORIGIN must be https://twynai.arclabs.page.")
    sys.exit(1)
if env["GOOGLE_REDIRECT_URI"].rstrip("/") != "https://api.twynai.arclabs.page/api/auth/google/callback":
    print("GOOGLE_REDIRECT_URI must use the production API callback URL.")
    sys.exit(1)
if "https://twynai.arclabs.page" not in [origin.strip().rstrip("/") for origin in env["CORS_ORIGINS"].split(",")]:
    print("CORS_ORIGINS must include https://twynai.arclabs.page.")
    sys.exit(1)

print("Production environment checks passed; secret values were not displayed.")
PY

if ! docker image inspect twyn-api:staged >/dev/null 2>&1; then
  echo "Missing staged image twyn-api:staged. Load twyn-api-staged.tar first."
  exit 1
fi

chmod 600 .env
docker compose -f docker-compose.server.yml config --quiet
docker compose -f docker-compose.server.yml --profile named-tunnel up -d --no-build

for _ in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:8100/api/health/db >/dev/null; then
    echo "Twyn API health check passed."
    break
  fi
  sleep 2
done

if ! curl --fail --silent http://127.0.0.1:8100/api/health/db >/dev/null; then
  echo "Twyn API did not become healthy. Check: docker compose -f docker-compose.server.yml logs --tail=100 api"
  exit 1
fi

if [[ -z "$(docker compose -f docker-compose.server.yml --profile named-tunnel ps --status running -q cloudflare-named-tunnel)" ]]; then
  echo "Cloudflare Tunnel is not running. Check its status in Cloudflare and server logs."
  exit 1
fi

echo "Twyn API and named Cloudflare Tunnel are running."
