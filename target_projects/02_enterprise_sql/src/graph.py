"""
Demo 02 — Enterprise SQL Agent

A *real* SQLite-backed SQL agent. The LLM must:
  1. Call list_tables()          → discover available tables
  2. Call get_schema(table)      → understand columns and types
  3. Call query_db(sql)          → execute a SELECT SQL query
  4. Chain multiple query steps  → answer multi-hop questions via JOINs

WHY REAL SQL, NOT JSON TOOLS:
  langchain-benchmarks provides Python function tools that simulate a DB.
  This demo uses an actual SQLite file so every answer requires the LLM
  to reason about the relational schema and write correct JOIN queries.
  The full SQL reasoning chain (discovery → schema → query → answer) is
  visible in Langfuse traces and in Agent Lab's execution chain view.

DRIFT SCENARIO:
  v1 → strict "always explore schema, use JOINs" prompt → high accuracy
  v2 → weaker prompt → LLM guesses schema, writes broken SQL → failures
"""

import json
import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

try:
    from .database import DB_PATH, setup_db
except ImportError:
    from database import DB_PATH, setup_db

load_dotenv()

# ── Ensure the database exists ────────────────────────────────────────────────
setup_db(DB_PATH)


# ── SQL Tools — the only interface between agent and database ──────────────────

@tool
def list_tables() -> str:
    """
    List all tables available in the enterprise database.
    Always call this first to understand what data is available.
    """
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        tables = [r[0] for r in rows]
        return "Available tables: " + ", ".join(tables)


@tool
def get_schema(table_name: str) -> str:
    """
    Get the column names and types for a specific table.
    Always inspect the schema before writing a query.

    Args:
        table_name: Name of the table (from list_tables).
    """
    with sqlite3.connect(DB_PATH) as conn:
        # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        if not rows:
            return f"Table '{table_name}' not found."
        cols = [f"{r[1]} {r[2]}" for r in rows]
        return f"Schema of {table_name}: " + ", ".join(cols)


@tool
def query_db(sql: str) -> str:
    """
    Execute a SELECT SQL query against the enterprise database.
    Returns results as a JSON-formatted list of rows.

    Rules:
    - Only SELECT statements are allowed.
    - Use JOINs when the question requires data from multiple tables.
    - ALWAYS inspect the schema with get_schema() before writing a query.

    Args:
        sql: A valid SELECT SQL query.
    """
    sql = sql.strip()
    if not sql.upper().startswith("SELECT"):
        return "Error: Only SELECT queries are permitted."
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cur = conn.execute(sql)
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            if not rows:
                return "Query returned 0 rows."
            result = [dict(zip(cols, row)) for row in rows]
            return json.dumps(result, default=str)
    except sqlite3.Error as e:
        return f"SQL Error: {e}"


SQL_TOOLS = [list_tables, get_schema, query_db]

# ── System prompts ─────────────────────────────────────────────────────────────

# v1 — strict: forces schema exploration and correct JOINs
SYSTEM_PROMPT_V1 = """You are a precise enterprise data analyst with access to a SQLite database.

REQUIRED PROCESS — follow these steps for every question:
1. Call list_tables() to see what tables exist.
2. Call get_schema() for each table you need to understand.
3. Write a correct SQL SELECT query with proper JOINs if the data spans tables.
4. Execute the query with query_db() and return the exact value.

RULES:
- Never guess column names or table structure — always inspect the schema.
- Use JOIN queries to answer multi-hop questions (e.g. user → location → city).
- Return ONLY the raw answer value — no explanations, no markdown.
- If a column contains a JSON array, return it as-is."""

# v2 — weaker: skips schema inspection, guesses column names → drift
SYSTEM_PROMPT_V2 = """You are a data analyst with access to a SQL database.
Use the available tools to answer questions about users, locations, and foods.
Be concise and return just the answer."""

SYSTEM_PROMPT = SYSTEM_PROMPT_V1


# ── Agent entrypoint ───────────────────────────────────────────────────────────

def run_agent(input: dict, config: dict | None = None) -> dict:
    """
    Agent Lab entrypoint.

    Args:
        input:  {"question": "What city does Charlie live in?"}
        config: LangGraph run config (Agent Lab injects Langfuse callbacks here)

    Returns:
        {"answer": "Chicago"}

    Typical tool call sequence for "What city does Charlie live in?":
        list_tables()
        → get_schema("users"), get_schema("locations")
        → query_db("SELECT l.city FROM users u JOIN locations l ON u.location_id = l.id WHERE u.name = 'Charlie'")
        → "Chicago"
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    agent = create_react_agent(llm, SQL_TOOLS, prompt=SYSTEM_PROMPT)

    result = agent.invoke(
        {"messages": [("human", input["question"])]},
        config=config or {},
    )

    answer = result["messages"][-1].content.strip()
    return {"answer": answer}


if __name__ == "__main__":
    test_questions = [
        "What city does Charlie live in?",
        "What is Alice's email address?",
        "What are the allergic ingredients in Sushi?",
        "What is the total calories of Alice's favorite foods?",
    ]
    for q in test_questions:
        result = run_agent({"question": q})
        print(f"Q: {q}")
        print(f"A: {result['answer']}\n")
