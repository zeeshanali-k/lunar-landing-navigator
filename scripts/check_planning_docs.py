#!/usr/bin/env python3
"""Check that the planning documents stay consistent, annotated, and non-contradictory."""

from __future__ import annotations

import re
import sys

from planning_checks import (
    AGENTS,
    ANCHOR_REF_RE,
    HISTORICAL_MARKER,
    LEDGER,
    LEGACY_DOCS,
    PLAN,
    REQUIRED_ANCHORS,
    ROOT,
    TASK_REF_RE,
    VAGUE_ACCEPTANCE,
    PlanError,
    find_prohibited,
    load_json,
    read,
    require,
)

SKIP_TOKENS = {"TASKS", "TASK", "REQ", "STATUS", "REASON", "REPLACEMENT"}


def check_plan_anchors() -> set[str]:
    """Every requirement must be defined exactly once in the operative plan."""
    text = read(PLAN)
    found = set(re.findall(r'<a id="(req-\d{2})"></a>', text))
    for anchor in REQUIRED_ANCHORS:
        require(anchor in found, f"plan missing requirement anchor #{anchor}")
    require(len(found) == 12, f"plan defines {len(found)} anchors, expected 12")
    return found


def check_plan_is_closed() -> None:
    """Normative sections must contain no placeholders and no prohibited commands."""
    text = read(PLAN)
    for token in ("TBD", "TODO", "FIXME", "XXX"):
        require(token not in text, f"plan contains unresolved placeholder {token}")
    offending = find_prohibited(text)
    require(offending is None, f"plan contains prohibited command form {offending!r}")


def check_plan_declares_authority() -> None:
    """The plan must name the three authorities, the conflict rule, and the AI non-goal."""
    text = read(PLAN)
    for authority in ("AGENTS.md", "plan/task-ledger.json", "HACKATHON_BUILD_PLAN.md"):
        require(authority in text, f"plan does not name authority {authority}")
    require("Conflict rule" in text, "plan does not state the conflict rule")
    require("Non-goal — no runtime AI" in text, "plan does not state the no-AI non-goal")
    require(
        "No duplication is permitted anywhere" in text,
        "plan does not state the single-source-of-truth rule",
    )


def check_agents_protocol() -> None:
    """AGENTS.md must contain the protocol, prohibitions, and the allowed tooling forms."""
    text = read(AGENTS)
    for phrase in ("task-ledger.json", "blocked", "evidence", "README.md", "Do not start 3D"):
        require(phrase in text, f"AGENTS.md missing {phrase!r}")
    require("Do not add any AI" in text, "AGENTS.md does not prohibit AI components")
    require("uv run --python 3.12 --frozen" in text, "AGENTS.md missing the uv run form")
    require("bun run" in text, "AGENTS.md missing the Bun command form")
    offending = find_prohibited(text)
    require(offending is None, f"AGENTS.md contains prohibited {offending!r}")


def check_no_duplicate_fixtures() -> None:
    """Fixture trees must not be maintained as divergent hand-edited copies."""
    canonical = ROOT / "contracts" / "fixtures"
    duplicate = ROOT / "frontend" / "public" / "data" / "fixtures"
    if not duplicate.exists():
        return
    for path in sorted(duplicate.glob("*.json")):
        twin = canonical / path.name
        require(
            twin.exists() and twin.read_bytes() == path.read_bytes(),
            f"{path.relative_to(ROOT)} diverges from {twin.relative_to(ROOT)}; "
            "fixtures must be generated, not hand-maintained in two places",
        )


def check_legacy_annotations(task_ids: set[str], anchors: set[str]) -> None:
    """Legacy documents stay present, annotated, and never contradict the ledger."""
    for path in LEGACY_DOCS:
        text = read(path)
        relative = path.relative_to(path.parents[len(path.parents) - 1])
        name = "/".join(relative.parts[1:]) if len(relative.parts) > 1 else path.name
        require(HISTORICAL_MARKER in text, f"{name} lacks a top-level historical marker")
        require("HACKATHON_BUILD_PLAN.md" in text, f"{name} does not point at the operative plan")
        offending = find_prohibited(text)
        require(offending is None, f"{name} contains prohibited command form {offending!r}")
        for reference in TASK_REF_RE.findall(text):
            for task_id in re.findall(r"[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*", reference):
                if task_id in SKIP_TOKENS:
                    continue
                require(task_id in task_ids, f"{name} references unknown task {task_id}")
        for anchor in ANCHOR_REF_RE.findall(text):
            require(anchor in anchors, f"{name} references unknown anchor {anchor}")


def check_ledger_consistency(task_ids: set[str], anchors: set[str]) -> None:
    """The ledger must reference known requirements and known tasks only."""
    ledger = load_json(LEDGER)
    for task in ledger["tasks"]:
        for requirement in task["requirement_ids"]:
            require(requirement.lower() in anchors, f"{task['id']} unknown requirement {requirement}")
        for dependency in task["depends_on"]:
            require(dependency in task_ids, f"{task['id']} depends on unknown task {dependency}")


def check_no_vague_acceptance() -> None:
    """Acceptance criteria must be deterministic, not stylistic."""
    ledger = load_json(LEDGER)
    for task in ledger["tasks"]:
        joined = " ".join(task["acceptance"]).lower()
        for phrase in VAGUE_ACCEPTANCE:
            require(phrase not in joined, f"{task['id']} acceptance uses vague phrase {phrase!r}")


def main() -> int:
    """Run every documentation check and report the outcome."""
    try:
        anchors = check_plan_anchors()
        check_plan_is_closed()
        check_plan_declares_authority()
        check_agents_protocol()
        task_ids = {task["id"] for task in load_json(LEDGER)["tasks"]}
        check_legacy_annotations(task_ids, anchors)
        check_ledger_consistency(task_ids, anchors)
        check_no_vague_acceptance()
        check_no_duplicate_fixtures()
    except PlanError as exc:
        print(f"FAIL  {exc}")
        return 1

    print(
        f"OK    {len(anchors)} anchors, {len(task_ids)} ledger tasks, "
        f"{len(LEGACY_DOCS)} legacy documents annotated"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
