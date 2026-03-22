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
    # RAGAS per-sample scores
    "ALTER TABLE run_samples ADD COLUMN ragas_faithfulness REAL DEFAULT NULL",
    "ALTER TABLE run_samples ADD COLUMN ragas_relevancy    REAL DEFAULT NULL",
    "ALTER TABLE run_samples ADD COLUMN ragas_precision    REAL DEFAULT NULL",
    # RAGAS run-level averages
    "ALTER TABLE runs ADD COLUMN avg_ragas_faithfulness REAL DEFAULT NULL",
    "ALTER TABLE runs ADD COLUMN avg_ragas_relevancy    REAL DEFAULT NULL",
    "ALTER TABLE runs ADD COLUMN avg_ragas_precision    REAL DEFAULT NULL",
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

            CREATE TABLE IF NOT EXISTS sample_feedback (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id      INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
                sample_idx  INTEGER NOT NULL,
                score       INTEGER NOT NULL,   -- +1 thumbs up, -1 thumbs down
                comment     TEXT    NOT NULL DEFAULT '',
                timestamp   TEXT    NOT NULL,
                UNIQUE(run_id, sample_idx)
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
    avg_ragas_faithfulness: Optional[float] = None,
    avg_ragas_relevancy: Optional[float] = None,
    avg_ragas_precision: Optional[float] = None,
) -> int:
    """Insert an aggregated run record. Returns the new run id."""
    ts = datetime.utcnow().isoformat()
    with _connect(db_path) as conn:
        cur = conn.execute(
            """
            INSERT OR REPLACE INTO runs
                (version_tag, success_rate, avg_latency_ms, avg_cost_usd,
                 total_cases, snapshot_path, content_hash,
                 notes, total_input_tokens, total_output_tokens, timestamp,
                 avg_ragas_faithfulness, avg_ragas_relevancy, avg_ragas_precision)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (version_tag, success_rate, avg_latency_ms, avg_cost_usd,
             total_cases, snapshot_path, content_hash,
             notes, total_input_tokens, total_output_tokens, ts,
             avg_ragas_faithfulness, avg_ragas_relevancy, avg_ragas_precision),
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
            s.get("ragas_faithfulness"),
            s.get("ragas_relevancy"),
            s.get("ragas_precision"),
        )
        for s in samples
    ]
    with _connect(db_path) as conn:
        conn.executemany(
            """
            INSERT INTO run_samples
                (run_id, sample_idx, input, expected, got, passed, latency_ms,
                 langfuse_trace_id, total_llm_calls, total_tool_calls, cost_usd,
                 ragas_faithfulness, ragas_relevancy, ragas_precision)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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


# ---------------------------------------------------------------------------
# Human feedback
# ---------------------------------------------------------------------------

def upsert_feedback(
    db_path: Path,
    run_id: int,
    sample_idx: int,
    score: int,
    comment: str = "",
) -> None:
    """Insert or replace human feedback for a sample (one feedback per sample per run)."""
    ts = datetime.utcnow().isoformat()
    with _connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO sample_feedback (run_id, sample_idx, score, comment, timestamp)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(run_id, sample_idx) DO UPDATE SET
                score     = excluded.score,
                comment   = excluded.comment,
                timestamp = excluded.timestamp
            """,
            (run_id, sample_idx, score, comment, ts),
        )


def get_feedback_for_run(db_path: Path, run_id: int) -> list[dict]:
    """Return all feedback rows for a given run id."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            "SELECT * FROM sample_feedback WHERE run_id = ? ORDER BY sample_idx ASC",
            (run_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_all_feedback_for_export(db_path: Path, version_tag: str) -> list[dict]:
    """
    Return a joined record per sample: sample data + feedback (if any).
    Used for RLHF dataset export.
    """
    with _connect(db_path) as conn:
        rows = conn.execute(
            """
            SELECT
                r.version_tag,
                r.snapshot_path,
                rs.sample_idx,
                rs.input,
                rs.expected,
                rs.got,
                rs.passed,
                rs.latency_ms,
                sf.score       AS human_score,
                sf.comment     AS human_comment
            FROM run_samples rs
            JOIN runs r ON rs.run_id = r.id
            LEFT JOIN sample_feedback sf
                ON sf.run_id = rs.run_id AND sf.sample_idx = rs.sample_idx
            WHERE r.version_tag = ?
            ORDER BY rs.sample_idx ASC
            """,
            (version_tag,),
        ).fetchall()
    return [dict(r) for r in rows]
