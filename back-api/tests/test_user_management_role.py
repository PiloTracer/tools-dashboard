"""Tests for admin role updates."""

from __future__ import annotations

import importlib
from dataclasses import dataclass, field
from typing import Any

import pytest

domain = importlib.import_module("features.user-management.domain")
UserManagementService = domain.UserManagementService
UserRoleUpdateRequest = domain.UserRoleUpdateRequest


@dataclass
class _FakeUserRepo:
    users: dict[int, dict[str, Any]]
    role_updates: list[dict[str, Any]] = field(default_factory=list)

    async def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        return self.users.get(user_id)

    async def update_user_role(
        self,
        user_id: int,
        role: str,
        permissions: list[str],
    ) -> dict[str, Any]:
        row = self.users[user_id]
        row["role"] = role
        row["permissions"] = permissions
        self.role_updates.append(
            {"user_id": user_id, "role": role, "permissions": permissions}
        )
        return dict(row)


class _FakeExtRepo:
    def sync_canonical_data(self, **kwargs: Any) -> None:
        return None


class _FakeAuditRepo:
    def create_audit_log(self, **kwargs: Any) -> None:
        return None


class _FakeAuthService:
    def __init__(self) -> None:
        self.invalidated: list[int] = []

    async def invalidate_user_sessions(self, user_id: int, reason: str) -> None:
        self.invalidated.append(user_id)


@pytest.mark.asyncio
async def test_admin_can_change_user_role_with_default_permissions() -> None:
    repo = _FakeUserRepo(
        users={
            2: {
                "id": 2,
                "email": "user@example.com",
                "role": "customer",
                "permissions": [],
                "is_email_verified": True,
                "created_at": None,
                "updated_at": None,
            }
        }
    )
    auth = _FakeAuthService()
    service = UserManagementService(
        user_repository=repo,
        user_ext_repository=_FakeExtRepo(),
        audit_repository=_FakeAuditRepo(),
        auth_service_client=auth,
    )

    detail = await service.update_user_role(
        2,
        UserRoleUpdateRequest(role="admin", permissions=[]),
        {"id": 1, "email": "admin@example.com"},
    )

    assert detail["role"] == "admin"
    assert repo.role_updates[-1]["permissions"] == ["*"]
    assert auth.invalidated == [2]


@pytest.mark.asyncio
async def test_admin_cannot_change_own_role() -> None:
    repo = _FakeUserRepo(
        users={
            1: {
                "id": 1,
                "email": "admin@example.com",
                "role": "admin",
                "permissions": ["*"],
            }
        }
    )
    service = UserManagementService(
        user_repository=repo,
        user_ext_repository=_FakeExtRepo(),
        audit_repository=_FakeAuditRepo(),
        auth_service_client=_FakeAuthService(),
    )

    with pytest.raises(ValueError, match="Cannot change your own role"):
        await service.update_user_role(
            1,
            UserRoleUpdateRequest(role="customer", permissions=[]),
            {"id": 1, "email": "admin@example.com"},
        )


@pytest.mark.asyncio
async def test_invalid_role_is_rejected() -> None:
    repo = _FakeUserRepo(
        users={
            2: {
                "id": 2,
                "email": "user@example.com",
                "role": "customer",
                "permissions": [],
            }
        }
    )
    service = UserManagementService(
        user_repository=repo,
        user_ext_repository=_FakeExtRepo(),
        audit_repository=_FakeAuditRepo(),
        auth_service_client=_FakeAuthService(),
    )

    with pytest.raises(ValueError, match="Invalid role"):
        await service.update_user_role(
            2,
            UserRoleUpdateRequest(role="superuser", permissions=[]),
            {"id": 1, "email": "admin@example.com"},
        )
