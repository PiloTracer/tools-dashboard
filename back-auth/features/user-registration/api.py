"""User registration endpoints."""

from __future__ import annotations

import base64
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.cassandra import record_event
from core.config import get_settings
from core.database import delete_session, find_user_by_session, get_session
from repositories import user_repository
from schemas import (
    GoogleCallbackRequest,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RegistrationRequest,
    RegistrationResponse,
    StatusResponse,
    VerificationRequest,
)
from services import email as email_service
from services import google_oauth
from services.auth import create_user_session, generate_token
from services.subscription import ensure_user_subscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user-registration", tags=["user-registration"])

CSRF_COOKIE_NAME = "registration_csrf"
STATE_COOKIE_NAME = "registration_oauth_state"
PKCE_COOKIE_NAME = "registration_oauth_pkce"


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _generate_pkce_pair() -> tuple[str, str]:
    code_verifier = _base64url(secrets.token_bytes(32))
    code_challenge = _base64url(hashlib.sha256(code_verifier.encode("utf-8")).digest())
    return code_verifier, code_challenge


def _set_cookie(response: Response, name: str, value: str, *, max_age: int, http_only: bool = True) -> None:
    settings = get_settings()
    response.set_cookie(
        key=name,
        value=value,
        httponly=http_only,
        secure=settings.registration_csrf_cookie_secure,
        samesite=settings.registration_csrf_cookie_samesite,
        max_age=max_age,
        path="/",
        domain=settings.registration_csrf_cookie_domain,
    )


def _set_session_cookie(response: Response, token: str, max_age: int) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=max_age,
        path="/",
        domain=settings.session_cookie_domain,
    )


def _build_google_auth_url(state: str, code_challenge: str) -> Optional[str]:
    settings = get_settings()
    if not settings.google_oauth_client_id or not settings.google_oauth_redirect_uri:
        return None

    params: Dict[str, Any] = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": " ".join(settings.google_scopes_list()),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    if settings.google_oauth_allowed_domains:
        params["hd"] = settings.google_oauth_allowed_domains

    from urllib.parse import urlencode

    return f"{settings.google_oauth_auth_endpoint}?{urlencode(params)}"


@router.get("/config", summary="User registration frontend configuration")
async def get_registration_config(response: Response) -> JSONResponse:
    settings = get_settings()
    csrf_token = generate_token(24)
    state_token = generate_token(18)
    code_verifier, code_challenge = _generate_pkce_pair()

    authorize_url = _build_google_auth_url(state_token, code_challenge)

    payload = {
        "csrfToken": csrf_token,
        "providers": {
            "google": {
                "authorizeUrl": authorize_url,
                "buttonText": settings.google_oauth_button_text,
            }
        }
        if authorize_url
        else {},
        "email": {"passwordPolicy": {"minLength": settings.registration_password_min_length}},
    }

    json_response = JSONResponse(content=payload)
    _set_cookie(json_response, CSRF_COOKIE_NAME, csrf_token, max_age=settings.registration_csrf_cookie_max_age)
    _set_cookie(json_response, STATE_COOKIE_NAME, state_token, max_age=settings.registration_csrf_cookie_max_age)
    _set_cookie(json_response, PKCE_COOKIE_NAME, code_verifier, max_age=settings.registration_csrf_cookie_max_age)
    return json_response


def _validate_csrf(request: Request, header_token: Optional[str]) -> None:
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    if not cookie_token or not header_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CSRF token")
    if cookie_token != header_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")


@router.post("", summary="Register a new user via email", response_model=RegistrationResponse)
async def register_user(
    request: Request,
    payload: RegistrationRequest,
    csrf_header: Optional[str] = Header(default=None, alias="X-CSRF-Token"),
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    _validate_csrf(request, csrf_header)

    if len(payload.password) < settings.registration_password_min_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {settings.registration_password_min_length} characters",
        )

    async with session.begin():
        existing = await user_repository.get_user_by_email(session, payload.email)
        if existing:
            user_id = existing["id"]
            if existing["is_email_verified"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered. Try signing in instead.",
                )
            await user_repository.update_password(session, user_id, payload.password)
        else:
            user = await user_repository.create_user(session, payload.email, payload.password)
            user_id = user["id"]

        token = generate_token(24)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.registration_token_ttl_minutes)
        await user_repository.create_verification_token(session, user_id, token, expires_at)

    verification_url = settings.build_verification_url(token)
    try:
        await email_service.send_verification_email(payload.email, verification_url)
    except RuntimeError as exc:
        logger.exception("Failed to send verification email for %s", payload.email)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    record_event(user_id, "registration_email_requested", {"email": payload.email})

    return RegistrationResponse(
        status="pending_verification",
        redirectTo="/features/user-registration/verify?source=email",
        next={"redirectTo": "/features/user-registration/verify?source=email"},
    )


@router.post("/login", summary="Sign in an existing user via email/password", response_model=LoginResponse)
async def login_user(
    request: Request,
    payload: LoginRequest,
    csrf_header: Optional[str] = Header(default=None, alias="X-CSRF-Token"),
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    _validate_csrf(request, csrf_header)

    async with session.begin():
        user_record = await user_repository.get_user_by_email(session, payload.email)

        if not user_record or not user_record.get("password_hash"):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "error",
                    "message": "Invalid email or password.",
                    "fieldErrors": {
                        "email": "We could not find an account with that email.",
                        "password": "Double-check your password and try again.",
                    },
                },
            )

        password_valid = await user_repository.verify_password(user_record["password_hash"], payload.password)
        if not password_valid:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "error",
                    "message": "Invalid email or password.",
                    "fieldErrors": {"password": "The password you entered does not match our records."},
                },
            )

        if not user_record["is_email_verified"]:
            token = generate_token(24)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.registration_token_ttl_minutes)
            await user_repository.create_verification_token(session, user_record["id"], token, expires_at)
            verification_url = settings.build_verification_url(token)
            try:
                await email_service.send_verification_email(payload.email, verification_url)
            except RuntimeError as exc:
                logger.exception("Failed to send verification email during login for %s", payload.email)

            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "status": "pending_verification",
                    "message": "Please verify your email before signing in. We just sent you a new link.",
                    "next": {"redirectTo": "/features/user-registration/verify?source=email"},
                },
            )

        # Ensure user has a subscription (auto-create Free tier if needed)
        await ensure_user_subscription(session, user_record["id"])

        session_token, _ = await create_user_session(session, user_record["id"])

    record_event(user_record["id"], "email_login", {"email": user_record["email"]})

    response = JSONResponse(
        content={
            "status": "authenticated",
            "redirectTo": "/features/app-library",
            "email": user_record["email"],
            "message": "Signed in successfully.",
        }
    )
    _set_session_cookie(response, session_token, max_age=settings.session_cookie_max_age)
    return response


@router.post("/verify-email", summary="Verify email token")
async def verify_email(
    payload: VerificationRequest,
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    token_record = None
    user_record = None

    async with session.begin():
        token_record = await user_repository.find_verification_token(session, payload.token)
        if not token_record:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")
        if token_record["expires_at"] < datetime.now(timezone.utc):
            await user_repository.delete_verification_token(session, payload.token)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token expired")

        user_record = await user_repository.get_user_by_id(session, token_record["user_id"])
        if not user_record:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User no longer exists")

        await user_repository.mark_email_verified(session, user_record["id"])

        # Ensure user has a subscription (auto-create Free tier if needed)
        await ensure_user_subscription(session, user_record["id"])

        session_token, _ = await create_user_session(session, user_record["id"])

    record_event(user_record["id"], "email_verified", {"email": user_record["email"]})

    response = JSONResponse(
        content={
            "status": "verified",
            "redirectTo": "/features/app-library",
            "email": user_record["email"],
        }
    )
    _set_session_cookie(response, session_token, max_age=settings.session_cookie_max_age)
    return response


@router.post("/providers/google/callback", summary="Handle Google OAuth callback")
async def google_callback(
    request: Request,
    payload: GoogleCallbackRequest,
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    expected_state = request.cookies.get(STATE_COOKIE_NAME)
    code_verifier = request.cookies.get(PKCE_COOKIE_NAME)

    if not expected_state or expected_state != payload.state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state parameter")

    try:
        token_response = await google_oauth.exchange_code_for_tokens(payload.code, code_verifier=code_verifier)
    except Exception as exc:
        logger.exception("Google token exchange failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google token exchange failed") from exc

    access_token = token_response.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Missing access token from Google")

    try:
        userinfo = await google_oauth.fetch_userinfo(access_token)
    except Exception as exc:
        logger.exception("Google userinfo fetch failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch Google profile") from exc

    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account has no email")

    email_verified = userinfo.get("email_verified", False)
    provider_account_id = userinfo.get("sub") or userinfo.get("id")
    if not provider_account_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google profile missing subject identifier")

    async with session.begin():
        existing = await user_repository.get_user_by_email(session, email)
        if existing:
            user_id = existing["id"]
        else:
            user = await user_repository.create_user(session, email, password=None)
            user_id = user["id"]

        if email_verified:
            already_verified = existing["is_email_verified"] if existing else False
            if not already_verified:
                await user_repository.mark_email_verified(session, user_id)

        await user_repository.upsert_identity(
            session,
            user_id=user_id,
            provider="google",
            provider_account_id=provider_account_id,
            access_token=access_token,
            refresh_token=token_response.get("refresh_token"),
            raw_profile=userinfo,
        )

        # Ensure user has a subscription (auto-create Free tier if needed)
        await ensure_user_subscription(session, user_id)

        session_token, _ = await create_user_session(session, user_id)

    record_event(user_id, "google_connected", {"email": email})

    response = JSONResponse(
        content={
            "status": "verified" if email_verified else "pending",
            "redirectTo": "/features/app-library",
            "email": email,
        }
    )
    _set_session_cookie(response, session_token, max_age=settings.session_cookie_max_age)
    response.delete_cookie(
        STATE_COOKIE_NAME,
        path="/",
        domain=settings.registration_csrf_cookie_domain,
    )
    response.delete_cookie(
        PKCE_COOKIE_NAME,
        path="/",
        domain=settings.registration_csrf_cookie_domain,
    )
    response.delete_cookie(
        CSRF_COOKIE_NAME,
        path="/",
        domain=settings.registration_csrf_cookie_domain,
    )
    return response


@router.post("/logout", summary="Log out the current session", response_model=LogoutResponse)
async def logout_user(request: Request, session: AsyncSession = Depends(get_session)):
    settings = get_settings()
    session_token = request.cookies.get(settings.session_cookie_name)

    response = JSONResponse(
        content={
            "status": "logged_out",
            "message": "You have been signed out.",
            "redirectTo": "/",
        }
    )

    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        domain=settings.session_cookie_domain,
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,
    )

    if not session_token:
        return response

    async with session.begin():
        user_row = await find_user_by_session(session, session_token)
        await delete_session(session, session_token)

    if user_row:
        record_event(user_row["id"], "session_terminated", {"reason": "logout"})

    return response


@router.get("/status", summary="Check current registration status", response_model=StatusResponse)
async def registration_status(request: Request, session: AsyncSession = Depends(get_session)):
    settings = get_settings()
    session_token = request.cookies.get(settings.session_cookie_name)
    if not session_token:
        return StatusResponse(status="pending", message="No active session")

    user_row = await find_user_by_session(session, session_token)
    if not user_row:
        return StatusResponse(status="pending", message="No user in session")

    status_value = "verified" if user_row["is_email_verified"] else "pending"
    redirect_to = "/features/app-library" if status_value == "verified" else None
    verified_at = user_row.get("updated_at") if status_value == "verified" else None
    return StatusResponse(
        status=status_value,
        email=user_row["email"],
        userId=user_row["id"],  # Include userId for OAuth authorization
        redirectTo=redirect_to,
        message="Account verified" if status_value == "verified" else "Awaiting verification",
        verifiedAt=verified_at,
    )
