"""Repository for subscription metadata stored in Cassandra."""

from typing import Any
from datetime import datetime
import uuid


class SubscriptionMetadataRepository:
    """Repository for managing subscription package metadata in Cassandra."""

    def __init__(self, session: Any) -> None:
        self.session = session
        self._prepare_statements()

    def _prepare_statements(self) -> None:
        """Prepare CQL statements for better performance."""
        # Note: In a real implementation, you would prepare these statements
        # using session.prepare(). For now, we'll use simple string queries.
        pass

    def upsert_metadata(
        self,
        package_slug: str,
        metadata_key: str,
        metadata_value: str,
        metadata_type: str,
        display_order: int,
    ) -> None:
        """Insert or update metadata for a subscription package."""
        query = """
            INSERT INTO subscription_package_metadata
                (package_slug, metadata_key, metadata_value, metadata_type,
                 display_order, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            USING TTL 31536000
        """
        now = datetime.utcnow()
        self.session.execute(
            query,
            [
                package_slug,
                metadata_key,
                metadata_value,
                metadata_type,
                display_order,
                now,
                now,
            ],
        )

    def find_by_package(self, package_slug: str) -> list[dict[str, Any]]:
        """Retrieve all metadata for a subscription package."""
        query = """
            SELECT package_slug, metadata_key, metadata_value, metadata_type,
                   display_order, created_at, updated_at
            FROM subscription_package_metadata
            WHERE package_slug = %s
        """
        result_set = self.session.execute(query, [package_slug])
        return [
            {
                "package_slug": row.package_slug,
                "metadata_key": row.metadata_key,
                "metadata_value": row.metadata_value,
                "metadata_type": row.metadata_type,
                "display_order": row.display_order,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in result_set
        ]

    def find_by_package_and_type(
        self, package_slug: str, metadata_type: str
    ) -> list[dict[str, Any]]:
        """Retrieve metadata for a package filtered by type."""
        query = """
            SELECT package_slug, metadata_key, metadata_value, metadata_type,
                   display_order, created_at, updated_at
            FROM subscription_package_metadata
            WHERE package_slug = %s AND metadata_type = %s
            ALLOW FILTERING
        """
        result_set = self.session.execute(
            query, [package_slug, metadata_type]
        )
        return [
            {
                "package_slug": row.package_slug,
                "metadata_key": row.metadata_key,
                "metadata_value": row.metadata_value,
                "metadata_type": row.metadata_type,
                "display_order": row.display_order,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in result_set
        ]

    def delete_metadata(self, package_slug: str, metadata_key: str) -> None:
        """Delete specific metadata entry."""
        query = """
            DELETE FROM subscription_package_metadata
            WHERE package_slug = %s AND metadata_key = %s
        """
        self.session.execute(query, [package_slug, metadata_key])


class SubscriptionFeaturesRepository:
    """Repository for managing subscription features in Cassandra."""

    def __init__(self, session: Any) -> None:
        self.session = session
        self._prepare_statements()

    def _prepare_statements(self) -> None:
        """Prepare CQL statements for better performance."""
        pass

    def upsert_feature(
        self,
        package_slug: str,
        feature_id: str,
        feature_name: str,
        feature_description: str,
        is_included: bool,
        display_order: int,
        icon: str = "",
        category: str = "general",
    ) -> None:
        """Insert or update a feature for a subscription package."""
        query = """
            INSERT INTO subscription_features
                (package_slug, feature_id, feature_name, feature_description,
                 is_included, display_order, icon, category, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            USING TTL 31536000
        """
        now = datetime.utcnow()
        self.session.execute(
            query,
            [
                package_slug,
                feature_id,
                feature_name,
                feature_description,
                is_included,
                display_order,
                icon,
                category,
                now,
                now,
            ],
        )

    def find_by_package(self, package_slug: str) -> list[dict[str, Any]]:
        """Retrieve all features for a subscription package."""
        query = """
            SELECT package_slug, feature_id, feature_name, feature_description,
                   is_included, display_order, icon, category, created_at, updated_at
            FROM subscription_features
            WHERE package_slug = %s
        """
        result_set = self.session.execute(query, [package_slug])
        return [
            {
                "package_slug": row.package_slug,
                "feature_id": row.feature_id,
                "feature_name": row.feature_name,
                "feature_description": row.feature_description,
                "is_included": row.is_included,
                "display_order": row.display_order,
                "icon": row.icon,
                "category": row.category,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in result_set
        ]

    def find_included_features(self, package_slug: str) -> list[dict[str, Any]]:
        """Retrieve only included features for a package."""
        query = """
            SELECT package_slug, feature_id, feature_name, feature_description,
                   is_included, display_order, icon, category, created_at, updated_at
            FROM subscription_features
            WHERE package_slug = %s AND is_included = true
            ALLOW FILTERING
        """
        result_set = self.session.execute(query, [package_slug])
        return [
            {
                "package_slug": row.package_slug,
                "feature_id": row.feature_id,
                "feature_name": row.feature_name,
                "feature_description": row.feature_description,
                "is_included": row.is_included,
                "display_order": row.display_order,
                "icon": row.icon,
                "category": row.category,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in result_set
        ]

    def find_by_category(
        self, package_slug: str, category: str
    ) -> list[dict[str, Any]]:
        """Retrieve features for a package filtered by category."""
        query = """
            SELECT package_slug, feature_id, feature_name, feature_description,
                   is_included, display_order, icon, category, created_at, updated_at
            FROM subscription_features
            WHERE package_slug = %s AND category = %s
            ALLOW FILTERING
        """
        result_set = self.session.execute(query, [package_slug, category])
        return [
            {
                "package_slug": row.package_slug,
                "feature_id": row.feature_id,
                "feature_name": row.feature_name,
                "feature_description": row.feature_description,
                "is_included": row.is_included,
                "display_order": row.display_order,
                "icon": row.icon,
                "category": row.category,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in result_set
        ]

    def delete_feature(self, package_slug: str, feature_id: str) -> None:
        """Delete a specific feature."""
        query = """
            DELETE FROM subscription_features
            WHERE package_slug = %s AND feature_id = %s
        """
        self.session.execute(query, [package_slug, feature_id])
