# Feature: User Logout

## Overview

User Logout terminates the **cookie session** used by the public app:

- Remix resource route under `/app/features/user-logout` proxies `POST` to `back-auth` at `/user-registration/logout` (handler lives on the user-registration router).
- Response `Set-Cookie` headers from back-auth are forwarded; the browser is redirected to the app home.
- `LogoutMessage` is the default export for the route module.

## User Stories

### Users
- As a user, I want to log out securely
- As a user, I want to be logged out when I close the browser
- As a user, I want confirmation before logging out (optional)

---

Last Updated: April 22, 2026
