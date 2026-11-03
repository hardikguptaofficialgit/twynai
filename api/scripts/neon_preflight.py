"""Strictly read-only production database adoption preflight.

This command never stamps revisions, runs migrations, or executes DDL/DML.
It requires DATABASE_URL to be supplied explicitly by the operator and never
prints that value.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

EXPLICIT_DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, inspect, text

from app.db import Base

BASELINE_REVISION = "20261103_0001"
PUBLIC_SCHEMA = "public"
EXPECTED_TABLES = {
    "bookings", "chunks", "conversations", "document_assets", "leads",
    "messages", "owners", "personas", "provider_spend", "sessions",
}


def _type_name(value) -> str:
    name = str(value).upper().replace("DATETIME", "TIMESTAMP")
    return name.replace("CHARACTER VARYING", "VARCHAR")


def _default_name(value) -> str | None:
    if value is None:
        return None
    result = str(value).strip().lower()
    result = result.replace("::character varying", "").replace("::text", "")
    return result


def expected_baseline() -> dict:
    """Build the baseline contract from models, with known pre-0002 drift."""
    result = {}
    for table_name, table in Base.metadata.tables.items():
        columns = {}
        for column in table.columns:
            default = "''" if table_name == "personas" and column.name == "avatar_path" else None
            nullable = True if table_name == "personas" and column.name == "avatar_path" else bool(column.nullable)
            columns[column.name] = {
                "type": _type_name(column.type),
                "nullable": nullable,
                "default": _default_name(default),
            }
        unique = {
            tuple(sorted(column.name for column in constraint.columns))
            for constraint in table.constraints
            if constraint.__class__.__name__ == "UniqueConstraint"
        }
        foreign_keys = {
            (foreign_key.parent.name, foreign_key.target_fullname)
            for foreign_key in table.foreign_keys
        }
        indexes = {tuple(sorted(index.columns.keys())) for index in table.indexes}
        result[table_name] = {
            "columns": columns,
            "primary_key": tuple(sorted(column.name for column in table.primary_key.columns)),
            "foreign_keys": foreign_keys,
            "unique": unique,
            "indexes": indexes,
        }
    return result


def inspect_catalog(connection) -> dict:
    """Collect only PostgreSQL/SQLAlchemy catalog metadata and aggregate counts."""
    inspector = inspect(connection)
    schema = PUBLIC_SCHEMA if connection.dialect.name == "postgresql" else None
    schema_names = set(inspector.get_schema_names())
    if schema == PUBLIC_SCHEMA and PUBLIC_SCHEMA not in schema_names:
        raise RuntimeError("public schema is missing")
    all_tables = set(inspector.get_table_names(schema=schema))
    tables = all_tables - {"alembic_version"}
    catalog = {
        "schema_names": schema_names,
        "public_schema": True if schema == PUBLIC_SCHEMA else None,
        "tables": tables,
        "alembic_version": None,
        "schemas": {},
    }
    if "alembic_version" in all_tables:
        catalog["alembic_version"] = [
            row[0] for row in connection.execute(text("SELECT version_num FROM " + ("public." if schema == PUBLIC_SCHEMA else "") + "alembic_version")).fetchall()
        ]

    for table_name in tables:
        columns = {}
        for column in inspector.get_columns(table_name, schema=schema):
            columns[column["name"]] = {
                "type": _type_name(column["type"]),
                "nullable": bool(column["nullable"]),
                "default": _default_name(column.get("default")),
            }
        unique = {
            tuple(sorted(constraint.get("column_names") or []))
            for constraint in inspector.get_unique_constraints(table_name, schema=schema)
        }
        foreign_keys = {
            (
                foreign_key["constrained_columns"][0],
                f"{foreign_key['referred_table']}.{foreign_key['referred_columns'][0]}",
            )
            for foreign_key in inspector.get_foreign_keys(table_name, schema=schema)
            if foreign_key.get("constrained_columns") and foreign_key.get("referred_columns")
        }
        indexes = {
            tuple(sorted(index.get("column_names") or []))
            for index in inspector.get_indexes(table_name, schema=schema)
            if not index.get("unique")
        }
        primary_key = tuple(sorted(inspector.get_pk_constraint(table_name, schema=schema).get("constrained_columns") or []))
        catalog["schemas"][table_name] = {
            "columns": columns,
            "primary_key": primary_key,
            "foreign_keys": foreign_keys,
            "unique": unique,
            "indexes": indexes,
        }
    return catalog


def compare_catalog(catalog: dict) -> list[str]:
    expected = expected_baseline()
    differences = []
    if catalog["tables"] != set(expected):
        differences.append(f"tables expected={sorted(expected)} actual={sorted(catalog['tables'])}")
    for table_name in sorted(set(expected) & catalog["tables"]):
        want, got = expected[table_name], catalog["schemas"][table_name]
        if set(want["columns"]) != set(got["columns"]):
            differences.append(f"{table_name}.columns")
        for column_name in sorted(set(want["columns"]) & set(got["columns"])):
            if want["columns"][column_name] != got["columns"][column_name]:
                differences.append(f"{table_name}.{column_name}")
        for key in ("primary_key", "foreign_keys", "unique", "indexes"):
            if want[key] != got[key]:
                differences.append(f"{table_name}.{key}")
    return differences


def run_preflight(engine) -> dict:
    with engine.connect() as connection:
        if engine.dialect.name == "postgresql":
            connection.exec_driver_sql("SET TRANSACTION READ ONLY")
            raw = connection.connection.driver_connection
            pgconn = getattr(raw, "pgconn", None)
            if pgconn is not None and hasattr(pgconn, "ssl_in_use"):
                ssl = bool(pgconn.ssl_in_use)
                ssl_method = "psycopg.pgconn.ssl_in_use"
            else:
                ssl = bool(getattr(getattr(raw, "info", None), "ssl_in_use", False))
                ssl_method = "psycopg.info.ssl_in_use"
            pooler_backend_ssl = connection.execute(text("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()")).scalar_one()
        else:
            ssl = None
            ssl_method = "not_applicable"
            pooler_backend_ssl = None
        catalog = inspect_catalog(connection)
        null_count = connection.execute(text("SELECT COUNT(*) FROM personas WHERE avatar_path IS NULL")).scalar_one() if "personas" in catalog["tables"] else None
    catalog["avatar_path_null_count"] = null_count
    catalog["ssl"] = ssl
    catalog["ssl_method"] = ssl_method
    catalog["pooler_backend_ssl"] = pooler_backend_ssl
    catalog["baseline_revision"] = BASELINE_REVISION
    catalog["schema_differences"] = compare_catalog(catalog)
    catalog["baseline_matches"] = not catalog["schema_differences"]
    catalog["revision_state_ok"] = catalog["alembic_version"] is None
    return catalog


def main() -> int:
    url = EXPLICIT_DATABASE_URL
    if not url:
        print("FAIL DATABASE_URL is not set; refusing to inspect an implicit local database")
        return 2
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    if url.startswith("postgresql+psycopg://") and "sslmode=" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    try:
        engine = create_engine(url, pool_pre_ping=True)
        if engine.dialect.name != "postgresql":
            print("FAIL database is not PostgreSQL; refusing non-Neon preflight")
            return 1
        report = run_preflight(engine)
    except Exception as exc:
        print(f"FAIL database preflight unavailable ({type(exc).__name__})")
        return 1
    finally:
        if "engine" in locals():
            engine.dispose()

    tables_ok = report["tables"] == EXPECTED_TABLES
    differences = report["schema_differences"]
    checks = {
        "public schema": report["public_schema"],
        "expected ten tables": tables_ok,
        "columns/types/nullability/defaults": not any(item.endswith(".columns") or "." in item and item.split(".")[-1] not in {"primary_key", "foreign_keys", "unique", "indexes"} for item in differences),
        "primary keys": not any(item.endswith(".primary_key") for item in differences),
        "foreign keys": not any(item.endswith(".foreign_keys") for item in differences),
        "unique constraints": not any(item.endswith(".unique") for item in differences),
        "indexes": not any(item.endswith(".indexes") for item in differences),
        "baseline schema": report["baseline_matches"],
        "avatar_path NULL count": report["avatar_path_null_count"] == 0,
        "Alembic revision state": report["revision_state_ok"],
        "SSL/TLS": report["ssl"] is True,
    }
    print("PASS PostgreSQL connectivity")
    print("PASS client SSL/TLS via " + report["ssl_method"] if report["ssl"] is True else "FAIL client SSL/TLS")
    if report["pooler_backend_ssl"] is False:
        print("INFO pg_stat_ssl=False on backend session; pooler backend status is distinct from client TLS")
    print("PASS" if report["public_schema"] else "FAIL", "public schema")
    if report["alembic_version"] is None:
        print("PASS alembic_version absent")
    else:
        print(f"FAIL existing Alembic revisions detected: {report['alembic_version']}")
    for name in ("expected ten tables", "columns/types/nullability/defaults", "primary keys", "foreign keys", "unique constraints", "indexes"):
        print("PASS" if checks[name] else "FAIL", name)
    print(f"PASS baseline {BASELINE_REVISION} schema match" if checks["baseline schema"] else f"FAIL baseline {BASELINE_REVISION} schema mismatch: {differences}")
    print(f"PASS personas.avatar_path NULL count={report['avatar_path_null_count']}" if checks["avatar_path NULL count"] else f"FAIL personas.avatar_path NULL count={report['avatar_path_null_count']}")
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
