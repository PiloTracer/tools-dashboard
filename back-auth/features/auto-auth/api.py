"""
Auto-Auth Feature - API Layer (Internal Endpoints)
Internal OAuth 2.0 endpoints for front-public to call.
"""

from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from core.cassandra import get_cassandra_session
from cassandra.cluster import Session as CassandraSession

from .infrastructure import OAuthInfrastructure
from .domain import OAuthDomain

router = APIRouter(prefix="/internal/oauth", tags=["auto-auth-internal"])


# ============================================================================
# Request/Response Models
# ============================================================================

class GenerateCodeRequest(BaseModel):
    """Request to generate authorization code."""
    user_id: UUID
    client_id: str
    scope: str  # Space-separated
    code_challenge: str
    code_challenge_method: str = "S256"
    redirect_uri: str
    expires_in: int = Field(default=600, ge=60, le=600)  # 1-10 minutes


class GenerateCodeResponse(BaseModel):
    """Response with authorization code."""
    code: str


class ValidateCodeRequest(BaseModel):
    """Request to validate authorization code."""
    code: str
    client_id: str
    redirect_uri: str
    code_verifier: str


class ValidateCodeResponse(BaseModel):
    """Response with validated code data."""
    user_id: UUID
    scope: list[str]


class IssueTokensRequest(BaseModel):
    """Request to issue tokens."""
    user_id: UUID
    client_id: str
    scope: list[str]
    user_email: str
    user_name: str


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    scope: str


class RefreshTokenRequest(BaseModel):
    """Request to refresh token."""
    refresh_token: str
    client_id: str


class ValidateTokenRequest(BaseModel):
    """Request to validate token."""
    token: str


class ValidateTokenResponse(BaseModel):
    """Token validation response."""
    valid: bool
    user_id: UUID | None = None
    client_id: str | None = None
    scope: list[str] | None = None
    error: str | None = None


class RevokeTokenRequest(BaseModel):
    """Request to revoke token."""
    token: str


# ============================================================================
# Dependency Injection
# ============================================================================

def get_oauth_domain(
    cassandra: CassandraSession = Depends(get_cassandra_session),
) -> OAuthDomain:
    """Get OAuth domain service.

    Args:
        cassandra: Cassandra session

    Returns:
        OAuthDomain instance
    """
    infra = OAuthInfrastructure(cassandra)
    return OAuthDomain(infra)


# ============================================================================
# API Endpoints
# ============================================================================

@router.post(
    "/generate-code",
    response_model=GenerateCodeResponse,
    summary="Generate authorization code",
    description="Generate OAuth 2.0 authorization code with PKCE support",
)
async def generate_authorization_code(
    request: GenerateCodeRequest,
    domain: OAuthDomain = Depends(get_oauth_domain),
) -> GenerateCodeResponse:
    """Generate OAuth authorization code.

    Args:
        request: Code generation request
        domain: OAuth domain service

    Returns:
        Authorization code
    """
    code = await domain.generate_authorization_code(
        user_id=request.user_id,
        client_id=request.client_id,
        scope=request.scope,
        code_challenge=request.code_challenge,
        code_challenge_method=request.code_challenge_method,
        redirect_uri=request.redirect_uri,
        expires_in=request.expires_in,
    )

    return GenerateCodeResponse(code=code)


@router.post(
    "/validate-code",
    response_model=ValidateCodeResponse,
    summary="Validate authorization code",
    description="Validate authorization code and PKCE verifier",
)
async def validate_authorization_code(
    request: ValidateCodeRequest,
    domain: OAuthDomain = Depends(get_oauth_domain),
) -> ValidateCodeResponse:
    """Validate authorization code and PKCE.

    Args:
        request: Code validation request
        domain: OAuth domain service

    Returns:
        Validated code data

    Raises:
        HTTPException 400: If code is invalid
    """
    result = await domain.validate_authorization_code(
        code=request.code,
        client_id=request.client_id,
        redirect_uri=request.redirect_uri,
        code_verifier=request.code_verifier,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired authorization code",
        )

    return ValidateCodeResponse(
        user_id=result["user_id"],
        scope=result["scope"],
    )


@router.post(
    "/issue-tokens",
    response_model=TokenResponse,
    summary="Issue access and refresh tokens",
    description="Issue JWT access and refresh tokens",
)
async def issue_tokens(
    request: IssueTokensRequest,
    domain: OAuthDomain = Depends(get_oauth_domain),
) -> TokenResponse:
    """Issue access and refresh tokens.

    Args:
        request: Token issuance request
        domain: OAuth domain service

    Returns:
        Access and refresh tokens
    """
    # Issue access token (1 hour)
    access_token = await domain.issue_access_token(
        user_id=request.user_id,
        client_id=request.client_id,
        scope=request.scope,
        user_email=request.user_email,
        user_name=request.user_name,
        expires_in=3600,
    )

    # Issue refresh token (30 days)
    refresh_token = await domain.issue_refresh_token(
        user_id=request.user_id,
        client_id=request.client_id,
        scope=request.scope,
        expires_in=2592000,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=3600,
        scope=" ".join(request.scope),
    )


@router.post(
    "/refresh-tokens",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Refresh access token using refresh token",
)
async def refresh_tokens(
    request: RefreshTokenRequest,
    domain: OAuthDomain = Depends(get_oauth_domain),
) -> TokenResponse:
    """Refresh access token.

    Args:
        request: Token refresh request
        domain: OAuth domain service

    Returns:
        New access and refresh tokens

    Raises:
        HTTPException 400: If refresh token is invalid
    """
    # Validate refresh token
    payload = await domain.validate_access_token(request.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired refresh token",
        )

    # Check token type
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is not a refresh token",
        )

    # Validate client_id
    if payload.get("aud") != request.client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client_id",
        )

    # Revoke old refresh token (single-use with rotation)
    await domain.revoke_token(request.refresh_token)

    # Extract user info from payload
    user_id = UUID(payload["sub"])
    scope = payload.get("scope", "").split()

    # TODO: Fetch user email and name from database
    # For now, use placeholder values
    user_email = "user@example.com"
    user_name = "User"

    # Issue new tokens
    access_token = await domain.issue_access_token(
        user_id=user_id,
        client_id=request.client_id,
        scope=scope,
        user_email=user_email,
        user_name=user_name,
        expires_in=3600,
    )

    new_refresh_token = await domain.issue_refresh_token(
        user_id=user_id,
        client_id=request.client_id,
        scope=scope,
        expires_in=2592000,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in=3600,
        scope=" ".join(scope),
    )


@router.post(
    "/validate-token",
    response_model=ValidateTokenResponse,
    summary="Validate access token",
    description="Validate JWT access token",
)
async def validate_token(
    request: ValidateTokenRequest,
    domain: OAuthDomain = Depends(get_oauth_domain),
) -> ValidateTokenResponse:
    """Validate access token.

    Args:
        request: Token validation request
        domain: OAuth domain service

    Returns:
        Token validation result
    """
    payload = await domain.validate_access_token(request.token)

    if not payload:
        return ValidateTokenResponse(
            valid=False,
            error="Invalid or expired token",
        )

    return ValidateTokenResponse(
        valid=True,
        user_id=UUID(payload["sub"]),
        client_id=payload.get("aud"),
        scope=payload.get("scope", "").split(),
    )


@router.post(
    "/revoke-token",
    summary="Revoke token",
    description="Revoke access or refresh token",
)
async def revoke_token(
    request: RevokeTokenRequest,
    domain: OAuthDomain = Depends(get_oauth_domain),
) -> dict:
    """Revoke token.

    Args:
        request: Token revocation request
        domain: OAuth domain service

    Returns:
        Success message
    """
    success = await domain.revoke_token(request.token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to revoke token",
        )

    return {"message": "Token revoked successfully"}


@router.get(
    "/jwks",
    summary="Get JWKS",
    description="Get JSON Web Key Set for public keys",
)
async def get_jwks(
    domain: OAuthDomain = Depends(get_oauth_domain),
) -> dict:
    """Get JWKS (JSON Web Key Set).

    Args:
        domain: OAuth domain service

    Returns:
        JWKS with public keys
    """
    return await domain.get_jwks()
