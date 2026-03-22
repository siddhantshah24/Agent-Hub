"""
Langfuse SDK compatibility: v2 exposes ``Langfuse``, v3 adds ``get_client()``.
Trace API usage in the dashboard expects a client with ``.api.trace``.
"""

import os
from typing import Any


def sync_langfuse_env_for_client() -> None:
    """SDK v3+ commonly reads LANGFUSE_BASE_URL; Agent Lab documents LANGFUSE_HOST."""
    host = (os.environ.get("LANGFUSE_HOST") or "").strip().rstrip("/")
    if host:
        os.environ.setdefault("LANGFUSE_BASE_URL", host)


def get_langfuse_trace_api_client() -> Any:
    """
    Return a Langfuse client that supports ``client.api.trace.list`` / ``.get``.

    Prefer explicit ``LANGFUSE_*`` env vars (same as ``agentlab eval``). Relying on
    ``get_client()`` alone often fails locally when .env is not in the process cwd.
    """
    sync_langfuse_env_for_client()
    pk = (os.environ.get("LANGFUSE_PUBLIC_KEY") or "").strip() or None
    sk = (os.environ.get("LANGFUSE_SECRET_KEY") or "").strip() or None
    host = (
        (os.environ.get("LANGFUSE_HOST") or "").strip().rstrip("/")
        or (os.environ.get("LANGFUSE_BASE_URL") or "").strip().rstrip("/")
        or "https://cloud.langfuse.com"
    )

    if pk and sk:
        from langfuse import Langfuse

        return Langfuse(public_key=pk, secret_key=sk, host=host)

    try:
        from langfuse import get_client

        return get_client()
    except ImportError:
        pass

    raise RuntimeError(
        "Langfuse keys missing: set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in your .env "
        "(and LANGFUSE_HOST, e.g. http://localhost:3000 for self-hosted)."
    )
