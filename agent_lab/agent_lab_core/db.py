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


# ---------------------------------------------------------------------------
# Migrations — applied in order, each guarded against already-existing columns
# ---------------------------------------------------------------------------

_MIGRATIONS = [
    # content_hash (from previous pull)
    "ALTER TABLE runs ADD COLUMN content_hash TEXT",
    # versioning improvements
    "ALTER TABLE runs ADD COLUMN notes TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE runs ADD COLUMN total_input_tokens INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE runs ADD COLUMN total_output_tokens INTEGER NOT NULL DEFAULT 0",
    # per-sample enrichment
    "ALTER TABLE run_samples ADD COLUMN langfuse_trace_id TEXT DEFAULT NULL",
    "ALTER TABLE run_samples ADD COLUMN total_llm_calls INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE run_samples ADD COLUMN total_tool_calls INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE run_samples ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0.0",
]


def init_db(db_path: Path) -> None:
    """Create tables if they don't exist, and run all pending migrations."""
    with _connect(db_path) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS runs (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                version_tag    TEXT    NOT NULL UNIQUE,
                success_rate   REAL    NOT NULL,
                avg_latency_ms REAL    NOT NULL,
                avg_cost_usd   REAL    NOT NULL,
                total_cases    INTEGER NOT NULL,
                snapshot_path  TEXT,
                content_hash   TEXT,
                timestamp      TEXT    NOT NULL
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
        # Apply migrations — skip if column already exists
        for stmt in _MIGRATIONS:
            try:
                conn.execute(stmt)
            except sqlite3.OperationalError:
                pass  # column already exists


def insert_run(
    db_path: Path,
    version_tag: str,
    success_rate: float,
    avg_latency_ms: float,
    avg_cost_usd: float,
    total_cases: int,
    snapshot_path: Optional[str] = None,
    content_hash: Optional[str] = None,
    notes: str = "",
    total_input_tokens: int = 0,
    total_output_tokens: int = 0,
) -> int:
    """Insert an aggregated run record. Returns the new run id."""
    ts = datetime.utcnow().isoformat()
    with _connect(db_path) as conn:
        cur = conn.execute(
            """
            INSERT OR REPLACE INTO runs
                (version_tag, success_rate, avg_latency_ms, avg_cost_usd,
                 total_cases, snapshot_path, content_hash,
                 notes, total_input_tokens, total_output_tokens, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (version_tag, success_rate, avg_latency_ms, avg_cost_usd,
             total_cases, snapshot_path, content_hash,
             notes, total_input_tokens, total_output_tokens, ts),
        )
        return cur.lastrowid or 0


def update_run_notes(db_path: Path, version_tag: str, notes: str) -> bool:
    """Update the notes for an existing run. Returns True if a row was updated."""
    with _connect(db_path) as conn:
        cur = conn.execute(
            "UPDATE runs SET notes = ? WHERE version_tag = ?",
            (notes, version_tag),
        )
        return cur.rowcount > 0


def tag_exists(db_path: Path, version_tag: str) -> bool:
    """Return True if a run with this tag already exists."""
    if not db_path.exists():
        return False
    with _connect(db_path) as conn:
        row = conn.execute(
            "SELECT 1 FROM runs WHERE version_tag = ?", (version_tag,)
        ).fetchone()
    return row is not None


def get_run_count(db_path: Path) -> int:
    """Return total number of runs recorded."""
    if not db_path.exists():
        return 0
    with _connect(db_path) as conn:
        row = conn.execute("SELECT COUNT(*) FROM runs").fetchone()
    return row[0] if row else 0


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
            s.get("langfuse_trace_id"),
            s.get("total_llm_calls", 0),
            s.get("total_tool_calls", 0),
            s.get("cost_usd", 0.0),
        )
        for s in samples
    ]
    with _connect(db_path) as conn:
        conn.executemany(
            """
            INSERT INTO run_samples
                (run_id, sample_idx, input, expected, got, passed, latency_ms,
                 langfuse_trace_id, total_llm_calls, total_tool_calls, cost_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
