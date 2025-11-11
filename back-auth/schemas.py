"""Pydantic schemas for auth service."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegistrationRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RegistrationResponse(BaseModel):
    status: str
    redirectTo: Optional[str] = None
    next: Optional[dict] = None


class VerificationRequest(BaseModel):
    token: str


class GoogleCallbackRequest(BaseModel):
    code: str
    state: str
    code_verifier: Optional[str] = None


class StatusResponse(BaseModel):
    status: str
    email: Optional[str] = None
    redirectTo: Optional[str] = None
    message: Optional[str] = None
    verifiedAt: Optional[datetime] = None
