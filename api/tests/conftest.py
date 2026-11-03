"""Keep the test suite isolated from any developer or Neon DATABASE_URL."""
import os
import tempfile
import atexit
from pathlib import Path


_test_dir = tempfile.TemporaryDirectory(prefix="twyn-pytest-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_test_dir.name) / 'test.db'}"
os.environ["UPLOAD_DIR"] = str(Path(_test_dir.name) / "uploads")
os.environ["ALLOW_DEV_LOGIN"] = "1"

from app.db import engine, init_local_db

init_local_db()
atexit.register(engine.dispose)
