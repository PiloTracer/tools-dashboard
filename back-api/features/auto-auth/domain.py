"""
Auto-Auth Feature - Domain Logic (back-api)
Business logic for OAuth client management and external app integration.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID


class OAuthClientDomain:
    """Domain logic for OAuth client and API key management."""

    def __init__(self, infrastructure, user_repository=None, subscription_repository=None):
        """Initialize domain.

        Args:
            infrastructure: OAuthClientInfrastructure instance
            user_repository: User repository for fetching user data
            subscription_repository: Subscription repository
        """
        self.infra = infrastructure
        self.user_repo = user_repository
        self.subscription_repo = subscription_repository

    # ========================================================================
    # OAuth Client Management
    # ========================================================================

    async def register_oauth_client(
        self,
        client_name: str,
        redirect_uris: list[str],
        allowed_scopes: list[str],
        description: Optional[str] = None,
        logo_url: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> dict:
        """Register new OAuth client.

        Args:
            client_name: Client application name
            redirect_uris: Allowed redirect URIs
            allowed_scopes: Allowed scopes
            description: Optional description
            logo_url: Optional logo URL
            created_by: User ID who created this client

        Returns:
            Client data with client_id and client_secret
        """
        from .infrastructure import (
            generate_client_id,
            generate_client_secret,
            hash_secret,
        )

        # Generate credentials
        client_id = generate_client_id()
        client_secret = generate_client_secret()
        client_secret_hash = hash_secret(client_secret)

        # Create in database
        client = await self.infra.create_oauth_client(
            client_id=client_id,
            client_secret_hash=client_secret_hash,
            client_name=client_name,
            redirect_uris=redirect_uris,
            allowed_scopes=allowed_scopes,
            description=description,
            logo_url=logo_url,
            created_by=created_by,
        )

        # Return client with secret (only shown once!)
        return {
            **client,
            "client_secret": client_secret,  # Only returned on creation
        }

    async def get_oauth_client(self, client_id: str) -> Optional[dict]:
        """Get OAuth client details.

        Args:
            client_id: Client identifier

        Returns:
            Client data (without secret)
        """
        client = await self.infra.get_oauth_client(client_id)

        if not client:
            return None

        # Remove sensitive data
        client.pop("client_secret_hash", None)

        return client

    async def list_oauth_clients(self) -> list[dict]:
        """List all OAuth clients.

        Returns:
            List of client data (without secrets)
        """
        clients = await self.infra.get_all_oauth_clients()

        # Remove sensitive data
        for client in clients:
            client.pop("client_secret_hash", None)

        return clients

    async def update_oauth_client(
        self, client_id: str, updates: dict
    ) -> Optional[dict]:
        """Update OAuth client.

        Args:
            client_id: Client identifier
            updates: Fields to update

        Returns:
            Updated client data
        """
        # Remove fields that shouldn't be updated directly
        updates.pop("client_id", None)
        updates.pop("client_secret_hash", None)
        updates.pop("id", None)
        updates.pop("created_at", None)
        updates.pop("created_by", None)

        client = await self.infra.update_oauth_client(client_id, updates)

        if client:
            client.pop("client_secret_hash", None)

        return client

    async def delete_oauth_client(self, client_id: str) -> bool:
        """Delete OAuth client.

        Args:
            client_id: Client identifier

        Returns:
            True if deleted
        """
        return await self.infra.delete_oauth_client(client_id)

    async def validate_client_credentials(
        self, client_id: str, client_secret: str
    ) -> bool:
        """Validate client credentials.

        Args:
            client_id: Client identifier
            client_secret: Client secret

        Returns:
            True if valid
        """
        return await self.infra.validate_client_credentials(client_id, client_secret)

    # ========================================================================
    # User Consent Management
    # ========================================================================

    async def check_user_consent(self, user_id: int, client_id: str) -> bool:
        """Check if user has consented to this client.

        Args:
            user_id: User ID
            client_id: Client identifier

        Returns:
            True if consented
        """
        return await self.infra.check_user_consent(user_id, client_id)

    async def store_user_consent(
        self, user_id: int, client_id: str, scope: list[str]
    ) -> None:
        """Store user consent.

        Args:
            user_id: User ID
            client_id: Client identifier
            scope: List of scopes
        """
        await self.infra.store_user_consent(user_id, client_id, scope)

    # ========================================================================
    # API Key Management
    # ========================================================================

    async def generate_api_key(
        self,
        client_id: str,
        name: str,
        description: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        created_by: Optional[int] = None,
    ) -> dict:
        """Generate API key for external app.

        Args:
            client_id: OAuth client identifier
            name: Key name
            description: Optional description
            expires_at: Optional expiration date
            created_by: User ID who created this key

        Returns:
            API key data with key (only shown once!)
        """
        from .infrastructure import generate_api_key, hash_secret

        # Generate API key
        api_key = generate_api_key()
        key_hash = hash_secret(api_key)

        # Store in database
        key_data = await self.infra.create_api_key(
            key_hash=key_hash,
            client_id=client_id,
            name=name,
            description=description,
            expires_at=expires_at,
            created_by=created_by,
        )

        # Return key (only shown once!)
        return {
            **key_data,
            "api_key": api_key,
        }

    async def validate_api_key(self, api_key: str) -> Optional[dict]:
        """Validate API key.

        Args:
            api_key: API key

        Returns:
            Client data if valid
        """
        return await self.infra.validate_api_key(api_key)

    async def list_api_keys(self) -> list[dict]:
        """List all API keys.

        Returns:
            List of API key data (without keys)
        """
        keys = await self.infra.get_all_api_keys()

        # Remove sensitive data
        for key in keys:
            key.pop("key_hash", None)

        return keys

    async def revoke_api_key(self, key_id: UUID) -> bool:
        """Revoke API key.

        Args:
            key_id: API key UUID

        Returns:
            True if revoked
        """
        return await self.infra.revoke_api_key(key_id)

    # ========================================================================
    # User Profile for External Apps
    # ========================================================================

    async def get_user_profile(self, user_id: int) -> Optional[dict]:
        """Get user profile for external applications.

        Args:
            user_id: User ID

        Returns:
            User profile data
        """
        # TODO: Implement actual user repository call
        # For now, return placeholder
        return {
            "id": str(user_id),
            "email": f"user{user_id}@example.com",
            "name": f"User {user_id}",
            "first_name": "User",
            "last_name": str(user_id),
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

    async def get_user_subscription(self, user_id: int) -> Optional[dict]:
        """Get user subscription details.

        Args:
            user_id: User ID

        Returns:
            Subscription data
        """
        # TODO: Implement actual subscription repository call
        # For now, return placeholder
        return {
            "user_id": str(user_id),
            "tier": "professional",
            "plan": "Professional Plan",
            "status": "active",
            "features": {
                "ecards_enabled": True,
                "template_limit": 50,
                "batch_size_limit": 5000,
                "storage_gb": 10,
            },
            "billing_cycle": "monthly",
            "current_period_start": datetime.utcnow().isoformat(),
            "current_period_end": datetime.utcnow().isoformat(),
            "valid_until": datetime.utcnow().isoformat(),
            "auto_renew": True,
        }

    async def get_user_limits(self, user_id: int) -> dict:
        """Get user rate limits and usage.

        Args:
            user_id: User ID

        Returns:
            Rate limits data
        """
        # TODO: Implement actual usage tracking
        # For now, return placeholder
        return {
            "user_id": str(user_id),
            "subscription_tier": "professional",
            "cards_per_month": 10000,
            "current_usage": 2547,
            "remaining_cards": 7453,
            "llm_credits": 500,
            "llm_credits_used": 127,
            "storage": {
                "limit_gb": 10.0,
                "used_gb": 3.2,
                "remaining_gb": 6.8,
            },
            "templates": {
                "limit": 50,
                "current": 12,
                "remaining": 38,
            },
            "batches": {
                "active_limit": 10,
                "current_active": 3,
            },
            "reset_date": datetime.utcnow().isoformat(),
            "billing_cycle": "monthly",
        }

    async def verify_user_permissions(
        self, user_id: int, required_permissions: list[str]
    ) -> dict:
        """Verify user has required permissions.

        Args:
            user_id: User ID
            required_permissions: List of required permissions

        Returns:
            Verification result
        """
        # TODO: Implement actual permission checking
        # For now, return placeholder (grant all)
        return {
            "user_id": str(user_id),
            "verified": True,
            "permissions": required_permissions + ["ecards.admin"],
            "has_access": True,
            "reason": None,
        }

    async def record_usage_event(
        self,
        user_id: int,
        client_id: str,
        event_type: str,
        quantity: int,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Record usage event for billing.

        Args:
            user_id: User ID
            client_id: OAuth client ID
            event_type: Event type (e.g., 'cards_generated')
            quantity: Quantity of resource used
            metadata: Optional metadata

        Returns:
            Usage event data
        """
        # TODO: Implement actual usage recording
        # For now, return placeholder
        return {
            "event_id": "evt_" + str(UUID.uuid4()),
            "recorded": True,
            "new_usage": 2547 + quantity,
            "remaining_cards": 7453 - quantity,
        }
