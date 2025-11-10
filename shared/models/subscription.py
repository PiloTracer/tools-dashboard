"""Shared subscription model."""

from dataclasses import dataclass


@dataclass(slots=True)
class Subscription:
    id: str
    user_id: str
    tier: str
    status: str
