"""
Demo 03 — Typewriter (26 tools): "Trace Stress Test" Agent

All 26 letter tools are defined inline below — no langchain-benchmarks dependency at runtime.
Each tool types one letter onto a virtual paper. The agent must call them in sequence
to reproduce the given word.

Example: typing "hello" requires exactly 5 sequential tool calls: h → e → l → l → o

Why this is a stress test:
  - Each character is a separate tool call → Langfuse traces have N spans per word
  - A 9-letter word generates 9 tool-call nodes in the trace graph
  - The model must plan the sequence correctly with 26 possible tools at each step
  - This stresses the reasoning loop and overwhelms weaker models

Drift scenario:
  v1 → gpt-4o, strict prompt → sequences perfectly, high pass rate
  v2 → downgrade model or weaken prompt → loses track for longer words
"""

import os
from typing import Callable

from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

load_dotenv()

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are a typewriter. Your only job is to reproduce the given string exactly "
    "by calling letter tools one at a time, in order. "
    "Use tool 'a' to type 'a', tool 'b' to type 'b', and so on. "
    "Do NOT call any tool more than once per character position. "
    "Do NOT add any spaces, punctuation, or extra characters. "
    "After typing all letters, stop immediately — do not explain or summarize."
)


# ── Paper state ───────────────────────────────────────────────────────────────

class _Paper:
    """A stateful buffer that accumulates typed letters. One instance per agent call."""

    def __init__(self):
        self.content: str = ""

    def type_letter(self, letter: str) -> str:
        self.content += letter
        return "OK"

    def read(self) -> str:
        return self.content


# ── Tool factory ──────────────────────────────────────────────────────────────

def _make_letter_tools(paper: _Paper) -> list:
    """
    Create 26 stateful letter tools bound to a given paper instance.
    Each call creates a fresh set tied to the current paper buffer.
    """
    tools = []
    for letter in "abcdefghijklmnopqrstuvwxyz":
        # Build the function first with a real docstring, then wrap with @tool
        def _make(ltr: str = letter):
            def fn() -> str:
                return paper.type_letter(ltr)
            fn.__name__ = ltr
            fn.__doc__ = f'Type the letter "{ltr}" onto the paper.'
            return tool(fn)
        tools.append(_make())
    return tools


# ── Module-level sample tools for snapshot/metadata capture ──────────────────
# Agent Lab snapshots these at eval time for the "Model & Tools" tab.
# These are bound to a throwaway paper — never used for actual eval invocations.
_SAMPLE_PAPER = _Paper()
TYPEWRITER_TOOLS = _make_letter_tools(_SAMPLE_PAPER)


# ── Agent entrypoint ──────────────────────────────────────────────────────────

def run_agent(input: dict, config: dict | None = None) -> dict:
    """
    Agent Lab entrypoint.

    A FRESH paper (and fresh tools) is created per call so the buffer
    starts empty for every new word.

    Args:
        input:  {"question": "hello"}
        config: LangGraph run config (Agent Lab injects Langfuse callbacks here)

    Returns:
        {"answer": "hello"}  ← from paper.read(), not the model message
    """
    # Fresh paper per call — critical for correct state isolation
    paper = _Paper()
    tools = _make_letter_tools(paper)

    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        api_key=os.environ.get("OPENAI_API_KEY"),
    )

    agent = create_react_agent(llm, tools, prompt=SYSTEM_PROMPT)

    # Each letter needs ~2 graph steps (LLM turn + tool call).
    # A 10-letter word = ~22 steps; set limit to 200 to handle any word length.
    merged_config = {"recursion_limit": 200, **(config or {})}

    agent.invoke(
        {"messages": [("human", input["question"])]},
        config=merged_config,
    )

    return {"answer": paper.read()}


if __name__ == "__main__":
    out = run_agent({"question": "hello"})
    print("Typed:", repr(out["answer"]))  # Expected: 'hello'
