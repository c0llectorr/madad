"""
sqlite/sync_service.py
[PHASE 2 — NOT BUILT FOR THIS DEMO]

DO NOT RUN this file during the hackathon build.
See MADAD_DATABASE.md Section 4a for full design rationale.

This file is kept as a documented Phase 2 implementation reference.
The team should only revisit this if there is genuine spare time on Day 3 or 4,
decided together — not as a default fallback.

PITCH LINE IF JUDGES ASK:
  "Madad is architected for offline-first field operation — the coordinator's
   extraction layer already runs locally for exactly this reason. For this build,
   we prioritized the live coordination and routing experience you're seeing;
   the local-cache-and-sync layer for full offline resilience is the next phase,
   and the schema is already designed to support it."
"""

import time
import sqlite3
import json

# psycopg2 import is intentionally at the top so the Phase 2 dependency is visible
# even though this file is not executed in MVP.
try:
    import psycopg2
except ImportError:
    psycopg2 = None  # type: ignore[assignment]


def get_unsynced_records(sqlite_conn: sqlite3.Connection) -> list:
    """Fetch all records from sync_queue that haven't been pushed to central Postgres yet."""
    cur = sqlite_conn.execute(
        "SELECT id, table_name, record_id, operation, payload_json "
        "FROM sync_queue WHERE synced = 0"
    )
    return cur.fetchall()


def push_to_central(pg_conn, table_name: str, record_id: str, operation: str, payload: dict) -> None:
    """
    Push a single record to central Postgres.

    Conflict resolution: last-write-wins via ON CONFLICT ... DO UPDATE.
    This is a deliberately simple strategy — real distributed-sync systems
    (ODK/KoboToolbox pattern) often use more sophisticated merge logic.
    State this plainly if judges ask rather than implying it's more sophisticated.
    """
    cur = pg_conn.cursor()

    if operation == "insert":
        columns = list(payload.keys())
        values = list(payload.values())
        placeholders = ", ".join(["%s"] * len(values))
        col_names = ", ".join(columns)
        update_clause = ", ".join(
            f"{c} = EXCLUDED.{c}" for c in columns if c != "id"
        )
        cur.execute(
            f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders}) "
            f"ON CONFLICT (id) DO UPDATE SET {update_clause}",
            values,
        )

    elif operation == "update":
        set_clause = ", ".join(f"{k} = %s" for k in payload if k != "id")
        values = [v for k, v in payload.items() if k != "id"] + [record_id]
        cur.execute(
            f"UPDATE {table_name} SET {set_clause} WHERE id = %s",
            values,
        )

    pg_conn.commit()


def sync_loop(sqlite_path: str, pg_conn_string: str, interval_seconds: int = 30) -> None:
    """
    Background sync loop. Runs every `interval_seconds`, pushing any unsynced
    local records to central Postgres whenever connectivity is available.

    Central DB being unreachable is expected during an actual outage —
    it is logged silently, not raised as an error.
    """
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is not installed — run: pip install psycopg2-binary")

    print(f"[sync] Starting sync loop (interval={interval_seconds}s)")

    while True:
        sqlite_conn = sqlite3.connect(sqlite_path)
        try:
            pg_conn = psycopg2.connect(pg_conn_string)
            rows = get_unsynced_records(sqlite_conn)
            if rows:
                print(f"[sync] Pushing {len(rows)} unsynced record(s)...")
            for row in rows:
                queue_id, table_name, record_id, operation, payload_json = row
                push_to_central(
                    pg_conn, table_name, record_id, operation, json.loads(payload_json)
                )
                sqlite_conn.execute(
                    "UPDATE sync_queue SET synced = 1 WHERE id = ?", (queue_id,)
                )
            sqlite_conn.commit()
            pg_conn.close()
        except Exception as e:  # noqa: BLE001
            # Central DB unreachable during outage — expected, not an alarm.
            print(f"[sync] Central DB unreachable: {e}")
        finally:
            sqlite_conn.close()

        time.sleep(interval_seconds)
