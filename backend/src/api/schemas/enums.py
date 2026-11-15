"""Closed enumerations and allowlists for the wire contract (REQ-06).

These are the authoritative value sets. They are ``Enum`` classes rather than
``Literal`` aliases so that each one appears as a named component in the generated
OpenAPI document and therefore in ``frontend/src/types/api.generated.ts``. A value
outside an allowlist is a 422.
"""

from __future__ import annotations

from enum import Enum


class SolarArrayType(str, Enum):
    """Solar array architecture (REQ-09)."""

    HORIZONTAL_FIXED = "horizontal_fixed"
    VERTICAL_FIXED = "vertical_fixed"
    VERTICAL_TRACKING = "vertical_tracking"


class DurationDays(float, Enum):
    """Mission duration allowlist. Values outside it are a 422."""

    D7 = 7.0
    D14 = 14.0
    D29_5 = 29.5


class StepMinutes(int, Enum):
    """Mission sampling step allowlist."""

    M10 = 10
    M60 = 60


class ObserverHeightM(float, Enum):
    """Observer mast heights; only these three horizon profiles are precomputed."""

    H1_5 = 1.5
    H2_0 = 2.0
    H10_0 = 10.0


class SiteCategory(str, Enum):
    """Registry category (REQ-05)."""

    ARTEMIS_III = "artemis_iii"
    CLPS_COMMERCIAL = "clps_commercial"
    APOLLO_HISTORIC = "apollo_historic"
    INTERNATIONAL = "international"
