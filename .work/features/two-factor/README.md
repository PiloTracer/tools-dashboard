# Feature: Two-Factor Authentication

> **Current code (April 2026):** `back-auth/features/two-factor/api.py` only exposes a placeholder `POST /auth/two-factor/challenge` route. There is no TOTP UI package under `front-public/app/features/two-factor/` yet. The sections below remain product intent.

## Overview

Two-Factor Authentication (2FA) provides an additional layer of security by requiring a second authentication factor:
- Time-based One-Time Passwords (TOTP)
- SMS codes (future)
- Backup codes
- Device trust management

This protects accounts even if passwords are compromised.

## User Stories

### Users
- As a user, I want to enable 2FA on my account
- As a user, I want to use an authenticator app (Google Authenticator, Authy)
- As a user, I want to generate backup codes
- As a user, I want to trust this device for 30 days
- As a user, I want to disable 2FA

### Admins
- As an admin, I want to see which users have 2FA enabled
- As an admin, I want to force 2FA for admin accounts

## Key Workflows

### Enable 2FA
1. User navigates to security settings
2. User clicks "Enable 2FA"
3. System generates QR code
4. User scans with authenticator app
5. User enters a code to verify
6. System generates backup codes
7. User saves backup codes securely
8. 2FA is now enabled

### Login with 2FA
1. User logs in with email/password
2. System prompts for 2FA code
3. User enters code from authenticator app
4. System validates code
5. User is logged in

## Key Features

- **TOTP Support**: Time-based one-time passwords
- **QR Code**: Easy setup with authenticator apps
- **Backup Codes**: Recovery if authenticator lost
- **Device Trust**: Remember device for 30 days
- **Session Validation**: Re-verify on sensitive operations

## Technical Requirements

### Services Involved
- **front-public**: 2FA setup and verification UI
- **back-auth**: TOTP generation and validation
- **back-postgres**: 2FA settings storage
- **back-cassandra**: 2FA events logging

### Security Considerations
- **Time Window**: 30-second window for TOTP
- **Backup Codes**: Hashed in database
- **One-Time Use**: Each code usable only once
- **Device Fingerprinting**: For device trust
- **Rate Limiting**: Prevent code guessing

### Dependencies
- pyotp >= 2.8.0 (TOTP)
- qrcode >= 7.3.1 (QR code generation)

## Performance Targets
- 2FA setup: < 2s
- Code validation: < 100ms

## Known Limitations
- SMS 2FA not yet implemented
- Backup code recovery limited
- Device trust uses basic fingerprinting

---

Last Updated: April 22, 2026
