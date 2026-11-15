# Protected Files

Files listed here are **human-owned**. No agent may create, edit, delete, or rename them. This exists because an agent whose task is judged by a check must never be able to edit that check.

## Protected set

```text
AGENTS.md
DEVELOPMENT_PLAN.md
plan/**
scripts/validate_task_ledger.py
scripts/check_planning_docs.py
scripts/check_file_lengths.py
scripts/planning_checks.py
scripts/prohibited_checks.py
.gitignore
.githooks/**
CODEOWNERS
```

## Why each is protected

| Path | Reason |
|---|---|
| `AGENTS.md`, `DEVELOPMENT_PLAN.md`, `plan/**` | Define the rules. An agent editing these can redefine what "done" means. |
| `scripts/*.py` | Judge whether the work is done. An agent editing these can make itself pass. |
| `.gitignore` | Controls what enters history. An agent editing this can hide artefacts it should not commit. |
| `.githooks/**` | Enforce commit identity. An agent editing this can attribute work to itself. |
| `CODEOWNERS` | Requests human review. An agent editing this can route review to itself. |

## Required behaviour

If a task appears to need a protected file changed, the agent **stops** and reports:

```text
PROTECTED PATH: <path>
REASON: <what needs to change and why>
ACTION REQUIRED: human edit, or approved plan revision
```

An agent never edits a protected file "just to make the check pass", never relaxes an assertion, never deletes a failing test, and never adds an exclusion. A failing check is reported, not silenced.

## Enforcement

Three independent layers, so a single bypass is not enough:

1. **Local hook** — `.githooks/pre-commit` rejects staged changes to protected paths unless the commit is explicitly signed off by a human with `ALLOW_PROTECTED=1`.
2. **Digest manifest** — `plan/protected.sha256` records the hash of every protected file. `scripts/check_planning_docs.py` fails when any hash drifts.
3. **CI** — a pull request that touches a protected path fails unless a human reviewer approves it, and `main` requires that review before merge.

## Test integrity

Beyond protected files, these rules stop an agent from weakening its own evidence:

- An existing test file may be **extended**; deleting a test, renaming it away, or marking it skipped is a protected change.
- Test configuration such as `pytest.ini`, `vitest.config.ts`, and coverage thresholds is protected.
- The number of collected tests may not decrease between `main` and a branch. `scripts/check_planning_docs.py` compares the collected count when a test runner is available.
- Assertions may not be replaced with `assert True`, `pass`, or an equivalent tautology.
- A tolerance may not be widened without a recorded reason in the ledger task's evidence.
