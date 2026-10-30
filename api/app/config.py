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

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///" + str(Path(__file__).resolve().parents[1] / "proxy.db"))
GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GNANI_BASE = os.getenv("GNANI_BASE_URL", "https://api.vachana.ai")
GNANI_TTS_MODEL = os.getenv("GNANI_TTS_MODEL", "timbre-v3.0")
GNANI_DEFAULT_VOICE = os.getenv("GNANI_DEFAULT_VOICE", "Shivani")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
WEB_ORIGIN = os.getenv("WEB_ORIGIN", "http://localhost:3100")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parents[1] / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def modes():
    return {
        "llm": "groq" if GROQ_API_KEY else ("openrouter" if OPENROUTER_API_KEY else "mock"),
        "voice": "gnani" if GNANI_API_KEY else "mock",
        "calendar": "google" if GOOGLE_CLIENT_ID else "mock",
        "db": DATABASE_URL.split(":")[0],
    }
