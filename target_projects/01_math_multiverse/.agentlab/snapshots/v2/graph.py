"""
Demo 01 — Multiverse Math: "Strict Compliance" Agent

Uses the official langchain-benchmarks 'Multiverse Math' task.
The environment provides 10 math tools (multiply, add, divide, subtract,
power, log, negate, sin, cos, pi) whose results differ from standard math.

The agent MUST use tools — mental math will produce wrong answers.
This demo showcases Agent Lab's ability to catch "confidence drift" where
a model upgrade might start answering from memory instead of using tools.

Drift scenario:
  v1 → strict system prompt forces tool use → 100% pass rate
  v2 → weaker prompt → model occasionally bypasses tools → pass rate drops

Agent Lab traces every tool call via Langfuse so you can inspect exactly
which tool was skipped for each failed sample.
"""

import os
import re

from dotenv import load_dotenv
from langchain_benchmarks import registry
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

load_dotenv()

# ── Task & tools ────────────────────────────────────────────────────────────
_TASK = registry["Multiverse Math"]

# ── System prompt (tweak this between v1/v2 to create drift) ───────────────
# v1 — strict: forces tool use
SYSTEM_PROMPT_V1 = (
    "You are operating in an alternate mathematical universe where all operations "
    "behave differently from standard math. "
    "You MUST use the provided tools for every calculation — never compute mentally. "
    "Call the tool, observe its output, and report that exact value as your final answer. "
    "Respond with ONLY the number, no explanation."
)

# v2 — weaker (swap this in to observe drift):
# SYSTEM_PROMPT_V2 = (
#     "You are a math assistant in an alternate universe. "
#     "Use tools when helpful to answer math questions. "
#     "Give a concise numerical answer."
# )

SYSTEM_PROMPT = SYSTEM_PROMPT_V1


def _extract_number(text: str) -> str:
    """Pull the last number from the model's response."""
    matches = re.findall(r"-?\d+(?:\.\d+)?", text)
    return matches[-1] if matches else text.strip()


def run_agent(input: dict, config: dict | None = None) -> dict:
    """
    Agent Lab entrypoint.

    Args:
        input:  {"question": "What is multiply(3, 4) in this universe?"}
        config: LangGraph run config (Agent Lab injects Langfuse callbacks here)

    Returns:
        {"answer": "13.2"}
    """
    # Fresh environment per call — tools are deterministic across instances
    env = _TASK.create_environment()

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.environ.get("OPENAI_API_KEY"),
    )

    agent = create_react_agent(llm, env.tools, prompt=SYSTEM_PROMPT)

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
