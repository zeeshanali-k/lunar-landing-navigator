#!/usr/bin/env python3
"""Validate plan/task-ledger.json against its schema and its own DAG rules."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Any

from planning_checks import (
    EVIDENCE_KINDS,
    ID_RE,
    LEDGER,
    OWNERS,
    PHASES,
    PLAN,
    PRIORITIES,
    README,
    REQUIRED_KEYS,
    REQ_RE,
    REVIEWERS,
    ROOT,
    SCHEMA,
    SHA_RE,
    STATUSES,
    UTC_RE,
    PlanError,
    find_prohibited,
    load_json,
    require,
)
from prohibited_checks import (
    verify_frontend_has_no_physics,
    verify_unowned_modules_blocked,
    verify_manifests_have_no_ai,
    verify_no_ai,
    verify_three_d,
)

__all__ = ["main"]


def verify_schema_document(schema: dict[str, Any]) -> None:
    """Check the schema file itself is a closed draft 2020-12 object schema."""
    require("draft/2020-12" in str(schema.get("$schema", "")), "schema must declare draft 2020-12")
    require(schema.get("additionalProperties") is False, "schema root must be closed")
    task = schema.get("$defs", {}).get("task", {})
    require(task.get("additionalProperties") is False, "schema task definition must be closed")
    missing = REQUIRED_KEYS - set(task.get("required", []))
    require(not missing, f"schema task definition missing required keys: {sorted(missing)}")


def verify_structure(ledger: dict[str, Any], schema: dict[str, Any]) -> list[dict[str, Any]]:
    """Apply required keys, unknown-key rejection, and enum constraints."""
    require(
        not set(ledger) - {"schema_version", "requirement_anchors", "ownership", "tasks"},
        "ledger has unexpected top-level keys",
    )
    require(
        ledger.get("schema_version") == schema["properties"]["schema_version"]["const"],
        "schema_version mismatch",
    )
    anchors = ledger.get("requirement_anchors", [])
    require(
        anchors == [f"REQ-{n:02d}" for n in range(1, 13)],
        "requirement_anchors must be exactly REQ-01 .. REQ-12 in order",
    )
    ownership = ledger.get("ownership", {})
    require(ownership.get("model") == "module", "ownership.model must be 'module'")
    require(
        ownership.get("source") == "plan/OWNERS.md",
        "ownership.source must point at plan/OWNERS.md",
    )
    modules = ownership.get("modules", {})
    require(
        set(modules) == {f"M{n}" for n in range(1, 6)},
        "ownership must declare exactly M1..M5",
    )
    enums = {
        "phase": PHASES,
        "priority": PRIORITIES,
        "owner": OWNERS,
        "reviewer": REVIEWERS,
        "status": STATUSES,
    }
    tasks = ledger.get("tasks", [])
    require(bool(tasks), "ledger declares no tasks")
    for index, task in enumerate(tasks):
        where = f"task[{index}]"
        require(
            set(task) == REQUIRED_KEYS,
            f"{where} keys differ: missing {sorted(REQUIRED_KEYS - set(task))}, "
            f"unknown {sorted(set(task) - REQUIRED_KEYS)}",
        )
        for field, allowed in enums.items():
            require(task[field] in allowed, f"{where} invalid {field} {task[field]!r}")
        require(
            task["owner"] != task["reviewer"],
            f"{where} owner and reviewer are the same module",
        )
    return tasks


def verify_dependencies(tasks: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Check unique ids, existing dependencies, and acyclicity."""
    by_id: dict[str, dict[str, Any]] = {}
    for task in tasks:
        require(bool(ID_RE.match(task["id"])), f"invalid task id format: {task['id']!r}")
        require(task["id"] not in by_id, f"duplicate task id: {task['id']}")
        by_id[task["id"]] = task
    for task in tasks:
        for dependency in task["depends_on"]:
            require(dependency in by_id, f"{task['id']} depends on unknown task {dependency}")
            require(dependency != task["id"], f"{task['id']} depends on itself")

    remaining = {task["id"]: set(task["depends_on"]) for task in tasks}
    while remaining:
        ready = [node for node, deps in remaining.items() if not deps]
        require(bool(ready), f"dependency cycle among {sorted(remaining)}")
        for node in ready:
            del remaining[node]
        for deps in remaining.values():
            deps.difference_update(ready)
    return by_id


def verify_task_shape(task: dict[str, Any]) -> None:
    """Reject unsafe paths and prohibited or empty commands."""
    for key in ("read_paths", "write_paths", "inputs", "outputs"):
        for value in task[key]:
            candidate = Path(value)
            require(not candidate.is_absolute(), f"{task['id']} {key} entry is absolute: {value!r}")
            require(".." not in candidate.parts, f"{task['id']} {key} entry escapes: {value!r}")
    cwd = Path(task["working_directory"])
    require(not cwd.is_absolute(), f"{task['id']} working_directory is absolute")
    require(".." not in cwd.parts, f"{task['id']} working_directory escapes")

    require(bool(task["commands"]), f"{task['id']} declares no commands")
    for command in task["commands"]:
        require(bool(command["run"].strip()), f"{task['id']} has an empty command")
        offending = find_prohibited(command["run"])
        require(offending is None, f"{task['id']} uses prohibited {offending!r}")
        require(isinstance(command["expected_exit"], int), f"{task['id']} expected_exit not int")


def verify_requirements(task: dict[str, Any], anchors: set[str]) -> None:
    """Check requirement ids resolve to plan anchors."""
    require(bool(task["requirement_ids"]), f"{task['id']} has no requirement_ids")
    for requirement in task["requirement_ids"]:
        require(
            bool(REQ_RE.match(requirement)) and requirement in anchors,
            f"{task['id']} has invalid requirement id {requirement!r}",
        )


def verify_done_state(task: dict[str, Any], by_id: dict[str, dict[str, Any]]) -> None:
    """Validate the state-dependent fields of a task."""
    status = task["status"]
    if status == "done":
        for dependency in task["depends_on"]:
            require(
                by_id[dependency]["status"] == "done",
                f"{task['id']} is done but dependency {dependency} is not",
            )
        require(
            bool(task["completed_at_utc"]) and bool(UTC_RE.match(task["completed_at_utc"])),
            f"{task['id']} is done without a valid UTC completion time",
        )
        require(
            bool(task["completed_commit"]) and len(task["completed_commit"]) >= 7,
            f"{task['id']} is done without a completion commit",
        )
        require(task["blocked_reason"] is None, f"{task['id']} is done but still blocked")
        required = {(i["kind"], i["ref"]) for i in task["required_evidence"]}
        recorded = {(i["kind"], i["ref"]) for i in task["evidence"]}
        require(not required - recorded, f"{task['id']} evidence incomplete: {required - recorded}")
        for item in task["evidence"]:
            require(item["kind"] in EVIDENCE_KINDS, f"{task['id']} invalid evidence kind")
            if item["kind"] == "command":
                require(item.get("exit") == 0, f"{task['id']} has a failing command in evidence")
            if item["kind"] == "artifact":
                require(
                    bool(item.get("sha256")) and bool(SHA_RE.match(item["sha256"])),
                    f"{task['id']} artifact evidence lacks a valid sha256",
                )
                require((ROOT / item["ref"]).exists(), f"{task['id']} artifact missing: {item['ref']}")
    elif status == "blocked":
        require(
            bool(task["blocked_reason"]) and len(task["blocked_reason"]) >= 10,
            f"{task['id']} is blocked without an explanatory reason",
        )
    else:
        require(
            task["completed_at_utc"] is None and task["completed_commit"] is None,
            f"{task['id']} is {status} but records completion fields",
        )

    if task["human_approval_required"]:
        require(task["reviewer"] == "human", f"{task['id']} needs a human reviewer")
        require(
            status != "done" or bool(task["approval"]),
            f"{task['id']} is done without a recorded human approval",
        )


def verify_close_out(tasks: list[dict[str, Any]], by_id: dict[str, dict[str, Any]]) -> None:
    """Check a single in-progress task and that P1 stays gated."""
    in_progress = [task["id"] for task in tasks if task["status"] == "in_progress"]
    require(len(in_progress) <= 1, f"more than one task in progress: {in_progress}")
    if by_id["P1-APPROVAL"]["status"] != "done":
        for task in tasks:
            require(
                not (task["phase"] == "p1" and task["status"] in {"in_progress", "done"}),
                f"{task['id']} ran before P1-APPROVAL was done",
            )


def verify_plan_anchors(anchors: set[str]) -> None:
    """Confirm every requirement anchor exists in the operative plan."""
    require(PLAN.exists(), "DEVELOPMENT_PLAN.md is missing")
    text = PLAN.read_text(encoding="utf-8")
    for anchor in anchors:
        require(
            f'id="{anchor.lower()}"' in text or f"## {anchor} " in text,
            f"plan does not define anchor {anchor}",
        )


def verify_readme_untouched() -> None:
    """README.md must stay unchanged until DELIVERY-002."""
    result = subprocess.run(
        ["git", "diff", "--exit-code", "--", README.name],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    require(result.returncode == 0, "README.md changed; its rewrite belongs to DELIVERY-002")


def main() -> int:
    """Run every ledger check and report the outcome."""
    try:
        schema = load_json(SCHEMA)
        verify_schema_document(schema)
        ledger = load_json(LEDGER)
        tasks = verify_structure(ledger, schema)
        by_id = verify_dependencies(tasks)
        anchors = set(ledger["requirement_anchors"])
        verify_plan_anchors(anchors)
        for task in tasks:
            verify_task_shape(task)
            verify_requirements(task, anchors)
            verify_done_state(task, by_id)
            verify_three_d(task, by_id)
            verify_no_ai(task)
        verify_close_out(tasks, by_id)
        verify_unowned_modules_blocked(tasks, ledger)
        verify_readme_untouched()
        verify_manifests_have_no_ai()
        verify_frontend_has_no_physics()
    except PlanError as exc:
        print(f"FAIL  {exc}")
        return 1

    done = sum(1 for task in tasks if task["status"] == "done")
    print(f"OK    {len(tasks)} tasks validated, {done} done, no cycles, all anchors resolved")
    return 0


if __name__ == "__main__":
    sys.exit(main())
