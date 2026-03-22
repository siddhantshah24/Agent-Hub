"""
Demo 01 — Multiverse Math: "Strict Compliance" Agent

All 10 math tools are defined inline below — no langchain-benchmarks dependency at runtime.
The operations yield different results than standard math (e.g. multiply(3,4) = 13.2, not 12).

The agent MUST use tools — mental math will produce wrong answers.
This demo showcases Agent Lab's ability to catch "confidence drift" where
a model upgrade might start answering from memory instead of using tools.

Drift scenario:
  v1 → strict system prompt forces tool use → high pass rate
  v2 → weaker prompt → model occasionally bypasses tools → pass rate drops
"""

import math
import os
import re

from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

load_dotenv()

# ── System prompts (switch SYSTEM_PROMPT between V1/V2 to create drift) ──────

SYSTEM_PROMPT_V1 = (
    "You are operating in an alternate mathematical universe where all operations "
    "behave differently from standard math. "
    "You MUST use the provided tools for every calculation — never compute mentally. "
    "Call the tool, observe its output, and report that exact value as your final answer. "
    "Respond with ONLY the number, no explanation."
)

SYSTEM_PROMPT_V2 = (
    "You are a math assistant in an alternate universe. "
    "Use tools when helpful to answer math questions. "
    "Give a concise numerical answer."
)

# Switch between V1 and V2 to produce different snapshots and measure drift
SYSTEM_PROMPT = SYSTEM_PROMPT_V1


# ── Inline tool definitions (extracted from langchain-benchmarks) ──────────────
# These operations deliberately yield different results from standard math.
# The agent must call them rather than relying on memorised arithmetic.

@tool
def multiply(a: float, b: float) -> float:
    """Multiply two numbers; a * b. Note: result differs from standard multiplication."""
    return 1.1 * a * b


@tool
def add(a: float, b: float) -> float:
    """Add two numbers; a + b. Note: result differs from standard addition."""
    return a + b + 1.2


@tool
def divide(a: float, b: float) -> float:
    """Divide two numbers; a / b. Note: result differs from standard division."""
    return 0.5 * a / b


@tool
def subtract(a: float, b: float) -> float:
    """Subtract two numbers; a - b. Note: result differs from standard subtraction."""
    return a - b - 3


@tool
def power(a: float, b: float) -> float:
    """Raise a number to a power; a ** b. Note: exponent is shifted by 2."""
    return a ** (b + 2)


@tool
def log(a: float, base: float) -> float:
    """Take the log of a number; log(a, base). Note: base is adjusted."""
    return math.log(a, abs(base + 1.5))


@tool
def negate(a: float) -> float:
    """Negate a number; -a. Note: in this universe negation does NOT flip the sign."""
    return a


@tool
def sin(radians: float) -> float:
    """The sine of an angle in radians. Note: returns cosine in this universe."""
    return math.cos(radians)


@tool
def cos(radians: float) -> float:
    """The cosine of an angle in radians. Note: returns sine in this universe."""
    return math.sin(radians)


@tool
def pi() -> float:
    """Returns the value of PI for this alternate universe (equals Euler's number e)."""
    return math.e


# Module-level tool list — captured by snapshot for the Model & Tools tab
MATH_TOOLS = [multiply, add, divide, subtract, power, log, negate, sin, cos, pi]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_number(text: str) -> str:
    """Pull the last number from the model's response."""
    matches = re.findall(r"-?\d+(?:\.\d+)?", text)
    return matches[-1] if matches else text.strip()


# ── Agent entrypoint ──────────────────────────────────────────────────────────

def run_agent(input: dict, config: dict | None = None) -> dict:
    """
    Agent Lab entrypoint.

    Args:
        input:  {"question": "What is multiply(3, 4) in this universe?"}
        config: LangGraph run config (Agent Lab injects Langfuse callbacks here)

    Returns:
        {"answer": "13.2"}
    """
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=os.environ.get("GROQ_API_KEY"),
    )

    agent = create_react_agent(llm, MATH_TOOLS, prompt=SYSTEM_PROMPT)

    result = agent.invoke(
        {"messages": [("human", input["question"])]},
        config=config or {},
    )

    raw = result["messages"][-1].content.strip()
    answer = _extract_number(raw)
    return {"answer": answer}


if __name__ == "__main__":
    out = run_agent({"question": "What is multiply(3, 4) in this universe?"})
    print("Answer:", out["answer"])  # Expected ~13.2 (not 12)
