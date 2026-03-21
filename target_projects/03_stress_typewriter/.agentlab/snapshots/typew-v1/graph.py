"""
Demo 03 — Typewriter (26 tools): "Trace Stress Test" Agent

Uses the official langchain-benchmarks 'Tool Usage - Typewriter (26 tools)' task.
The environment provides 26 tools — one per letter of the alphabet.
The agent must call tools in sequence to type a given word letter by letter.

Example: typing "hello" requires 5 sequential tool calls:
  h() → e() → l() → l() → o()

Why this is a stress test:
  - Each character is a separate tool call → Langfuse traces have N spans per word
  - A 9-letter word generates 9 tool-call nodes in the trace graph
  - The model must plan the sequence correctly with 26 possible tools at each step
  - This stresses the reasoning loop and overwhelms weaker models

Drift scenario:
  v1 → gpt-4o-mini, strict prompt → sequences perfectly, ~100% pass
  v2 → downgrade to gpt-3.5-turbo → loses track of position in long words
  
Agent Lab's trace view in Langfuse will show the exact tool sequence,
while the diff page shows which words failed (usually longer ones first).

Critical: Each run() call creates a FRESH environment instance so the
internal typewriter buffer starts empty for every new word.
"""

import os

from dotenv import load_dotenv
from langchain_benchmarks import registry
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

load_dotenv()

_TASK = registry["Tool Usage - Typewriter (26 tools)"]

SYSTEM_PROMPT = (
    "You are a typewriter. Your only job is to reproduce the given string exactly "
    "by calling letter tools one at a time, in order. "
    "Use tool 'a' to type 'a', tool 'b' to type 'b', and so on. "
    "Do NOT call any tool more than once per character position. "
    "Do NOT add any spaces, punctuation, or extra characters. "
    "After typing all letters, stop immediately — do not explain or summarize."
)


def run_agent(input: dict, config: dict | None = None) -> dict:
    """
    Agent Lab entrypoint.

    The answer is read from the environment's buffer AFTER the agent finishes —
    not from the final AI message. This is the key difference from the other agents.

    Args:
        input:  {"question": "hello"}
        config: LangGraph run config (Agent Lab injects Langfuse callbacks here)

    Returns:
        {"answer": "hello"}  ← from env.read_state(), not the model message
    """
    # CRITICAL: fresh environment per call — buffer starts empty
    env = _TASK.create_environment()

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.environ.get("OPENAI_API_KEY"),
    )

    agent = create_react_agent(llm, env.tools, prompt=SYSTEM_PROMPT)

    agent.invoke(
        {"messages": [("human", input["question"])]},
        config=config or {},
    )

    # Read what was actually typed into the environment buffer
    typed = env.read_state()
    return {"answer": typed if typed else ""}


if __name__ == "__main__":
    out = run_agent({"question": "hello"})
    print("Typed:", repr(out["answer"]))  # Expected: 'hello'
