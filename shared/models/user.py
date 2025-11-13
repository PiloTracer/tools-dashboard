"""Shared user model."""

from dataclasses import dataclass


@dataclass(slots=True)
class User:
    id: str
    email: str
    status: str
    role: str  # 'admin' | 'customer' | 'moderator' | 'support'
    permissions: list[str]  # ['users.read', 'users.write', '*']
    created_at: str
    updated_at: str
