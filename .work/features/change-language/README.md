# Feature: Change Language

## Overview

Change Language persists the user locale for front-public using the **i18next** cookie:

- **Resource route** `POST /app/change-language` sets the locale cookie and redirects back to the referer (or app home).
- **`LanguageSwitcher`** (`app/components/LanguageSwitcher.tsx`) posts `lng` to that route.
- **Loader** on direct `GET` redirects away (no standalone page UI in the feature folder).

There is no separate `hooks/` or `utils/` tree under `app/features/change-language/`; behavior is split between the route module, `i18next.server.ts`, and the global switcher.

## User Stories

### Users

- As a user, I want to change the application language.
- As a user, I want my language preference to persist across visits (cookie).

---

Last Updated: April 22, 2026
