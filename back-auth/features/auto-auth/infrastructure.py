"""
Auto-Auth Feature - Infrastructure Layer
Handles database operations for OAuth 2.0 authorization codes, tokens, and RSA keys.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4

from cassandra.cluster import Session as CassandraSession


class OAuthInfrastructure:
    """Infrastructure layer for OAuth 2.0 data persistence in Cassandra."""

    def __init__(self, cassandra_session: CassandraSession):
        """Initialize OAuth infrastructure.

        Args:
            cassandra_session: Cassandra session for auth_events keyspace
        """
        self.session = cassandra_session

    # ========================================================================
    # Authorization Code Operations
    # ========================================================================

    async def store_authorization_code(
        self,
        code: str,
        user_id: UUID,
        client_id: str,
        scope: list[str],
        redirect_uri: str,
        code_challenge: Optional[str],
        code_challenge_method: Optional[str],
        expires_in: int = 600,
    ) -> None:
        """Store authorization code in Cassandra.

        Args:
            code: Authorization code
            user_id: User UUID
            client_id: OAuth client ID
            scope: List of granted scopes
            redirect_uri: Redirect URI from authorization request
            code_challenge: PKCE code challenge (optional for pre-initiated flows)
            code_challenge_method: PKCE challenge method - S256 (optional for pre-initiated flows)
            expires_in: Expiry time in seconds (default 10 minutes)
        """
        query = """
        INSERT INTO auth_events.oauth_authorization_codes (
            code, user_id, client_id, scope, redirect_uri,
            code_challenge, code_challenge_method,
            issued_at, expires_at, used, used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        USING TTL ?
        """

        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=expires_in)

        self.session.execute(
            query,
            (
                code,
                user_id,
                client_id,
                set(scope),
                redirect_uri,
                code_challenge,  # Can be None
                code_challenge_method,  # Can be None
                now,
                expires_at,
                False,
                None,
                expires_in,  # TTL
            ),
        )

    async def get_authorization_code(self, code: str) -> Optional[dict]:
        """Retrieve authorization code from Cassandra.

        Args:
            code: Authorization code

        Returns:
            Authorization code data or None if not found
        """
        query = """
        SELECT code, user_id, client_id, scope, redirect_uri,
               code_challenge, code_challenge_method,
               issued_at, expires_at, used, used_at
        FROM auth_events.oauth_authorization_codes
        WHERE code = ?
        """

        result = self.session.execute(query, (code,))
        row = result.one()

        if not row:
            return None

        return {
            "code": row.code,
            "user_id": row.user_id,
            "client_id": row.client_id,
            "scope": list(row.scope),
            "redirect_uri": row.redirect_uri,
            "code_challenge": row.code_challenge,
            "code_challenge_method": row.code_challenge_method,
            "issued_at": row.issued_at,
            "expires_at": row.expires_at,
            "used": row.used,
            "used_at": row.used_at,
        }

    async def mark_authorization_code_as_used(self, code: str) -> None:
        """Mark authorization code as used (prevents replay attacks).

        Args:
            code: Authorization code
        """
        query = """
        UPDATE auth_events.oauth_authorization_codes
        SET used = true, used_at = ?
        WHERE code = ?
        """

        self.session.execute(query, (datetime.utcnow(), code))

    # ========================================================================
    # Token Operations
    # ========================================================================

    async def store_token(
        self,
        token_id: UUID,
        user_id: UUID,
        client_id: str,
        token_type: str,
        token_hash: str,
        scope: list[str],
        expires_in: int,
        parent_token_id: Optional[UUID] = None,
    ) -> None:
        """Store OAuth token in Cassandra.

        Args:
            token_id: Token UUID
            user_id: User UUID
            client_id: OAuth client ID
            token_type: 'access' or 'refresh'
            token_hash: Hash of the token
            scope: List of scopes
            expires_in: Expiry time in seconds
            parent_token_id: Parent token ID (for refresh token rotation)
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=expires_in)

        # Store in main tokens table
        query = """
        INSERT INTO auth_events.oauth_tokens (
            token_id, user_id, client_id, token_type, token_hash,
            scope, issued_at, expires_at, revoked, revoked_at, parent_token_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        self.session.execute(
            query,
            (
                token_id,
                user_id,
                client_id,
                token_type,
                token_hash,
                set(scope),
                now,
                expires_at,
                False,
                None,
                parent_token_id,
            ),
        )

        # Store in denormalized user index table
        query_user_index = """
        INSERT INTO auth_events.oauth_tokens_by_user (
            user_id, client_id, token_id, token_type,
            issued_at, expires_at, revoked
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """

        self.session.execute(
            query_user_index,
            (user_id, client_id, token_id, token_type, now, expires_at, False),
        )

    async def get_token_by_hash(self, token_hash: str) -> Optional[dict]:
        """Retrieve token by hash.

        Args:
            token_hash: Hash of the token

        Returns:
            Token data or None if not found
        """
        query = """
        SELECT token_id, user_id, client_id, token_type, token_hash,
               scope, issued_at, expires_at, revoked, revoked_at, parent_token_id
        FROM auth_events.oauth_tokens
        WHERE token_hash = ?
        LIMIT 1
        """

        result = self.session.execute(query, (token_hash,))
        row = result.one()

        if not row:
            return None

        return {
            "token_id": row.token_id,
            "user_id": row.user_id,
            "client_id": row.client_id,
            "token_type": row.token_type,
            "token_hash": row.token_hash,
            "scope": list(row.scope),
            "issued_at": row.issued_at,
            "expires_at": row.expires_at,
            "revoked": row.revoked,
            "revoked_at": row.revoked_at,
            "parent_token_id": row.parent_token_id,
        }

    async def revoke_token(self, token_hash: str, reason: str = "user_requested") -> None:
        """Revoke a token.

        Args:
            token_hash: Hash of the token
            reason: Revocation reason
        """
        now = datetime.utcnow()

        # Update main token table
        query = """
        UPDATE auth_events.oauth_tokens
        SET revoked = true, revoked_at = ?
        WHERE token_hash = ?
        """

        self.session.execute(query, (now, token_hash))

        # Get token info for revocation table
        token = await self.get_token_by_hash(token_hash)
        if token:
            # Insert into revocations table for fast checking
            query_revoke = """
            INSERT INTO auth_events.oauth_token_revocations (
                token_hash, revoked_at, reason, user_id, client_id
            ) VALUES (?, ?, ?, ?, ?)
            USING TTL 2592000
            """

            self.session.execute(
                query_revoke,
                (token_hash, now, reason, token["user_id"], token["client_id"]),
            )

    async def is_token_revoked(self, token_hash: str) -> bool:
        """Check if token is revoked (fast check).

        Args:
            token_hash: Hash of the token

        Returns:
            True if token is revoked
        """
        query = """
        SELECT token_hash
        FROM auth_events.oauth_token_revocations
        WHERE token_hash = ?
        """

        result = self.session.execute(query, (token_hash,))
        return result.one() is not None

    # ========================================================================
    # RSA Key Operations
    # ========================================================================

    async def store_rsa_key(
        self,
        key_id: str,
        public_key: str,
        private_key: str,
        algorithm: str = "RS256",
    ) -> None:
        """Store RSA key pair in Cassandra.

        Args:
            key_id: Key identifier
            public_key: Public key (PEM format)
            private_key: Private key (PEM format)
            algorithm: JWT algorithm (default RS256)
        """
        query = """
        INSERT INTO auth_events.oauth_rsa_keys (
            key_id, public_key, private_key, algorithm,
            created_at, expires_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """

        now = datetime.utcnow()
        expires_at = now + timedelta(days=365)  # 1 year

        self.session.execute(
            query,
            (key_id, public_key, private_key, algorithm, now, expires_at, True),
        )

    async def get_active_rsa_key(self) -> Optional[dict]:
        """Get active RSA key for signing.

        Returns:
            RSA key data or None if no active key
        """
        query = """
        SELECT key_id, public_key, private_key, algorithm,
               created_at, expires_at, is_active
        FROM auth_events.oauth_rsa_keys
        WHERE is_active = true
        LIMIT 1
        ALLOW FILTERING
        """

        result = self.session.execute(query)
        row = result.one()

        if not row:
            return None

        return {
            "key_id": row.key_id,
            "public_key": row.public_key,
            "private_key": row.private_key,
            "algorithm": row.algorithm,
            "created_at": row.created_at,
            "expires_at": row.expires_at,
            "is_active": row.is_active,
        }

    async def get_public_key_by_id(self, key_id: str) -> Optional[str]:
        """Get public key by key ID (for JWKS).

        Args:
            key_id: Key identifier

        Returns:
            Public key (PEM format) or None
        """
        query = """
        SELECT public_key
        FROM auth_events.oauth_rsa_keys
        WHERE key_id = ?
        """

        result = self.session.execute(query, (key_id,))
        row = result.one()

        return row.public_key if row else None

    async def get_all_public_keys(self) -> list[dict]:
        """Get all active public keys (for JWKS).

        Returns:
            List of public key data
        """
        query = """
        SELECT key_id, public_key, algorithm
        FROM auth_events.oauth_rsa_keys
        WHERE is_active = true
        ALLOW FILTERING
        """

        result = self.session.execute(query)

        return [
            {"key_id": row.key_id, "public_key": row.public_key, "algorithm": row.algorithm}
            for row in result
        ]

    # ========================================================================
    # Session Activity (Audit Log)
    # ========================================================================

    async def log_session_activity(
        self,
        session_id: UUID,
        user_id: UUID,
        client_id: str,
        activity_type: str,
        ip_address: str,
        user_agent: str,
        metadata: Optional[dict] = None,
    ) -> None:
        """Log OAuth session activity.

        Args:
            session_id: Session UUID
            user_id: User UUID
            client_id: OAuth client ID
            activity_type: Type of activity (e.g., 'authorization', 'token_issued')
            ip_address: Client IP address
            user_agent: Client user agent
            metadata: Additional metadata
        """
        now = datetime.utcnow()

        # Store in main activity table
        query = """
        INSERT INTO auth_events.oauth_session_activity (
            session_id, timestamp, user_id, client_id, activity_type,
            ip_address, user_agent, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """

        self.session.execute(
            query,
            (
                session_id,
                now,
                user_id,
                client_id,
                activity_type,
                ip_address,
                user_agent,
                metadata or {},
            ),
        )

        # Store in user-indexed table
        query_user_index = """
        INSERT INTO auth_events.oauth_session_activity_by_user (
            user_id, timestamp, session_id, client_id,
            activity_type, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?)
        """

        self.session.execute(
            query_user_index,
            (user_id, now, session_id, client_id, activity_type, ip_address),
        )


def generate_secure_code(length: int = 32) -> str:
    """Generate secure random code.

    Args:
        length: Length of the code (default 32)

    Returns:
        Secure random code
    """
    return secrets.token_urlsafe(length)


def generate_token_id() -> UUID:
    """Generate UUID for token.

    Returns:
        UUID4
    """
    return uuid4()
