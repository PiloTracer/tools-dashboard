"""Shared user model."""

from dataclasses import dataclass


@dataclass(slots=True)
class User:
    id: str
    email: str
    status: str
