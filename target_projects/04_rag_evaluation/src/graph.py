"""
Demo 04 — Financial Knowledge RAG: "Retrieval Quality" Agent

A LangGraph RAG agent backed by a local FAISS vector store built from
documents/financial_kb.txt at import time (no external service needed).

Drift scenario:
  v1 → strict prompt ("answer ONLY from retrieved context") + top_k=3
       → lower faithfulness but very conservative answers
  v2 → relaxed prompt + top_k=5
       → higher faithfulness (more context to draw from), better relevancy

Agent Lab tracks: faithfulness, answer_relevancy, context_precision (RAGAS)
plus the usual pass/fail (keyword-contains), latency, and cost.

To create v2: change SYSTEM_PROMPT = SYSTEM_PROMPT_V2 and top_k = 5 below.
"""

import os
import re
from pathlib import Path
from typing import Annotated, Any

from dotenv import load_dotenv
from langchain_core.messages import AnyMessage, HumanMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

load_dotenv()

# ── System Prompts (switch SYSTEM_PROMPT between V1/V2 to create drift) ───────

SYSTEM_PROMPT_V1 = (
    "You are a financial knowledge assistant. "
    "You MUST answer exclusively using the information retrieved by the search tool. "
    "Do NOT use any outside knowledge or make assumptions. "
    "If the retrieved context does not contain enough information, say so explicitly. "
    "Keep answers concise and directly grounded in the retrieved text."
)

SYSTEM_PROMPT_V2 = (
    "You are a helpful financial assistant. "
    "Use the search tool to find relevant information, then provide a clear and "
    "helpful answer. You may supplement retrieved context with your general knowledge "
    "when needed to give a complete response."
)

# ── Active config — change these to create a new version ──────────────────────

SYSTEM_PROMPT = SYSTEM_PROMPT_V2   # switched to V2 for second run
top_k = 5                           # increased from 3 to 5 for second run

# ── Build FAISS index from local documents ────────────────────────────────────

_DOCS_PATH = Path(__file__).parent.parent / "documents" / "financial_kb.txt"

def _build_index() -> FAISS:
    """Parse financial_kb.txt into chunks and embed into FAISS at startup."""
    raw = _DOCS_PATH.read_text(encoding="utf-8")
    # Split on ## DOCUMENT: headers first, then chunk by size
    sections = re.split(r"(?=## DOCUMENT:)", raw)
    sections = [s.strip() for s in sections if s.strip()]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=60,
        separators=["\n\n", "\n", ". ", " "],
    )
    chunks = []
    for sec in sections:
        chunks.extend(splitter.split_text(sec))

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    index = FAISS.from_texts(chunks, embeddings)
    return index

_INDEX: FAISS = _build_index()

# ── Retrieval tool ─────────────────────────────────────────────────────────────

@tool
def search_knowledge_base(query: str) -> str:
    """Search the financial knowledge base for information relevant to the query.

    Args:
        query: The search query to look up in the knowledge base.

    Returns:
        Relevant text passages from the financial knowledge base.
    """
    docs = _INDEX.similarity_search(query, k=top_k)
    if not docs:
        return "No relevant information found."
    return "\n\n---\n\n".join(d.page_content for d in docs)

RAG_TOOLS = [search_knowledge_base]

# ── LangGraph agent ───────────────────────────────────────────────────────────

_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
_llm_with_tools = _llm.bind_tools(RAG_TOOLS)


class _State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    contexts: list[str]


def _agent_node(state: _State) -> dict:
    msgs = state["messages"]
    if len(msgs) == 1:
        # Inject system prompt on the first call
        from langchain_core.messages import SystemMessage
        msgs = [SystemMessage(content=SYSTEM_PROMPT)] + list(msgs)
    response = _llm_with_tools.invoke(msgs)
    return {"messages": [response]}


def _should_continue(state: _State) -> str:
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tools"
    return END


def _tool_node_with_context(state: _State) -> dict:
    """Run the retrieval tool and capture context strings for RAGAS."""
    last = state["messages"][-1]
    tool_results = []
    contexts = list(state.get("contexts") or [])

    for tc in last.tool_calls:
        args = tc.get("args", {})
        query = args.get("query", "")
        output = search_knowledge_base.invoke(args)
        # Store each retrieved chunk separately for RAGAS
        for chunk in output.split("\n\n---\n\n"):
            chunk = chunk.strip()
            if chunk:
                contexts.append(chunk)
        from langchain_core.messages import ToolMessage
        tool_results.append(
            ToolMessage(content=output, tool_call_id=tc["id"])
        )

    return {"messages": tool_results, "contexts": contexts}


_builder = StateGraph(_State)
_builder.add_node("agent", _agent_node)
_builder.add_node("tools", _tool_node_with_context)
_builder.add_edge(START, "agent")
_builder.add_conditional_edges("agent", _should_continue, ["tools", END])
_builder.add_edge("tools", "agent")
_graph = _builder.compile()


# ── Public entry point ─────────────────────────────────────────────────────────

def run_agent(inputs: dict, config: dict | None = None) -> dict:
    """
    Agent Lab entry point.

    Args:
        inputs: {"question": str}
        config: LangChain config dict with callbacks injected by Agent Lab runner

    Returns:
        {"answer": str, "contexts": list[str]}
        The `contexts` key triggers RAGAS scoring in the runner.
    """
    question = inputs.get("question", "")
    invoke_kwargs: dict[str, Any] = {"messages": [HumanMessage(content=question)], "contexts": []}
    if config:
        result = _graph.invoke(invoke_kwargs, config)
    else:
        result = _graph.invoke(invoke_kwargs)

    answer = result["messages"][-1].content
    contexts = result.get("contexts", [])
    return {"answer": answer, "contexts": contexts}
