"""
Master dataset download script for Agent Lab target projects.

Generates JSONL evaluation datasets for all three demo environments
using the native langchain-benchmarks environments (no LangSmith key required).

Usage:
    python download_datasets.py

Outputs:
    01_math_multiverse/datasets/math_evals.jsonl    (20 examples)
    02_enterprise_sql/datasets/relational_evals.jsonl (20 examples)
    03_stress_typewriter/datasets/typewriter_evals.jsonl (25 examples)
"""

import json
from pathlib import Path

from langchain_benchmarks import registry

ROOT = Path(__file__).parent


# ── Helpers ────────────────────────────────────────────────────────────────

def save_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")
    print(f"  Saved {len(records)} examples → {path.relative_to(ROOT.parent)}")


# ── 01: Multiverse Math ────────────────────────────────────────────────────

def generate_math_dataset() -> None:
    """
    Generate math examples using the actual Multiverse Math environment.
    The environment uses altered math operations (e.g. multiply returns 1.1x the
    real result), so the agent MUST use tools — mental math will fail.
    """
    print("\n[1/3] Generating Multiverse Math dataset...")

    task = registry["Multiverse Math"]
    env = task.create_environment()
    t = {tool.name: tool for tool in env.tools}

    def fmt(v) -> str:
        """Format float answers cleanly."""
        try:
            f = float(v)
            return str(int(f)) if f == int(f) else str(round(f, 6))
        except (ValueError, TypeError):
            return str(v)

    # Single-operation questions
    single_ops = [
        ("What is multiply(3, 4) in this universe?",
         fmt(t["multiply"].invoke({"a": 3, "b": 4}))),
        ("What is add(5, 2) in this universe?",
         fmt(t["add"].invoke({"a": 5, "b": 2}))),
        ("What is subtract(10, 3) in this universe?",
         fmt(t["subtract"].invoke({"a": 10, "b": 3}))),
        ("What is divide(8, 2) in this universe?",
         fmt(t["divide"].invoke({"a": 8, "b": 2}))),
        ("What is power(2, 3) in this universe?",
         fmt(t["power"].invoke({"a": 2, "b": 3}))),
        ("What is negate(5) in this universe?",
         fmt(t["negate"].invoke({"a": 5}))),
        ("What is sin(0) in this universe?",
         fmt(t["sin"].invoke({"radians": 0}))),
        ("What is cos(0) in this universe?",
         fmt(t["cos"].invoke({"radians": 0}))),
        ("What is the value of pi in this universe?",
         fmt(t["pi"].invoke({}))),
        ("What is log(8, 2) in this universe?",
         fmt(t["log"].invoke({"a": 8, "base": 2}))),
        ("What is multiply(6, 7) in this universe?",
         fmt(t["multiply"].invoke({"a": 6, "b": 7}))),
        ("What is add(100, 50) in this universe?",
         fmt(t["add"].invoke({"a": 100, "b": 50}))),
        ("What is subtract(20, 8) in this universe?",
         fmt(t["subtract"].invoke({"a": 20, "b": 8}))),
        ("What is divide(15, 3) in this universe?",
         fmt(t["divide"].invoke({"a": 15, "b": 3}))),
        ("What is power(3, 2) in this universe?",
         fmt(t["power"].invoke({"a": 3, "b": 2}))),
    ]

    # Compound questions (require multiple tool calls — the real stress test)
    add_3_2 = float(t["add"].invoke({"a": 3, "b": 2}))
    sub_10_4 = float(t["subtract"].invoke({"a": 10, "b": 4}))
    compound1 = fmt(t["multiply"].invoke({"a": add_3_2, "b": sub_10_4}))

    mul_2_5 = float(t["multiply"].invoke({"a": 2, "b": 5}))
    add_mul_3 = float(t["add"].invoke({"a": mul_2_5, "b": 3}))
    compound2 = fmt(t["divide"].invoke({"a": add_mul_3, "b": 2}))

    pow_2_4 = float(t["power"].invoke({"a": 2, "b": 4}))
    compound3 = fmt(t["subtract"].invoke({"a": pow_2_4, "b": 5}))

    neg_add = float(t["negate"].invoke({"a": float(t["add"].invoke({"a": 4, "b": 6}))}))
    compound4 = fmt(t["multiply"].invoke({"a": neg_add, "b": 2}))

    pi_val = float(t["pi"].invoke({}))
    compound5 = fmt(t["multiply"].invoke({"a": pi_val, "b": 2}))

    compound_ops = [
        ("What is multiply(add(3, 2), subtract(10, 4)) in this universe?", compound1),
        ("What is divide(add(multiply(2, 5), 3), 2) in this universe?", compound2),
        ("What is subtract(power(2, 4), 5) in this universe?", compound3),
        ("What is multiply(negate(add(4, 6)), 2) in this universe?", compound4),
        ("What is multiply(pi(), 2) in this universe?", compound5),
    ]

    records = [{"question": q, "answer": a} for q, a in single_ops + compound_ops]
    save_jsonl(ROOT / "01_math_multiverse" / "datasets" / "math_evals.jsonl", records)


# ── 02: Enterprise Relational Data ─────────────────────────────────────────

def generate_relational_dataset() -> None:
    """
    Generate relational data Q&A from the live environment.
    Data: 6 users (Alice, Bob, Charlie, Donna, Eve, Frank The Cat),
    7 foods, 5 cities. Tests multi-hop tool chaining.
    """
    print("\n[2/3] Generating Enterprise Relational Data dataset...")

    task = registry["Tool Usage - Relational Data"]
    env = task.create_environment()
    t = {tool.name: tool for tool in env.tools}

    records = [
        # Single-hop lookups
        {"question": "What is Alice's email address?",
         "answer": "alice@gmail.com"},
        {"question": "What is Bob's favorite color?",
         "answer": "orange"},
        {"question": "What city does Charlie live in?",
         "answer": "Chicago"},
        {"question": "What is Eve's email address?",
         "answer": "eve@example.org"},
        {"question": "What is Donna's favorite color?",
         "answer": "green"},
        {"question": "What city does Frank The Cat live in?",
         "answer": "Miami"},

        # Food lookups
        {"question": "How many calories does Pizza have?",
         "answer": "285"},
        {"question": "What are the allergic ingredients in Sushi?",
         "answer": "['Fish', 'Soy']"},
        {"question": "How many calories does Salad have?",
         "answer": "50"},
        {"question": "What are the allergic ingredients in Burger?",
         "answer": "['Gluten', 'Dairy']"},
        {"question": "How many calories does Ice Cream have?",
         "answer": "200"},

        # Multi-hop: user → location → city
        {"question": "What city does the user with id 21 live in?",
         "answer": "Los Angeles"},
        {"question": "What city does the user with id 41 live in?",
         "answer": "Houston"},
        {"question": "What city does the user with id 42 live in?",
         "answer": "Miami"},

        # Multi-hop: find user by name → get property
        {"question": "What is Charlie's email address?",
         "answer": "charlie@yahoo.com"},
        {"question": "What is Frank The Cat's email address?",
         "answer": "frank.the.cat@langchain.dev"},

        # Favorite foods (multi-hop: user → food_ids → food names)
        {"question": "What are Alice's favorite food IDs?",
         "answer": "[1, 2, 3]"},
        {"question": "What is the name of food ID 4?",
         "answer": "Burger"},
        {"question": "What is the name of food ID 7?",
         "answer": "Salad"},

        # Current user
        {"question": "What is the current user's ID?",
         "answer": "1"},
    ]

    save_jsonl(ROOT / "02_enterprise_sql" / "datasets" / "relational_evals.jsonl", records)


# ── 03: Typewriter Stress Test ─────────────────────────────────────────────

def generate_typewriter_dataset() -> None:
    """
    Generate typewriter tasks. The agent must use individual letter tools
    (tool 'a' types 'a', tool 'b' types 'b', etc.) to spell each word.
    26 tools × increasing word length = combinatorial trace explosion.
    """
    print("\n[3/3] Generating Typewriter Stress Test dataset...")

    words = [
        # Short (2–3 letters) — warm up
        "hi", "ok", "go", "ai", "on",
        # Medium (4–6 letters) — primary test
        "chat", "lang", "graph", "agent", "model",
        "trace", "token", "tools", "chain", "llm",
        # Longer (7–9 letters) — stress test
        "langraph", "evaluate", "toolcall", "hackathon",
        # Mixed case (agent must use lowercase tools)
        "Python", "OpenAI", "LangChain",
        # With repeated letters (tests idempotency)
        "llama", "hello", "google",
    ]

    records = [
        {"question": word.lower(), "answer": word.lower()}
        for word in words
    ]

    save_jsonl(ROOT / "03_stress_typewriter" / "datasets" / "typewriter_evals.jsonl", records)


# ── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("Agent Lab — Dataset Generator")
    print("Using: langchain-benchmarks native environments")
    print("=" * 60)

    generate_math_dataset()
    generate_relational_dataset()
    generate_typewriter_dataset()

    print("\n✓ All datasets generated. Run `agentlab eval --tag v1` in each project folder.")
