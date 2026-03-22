"""
Agent Lab CLI — powered by Typer.

Commands:
  agentlab init              Scaffold agent-eval.yml in cwd
  agentlab eval --tag <v>   Run evaluation and save metrics
  agentlab rollback --tag <v> Restore agent file from snapshot
  agentlab ui               Start FastAPI + Next.js dashboard
"""

import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

import typer
from dotenv import find_dotenv, load_dotenv
from rich.console import Console

app = typer.Typer(
    name="agentlab",
    help="Agent Lab — local MLOps for LangGraph agents",
    add_completion=False,
)
console = Console()

# Database file lives in the project root (cwd when commands are run)
DB_FILENAME = ".agentlab.db"
CONFIG_FILENAME = "agent-eval.yml"


def _project_root() -> Path:
    return Path.cwd()


def _db_path() -> Path:
    return _project_root() / DB_FILENAME


def _load_env() -> dict:
    """
    Load .env by searching upward from cwd.
    A single .env at the workspace root is shared by all target projects.
    """
    dotenv_path = find_dotenv(usecwd=True)
    if dotenv_path:
        load_dotenv(dotenv_path, override=False)
    return {
        "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", ""),
        "LANGFUSE_PUBLIC_KEY": os.environ.get("LANGFUSE_PUBLIC_KEY", ""),
        "LANGFUSE_SECRET_KEY": os.environ.get("LANGFUSE_SECRET_KEY", ""),
        "LANGFUSE_HOST": os.environ.get("LANGFUSE_HOST", "http://localhost:3000"),
    }


# ---------------------------------------------------------------------------
# agentlab init
# ---------------------------------------------------------------------------

@app.command()
def init():
    """Scaffold an agent-eval.yml config file in the current directory."""
    from .parser import INIT_TEMPLATE

    config_file = _project_root() / CONFIG_FILENAME
    if config_file.exists():
        overwrite = typer.confirm(
            f"{CONFIG_FILENAME} already exists. Overwrite?", default=False
        )
        if not overwrite:
            console.print("[yellow]Aborted.[/]")
            raise typer.Exit()

    config_file.write_text(INIT_TEMPLATE)
    console.print(f"[green]Created[/] {config_file}")
    console.print(
        "\nNext steps:\n"
        "  1. Edit [bold]agent-eval.yml[/] to point at your agent and dataset.\n"
        "  2. Add your API keys to [bold].env[/].\n"
        "  3. Run [bold]agentlab eval --tag v1[/]"
    )


# ---------------------------------------------------------------------------
# agentlab eval
# ---------------------------------------------------------------------------

@app.command()
def eval(
    tag: Optional[str] = typer.Option(
        None, "--tag", "-t",
        help="Version tag (e.g. v1, prompt-v2). Omit to auto-generate from content hash.",
    ),
    config: Path = typer.Option(
        None, "--config", "-c", help="Path to agent-eval.yml (default: ./agent-eval.yml)"
    ),
    force: bool = typer.Option(
        False, "--force", help="Overwrite an existing tag instead of erroring.",
    ),
    limit: Optional[int] = typer.Option(
        None, "--limit", "-n",
        help="Only run the first N samples. Useful for quick smoke tests.",
    ),
    notes: str = typer.Option(
        "", "--notes", "-m",
        help="Human-readable description of what changed in this version.",
    ),
):
    """Run evaluation against the golden dataset and record metrics."""
    from .parser import parse_config
    from .runner import run_evaluation

    env = _load_env()
    config_file = config or (_project_root() / CONFIG_FILENAME)
    eval_config = parse_config(config_file)

    if not env["LANGFUSE_PUBLIC_KEY"]:
        console.print(
            "[yellow]Warning:[/] LANGFUSE_PUBLIC_KEY not set — tracing will be skipped.\n"
            "Add it to your .env file for full observability."
        )

    try:
        result = run_evaluation(
            config=eval_config,
            tag=tag,
            project_root=_project_root(),
            db_path=_db_path(),
            langfuse_public_key=env["LANGFUSE_PUBLIC_KEY"],
            langfuse_secret_key=env["LANGFUSE_SECRET_KEY"],
            langfuse_host=env["LANGFUSE_HOST"],
            force=force,
            limit=limit,
            notes=notes,
        )
    except ValueError as e:
        console.print(f"[red bold]Error:[/] {e}")
        raise typer.Exit(1)

    final_tag = result.get("tag", tag)
    console.print(
        f"\n[bold green]Done![/] Run saved as [bold]{final_tag}[/]. "
        "Start the dashboard with [bold]agentlab ui[/]"
    )


# ---------------------------------------------------------------------------
# agentlab rollback
# ---------------------------------------------------------------------------

@app.command()
def rollback(
    tag: str = typer.Option(..., "--tag", "-t", help="Version tag to roll back to"),
):
    """Restore the agent source file from a previously snapshotted version."""
    from .runner import rollback_to_tag

    rollback_to_tag(
        tag=tag,
        project_root=_project_root(),
        db_path=_db_path(),
    )
    console.print(
        f"\n[bold green]Rolled back to {tag}.[/] "
        "Run [bold]agentlab eval --tag rollback-check[/] to verify."
    )


# ---------------------------------------------------------------------------
# agentlab ui
# ---------------------------------------------------------------------------

@app.command()
def ui(
    api_port: int = typer.Option(8000, "--api-port", help="FastAPI server port"),
    ui_port: int = typer.Option(3001, "--ui-port", help="Next.js dev server port"),
):
    """Launch the FastAPI backend and Next.js dashboard."""
    import signal

    # Locate agent_lab root (two levels up from this file's package)
    agent_lab_root = Path(__file__).parent.parent.resolve()
    ui_dir = agent_lab_root / "agent_lab_ui"

    # Auto-detect a target_projects/ directory by scanning upward from cwd
    projects_root: Optional[str] = None
    for parent in [_project_root(), *_project_root().parents]:
        candidate = parent / "target_projects"
        if candidate.exists() and candidate.is_dir():
            projects_root = str(candidate)
            break

    env = {**os.environ, **_load_env(), "AGENTLAB_DB": str(_db_path())}
    if projects_root:
        env["AGENTLAB_PROJECTS_ROOT"] = projects_root
        console.print(f"  Projects  → {projects_root}")

    console.print(f"[bold cyan]Starting Agent Lab UI[/]")
    console.print(f"  API   → http://localhost:{api_port}")
    console.print(f"  Dashboard → http://localhost:{ui_port}\n")

    # Start FastAPI
    api_proc = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn",
            "agent_lab_core.server:app",
            "--host", "0.0.0.0",
            "--port", str(api_port),
            "--reload",
        ],
        cwd=str(agent_lab_root),
        env=env,
    )

    # Start Next.js
    npm_cmd = "npm"
    next_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "-p", str(ui_port)],
        cwd=str(ui_dir),
        env={
            **env,
            "NEXT_PUBLIC_API_URL": f"http://localhost:{api_port}",
        },
    )

    def _shutdown(sig, frame):
        console.print("\n[yellow]Shutting down...[/]")
        api_proc.terminate()
        next_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    api_proc.wait()
    next_proc.wait()


if __name__ == "__main__":
    app()
