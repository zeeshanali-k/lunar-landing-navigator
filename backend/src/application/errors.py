"""Application-level errors mapped to the REQ-10 API envelope."""

from __future__ import annotations

from typing import Any


class ApplicationError(Exception):
    """Base class for errors the API translates into a structured envelope."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class SiteNotFoundError(ApplicationError):
    status_code = 404
    code = "SITE_NOT_FOUND"


class TerrainNotAvailableError(ApplicationError):
    status_code = 409
    code = "TERRAIN_NOT_AVAILABLE"


class SitePackUnavailableError(ApplicationError):
    status_code = 503
    code = "SITE_PACK_UNAVAILABLE"


class SitePackInvalidError(ApplicationError):
    status_code = 503
    code = "SITE_PACK_INVALID"
