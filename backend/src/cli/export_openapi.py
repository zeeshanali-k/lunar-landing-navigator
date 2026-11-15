"""Generate the wire-contract artefacts from the Pydantic models (ARCH-002, REQ-06).

Two artefacts are produced, both from the FastAPI application's OpenAPI document,
so the Pydantic models in ``backend/src/api/schemas/`` stay the single source of
truth:

    contracts/openapi.json                committed OpenAPI 3.1 document
    frontend/src/types/api.generated.ts   TypeScript interfaces for the same schemas

Neither file is ever hand-edited; this module is the only writer.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.api.main import app
from src.api.schemas.fixture_synth import (
    build_compare_fixture,
    build_evaluate_fixture,
    build_fixture_manifest,
    build_health_fixture,
    build_sites_fixture,
    build_terrain_fixture,
    build_windows_fixture,
)
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
OPENAPI_PATH = REPO_ROOT / "contracts" / "openapi.json"
TYPES_PATH = REPO_ROOT / "frontend" / "src" / "types" / "api.generated.ts"
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"
FIXTURES_MIRROR = REPO_ROOT / "frontend" / "public" / "data" / "fixtures"

PRIMITIVES = {"string": "string", "number": "number", "integer": "number", "boolean": "boolean"}

# Pydantic appends a ``Schema`` suffix to the Python models; the wire contract and the
# published TypeScript types use the plain domain names (SiteSummary, not SiteSummarySchema).
NAME_SUFFIX = "Schema"


def wire_name(schema_name: str) -> str:
    """Map an OpenAPI component name to its published TypeScript type name."""
    if schema_name.endswith(NAME_SUFFIX) and len(schema_name) > len(NAME_SUFFIX):
        return schema_name[: -len(NAME_SUFFIX)]
    return schema_name


def build_openapi_document() -> dict[str, Any]:
    """Return the fully expanded OpenAPI 3.1 document for the application."""
    return app.openapi()


def _ref_name(ref: str) -> str:
    """Extract the schema name from a local ``$ref`` pointer and map it to its wire name."""
    return wire_name(ref.rsplit("/", 1)[-1])


def _literal_union(values: list[Any]) -> str:
    """Render a JSON-Schema ``enum`` as a TypeScript literal union."""
    return " | ".join(json.dumps(value) for value in values)


def _ts_type(schema: dict[str, Any]) -> str:
    """Render one JSON-Schema node as a TypeScript type expression."""
    if "$ref" in schema:
        return _ref_name(schema["$ref"])
    if "anyOf" in schema:
        return " | ".join(_ts_type(option) for option in schema["anyOf"])
    if "oneOf" in schema:
        return " | ".join(_ts_type(option) for option in schema["oneOf"])
    if "allOf" in schema:
        return " & ".join(_ts_type(option) for option in schema["allOf"])
    if "const" in schema:
        return json.dumps(schema["const"])
    if "enum" in schema:
        return _literal_union(schema["enum"])

    kind = schema.get("type")
    if kind in PRIMITIVES:
        return PRIMITIVES[kind]
    if kind == "null":
        return "null"
    if kind == "array":
        return f"{_ts_type(schema.get('items', {'type': 'string'}))}[]"
    if kind == "object" or "properties" in schema:
        extra = schema.get("additionalProperties")
        if extra is not None and not schema.get("properties"):
            return f"Record<string, {_ts_type(extra) if isinstance(extra, dict) else 'unknown'}>"
        return "Record<string, unknown>"
    return "unknown"


def _is_optional(prop_schema: dict[str, Any]) -> bool:
    """True when the property's own schema admits ``null`` (an explicit nullable field)."""
    if prop_schema.get("type") == "null":
        return True
    for key in ("anyOf", "oneOf"):
        if any(option.get("type") == "null" for option in prop_schema.get(key, [])):
            return True
    return False


def _interface_body(name: str, schema: dict[str, Any], *, is_request: bool) -> str:
    """Render a named object schema as a TypeScript interface declaration.

    Optionality depends on direction. A *request* field with a default is emitted as
    ``name?: T`` because the caller may omit it and Pydantic fills it in. A
    *response* field is always present on the wire, so it is emitted as required even
    when the model declares a default.

    A field is marked ``| null`` only when its own schema admits null; that is how a
    Class B site's absent terrain values are represented (REQ-05).
    """
    properties: dict[str, Any] = schema.get("properties", {})
    required = set(schema.get("required", []))
    lines = [f"export interface {name} {{"]
    for prop_name, prop_schema in properties.items():
        rendered = _ts_type(prop_schema)
        if _is_optional(prop_schema) and "null" not in rendered.split(" | "):
            rendered = f"{rendered} | null"
        optional = "?" if is_request and prop_name not in required else ""
        description = prop_schema.get("description")
        if description:
            lines.append(f"  /** {description} */")
        lines.append(f"  {prop_name}{optional}: {rendered};")
    lines.append("}")
    return "\n".join(lines)


def _alias_body(name: str, schema: dict[str, Any]) -> str:
    """Render a non-object schema as a named TypeScript type alias."""
    rendered = _ts_type(schema)
    if rendered == "unknown" and schema.get("type") is None:
        return f"export type {name} = Record<string, unknown>;"
    return f"export type {name} = {rendered};"


def _request_schema_names(document: dict[str, Any]) -> set[str]:
    """Collect the component names used as a request body anywhere in the document."""
    names: set[str] = set()
    for operations in document.get("paths", {}).values():
        for operation in operations.values():
            if not isinstance(operation, dict):
                continue
            body = operation.get("requestBody") or {}
            for media in body.get("content", {}).values():
                ref = (media.get("schema") or {}).get("$ref")
                if ref:
                    names.add(ref.rsplit("/", 1)[-1])
    return names


def render_typescript(document: dict[str, Any]) -> str:
    """Render every component schema as a TypeScript declaration, sorted by name."""
    schemas: dict[str, Any] = document.get("components", {}).get("schemas", {})
    requests = _request_schema_names(document)
    blocks = [
        "/* GENERATED FILE — do not edit by hand.",
        " * Source: backend/src/api/schemas/*.py via `python -m src.cli.export_openapi`.",
        " * Regenerate instead of patching: the parity test fails on any drift.",
        " */",
        "",
    ]
    named = {name: wire_name(name) for name in sorted(schemas)}
    for name, declared in named.items():
        schema = schemas[name]
        if schema.get("properties") is not None or schema.get("type") == "object":
            blocks.append(_interface_body(declared, schema, is_request=name in requests))
        else:
            blocks.append(_alias_body(declared, schema))
        blocks.append("")
    return "\n".join(blocks).rstrip("\n") + "\n"


def write_fixtures() -> list[str]:
    """Regenerate the canonical fixture tree.

    ``contracts/fixtures`` is the canonical copy owned by this task. The mirrored
    ``frontend/public/data/fixtures`` tree is generated by ``DATA-006``; if it is
    already present it is refreshed from the same bytes so the two never diverge
    (``check_planning_docs.py`` fails on a divergent mirror).
    """
    payloads = build_fixture_payloads()
    targets = [FIXTURES_DIR]
    if FIXTURES_MIRROR.exists():
        targets.append(FIXTURES_MIRROR)

    written: list[str] = []
    for target in targets:
        target.mkdir(parents=True, exist_ok=True)
        for filename, payload in payloads.items():
            raw = json.dumps(payload, indent=2, sort_keys=True) + "\n"
            (target / filename).write_text(raw, encoding="utf-8")
            written.append(str((target / filename).relative_to(REPO_ROOT)))
    return written


def build_fixture_payloads() -> dict[str, Any]:
    """Return every fixture file, keyed by filename, in a deterministic order."""
    site_ids = [site.id for site in load_curated_sites()]
    return {
        "sites.sample.json": build_sites_fixture(),
        "terrain.sample.json": build_terrain_fixture(site_ids[0]),
        "health.sample.json": build_health_fixture(),
        "evaluate.sample.json": build_evaluate_fixture(site_ids[0]),
        "compare.sample.json": build_compare_fixture(site_ids[:2]),
        "windows.sample.json": build_windows_fixture(site_ids[0]),
        "manifest.json": build_fixture_manifest(),
    }


def main() -> None:
    """Write every generated artefact and report what changed."""
    document = build_openapi_document()

    OPENAPI_PATH.parent.mkdir(parents=True, exist_ok=True)
    OPENAPI_PATH.write_text(json.dumps(document, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    TYPES_PATH.parent.mkdir(parents=True, exist_ok=True)
    TYPES_PATH.write_text(render_typescript(document), encoding="utf-8")

    written = write_fixtures()

    schema_count = len(document.get("components", {}).get("schemas", {}))
    print(f"wrote {OPENAPI_PATH.relative_to(REPO_ROOT)}")
    print(f"wrote {TYPES_PATH.relative_to(REPO_ROOT)} ({schema_count} schemas)")
    for path in written:
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
