"""
Parses the user's agent-eval.yml config file.

Expected schema:
    agent:
      entrypoint: "src.graph:run_agent"
    dataset:
      path: "datasets/math_evals.jsonl"
      input_key: "question"
      expected_output_key: "answer"
"""

from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass
class EvalConfig:
    entrypoint: str       # e.g. "src.graph:run_agent"
    dataset_path: Path    # resolved absolute path
    input_key: str        # key for the input field in each JSONL row
    expected_output_key: str  # key for the expected answer
    match_mode: str = "exact"  # "exact", "contains", or "numeric"


def parse_config(config_file: Path) -> EvalConfig:
    """Load and validate agent-eval.yml, returning an EvalConfig."""
    if not config_file.exists():
        raise FileNotFoundError(
            f"Config file not found: {config_file}\n"
            "Run `agentlab init` to create one."
        )

    with open(config_file) as f:
        raw = yaml.safe_load(f)

    try:
        entrypoint: str = raw["agent"]["entrypoint"]
        dataset_path: str = raw["dataset"]["path"]
        input_key: str = raw["dataset"]["input_key"]
        expected_output_key: str = raw["dataset"]["expected_output_key"]
    except KeyError as e:
        raise ValueError(f"Missing required field in agent-eval.yml: {e}") from e

    # Resolve dataset path relative to the config file's directory
    resolved = (config_file.parent / dataset_path).resolve()

    match_mode: str = raw.get("dataset", {}).get("match_mode", "exact")

    return EvalConfig(
        entrypoint=entrypoint,
        dataset_path=resolved,
        input_key=input_key,
        expected_output_key=expected_output_key,
        match_mode=match_mode,
    )


INIT_TEMPLATE = """\
agent:
  # Python import path to your agent's callable: "module.submodule:function"
  entrypoint: "src.graph:run_agent"

dataset:
  # Path to your JSONL evaluation dataset (relative to this file)
  path: "datasets/evals.jsonl"
  # Key in each JSONL row that holds the agent input
  input_key: "question"
  # Key in each JSONL row that holds the expected output
  expected_output_key: "answer"
"""
