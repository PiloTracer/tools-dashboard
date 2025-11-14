"""Audit repository for tracking admin actions."""

from typing import Any
from datetime import datetime
import uuid


class AuditRepository:
    """Repository for managing audit logs in Cassandra.

    This repository handles audit trail for all admin actions on users,
    providing compliance tracking and action history.
    """

    def __init__(self, session: Any) -> None:
        self.session = session
        self._prepare_statements()

    def _prepare_statements(self) -> None:
        """Prepare CQL statements for better performance."""
        # In production, prepare these statements for reuse
        pass

    def create_audit_log(
        self,
        admin_id: str,
        admin_email: str,
        user_id: str,
        action: str,
        changes: dict[str, Any],
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        """Create an audit log entry.

        Args:
            admin_id: ID of the admin performing the action
            admin_email: Email of the admin
            user_id: ID of the user being modified
            action: Action performed (e.g., 'update_profile', 'change_role')
            changes: Dict of what changed (before/after values)
            ip_address: IP address of the admin (optional)
            user_agent: User agent string (optional)

        Returns:
            Created audit log dict
        """
        log_id = uuid.uuid4()
        timestamp = datetime.utcnow()

        # Convert changes dict to map<text, text> for Cassandra
        changes_map = {k: str(v) for k, v in changes.items()}

        query = """
            INSERT INTO admin_audit_logs
                (id, timestamp, admin_id, admin_email, user_id, action,
                 changes, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        self.session.execute(
            query,
            [
                log_id,
                timestamp,
                admin_id,
                admin_email,
                user_id,
                action,
                changes_map,
                ip_address,
                user_agent,
            ],
        )

        return {
            "id": str(log_id),
            "timestamp": timestamp,
            "admin_id": admin_id,
            "admin_email": admin_email,
            "user_id": user_id,
            "action": action,
            "changes": changes,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }

    def get_user_audit_logs(
        self,
        user_id: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Retrieve audit logs for a specific user.

        Args:
            user_id: User ID to get logs for
            limit: Maximum number of logs to return

        Returns:
            List of audit log entries, newest first
        """
        query = """
            SELECT id, timestamp, admin_id, admin_email, user_id, action,
                   changes, ip_address, user_agent
            FROM admin_audit_logs
            WHERE user_id = %s
            LIMIT %s
            ALLOW FILTERING
        """

        result_set = self.session.execute(query, [user_id, limit])

        return [
            {
                "id": str(row.id),
                "timestamp": row.timestamp,
                "admin_id": row.admin_id,
                "admin_email": row.admin_email,
                "user_id": row.user_id,
                "action": row.action,
                "changes": dict(row.changes) if row.changes else {},
                "ip_address": row.ip_address,
                "user_agent": row.user_agent,
            }
            for row in result_set
        ]

    def get_admin_audit_logs(
        self,
        admin_id: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Retrieve audit logs for actions performed by a specific admin.

        Args:
            admin_id: Admin ID to get logs for
            limit: Maximum number of logs to return

        Returns:
            List of audit log entries, newest first
        """
        query = """
            SELECT id, timestamp, admin_id, admin_email, user_id, action,
                   changes, ip_address, user_agent
            FROM admin_audit_logs
            WHERE admin_id = %s
            LIMIT %s
            ALLOW FILTERING
        """

        result_set = self.session.execute(query, [admin_id, limit])

        return [
            {
                "id": str(row.id),
                "timestamp": row.timestamp,
                "admin_id": row.admin_id,
                "admin_email": row.admin_email,
                "user_id": row.user_id,
                "action": row.action,
                "changes": dict(row.changes) if row.changes else {},
                "ip_address": row.ip_address,
                "user_agent": row.user_agent,
            }
            for row in result_set
        ]

    def get_audit_logs_by_action(
        self,
        action: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Retrieve audit logs filtered by action type.

        Args:
            action: Action type to filter by
            limit: Maximum number of logs to return

        Returns:
            List of audit log entries, newest first
        """
        query = """
            SELECT id, timestamp, admin_id, admin_email, user_id, action,
                   changes, ip_address, user_agent
            FROM admin_audit_logs
            WHERE action = %s
            LIMIT %s
            ALLOW FILTERING
        """

        result_set = self.session.execute(query, [action, limit])

        return [
            {
                "id": str(row.id),
                "timestamp": row.timestamp,
                "admin_id": row.admin_id,
                "admin_email": row.admin_email,
                "user_id": row.user_id,
                "action": row.action,
                "changes": dict(row.changes) if row.changes else {},
                "ip_address": row.ip_address,
                "user_agent": row.user_agent,
            }
            for row in result_set
        ]

    def get_recent_audit_logs(
        self,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Retrieve most recent audit logs across all users.

        Args:
            limit: Maximum number of logs to return

        Returns:
            List of audit log entries, newest first
        """
        # Note: This query is expensive on large datasets
        # Consider using time-based partitioning in production
        query = """
            SELECT id, timestamp, admin_id, admin_email, user_id, action,
                   changes, ip_address, user_agent
            FROM admin_audit_logs
            LIMIT %s
        """

        result_set = self.session.execute(query, [limit])

        logs = [
            {
                "id": str(row.id),
                "timestamp": row.timestamp,
                "admin_id": row.admin_id,
                "admin_email": row.admin_email,
                "user_id": row.user_id,
                "action": row.action,
                "changes": dict(row.changes) if row.changes else {},
                "ip_address": row.ip_address,
                "user_agent": row.user_agent,
            }
            for row in result_set
        ]

        # Sort by timestamp descending (most recent first)
        logs.sort(key=lambda x: x["timestamp"], reverse=True)

        return logs
