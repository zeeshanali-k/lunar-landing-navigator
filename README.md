# Lunar Landing Site Navigator

**NASA Space Apps 2026 Challenge** — Interactive mission planning and educational visualization cockpit for lunar landing sites across the South Pole and equatorial regions.

## Architecture Overview

- **Unified Python Backend (`backend/src/`)**: Clean Architecture (Hexagonal Ports & Adapters) shared across offline data/CLI pipelines and FastAPI endpoints:
  - `domain/`: Pure physics, geometry, solar power, DTE comms, countdown detection, and feasibility scoring (zero external framework dependencies).
  - `application/`: Use cases and abstract `Protocol` ports.
  - `infrastructure/`: NASA LOLA DEM tiling, `<12ms` vectorized 360° horizon raycaster, SPICE/Horizons ephemeris, and caching.
  - `cli/`: Precomputation and JPL Horizons accuracy validation runners.
  - `api/`: Thin FastAPI REST delivery layer serving Contracts A–E.
- **Modular Frontend (`frontend/src/`)**: React + TypeScript (strict) + Vite + Three.js (`@react-three/fiber`), Zustand stores with shareable URL sync, 2D South Pole stereographic map, 3D `local_enu` shadow simulation, and multi-scenario comparison tools.
- **Shared Contracts (`contracts/`)**: Locked JSON schemas and sample fixtures (`Contracts A–E`) shared between backend and frontend.

## Coordinate Conventions (`local_enu`)

- **Selenographic Coordinates**: East-positive longitude `lon_deg` in `[-180, +180]`, latitude `lat_deg` in `[-90, +90]`.
- **Pole Singularity Guard**: Latitudes with `|lat_deg| > 89.9999°` clamp to `±89.9999°` so meridian North remains well-defined.
- **Topocentric Azimuth**: `0° = Local North`, `90° = Local East`, `180° = Local South`, `270° = Local West`.
- **Three.js Axes**: `+X = East`, `+Y = Up`, `-Z = North`.

## Quickstart & Quality Gates

### File-Size Gate (Hard Ceiling: 280 lines)
```bash
python3 scripts/check_file_lengths.py
```

### Backend (Python 3.12 + FastAPI)
```bash
cd backend
.venv/bin/pytest -v
.venv/bin/uvicorn src.api.main:app --reload --port 8000
```

### Frontend (TypeScript + Vite)
```bash
cd frontend
npm run typecheck
npm run build
npm run dev
```

### Smoke Test
```bash
./scripts/smoke_test.sh
```
