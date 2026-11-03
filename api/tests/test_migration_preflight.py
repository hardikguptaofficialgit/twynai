from pathlib import Path

from sqlalchemy import create_engine

from scripts import neon_preflight


def test_preflight_detects_baseline_drift_without_database_writes():
    expected = neon_preflight.expected_baseline()
    catalog = {
        "tables": set(expected),
        "schemas": expected,
        "alembic_version": None,
    }
    assert neon_preflight.compare_catalog(catalog) == []
    catalog["schemas"]["personas"]["columns"]["avatar_path"]["nullable"] = False
    assert "personas.avatar_path" in neon_preflight.compare_catalog(catalog)


def test_avatar_migration_uses_transaction_local_timeouts():
    migration = Path(__file__).parents[1] / "alembic" / "versions" / "20261103_0002_avatar_path_not_null.py"
    source = migration.read_text()
    assert 'SET LOCAL lock_timeout' in source
    assert 'SET LOCAL statement_timeout' in source
    assert 'SET lock_timeout' not in source.replace('SET LOCAL lock_timeout', '')
    assert 'SET statement_timeout' not in source.replace('SET LOCAL statement_timeout', '')


def test_preflight_sqlite_is_read_only_and_reports_not_applicable_ssl():
    engine = create_engine("sqlite:///:memory:")
    report = neon_preflight.run_preflight(engine)
    engine.dispose()
    assert report["ssl"] is None
    assert report["baseline_matches"] is False
    assert report["avatar_path_null_count"] is None
