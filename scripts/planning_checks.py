"""Shared constants and helpers for the planning-document validators."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
LEDGER = ROOT / "plan" / "task-ledger.json"
SCHEMA = ROOT / "plan" / "task-ledger.schema.json"
PLAN = ROOT / "DEVELOPMENT_PLAN.md"
AGENTS = ROOT / "AGENTS.md"
README = ROOT / "README.md"

ID_RE = re.compile(r"^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*$")
REQ_RE = re.compile(r"^REQ-(0[1-9]|1[0-2])$")
UTC_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")

REQUIRED_KEYS = {
    "id", "title", "phase", "priority", "owner", "reviewer", "status",
    "depends_on", "requirement_ids", "working_directory", "read_paths",
    "write_paths", "inputs", "outputs", "commands", "acceptance",
    "required_evidence", "evidence", "human_approval_required", "approval",
    "blocked_reason", "completed_at_utc", "completed_commit",
}
PHASES = {"planning", "foundation", "data", "backend", "frontend", "qa", "gate", "p1", "delivery"}
PRIORITIES = {"P0", "P1", "delivery"}
OWNERS = {f"M{n}" for n in range(1, 6)}
REVIEWERS = {f"M{n}" for n in range(1, 6)} | {"human"}
MODULES = OWNERS
STATUSES = {"pending", "in_progress", "blocked", "done"}
EVIDENCE_KINDS = {"command", "artifact", "approval", "report"}

PROHIBITED_TOKENS = (
    r"\bpip install\b",
    r"\buv pip\b",
    r"(?<!p)\bnpm install\b",
    r"(?<!p)\bnpm run\b",
    r"\bnpx\b",
)

THREE_D_TOKENS = (
    "three.js",
    "@react-three/fiber",
    "@react-three/drei",
    'from "three"',
    "terrain-3d",
    "shadow engine",
)

AI_TOKENS = (
    "openai",
    "anthropic",
    "langchain",
    "llama",
    "llama.cpp",
    "onnxruntime",
    "onnx",
    "transformers",
    "huggingface",
    "sentence-transformers",
    "ollama",
    "torch",
    "tensorflow",
    "scikit-learn",
    "vllm",
    "spacy",
    "tiktoken",
)

REQUIRED_ANCHORS = [f"req-{n:02d}" for n in range(1, 13)]
HISTORICAL_MARKER = "STATUS: HISTORICAL"
TASK_REF_RE = re.compile(r"TASKS?:\s*([A-Z0-9,\s-]+)")
ANCHOR_REF_RE = re.compile(r"DEVELOPMENT_PLAN\.md#(req-\d{2})")
VAGUE_ACCEPTANCE = (
    "looks right",
    "looks like a moon ridge",
    "real nasa physics",
    "believable",
    "nearly free",
    "real slack",
    "all tests pass",
)
LEGACY_DOCS = [
    ROOT / "DEVELOPMENT_PLAN.md",
    *sorted((ROOT / "plan").glob("0[0-5]-*.md")),
]


class PlanError(Exception):
    """Raised when a planning document or ledger violates a rule."""


def require(condition: bool, message: str) -> None:
    """Raise a plan error when a condition does not hold."""
    if not condition:
        raise PlanError(message)


def read(path: Path) -> str:
    """Read a UTF-8 document, failing clearly when absent."""
    if not path.exists():
        raise PlanError(f"missing document: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> dict[str, Any]:
    """Load a JSON document, reporting a readable error on failure."""
    text = read(path)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise PlanError(f"invalid JSON in {path.relative_to(ROOT)}: {exc}") from exc


def find_prohibited(text: str) -> str | None:
    """Return the first prohibited package-manager form, ignoring pnpm substrings."""
    lowered = text.lower()
    for pattern in PROHIBITED_TOKENS:
        match = re.search(pattern, lowered)
        if match:
            return match.group(0)
    return None
