"""
SQLite interface for Agent Lab.

Stores aggregated run metrics (runs) and per-sample results (run_samples).
Database file: <project_root>/.agentlab.db
"""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional


def _connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db(db_path: Path) -> None:
    """Create tables if they don't exist."""
    with _connect(db_path) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS runs (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                version_tag   TEXT    NOT NULL UNIQUE,
                success_rate  REAL    NOT NULL,
                avg_latency_ms REAL   NOT NULL,
                avg_cost_usd  REAL    NOT NULL,
                total_cases   INTEGER NOT NULL,
                snapshot_path TEXT,
                timestamp     TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS run_samples (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id      INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
                sample_idx  INTEGER NOT NULL,
                input       TEXT    NOT NULL,
                expected    TEXT    NOT NULL,
                got         TEXT    NOT NULL,
                passed      INTEGER NOT NULL,   -- 1 = pass, 0 = fail
                latency_ms  REAL    NOT NULL
            );
        """)


def insert_run(
    db_path: Path,
    version_tag: str,
    success_rate: float,
    avg_latency_ms: float,
    avg_cost_usd: float,
    total_cases: int,
    snapshot_path: Optional[str] = None,
) -> int:
    """Insert an aggregated run record. Returns the new run id."""
    ts = datetime.utcnow().isoformat()
    with _connect(db_path) as conn:
        cur = conn.execute(
            """
            INSERT OR REPLACE INTO runs
                (version_tag, success_rate, avg_latency_ms, avg_cost_usd,
                 total_cases, snapshot_path, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (version_tag, success_rate, avg_latency_ms, avg_cost_usd,
             total_cases, snapshot_path, ts),
        )
        return cur.lastrowid


def insert_samples(db_path: Path, run_id: int, samples: list[dict]) -> None:
    """Bulk-insert per-sample results for a run."""
    rows = [
        (
            run_id,
            s["sample_idx"],
            s["input"],
            s["expected"],
            s["got"],
            int(s["passed"]),
            s["latency_ms"],
        )
        for s in samples
    ]
    with _connect(db_path) as conn:
        conn.executemany(
            """
            INSERT INTO run_samples
                (run_id, sample_idx, input, expected, got, passed, latency_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )


def get_all_runs(db_path: Path) -> list[dict]:
    """Return all runs ordered by timestamp ascending."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            "SELECT * FROM runs ORDER BY timestamp ASC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_run_by_tag(db_path: Path, version_tag: str) -> Optional[dict]:
    with _connect(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM runs WHERE version_tag = ?", (version_tag,)
        ).fetchone()
    return dict(row) if row else None


def get_samples_for_tag(db_path: Path, version_tag: str) -> list[dict]:
    """Return all per-sample rows for a given version tag."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            """
            SELECT rs.*
            FROM run_samples rs
            JOIN runs r ON rs.run_id = r.id
            WHERE r.version_tag = ?
            ORDER BY rs.sample_idx ASC
            """,
            (version_tag,),
        ).fetchall()
    return [dict(r) for r in rows]
