"""
Auto-Auth Feature - Domain Logic
OAuth 2.0 business logic: PKCE validation, JWT signing, token generation.
"""

from __future__ import annotations

import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


class OAuthDomain:
    """Domain logic for OAuth 2.0 authorization server."""

    def __init__(self, infrastructure):
        """Initialize OAuth domain.

        Args:
            infrastructure: OAuthInfrastructure instance
        """
        self.infra = infrastructure

    # ========================================================================
    # PKCE (Proof Key for Code Exchange) Validation
    # ========================================================================

    def validate_pkce(
        self,
        code_verifier: str,
        code_challenge: str,
        code_challenge_method: str = "S256",
    ) -> bool:
        """Validate PKCE code verifier against code challenge.

        Args:
            code_verifier: Code verifier from token request
            code_challenge: Code challenge from authorization request
            code_challenge_method: Challenge method (S256 or plain)

        Returns:
            True if valid, False otherwise
        """
        if code_challenge_method == "S256":
            # SHA256 hash of verifier
            hashed = hashlib.sha256(code_verifier.encode("utf-8")).digest()
            computed_challenge = (
                base64.urlsafe_b64encode(hashed).decode("utf-8").rstrip("=")
            )
            return computed_challenge == code_challenge
        elif code_challenge_method == "plain":
            return code_verifier == code_challenge
        else:
            return False

    # ========================================================================
    # Authorization Code Operations
    # ========================================================================

    async def generate_authorization_code(
        self,
        user_id: int,
        client_id: str,
        scope: str,
        code_challenge: Optional[str],
        code_challenge_method: Optional[str],
        redirect_uri: str,
        expires_in: int = 600,
    ) -> str:
        """Generate OAuth authorization code.

        Args:
            user_id: User ID (integer from users table)
            client_id: OAuth client ID
            scope: Space-separated scopes
            code_challenge: PKCE code challenge (optional for pre-initiated flows)
            code_challenge_method: PKCE challenge method (optional for pre-initiated flows)
            redirect_uri: Redirect URI
            expires_in: Expiry time in seconds (default 10 minutes)

        Returns:
            Authorization code
        """
        from .infrastructure import generate_secure_code

        code = generate_secure_code(32)
        scope_list = scope.split()

        await self.infra.store_authorization_code(
            code=code,
            user_id=user_id,
            client_id=client_id,
            scope=scope_list,
            redirect_uri=redirect_uri,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            expires_in=expires_in,
        )

        return code

    async def validate_authorization_code(
        self,
        code: str,
        client_id: str,
        redirect_uri: str,
        code_verifier: Optional[str],
    ) -> Optional[dict]:
        """Validate authorization code and PKCE.

        Args:
            code: Authorization code
            client_id: OAuth client ID
            redirect_uri: Redirect URI from token request
            code_verifier: PKCE code verifier (optional for pre-initiated flows)

        Returns:
            Dict with user_id and scope if valid, None otherwise
        """
        # Get authorization code from database
        auth_code = await self.infra.get_authorization_code(code)

        if not auth_code:
            return None

        # Check if already used (replay attack)
        if auth_code["used"]:
            return None

        # Check if expired
        if datetime.utcnow() > auth_code["expires_at"]:
            return None

        # Validate client_id
        if auth_code["client_id"] != client_id:
            return None

        # Validate redirect_uri
        if auth_code["redirect_uri"] != redirect_uri:
            return None

        # Validate PKCE if code_challenge was provided during authorization
        # For pre-initiated OAuth flows from App Library, PKCE is optional
        if auth_code["code_challenge"] is not None:
            # PKCE was used - verify the code_verifier
            if not code_verifier:
                # Code challenge was provided but no verifier
                return None

            pkce_valid = self.validate_pkce(
                code_verifier,
                auth_code["code_challenge"],
                auth_code["code_challenge_method"],
            )

            if not pkce_valid:
                return None

        # Mark as used
        await self.infra.mark_authorization_code_as_used(code)

        return {
            "user_id": auth_code["user_id"],
            "scope": auth_code["scope"],
        }

    # ========================================================================
    # RSA Key Management
    # ========================================================================

    async def get_or_create_rsa_key(self) -> dict:
        """Get active RSA key or create new one if none exists.

        Returns:
            RSA key data (key_id, public_key, private_key)
        """
        # Try to get existing active key
        key = await self.infra.get_active_rsa_key()

        if key:
            return key

        # No active key, generate new one
        return await self.generate_rsa_key()

    async def generate_rsa_key(self, key_size: int = 2048) -> dict:
        """Generate new RSA key pair.

        Args:
            key_size: RSA key size in bits (default 2048)

        Returns:
            RSA key data
        """
        # Generate RSA key pair
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
            backend=default_backend(),
        )

        # Serialize private key to PEM format
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")

        # Serialize public key to PEM format
        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")

        # Generate key ID (date-based for rotation tracking)
        key_id = datetime.utcnow().strftime("oauth-key-%Y-%m-%d")

        # Store in database
        await self.infra.store_rsa_key(
            key_id=key_id,
            public_key=public_pem,
            private_key=private_pem,
            algorithm="RS256",
        )

        return {
            "key_id": key_id,
            "public_key": public_pem,
            "private_key": private_pem,
            "algorithm": "RS256",
        }

    # ========================================================================
    # JWT Token Operations
    # ========================================================================

    async def issue_access_token(
        self,
        user_id: int,
        client_id: str,
        scope: list[str],
        user_email: str,
        user_name: str,
        expires_in: int = 3600,
    ) -> str:
        """Issue JWT access token.

        Args:
            user_id: User ID (integer from users table)
            client_id: OAuth client ID
            scope: List of scopes
            user_email: User email
            user_name: User full name
            expires_in: Expiry time in seconds (default 1 hour)

        Returns:
            JWT access token
        """
        # Get RSA key for signing
        key_data = await self.get_or_create_rsa_key()

        # Build JWT payload
        now = datetime.utcnow()
        payload = {
            "sub": str(user_id),
            "email": user_email,
            "name": user_name,
            "iss": "http://epicdev.com",
            "aud": client_id,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
            "scope": " ".join(scope),
        }

        # Sign with RS256
        token = jwt.encode(
            payload,
            key_data["private_key"],
            algorithm="RS256",
            headers={"kid": key_data["key_id"]},
        )

        # Store token hash in database (for revocation checks)
        from .infrastructure import generate_token_id
        import hashlib

        token_id = generate_token_id()
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        await self.infra.store_token(
            token_id=token_id,
            user_id=user_id,
            client_id=client_id,
            token_type="access",
            token_hash=token_hash,
            scope=scope,
            expires_in=expires_in,
        )

        return token

    async def issue_refresh_token(
        self,
        user_id: int,
        client_id: str,
        scope: list[str],
        expires_in: int = 2592000,  # 30 days
    ) -> str:
        """Issue JWT refresh token.

        Args:
            user_id: User ID (integer from users table)
            client_id: OAuth client ID
            scope: List of scopes
            expires_in: Expiry time in seconds (default 30 days)

        Returns:
            JWT refresh token
        """
        # Get RSA key for signing
        key_data = await self.get_or_create_rsa_key()

        # Build JWT payload (minimal for refresh tokens)
        from .infrastructure import generate_token_id
        import hashlib

        token_id = generate_token_id()

        now = datetime.utcnow()
        payload = {
            "sub": str(user_id),
            "token_id": str(token_id),
            "type": "refresh",
            "iss": "http://epicdev.com",
            "aud": client_id,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
            "scope": " ".join(scope),
        }

        # Sign with RS256
        token = jwt.encode(
            payload,
            key_data["private_key"],
            algorithm="RS256",
            headers={"kid": key_data["key_id"]},
        )

        # Store token hash in database
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        await self.infra.store_token(
            token_id=token_id,
            user_id=user_id,
            client_id=client_id,
            token_type="refresh",
            token_hash=token_hash,
            scope=scope,
            expires_in=expires_in,
        )

        return token

    async def validate_access_token(self, token: str) -> Optional[dict]:
        """Validate JWT access token.

        Args:
            token: JWT access token

        Returns:
            Token payload if valid, None otherwise
        """
        try:
            # Decode header to get key ID
            header = jwt.get_unverified_header(token)
            key_id = header.get("kid")

            if not key_id:
                return None

            # Get public key
            public_key_pem = await self.infra.get_public_key_by_id(key_id)

            if not public_key_pem:
                return None

            # Verify token
            payload = jwt.decode(
                token,
                public_key_pem,
                algorithms=["RS256"],
                audience=None,  # Will be validated by client_id in payload
                options={"verify_aud": False},  # We validate aud manually
            )

            # Check if token is revoked
            import hashlib

            token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
            is_revoked = await self.infra.is_token_revoked(token_hash)

            if is_revoked:
                return None

            return payload

        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except Exception:
            return None

    async def revoke_token(self, token: str) -> bool:
        """Revoke token.

        Args:
            token: JWT token to revoke

        Returns:
            True if revoked successfully
        """
        import hashlib

        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        try:
            await self.infra.revoke_token(token_hash)
            return True
        except Exception:
            return False

    # ========================================================================
    # JWKS (JSON Web Key Set)
    # ========================================================================

    async def get_jwks(self) -> dict:
        """Get JWKS (JSON Web Key Set) for public keys.

        Returns:
            JWKS dictionary
        """
        keys = await self.infra.get_all_public_keys()
        jwks_keys = []

        for key in keys:
            # Parse public key to extract modulus and exponent
            from cryptography.hazmat.primitives.serialization import load_pem_public_key

            public_key = load_pem_public_key(
                key["public_key"].encode("utf-8"),
                backend=default_backend(),
            )

            # Extract RSA public numbers
            public_numbers = public_key.public_numbers()

            # Convert to base64url format
            def int_to_base64url(value):
                value_hex = format(value, "x")
                if len(value_hex) % 2:
                    value_hex = "0" + value_hex
                value_bytes = bytes.fromhex(value_hex)
                return base64.urlsafe_b64encode(value_bytes).decode("utf-8").rstrip("=")

            n = int_to_base64url(public_numbers.n)
            e = int_to_base64url(public_numbers.e)

            jwks_keys.append(
                {
                    "kty": "RSA",
                    "use": "sig",
                    "kid": key["key_id"],
                    "alg": key["algorithm"],
                    "n": n,
                    "e": e,
                }
            )

        return {"keys": jwks_keys}
