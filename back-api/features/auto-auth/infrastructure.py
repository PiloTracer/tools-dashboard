"""
Auto-Auth Feature - Infrastructure Layer (back-api)
Handles database operations for OAuth clients, API keys, and user data.
"""

from __future__ import annotations

import bcrypt
import secrets
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update, delete, Table, MetaData, Column, String, ARRAY, Boolean, TIMESTAMP, Integer
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession


def _define_oauth_clients_table(metadata: MetaData) -> Table:
    """Define OAuth clients table schema."""
    return Table(
        "oauth_clients",
        metadata,
        Column("id", PGUUID(as_uuid=True), primary_key=True),
        Column("client_id", String),
        Column("client_secret_hash", String),
        Column("client_name", String),
        Column("description", String),
        Column("logo_url", String),
        Column("dev_url", String),
        Column("prod_url", String),
        Column("redirect_uris", ARRAY(String)),
        Column("allowed_scopes", ARRAY(String)),
        Column("is_active", Boolean),
        Column("created_at", TIMESTAMP),
        Column("updated_at", TIMESTAMP),
        Column("created_by", Integer),
    )


def _define_oauth_consents_table(metadata: MetaData) -> Table:
    """Define OAuth consents table schema."""
    return Table(
        "oauth_consents",
        metadata,
        Column("id", PGUUID(as_uuid=True), primary_key=True),
        Column("user_id", Integer),
        Column("client_id", String),
        Column("scope", ARRAY(String)),
        Column("granted_at", TIMESTAMP),
    )


def _define_oauth_api_keys_table(metadata: MetaData) -> Table:
    """Define OAuth API keys table schema."""
    return Table(
        "oauth_api_keys",
        metadata,
        Column("id", PGUUID(as_uuid=True), primary_key=True),
        Column("key_hash", String),
        Column("client_id", String),
        Column("name", String),
        Column("description", String),
        Column("is_active", Boolean),
        Column("last_used_at", TIMESTAMP),
        Column("expires_at", TIMESTAMP),
        Column("created_at", TIMESTAMP),
        Column("created_by", Integer),
    )


class OAuthClientInfrastructure:
    """Infrastructure for OAuth client and API key management."""

    def __init__(self, postgres_session: AsyncSession):
        """Initialize infrastructure.

        Args:
            postgres_session: PostgreSQL async session
        """
        self.session = postgres_session

    # ========================================================================
    # OAuth Client Operations
    # ========================================================================

    async def create_oauth_client(
        self,
        client_id: str,
        client_secret_hash: str,
        client_name: str,
        redirect_uris: list[str],
        allowed_scopes: list[str],
        description: Optional[str] = None,
        logo_url: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> dict:
        """Create OAuth client in database.

        Args:
            client_id: Unique client identifier
            client_secret_hash: bcrypt hash of client secret
            client_name: Client name
            redirect_uris: Allowed redirect URIs
            allowed_scopes: Allowed scopes
            description: Optional description
            logo_url: Optional logo URL
            created_by: User ID who created this client

        Returns:
            Created client data
        """
        metadata = MetaData()
        oauth_clients = _define_oauth_clients_table(metadata)

        query = oauth_clients.insert().values(
            client_id=client_id,
            client_secret_hash=client_secret_hash,
            client_name=client_name,
            description=description,
            logo_url=logo_url,
            redirect_uris=redirect_uris,
            allowed_scopes=allowed_scopes,
            is_active=True,
            created_by=created_by,
        ).returning(oauth_clients)

        result = await self.session.execute(query)
        await self.session.commit()

        row = result.mappings().first()
        return dict(row) if row else {}

    async def get_oauth_client(self, client_id: str) -> Optional[dict]:
        """Get OAuth client by client_id.

        Args:
            client_id: Client identifier

        Returns:
            Client data or None
        """
        metadata = MetaData()
        oauth_clients = _define_oauth_clients_table(metadata)

        query = select(oauth_clients).where(oauth_clients.c.client_id == client_id)
        result = await self.session.execute(query)
        row = result.mappings().first()

        if not row:
            return None

        # Convert UUID to string for Pydantic
        client_data = dict(row)
        if client_data.get("id"):
            client_data["id"] = str(client_data["id"])
        return client_data

    async def validate_client_credentials(
        self, client_id: str, client_secret: str
    ) -> bool:
        """Validate client credentials.

        Args:
            client_id: Client identifier
            client_secret: Client secret (plaintext)

        Returns:
            True if valid
        """
        client = await self.get_oauth_client(client_id)

        if not client or not client.get("is_active"):
            return False

        return bcrypt.checkpw(
            client_secret.encode("utf-8"),
            client["client_secret_hash"].encode("utf-8"),
        )

    async def get_all_oauth_clients(self) -> list[dict]:
        """Get all OAuth clients.

        Returns:
            List of client data
        """
        metadata = MetaData()
        oauth_clients = _define_oauth_clients_table(metadata)

        query = select(oauth_clients).order_by(oauth_clients.c.created_at.desc())
        result = await self.session.execute(query)

        return [dict(row) for row in result.mappings()]

    async def update_oauth_client(
        self, client_id: str, updates: dict
    ) -> Optional[dict]:
        """Update OAuth client.

        Args:
            client_id: Client identifier
            updates: Fields to update

        Returns:
            Updated client data or None
        """
        metadata = MetaData()
        oauth_clients = _define_oauth_clients_table(metadata)

        query = (
            update(oauth_clients)
            .where(oauth_clients.c.client_id == client_id)
            .values(**updates)
            .returning(oauth_clients)
        )

        result = await self.session.execute(query)
        await self.session.commit()

        row = result.mappings().first()
        return dict(row) if row else None

    async def delete_oauth_client(self, client_id: str) -> bool:
        """Delete OAuth client.

        Args:
            client_id: Client identifier

        Returns:
            True if deleted
        """
        metadata = MetaData()
        oauth_clients = _define_oauth_clients_table(metadata)

        query = delete(oauth_clients).where(oauth_clients.c.client_id == client_id)
        result = await self.session.execute(query)
        await self.session.commit()

        return result.rowcount > 0

    # ========================================================================
    # User Consent Operations
    # ========================================================================

    async def check_user_consent(self, user_id: int, client_id: str) -> bool:
        """Check if user has consented to this client.

        Args:
            user_id: User ID
            client_id: Client identifier

        Returns:
            True if consented
        """
        metadata = MetaData()
        oauth_consents = _define_oauth_consents_table(metadata)

        query = select(oauth_consents).where(
            oauth_consents.c.user_id == user_id,
            oauth_consents.c.client_id == client_id,
        )

        result = await self.session.execute(query)
        return result.first() is not None

    async def store_user_consent(
        self, user_id: int, client_id: str, scope: list[str]
    ) -> None:
        """Store user consent.

        Args:
            user_id: User ID
            client_id: Client identifier
            scope: List of scopes
        """
        from sqlalchemy.dialects.postgresql import insert

        metadata = MetaData()
        oauth_consents = _define_oauth_consents_table(metadata)

        # Upsert: insert or update if exists
        insert_stmt = insert(oauth_consents).values(
            user_id=user_id,
            client_id=client_id,
            scope=scope,
        )

        upsert_stmt = insert_stmt.on_conflict_do_update(
            index_elements=["user_id", "client_id"],
            set_={"scope": scope, "granted_at": datetime.utcnow()},
        )

        await self.session.execute(upsert_stmt)
        await self.session.commit()

    # ========================================================================
    # API Key Operations
    # ========================================================================

    async def create_api_key(
        self,
        key_hash: str,
        client_id: str,
        name: str,
        description: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        created_by: Optional[int] = None,
    ) -> dict:
        """Create API key.

        Args:
            key_hash: bcrypt hash of API key
            client_id: OAuth client identifier
            name: Key name
            description: Optional description
            expires_at: Optional expiration date
            created_by: User ID who created this key

        Returns:
            Created API key data
        """
        metadata = MetaData()
        oauth_api_keys = _define_oauth_api_keys_table(metadata)

        query = oauth_api_keys.insert().values(
            key_hash=key_hash,
            client_id=client_id,
            name=name,
            description=description,
            is_active=True,
            expires_at=expires_at,
            created_by=created_by,
        ).returning(oauth_api_keys)

        result = await self.session.execute(query)
        await self.session.commit()

        row = result.mappings().first()
        return dict(row) if row else {}

    async def validate_api_key(self, api_key: str) -> Optional[dict]:
        """Validate API key and return client info.

        Args:
            api_key: API key (plaintext)

        Returns:
            Client data if valid, None otherwise
        """
        metadata = MetaData()
        oauth_api_keys = _define_oauth_api_keys_table(metadata)

        # Get all active API keys
        query = select(oauth_api_keys).where(
            oauth_api_keys.c.is_active == True
        )

        result = await self.session.execute(query)

        for row in result.mappings():
            # Check if key matches
            if bcrypt.checkpw(api_key.encode("utf-8"), row["key_hash"].encode("utf-8")):
                # Check if expired
                if row.get("expires_at") and datetime.utcnow() > row["expires_at"]:
                    return None

                # Update last_used_at
                update_query = (
                    update(oauth_api_keys)
                    .where(oauth_api_keys.c.id == row["id"])
                    .values(last_used_at=datetime.utcnow())
                )
                await self.session.execute(update_query)
                await self.session.commit()

                # Get client info
                return await self.get_oauth_client(row["client_id"])

        return None

    async def get_all_api_keys(self) -> list[dict]:
        """Get all API keys.

        Returns:
            List of API key data
        """
        metadata = MetaData()
        oauth_api_keys = _define_oauth_api_keys_table(metadata)

        query = select(oauth_api_keys).order_by(oauth_api_keys.c.created_at.desc())
        result = await self.session.execute(query)

        return [dict(row) for row in result.mappings()]

    async def revoke_api_key(self, key_id: UUID) -> bool:
        """Revoke API key.

        Args:
            key_id: API key UUID

        Returns:
            True if revoked
        """
        metadata = MetaData()
        oauth_api_keys = _define_oauth_api_keys_table(metadata)

        query = (
            update(oauth_api_keys)
            .where(oauth_api_keys.c.id == key_id)
            .values(is_active=False)
        )

        result = await self.session.execute(query)
        await self.session.commit()

        return result.rowcount > 0


def generate_client_id(prefix: str = "client") -> str:
    """Generate unique client ID.

    Args:
        prefix: Prefix for client ID

    Returns:
        Client ID
    """
    return f"{prefix}_{secrets.token_urlsafe(16)}"


def generate_client_secret() -> str:
    """Generate secure client secret.

    Returns:
        Client secret
    """
    return secrets.token_urlsafe(32)


def generate_api_key(prefix: str = "eak") -> str:
    """Generate API key.

    Args:
        prefix: Prefix for API key

    Returns:
        API key
    """
    return f"{prefix}_{secrets.token_urlsafe(48)}"


def hash_secret(secret: str) -> str:
    """Hash secret with bcrypt.

    Args:
        secret: Secret to hash

    Returns:
        bcrypt hash
    """
    return bcrypt.hashpw(secret.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
