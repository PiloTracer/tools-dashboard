"""Tests for client-app role (appsuper / appglobal) grant APIs.

Covers SPEC .work/features/app-roles/20260811-SPEC.md §11 (back-api cases):
grant/list/revoke flows, scope pairing, admin-only guards, idempotency,
unknown roles/targets, audit events, and the no-privilege regression guard.
"""

from __future__ import annotations

import importlib
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import pytest
from fastapi import FastAPI, HTTPException

api = importlib.import_module("features.app-library.api")

ADMIN = {"id": 1, "email": "admin@example.com", "role": "admin"}
APP_A = str(uuid.uuid4())
APP_B = str(uuid.uuid4())
APP_DELETED = str(uuid.uuid4())


class FakeAppUserRoleRepository:
    """In-memory AppUserRoleRepository with the same semantics (R14)."""

    def __init__(self, users: set[int]) -> None:
        self.users = users
        self.rows: dict[tuple[str | None, int, str], dict[str, Any]] = {}

    async def user_exists(self, user_id: int) -> bool:
        return user_id in self.users

    async def grant(
        self, app_id: str | None, user_id: int, role: str, granted_by: int | None
    ) -> tuple[dict[str, Any], bool]:
        key = (app_id, user_id, role)
        if key in self.rows:
            return self.rows[key], False
        row = {
            "id": uuid.uuid4(),
            "app_id": uuid.UUID(app_id) if app_id else None,
            "user_id": user_id,
            "role": role,
            "granted_by": granted_by,
            "created_at": datetime.now(timezone.utc),
        }
        self.rows[key] = row
        return row, True

    async def revoke(self, app_id: str | None, user_id: int, role: str) -> bool:
        return self.rows.pop((app_id, user_id, role), None) is not None

    async def list_effective_for_app(self, app_id: str) -> list[dict[str, Any]]:
        return [
            {**row, "email": f"user{row['user_id']}@example.com"}
            for (held_app, _, _), row in self.rows.items()
            if held_app is None or held_app == app_id
        ]

    async def list_for_user(self, user_id: int) -> list[dict[str, Any]]:
        return [
            {
                **row,
                "app_client_id": f"client-{row['app_id']}" if row["app_id"] else None,
                "app_name": f"App {row['app_id']}" if row["app_id"] else None,
            }
            for (_, held_user, _), row in self.rows.items()
            if held_user == user_id
        ]


class FakeAppRepository:
    def __init__(self) -> None:
        self.apps = {
            APP_A: {"id": uuid.UUID(APP_A), "client_name": "App A", "deleted_at": None},
            APP_B: {"id": uuid.UUID(APP_B), "client_name": "App B", "deleted_at": None},
            APP_DELETED: {
                "id": uuid.UUID(APP_DELETED),
                "client_name": "Deleted App",
                "deleted_at": datetime.now(timezone.utc),
            },
        }

    async def find_by_id(self, app_id: str) -> dict[str, Any] | None:
        return self.apps.get(app_id)


class FakeAuditLogRepository:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    async def create(self, **kwargs: Any) -> dict[str, Any]:
        self.events.append(kwargs)
        return kwargs


def _make_app(
    role_repo: FakeAppUserRoleRepository,
    app_repo: FakeAppRepository,
    audit_repo: FakeAuditLogRepository,
    *,
    as_admin: bool = True,
) -> FastAPI:
    app = FastAPI()
    app.include_router(api.admin_router)

    if as_admin:

        async def _admin() -> dict[str, Any]:
            return ADMIN

    else:

        async def _admin() -> dict[str, Any]:
            raise HTTPException(status_code=403, detail="Insufficient privileges")

    app.dependency_overrides[api.get_current_admin] = _admin
    app.dependency_overrides[api.get_app_repo] = lambda: app_repo
    app.dependency_overrides[api.get_app_user_role_repo] = lambda: role_repo
    app.dependency_overrides[api.get_audit_log_repo] = lambda: audit_repo
    app.dependency_overrides[api.get_access_rule_repo] = lambda: None
    return app


@pytest.fixture
def setup() -> tuple[httpx.AsyncClient, FakeAppUserRoleRepository, FakeAuditLogRepository]:
    role_repo = FakeAppUserRoleRepository(users={1, 2, 3})
    app_repo = FakeAppRepository()
    audit_repo = FakeAuditLogRepository()
    app = _make_app(role_repo, app_repo, audit_repo)
    client = httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    )
    return client, role_repo, audit_repo


@pytest.mark.asyncio
async def test_appsuper_grant_list_revoke_flow(setup) -> None:
    """Admin grants appsuper -> app and user lists show it -> revoke -> both empty (R13/R16)."""
    client, _, _ = setup

    resp = await client.put(f"/api/admin/app-library/{APP_A}/roles/2/appsuper")
    assert resp.status_code == 200

    holders = (await client.get(f"/api/admin/app-library/{APP_A}/roles")).json()
    assert holders["total"] == 1
    holder = holders["holders"][0]
    assert holder["user_id"] == 2
    assert holder["role"] == "appsuper"
    assert holder["scope"] == "per_app"

    assignments = (await client.get("/api/admin/users/2/app-roles")).json()
    assert assignments["total"] == 1
    assignment = assignments["assignments"][0]
    assert assignment["role"] == "appsuper"
    assert assignment["app_id"] == APP_A
    assert assignment["app_name"]

    resp = await client.delete(f"/api/admin/app-library/{APP_A}/roles/2/appsuper")
    assert resp.status_code == 200
    assert (await client.get(f"/api/admin/app-library/{APP_A}/roles")).json()["total"] == 0
    assert (await client.get("/api/admin/users/2/app-roles")).json()["total"] == 0


@pytest.mark.asyncio
async def test_appglobal_grant_visible_on_every_app_and_single_revoke(setup) -> None:
    """appglobal shows in user list and every app's effective list; one revoke clears all (R15.1/R16)."""
    client, _, _ = setup

    resp = await client.put("/api/admin/users/2/app-roles/appglobal")
    assert resp.status_code == 200

    assignments = (await client.get("/api/admin/users/2/app-roles")).json()
    assert assignments["total"] == 1
    assignment = assignments["assignments"][0]
    assert assignment["role"] == "appglobal"
    assert assignment["scope"] == "all_apps"
    assert assignment["app_id"] is None

    for app_id in (APP_A, APP_B):
        holders = (await client.get(f"/api/admin/app-library/{app_id}/roles")).json()
        assert holders["total"] == 1
        assert holders["holders"][0]["role"] == "appglobal"

    resp = await client.delete("/api/admin/users/2/app-roles/appglobal")
    assert resp.status_code == 200
    for app_id in (APP_A, APP_B):
        assert (await client.get(f"/api/admin/app-library/{app_id}/roles")).json()["total"] == 0
    assert (await client.get("/api/admin/users/2/app-roles")).json()["total"] == 0


@pytest.mark.asyncio
async def test_appglobal_and_appsuper_coexist_with_union_semantics(setup) -> None:
    """Both roles coexist; effective lists union; revoking one leaves the other (R15.4)."""
    client, _, _ = setup

    await client.put("/api/admin/users/2/app-roles/appglobal")
    await client.put(f"/api/admin/app-library/{APP_A}/roles/2/appsuper")

    holders_a = (await client.get(f"/api/admin/app-library/{APP_A}/roles")).json()
    assert holders_a["total"] == 2
    assert {h["role"] for h in holders_a["holders"]} == {"appsuper", "appglobal"}

    holders_b = (await client.get(f"/api/admin/app-library/{APP_B}/roles")).json()
    assert holders_b["total"] == 1
    assert holders_b["holders"][0]["role"] == "appglobal"

    await client.delete(f"/api/admin/app-library/{APP_A}/roles/2/appsuper")
    holders_a = (await client.get(f"/api/admin/app-library/{APP_A}/roles")).json()
    assert holders_a["total"] == 1
    assert holders_a["holders"][0]["role"] == "appglobal"

    assignments = (await client.get("/api/admin/users/2/app-roles")).json()
    assert [a["role"] for a in assignments["assignments"]] == ["appglobal"]


@pytest.mark.asyncio
async def test_scope_pairing_rejected(setup) -> None:
    """appglobal via app-scoped endpoint and appsuper via user-scoped endpoint -> 422 (R6.1)."""
    client, _, _ = setup

    resp = await client.put(f"/api/admin/app-library/{APP_A}/roles/2/appglobal")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "Role appglobal requires scope all_apps"

    resp = await client.put("/api/admin/users/2/app-roles/appsuper")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "Role appsuper requires scope per_app"

    resp = await client.delete(f"/api/admin/app-library/{APP_A}/roles/2/appglobal")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_non_admin_forbidden_on_all_six_endpoints(setup) -> None:
    """Non-admin (including role holders) gets 403 on every grant-surface endpoint (R1/R7)."""
    _, role_repo, audit_repo = setup
    app = _make_app(role_repo, FakeAppRepository(), audit_repo, as_admin=False)
    client = httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    )

    responses = [
        await client.get(f"/api/admin/app-library/{APP_A}/roles"),
        await client.put(f"/api/admin/app-library/{APP_A}/roles/2/appsuper"),
        await client.delete(f"/api/admin/app-library/{APP_A}/roles/2/appsuper"),
        await client.get("/api/admin/users/2/app-roles"),
        await client.put("/api/admin/users/2/app-roles/appglobal"),
        await client.delete("/api/admin/users/2/app-roles/appglobal"),
    ]
    assert [r.status_code for r in responses] == [403] * 6


@pytest.mark.asyncio
async def test_duplicate_grant_and_double_revoke_are_idempotent(setup) -> None:
    """Duplicate grant and double revoke succeed without error or duplicate rows (R2/R3)."""
    client, _, audit_repo = setup

    for _ in range(2):
        resp = await client.put(f"/api/admin/app-library/{APP_A}/roles/2/appsuper")
        assert resp.status_code == 200
    assert (await client.get(f"/api/admin/app-library/{APP_A}/roles")).json()["total"] == 1
    for _ in range(2):
        resp = await client.delete(f"/api/admin/app-library/{APP_A}/roles/2/appsuper")
        assert resp.status_code == 200

    for _ in range(2):
        resp = await client.put("/api/admin/users/2/app-roles/appglobal")
        assert resp.status_code == 200
    assert (await client.get("/api/admin/users/2/app-roles")).json()["total"] == 1
    for _ in range(2):
        resp = await client.delete("/api/admin/users/2/app-roles/appglobal")
        assert resp.status_code == 200

    granted = [e for e in audit_repo.events if e["event_type"] == "app_role_granted"]
    revoked = [e for e in audit_repo.events if e["event_type"] == "app_role_revoked"]
    assert len(granted) == 2
    assert len(revoked) == 2


@pytest.mark.asyncio
async def test_unknown_role_rejected(setup) -> None:
    """Grant with an unregistered role -> 422 (R6)."""
    client, _, _ = setup

    resp = await client.put("/api/admin/users/2/app-roles/superuser")
    assert resp.status_code == 422
    assert resp.json()["detail"] == "Invalid role: superuser. Must be one of: appglobal, appsuper"

    resp = await client.put(f"/api/admin/app-library/{APP_A}/roles/2/superuser")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_grant_targets_not_found(setup) -> None:
    """Unknown user / unknown app / soft-deleted app -> 404."""
    client, _, _ = setup

    resp = await client.put(f"/api/admin/app-library/{APP_A}/roles/99/appsuper")
    assert resp.status_code == 404
    resp = await client.put("/api/admin/users/99/app-roles/appglobal")
    assert resp.status_code == 404
    resp = await client.get("/api/admin/users/99/app-roles")
    assert resp.status_code == 404
    resp = await client.put(f"/api/admin/app-library/{uuid.uuid4()}/roles/2/appsuper")
    assert resp.status_code == 404
    resp = await client.put(f"/api/admin/app-library/{APP_DELETED}/roles/2/appsuper")
    assert resp.status_code == 404
    resp = await client.get(f"/api/admin/app-library/{APP_DELETED}/roles")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_audit_events_carry_role_and_appglobal_uses_null_app(setup) -> None:
    """Grant/revoke write audit rows naming the role; appglobal events have app_id NULL (R4)."""
    client, _, audit_repo = setup

    await client.put(f"/api/admin/app-library/{APP_A}/roles/2/appsuper")
    await client.put("/api/admin/users/3/app-roles/appglobal")
    await client.delete("/api/admin/users/3/app-roles/appglobal")

    assert [e["event_type"] for e in audit_repo.events] == [
        "app_role_granted",
        "app_role_granted",
        "app_role_revoked",
    ]

    appsuper_event = audit_repo.events[0]
    assert appsuper_event["app_id"] == APP_A
    assert appsuper_event["changes"]["role"] == "appsuper"
    assert appsuper_event["changes"]["user_id"] == 2
    assert appsuper_event["performed_by"] == ADMIN["id"]

    appglobal_grant = audit_repo.events[1]
    assert appglobal_grant["app_id"] is None
    assert appglobal_grant["changes"]["role"] == "appglobal"
    assert "app_id" not in appglobal_grant["changes"]

    appglobal_revoke = audit_repo.events[2]
    assert appglobal_revoke["app_id"] is None
    assert appglobal_revoke["changes"]["role"] == "appglobal"


@pytest.mark.asyncio
async def test_role_holder_keeps_403_on_existing_admin_endpoints(setup) -> None:
    """Regression guard: a role holder (non-admin) is still 403 on existing admin writes (R7.2)."""
    _, role_repo, audit_repo = setup
    app = _make_app(role_repo, FakeAppRepository(), audit_repo, as_admin=False)
    client = httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    )

    resp = await client.put(f"/api/admin/app-library/{APP_A}", json={})
    assert resp.status_code == 403
    resp = await client.patch(
        f"/api/admin/app-library/{APP_A}/status", json={"is_active": False}
    )
    assert resp.status_code == 403
    resp = await client.post(f"/api/admin/app-library/{APP_A}/access", json={})
    assert resp.status_code == 403
    resp = await client.post(f"/api/admin/app-library/{APP_A}/regenerate-secret")
    assert resp.status_code == 403
