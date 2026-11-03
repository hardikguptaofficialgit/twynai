import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text


API_DIR = Path(__file__).resolve().parents[1]

# Migration execution is an explicit operator action. CI/local verification
# skips these integration tests unless deliberately enabled.
pytestmark = pytest.mark.skipif(
    not os.getenv("RUN_LOCAL_MIGRATIONS"),
    reason="migration execution requires explicit RUN_LOCAL_MIGRATIONS=1",
)


def run_alembic(db_path, *args):
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    env["UPLOAD_DIR"] = str(db_path.parent / "uploads")
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=API_DIR,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )


def test_avatar_path_migration_normalizes_nulls_and_is_reversible(tmp_path):
    db_path = tmp_path / "migration.db"
    run_alembic(db_path, "upgrade", "20261103_0001")

    engine = create_engine(f"sqlite:///{db_path}")
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO owners (id, email, name, google_tokens, created_at) VALUES ('o1', 'o1@example.com', 'Owner', '', CURRENT_TIMESTAMP)"))
        connection.execute(text("""INSERT INTO personas
            (id, owner_id, handle, name, headline, bio, rates, faqs, links, tone, accent,
             avatar_path, voice_embedding, voice_sample_path, languages, availability,
             published, onboarding_step, created_at)
            VALUES ('p1', 'o1', 'p1', 'Name', '', '', '', '[]', '[]', 'warm', 'lilac',
                    NULL, '', '', '["en"]', '{}', 0, 0, CURRENT_TIMESTAMP)"""))
    engine.dispose()

    run_alembic(db_path, "upgrade", "head")
    engine = create_engine(f"sqlite:///{db_path}")
    with engine.connect() as connection:
        avatar_path = connection.execute(text("SELECT avatar_path FROM personas WHERE id = 'p1'")).scalar_one()
        avatar_info = next(row for row in connection.exec_driver_sql("PRAGMA table_info(personas)") if row[1] == "avatar_path")
        version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    engine.dispose()
    assert avatar_path == ""
    assert avatar_info[3] == 1
    assert version == "20261103_0002"

    run_alembic(db_path, "downgrade", "base")
    run_alembic(db_path, "upgrade", "head")


def test_application_startup_has_no_database_initializer():
    from app.main import app

    assert app.router.on_startup == []
