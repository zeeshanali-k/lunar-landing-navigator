"""Prohibition checks: no 3D rendering and no AI/ML component may enter the build."""

from __future__ import annotations

from typing import Any

from planning_checks import AI_TOKENS, ROOT, THREE_D_TOKENS, PlanError, require


def _haystack(task: dict[str, Any]) -> str:
    return " ".join(
        [task["id"], task["title"], *task["acceptance"], *task["write_paths"], *task["outputs"]]
    ).lower()


def verify_three_d(task: dict[str, Any], by_id: dict[str, dict[str, Any]]) -> None:
    """Reject 3D work unless both gates are done and it is revision-approved."""
    haystack = _haystack(task)
    if not any(token in haystack for token in THREE_D_TOKENS):
        return
    require(task["status"] == "done", f"{task['id']} references 3D without an approved revision")
    for gate in ("P0-GATE", "P1-GATE"):
        require(
            by_id.get(gate, {}).get("status") == "done",
            f"{task['id']} references 3D before {gate} is done",
        )


def verify_no_ai(task: dict[str, Any]) -> None:
    """Reject any task that proposes adding an AI dependency or inference path."""
    haystack = _haystack(task)
    for token in AI_TOKENS:
        require(token not in haystack, f"{task['id']} proposes prohibited AI dependency {token!r}")


def verify_manifests_have_no_ai() -> None:
    """Fail if a runtime dependency manifest declares an AI/ML package."""
    manifests = (
        ROOT / "backend" / "pyproject.toml",
        ROOT / "frontend" / "package.json",
        ROOT / "frontend" / "bun.lock",
    )
    for manifest in manifests:
        if not manifest.exists():
            continue
        text = manifest.read_text(encoding="utf-8", errors="replace").lower()
        for token in AI_TOKENS:
            require(
                token not in text,
                f"{manifest.relative_to(ROOT)} declares prohibited AI dependency {token!r}",
            )


PHYSICS_LITERALS = ("1737.4", "1361", "89.9999", "0.267")


def verify_frontend_has_no_physics() -> None:
    """The frontend renders API numbers; it must not restate physical constants."""
    source = ROOT / "frontend" / "src"
    if not source.exists():
        return
    for path in sorted(source.rglob("*")):
        if path.suffix not in {".ts", ".tsx"} or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for literal in PHYSICS_LITERALS:
            require(
                literal not in text,
                f"{path.relative_to(ROOT)} restates physical constant {literal!r}; "
                "import it from the API contract instead",
            )
