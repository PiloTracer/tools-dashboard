"""Extended user data repository for Cassandra."""

from typing import Any
from datetime import datetime
import uuid


class UserExtRepository:
    """Repository for managing extended user profiles in Cassandra.

    This repository handles extended profile data, progressive profiling results,
    and canonical/denormalized data synced from PostgreSQL.

    Data Strategy:
    - PostgreSQL: Source of truth for core user data (email, role, status)
    - Cassandra: Source of truth for extended profile data (company, phone, etc.)
    - Cassandra: Stores denormalized copy of core data for performance
    """

    def __init__(self, session: Any) -> None:
        self.session = session
        self._prepare_statements()

    def _prepare_statements(self) -> None:
        """Prepare CQL statements for better performance."""
        # In production, prepare these statements for reuse
        pass

    def upsert_extended_profile(
        self,
        user_id: str,
        extended_data: dict[str, Any],
        denormalized_data: dict[str, Any] | None = None,
    ) -> None:
        """Insert or update extended user profile.

        Args:
            user_id: User UUID
            extended_data: Extended profile fields (company, phone, etc.)
            denormalized_data: Denormalized data from PostgreSQL (email, role, status)
        """
        # Build field lists dynamically
        fields = ["user_id"]
        values = [uuid.UUID(user_id)]

        # Add extended profile fields
        for key, value in extended_data.items():
            if value is not None:
                fields.append(key)
                values.append(value)

        # Add denormalized data if provided
        if denormalized_data:
            for key, value in denormalized_data.items():
                if value is not None:
                    fields.append(key)
                    values.append(value)

        # Always update updated_at
        fields.append("updated_at")
        values.append(datetime.utcnow())

        # If no created_at, add it
        if "created_at" not in fields:
            fields.append("created_at")
            values.append(datetime.utcnow())

        # Build CQL query
        placeholders = ", ".join(["%s"] * len(fields))
        query = f"""
            INSERT INTO user_extended_profiles
                ({", ".join(fields)})
            VALUES ({placeholders})
            USING TTL 31536000
        """

        self.session.execute(query, values)

    def get_extended_profile(self, user_id: str) -> dict[str, Any] | None:
        """Retrieve extended profile for a user.

        Args:
            user_id: User UUID

        Returns:
            Extended profile dict or None if not found
        """
        query = """
            SELECT user_id, first_name, last_name,
                   mobile_phone, home_phone, work_phone,
                   address_line1, address_line2, city, state_province, postal_code, country,
                   company, job_title, department, industry,
                   picture_url, other_details,
                   language, timezone,
                   communication_preferences, profile_completion_percentage,
                   last_profile_update, onboarding_completed, onboarding_step,
                   email, role, status, created_at, updated_at
            FROM user_extended_profiles
            WHERE user_id = %s
        """
        result = self.session.execute(query, [uuid.UUID(user_id)])
        row = result.one() if result else None

        if not row:
            return None

        return {
            "user_id": str(row.user_id),
            "first_name": row.first_name,
            "last_name": row.last_name,
            # Contact information
            "mobile_phone": row.mobile_phone,
            "home_phone": row.home_phone,
            "work_phone": row.work_phone,
            # Address information
            "address_line1": row.address_line1,
            "address_line2": row.address_line2,
            "city": row.city,
            "state_province": row.state_province,
            "postal_code": row.postal_code,
            "country": row.country,
            # Professional information
            "company": row.company,
            "job_title": row.job_title,
            "department": row.department,
            "industry": row.industry,
            # Profile picture
            "picture_url": row.picture_url,
            # Other details
            "other_details": row.other_details,
            # Preferences
            "language": row.language,
            "timezone": row.timezone,
            "communication_preferences": dict(row.communication_preferences) if row.communication_preferences else {},
            "profile_completion_percentage": row.profile_completion_percentage,
            "last_profile_update": row.last_profile_update,
            "onboarding_completed": row.onboarding_completed,
            "onboarding_step": row.onboarding_step,
            # Canonical data
            "email": row.email,
            "role": row.role,
            "status": row.status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    def update_profile_fields(
        self,
        user_id: str,
        fields: dict[str, Any],
    ) -> None:
        """Update specific fields in extended profile.

        Args:
            user_id: User UUID
            fields: Dict of field names to values
        """
        if not fields:
            return

        # Build SET clause
        set_clauses = []
        values = []

        for key, value in fields.items():
            set_clauses.append(f"{key} = %s")
            values.append(value)

        # Always update updated_at
        set_clauses.append("updated_at = %s")
        values.append(datetime.utcnow())

        # Add user_id as WHERE parameter
        values.append(uuid.UUID(user_id))

        query = f"""
            UPDATE user_extended_profiles
            SET {", ".join(set_clauses)}
            WHERE user_id = %s
            USING TTL 31536000
        """

        self.session.execute(query, values)

    def sync_canonical_data(
        self,
        user_id: str,
        email: str,
        role: str,
        status: str,
    ) -> None:
        """Sync denormalized/canonical data from PostgreSQL to Cassandra.

        This is called whenever core user data changes in PostgreSQL
        to keep the Cassandra canonical copy in sync.

        Args:
            user_id: User UUID
            email: User email (from PostgreSQL)
            role: User role (from PostgreSQL)
            status: User status (from PostgreSQL)
        """
        query = """
            UPDATE user_extended_profiles
            SET email = %s, role = %s, status = %s, updated_at = %s
            WHERE user_id = %s
            USING TTL 31536000
        """
        now = datetime.utcnow()
        self.session.execute(query, [email, role, status, now, uuid.UUID(user_id)])

    def delete_extended_profile(self, user_id: str) -> None:
        """Delete extended profile (GDPR compliance).

        Args:
            user_id: User UUID
        """
        query = "DELETE FROM user_extended_profiles WHERE user_id = %s"
        self.session.execute(query, [uuid.UUID(user_id)])

    def calculate_profile_completion(self, user_id: str) -> int:
        """Calculate profile completion percentage.

        Args:
            user_id: User UUID

        Returns:
            Completion percentage (0-100)
        """
        profile = self.get_extended_profile(user_id)
        if not profile:
            return 0

        # Define fields to check for completion
        required_fields = [
            "first_name",
            "last_name",
            "phone",
            "company",
            "job_title",
            "language",
            "timezone",
        ]

        filled_count = sum(1 for field in required_fields if profile.get(field))
        percentage = int((filled_count / len(required_fields)) * 100)

        # Update the percentage in Cassandra
        self.update_profile_fields(
            user_id,
            {"profile_completion_percentage": percentage}
        )

        return percentage

    # Legacy method for backward compatibility
    async def upsert(self, user_id: str, payload: dict[str, Any]) -> None:
        """Legacy upsert method for backward compatibility.

        Args:
            user_id: User UUID
            payload: Data to upsert
        """
        self.upsert_extended_profile(user_id, payload)
