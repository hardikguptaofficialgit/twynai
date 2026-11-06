import os
from pathlib import Path

def _load_env():
    for p in (Path(__file__).resolve().parents[2] / ".env", Path(__file__).resolve().parents[1] / ".env"):
        if p.exists():
            for line in p.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())
_load_env()

def _db_url():
    u = os.getenv("DATABASE_URL", "").strip() or ("sqlite:///" + str(Path(__file__).resolve().parents[1] / "proxy.db"))
    for pre in ("postgres://", "postgresql://"):
        if u.startswith(pre):
            u = "postgresql+psycopg://" + u[len(pre):]
    if u.startswith("postgresql+psycopg://") and "sslmode=" not in u:
        u += ("&" if "?" in u else "?") + "sslmode=require"
    return u

def _secret(name: str) -> str:
    """Normalize Secret Manager/env values without ever logging their contents."""
    return os.getenv(name, "").strip()

DATABASE_URL = _db_url()
GNANI_API_KEY = _secret("GNANI_API_KEY")
GNANI_BASE = os.getenv("GNANI_BASE_URL", "https://api.vachana.ai")
GNANI_TTS_MODEL = os.getenv("GNANI_TTS_MODEL", "timbre-v3.0")
GNANI_DEFAULT_VOICE = os.getenv("GNANI_DEFAULT_VOICE", "Shivani")
NVIDIA_API_KEY = _secret("NVIDIA_API_KEY")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "openai/gpt-oss-20b")
META_API_KEY = _secret("META_API_KEY")
META_MODEL = os.getenv("META_MODEL", "muse-spark-1.3")
GROQ_API_KEY = _secret("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
OPENROUTER_API_KEY = _secret("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
# Ordered fastest-first for visitor turns. Keep this configurable so a provider
# can be promoted without changing application code or secrets.
LLM_PROVIDER_ORDER = [x.strip().lower() for x in os.getenv("LLM_PROVIDER_ORDER", "meta,groq,nvidia,openrouter").split(",") if x.strip()]
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = _secret("GOOGLE_CLIENT_SECRET")
WEB_ORIGIN = os.getenv("WEB_ORIGIN", "http://localhost:3100")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8100/api/auth/google/callback")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parents[1] / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OBJECT_STORAGE_ENDPOINT = os.getenv("R2_ENDPOINT", os.getenv("OBJECT_STORAGE_ENDPOINT", os.getenv("AWS_ENDPOINT_URL_S3", ""))).strip()
OBJECT_STORAGE_REGION = os.getenv("R2_REGION", os.getenv("OBJECT_STORAGE_REGION", os.getenv("AWS_REGION", "auto"))).strip()
OBJECT_STORAGE_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", os.getenv("OBJECT_STORAGE_ACCESS_KEY_ID", os.getenv("AWS_ACCESS_KEY_ID", ""))).strip()
OBJECT_STORAGE_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", os.getenv("OBJECT_STORAGE_SECRET_ACCESS_KEY", os.getenv("AWS_SECRET_ACCESS_KEY", ""))).strip()
OBJECT_STORAGE_BUCKET = os.getenv("R2_BUCKET_NAME", os.getenv("OBJECT_STORAGE_BUCKET", "")).strip()
OBJECT_STORAGE_ENABLED = bool(OBJECT_STORAGE_ENDPOINT and OBJECT_STORAGE_ACCESS_KEY_ID and OBJECT_STORAGE_SECRET_ACCESS_KEY and OBJECT_STORAGE_BUCKET)
if any((OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_ACCESS_KEY_ID, OBJECT_STORAGE_SECRET_ACCESS_KEY, OBJECT_STORAGE_BUCKET)) and not OBJECT_STORAGE_ENABLED:
    raise RuntimeError("Set the object storage endpoint, access key, secret key, and bucket together.")

def modes():
    configured = {"meta": META_API_KEY, "groq": GROQ_API_KEY, "nvidia": NVIDIA_API_KEY, "openrouter": OPENROUTER_API_KEY}
    primary = next((name for name in LLM_PROVIDER_ORDER if configured.get(name)), "mock")
    return {
        "llm": primary,
        "voice": "gnani" if GNANI_API_KEY else "mock",
        "calendar": "google" if GOOGLE_CLIENT_ID else "mock",
        "google_login": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "dev_login": ALLOW_DEV_LOGIN,
        "db": DATABASE_URL.split(":")[0],
    }
ALLOW_DEV_LOGIN = os.getenv("ALLOW_DEV_LOGIN", "1") == "1"   # set 0 in production once Google sign-in is live
RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "30"))  # public chat/voice turns per IP per minute
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(8 * 1024 * 1024)))
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(3 * 1024 * 1024)))
MAX_DOC_BYTES = int(os.getenv("MAX_DOC_BYTES", str(10 * 1024 * 1024)))
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "1500"))
SESSION_DAYS = int(os.getenv("SESSION_DAYS", "30"))
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "2"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "2"))
CORS_ORIGINS = [o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", WEB_ORIGIN).split(",") if o.strip()]
