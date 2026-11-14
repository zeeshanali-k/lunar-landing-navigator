#!/usr/bin/env python3
"""CI file-length guardrail enforcing small, single-responsibility source files."""

from __future__ import annotations

import sys
from pathlib import Path

SOFT_LIMIT_LINES = 200
HARD_LIMIT_LINES = 280
TARGET_DIRS = ("backend/src", "backend/tests", "frontend/src", "scripts")
CODE_EXTENSIONS = {".py", ".ts", ".tsx"}
SKIP_DIR_PARTS = {".venv", "node_modules", "dist", "__pycache__", ".git"}


def count_lines(file_path: Path) -> int:
    """Return the number of newline-delimited lines in a source file."""
    with file_path.open("r", encoding="utf-8") as handle:
        return sum(1 for _ in handle)


def scan_repository(repo_root: Path) -> tuple[list[tuple[Path, int]], list[tuple[Path, int]]]:
    """Scan target source folders and collect soft warnings and hard violations."""
    warnings: list[tuple[Path, int]] = []
    violations: list[tuple[Path, int]] = []

    for rel_dir in TARGET_DIRS:
        base_dir = repo_root / rel_dir
        if not base_dir.exists():
            continue
        for file_path in sorted(base_dir.rglob("*")):
            if not file_path.is_file() or file_path.suffix not in CODE_EXTENSIONS:
                continue
            if any(part in SKIP_DIR_PARTS for part in file_path.parts):
                continue
            line_count = count_lines(file_path)
            if line_count > HARD_LIMIT_LINES:
                violations.append((file_path.relative_to(repo_root), line_count))
            elif line_count > SOFT_LIMIT_LINES:
                warnings.append((file_path.relative_to(repo_root), line_count))

    return warnings, violations


def main() -> int:
    """Run the file-length check and exit 1 if any file exceeds HARD_LIMIT_LINES."""
    repo_root = Path(__file__).resolve().parent.parent
    warnings, violations = scan_repository(repo_root)

    for rel_path, lines in warnings:
        print(f"WARN  {rel_path}: {lines} lines (soft limit {SOFT_LIMIT_LINES})")

    for rel_path, lines in violations:
        print(f"FAIL  {rel_path}: {lines} lines (hard limit {HARD_LIMIT_LINES})")

    if violations:
        print(f"\nFile-length check failed: {len(violations)} file(s) exceed {HARD_LIMIT_LINES} lines.")
        return 1

    print(
        f"File-length check passed (0 violations > {HARD_LIMIT_LINES} lines, "
        f"{len(warnings)} warning(s) > {SOFT_LIMIT_LINES} lines)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
