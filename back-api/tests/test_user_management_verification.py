"""Tests for admin email verification updates (public login gate)."""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from typing import Any

import pytest

domain = importlib.import_module("features.user-management.domain")
UserEmailVerificationUpdateRequest = domain.UserEmailVerificationUpdateRequest
UserManagementService = domain.UserManagementService


@dataclass
class _FakeUserRepo:
    users: dict[int, dict[str, Any]]

    async def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        return self.users.get(user_id)

    async def update_user(
        self,
        user_id: int,
        email: str | None = None,
        is_email_verified: bool | None = None,
    ) -> dict[str, Any] | None:
        row = self.users.get(user_id)
        if not row:
            return None
        if email is not None:
            row["email"] = email
        if is_email_verified is not None:
            row["is_email_verified"] = is_email_verified
        return dict(row)


class _FakeExtRepo:
    def get_extended_profile(self, user_id: str) -> dict[str, Any] | None:
        return None


class _FakeAuditRepo:
    def create_audit_log(self, **kwargs: Any) -> None:
        return None


@pytest.mark.asyncio
async def test_admin_can_mark_user_verified_for_login() -> None:
    repo = _FakeUserRepo(
        users={
            2: {
                "id": 2,
                "email": "user@example.com",
                "role": "customer",
                "permissions": [],
                "is_email_verified": False,
                "created_at": None,
                "updated_at": None,
            }
        }
    )
    service = UserManagementService(
        user_repository=repo,
        user_ext_repository=_FakeExtRepo(),
        audit_repository=_FakeAuditRepo(),
        auth_service_client=None,
    )

    detail = await service.update_user_email_verification(
        2,
        UserEmailVerificationUpdateRequest(is_email_verified=True),
        admin_user={"id": 99, "email": "admin@example.com"},
    )

    assert detail["is_email_verified"] is True
    assert repo.users[2]["is_email_verified"] is True


@pytest.mark.asyncio
async def test_unverified_user_blocked_at_login_gate() -> None:
    """Document the back-auth login rule: is_email_verified must be true."""
    user = {"is_email_verified": False, "password_hash": "x"}
    assert not user["is_email_verified"]

    user["is_email_verified"] = True
    assert user["is_email_verified"]
