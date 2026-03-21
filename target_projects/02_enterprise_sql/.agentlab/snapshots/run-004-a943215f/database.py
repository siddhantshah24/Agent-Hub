"""
Enterprise database — a real SQLite database for the SQL agent demo.

WHY SQLITE NOT JSON:
  The JSON tools in langchain-benchmarks simulate a database with Python functions.
  This demo uses a *real* relational SQLite database so the agent must:
    1. Discover what tables exist  (list_tables)
    2. Understand the schema       (get_schema)
    3. Write and execute SQL JOINs (query_db)
  This tests the agent's SQL reasoning, not just function-calling pattern matching.

  Every multi-hop query forces a real JOIN. The agent cannot guess — it must write
  correct SQL to traverse the relational model.

SCHEMA:
  users(id, name, email, location_id, favorite_color)
  locations(id, city, country, current_weather)
  foods(id, name, calories, allergic_ingredients)
  user_foods(user_id, food_id)          ← junction table
"""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "datasets" / "enterprise.db"


# ── DDL ───────────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS locations (
    id              INTEGER PRIMARY KEY,
    city            TEXT    NOT NULL,
    country         TEXT    DEFAULT 'USA',
    current_weather TEXT    DEFAULT 'Sunny'
);

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL,
    email           TEXT,
    location_id     INTEGER REFERENCES locations(id),
    favorite_color  TEXT
);

CREATE TABLE IF NOT EXISTS foods (
    id                    INTEGER PRIMARY KEY,
    name                  TEXT    NOT NULL,
    calories              INTEGER,
    allergic_ingredients  TEXT   -- JSON array, e.g. '["Gluten","Dairy"]'
);

CREATE TABLE IF NOT EXISTS user_foods (
    user_id  INTEGER REFERENCES users(id),
    food_id  INTEGER REFERENCES foods(id),
    PRIMARY KEY (user_id, food_id)
);
"""

# ── Seed data ─────────────────────────────────────────────────────────────────
# Anchored to the expected answers in relational_evals.jsonl

_LOCATIONS = [
    (1,  "New York",     "USA", "Cloudy"),
    (2,  "Los Angeles",  "USA", "Sunny"),
    (3,  "Chicago",      "USA", "Windy"),
    (4,  "Houston",      "USA", "Hot"),
    (5,  "Miami",        "USA", "Humid"),
    (6,  "San Francisco","USA", "Foggy"),
    (7,  "Seattle",      "USA", "Rainy"),
    (8,  "Boston",       "USA", "Cold"),
    (9,  "Austin",       "USA", "Sunny"),
    (10, "Denver",       "USA", "Snowy"),
]

# loc_id → city:  1=NYC, 2=LA, 3=Chicago, 4=Houston, 5=Miami
_USERS = [
    # id   name             email                              loc  color
    (1,    "Alice",         "alice@gmail.com",                 1,   "blue"),
    (2,    "Bob",           "bob@hotmail.com",                 2,   "orange"),
    (3,    "Charlie",       "charlie@yahoo.com",               3,   "red"),
    (4,    "Donna",         "donna@work.org",                  4,   "green"),
    (5,    "Eve",           "eve@example.org",                 5,   "purple"),
    (6,    "Frank The Cat", "frank.the.cat@langchain.dev",     5,   "black"),
    (7,    "Grace",         "grace@startup.io",                6,   "pink"),
    (8,    "Hank",          "hank@corp.com",                   7,   "brown"),
    (9,    "Ivy",           "ivy@design.co",                   8,   "white"),
    (10,   "Jack",          "jack@finance.net",                9,   "gray"),
    # Sparse IDs for the "user with id N" queries
    (21,   "User21",        "user21@test.com",                 2,   "yellow"),   # LA
    (41,   "User41",        "user41@test.com",                 4,   "teal"),     # Houston
    (42,   "User42",        "user42@test.com",                 5,   "silver"),   # Miami
]

_FOODS = [
    # id  name          calories  allergic_ingredients
    (1,   "Pizza",      285,      "[]"),
    (2,   "Sushi",      200,      '["Fish", "Soy"]'),
    (3,   "Ice Cream",  200,      '["Dairy"]'),
    (4,   "Burger",     450,      '["Gluten", "Dairy"]'),
    (5,   "Pasta",      320,      '["Gluten"]'),
    (6,   "Tacos",      180,      '["Gluten"]'),
    (7,   "Salad",      50,       "[]"),
    (8,   "Ramen",      380,      '["Gluten", "Soy"]'),
    (9,   "Steak",      600,      "[]"),
    (10,  "Waffles",    310,      '["Gluten", "Dairy"]'),
]

# Alice (1) likes Pizza(1), Sushi(2), Ice Cream(3)
# Bob   (2) likes Burger(4), Tacos(6)
# Charlie(3) likes Salad(7), Steak(9)
# Donna (4) likes Pasta(5), Salad(7), Waffles(10)
# Eve   (5) likes Sushi(2), Ramen(8)
# Frank (6) likes Tacos(6), Steak(9)
_USER_FOODS = [
    (1, 1), (1, 2), (1, 3),
    (2, 4), (2, 6),
    (3, 7), (3, 9),
    (4, 5), (4, 7), (4, 10),
    (5, 2), (5, 8),
    (6, 6), (6, 9),
]


# ── Setup function ─────────────────────────────────────────────────────────────

def setup_db(db_path: Path = DB_PATH) -> Path:
    """Create (or verify) the enterprise SQLite database. Idempotent."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.executescript(_SCHEMA)

        # Only seed if tables are empty
        if not conn.execute("SELECT 1 FROM locations LIMIT 1").fetchone():
            conn.executemany("INSERT INTO locations VALUES (?,?,?,?)", _LOCATIONS)
            conn.executemany("INSERT INTO users VALUES (?,?,?,?,?)", _USERS)
            conn.executemany("INSERT INTO foods VALUES (?,?,?,?)", _FOODS)
            conn.executemany("INSERT INTO user_foods VALUES (?,?)", _USER_FOODS)
            conn.commit()

    return db_path


if __name__ == "__main__":
    path = setup_db()
    print(f"Database ready at {path}")
    with sqlite3.connect(path) as conn:
        print("Users:", conn.execute("SELECT id, name, email FROM users LIMIT 5").fetchall())
        print("Foods:", conn.execute("SELECT id, name, calories FROM foods").fetchall())
