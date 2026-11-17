"""Integration tests for the Vercel full-stack configuration and ASGI entrypoint."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[3]
ENTRYPOINT_PATH = REPO_ROOT / "api" / "index.py"
VERCEL_CONFIG_PATH = REPO_ROOT / "vercel.json"
REQUIREMENTS_PATH = REPO_ROOT / "requirements.txt"


def _load_vercel_app() -> FastAPI:
    spec = importlib.util.spec_from_file_location("vercel_api_index", ENTRYPOINT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    app = module.app
    assert isinstance(app, FastAPI)
    return app


def test_vercel_entrypoint_serves_p0_routes() -> None:
    app = _load_vercel_app()
    client = TestClient(app)

    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["moon_radius_km"] == 1737.4

    sites = client.get("/api/v1/sites")
    assert sites.status_code == 200
    assert len(sites.json()) == 16

    terrain = client.get("/api/v1/sites/artemis-cabeus-peak/terrain")
    assert terrain.status_code == 200

    evaluated = client.post(
        "/api/v1/evaluate",
        json={
            "site_id": "artemis-cabeus-peak",
            "start_utc": "2027-11-01T00:00:00Z",
            "duration_days": 7,
            "step_minutes": 60,
        },
    )
    assert evaluated.status_code == 200
    assert len(evaluated.json()["timeseries"]) == 168


def test_vercel_entrypoint_avoids_offline_heavy_imports() -> None:
    payload = json.dumps(
        {
            "site_id": "artemis-cabeus-peak",
            "start_utc": "2027-11-01T00:00:00Z",
            "duration_days": 7,
        }
    ).encode("utf-8")
    script = f"""
import asyncio
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("vercel_api_index", {str(ENTRYPOINT_PATH)!r})
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

async def run():
    status = 0
    chunks = []
    sent = False
    req_body = {payload!r}

    async def recv():
        nonlocal sent
        if sent:
            return {{"type": "http.disconnect"}}
        sent = True
        return {{"type": "http.request", "body": req_body, "more_body": False}}

    async def send(msg):
        nonlocal status
        if msg["type"] == "http.response.start":
            status = msg["status"]
        elif msg["type"] == "http.response.body":
            chunks.append(msg.get("body", b""))

    scope = {{
        "type": "http",
        "asgi": {{"version": "3.0"}},
        "method": "POST",
        "path": "/api/v1/evaluate",
        "raw_path": b"/api/v1/evaluate",
        "query_string": b"",
        "headers": [(b"content-type", b"application/json")],
        "scheme": "http",
        "server": ("testserver", 80),
    }}
    await mod.app(scope, recv, send)
    assert status == 200
    assert len(json.loads(b"".join(chunks))["timeseries"]) == 168

asyncio.run(run())
banned = [m for m in ("numpy", "scipy", "httpx", "src.cli") if m in sys.modules]
assert not banned, f"unexpected runtime imports: {{banned}}"
"""
    proc = subprocess.run(
        [sys.executable, "-c", script],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout


def test_vercel_config_and_runtime_requirements() -> None:
    config = json.loads(VERCEL_CONFIG_PATH.read_text(encoding="utf-8"))
    assert config["outputDirectory"] == "frontend/dist"
    fn = config["functions"]["api/index.py"]
    for required_glob in (
        "backend/src/**",
        "backend/config/**",
        "backend/data/site_packs/**",
        "data/manifests/site_packs/index.json",
    ):
        assert required_glob in fn["includeFiles"]

    rewrites = config["rewrites"]
    assert rewrites[0] == {"source": "/api/(.*)", "destination": "/api/index.py"}
    assert rewrites[1]["destination"] == "/index.html"

    lines = [
        line.split("#", 1)[0].strip().lower()
        for line in REQUIREMENTS_PATH.read_text(encoding="utf-8").splitlines()
        if line.split("#", 1)[0].strip()
    ]
    joined = "\n".join(lines)
    for pkg in ("fastapi==", "pydantic==", "pyyaml=="):
        assert pkg in joined
    for excluded in ("numpy", "scipy", "httpx"):
        assert excluded not in joined
