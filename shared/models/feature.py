"""Shared feature contract model."""

from dataclasses import dataclass
from typing import Sequence


@dataclass(slots=True)
class FeatureContract:
    name: str
    version: str
    endpoints: Sequence[dict]
