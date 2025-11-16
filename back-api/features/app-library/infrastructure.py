"""Infrastructure layer for app-library feature.

This module provides access to PostgreSQL repositories for application management.
"""

from typing import Protocol, Any
import httpx


class PostgresClient(Protocol):
    """Protocol for PostgreSQL database access."""

    async def get_app_repository(self) -> Any:
        """Get AppRepository instance."""
        ...

    async def get_access_rule_repository(self) -> Any:
        """Get AccessRuleRepository instance."""
        ...

    async def get_user_preference_repository(self) -> Any:
        """Get UserPreferenceRepository instance."""
        ...

    async def get_audit_log_repository(self) -> Any:
        """Get AuditLogRepository instance."""
        ...


class HttpPostgresClient:
    """HTTP client for back-postgres service.

    Note: In the current architecture, back-postgres is accessed directly via
    connection pool, not via HTTP. This class is a placeholder for future
    microservice architecture if back-postgres becomes a separate HTTP service.

    For now, repositories are instantiated directly with the asyncpg pool.
    """

    def __init__(self, base_url: str = "http://back-postgres:8102"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=10.0)

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


class RepositoryRegistry:
    """Registry for app-library repositories.

    This class provides access to all repositories needed by the domain layer.
    """

    def __init__(self, db_pool: Any = None):
        """Initialize repository registry.

        Args:
            db_pool: asyncpg connection pool
        """
        self.db_pool = db_pool
        self._app_repo = None
        self._access_rule_repo = None
        self._user_pref_repo = None
        self._audit_log_repo = None

    def get_app_repository(self) -> Any:
        """Get AppRepository instance.

        Returns:
            AppRepository instance
        """
        if self._app_repo is None:
            from repositories.app_library_repository import AppRepository
            self._app_repo = AppRepository(self.db_pool)
        return self._app_repo

    def get_access_rule_repository(self) -> Any:
        """Get AccessRuleRepository instance.

        Returns:
            AccessRuleRepository instance
        """
        if self._access_rule_repo is None:
            from repositories.app_library_repository import AccessRuleRepository
            self._access_rule_repo = AccessRuleRepository(self.db_pool)
        return self._access_rule_repo

    def get_user_preference_repository(self) -> Any:
        """Get UserPreferenceRepository instance.

        Returns:
            UserPreferenceRepository instance
        """
        if self._user_pref_repo is None:
            from repositories.app_library_repository import UserPreferenceRepository
            self._user_pref_repo = UserPreferenceRepository(self.db_pool)
        return self._user_pref_repo

    def get_audit_log_repository(self) -> Any:
        """Get AuditLogRepository instance.

        Returns:
            AuditLogRepository instance
        """
        if self._audit_log_repo is None:
            from repositories.app_library_repository import AuditLogRepository
            self._audit_log_repo = AuditLogRepository(self.db_pool)
        return self._audit_log_repo
