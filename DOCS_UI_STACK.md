# Front-end stack — Tools Dashboard

> **Bootstrap:** Created by `@ui-bootstrap init` when missing. Customize pins; link from `.cursorrules` as `DOCS_UI_STACK.md`.

**Updated:** 2025-06-11

## Runtime (primary: front-admin)

| Item | Value |
|------|-------|
| Framework | Remix v2 (React Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 (PostCSS) |
| Package manager | npm |

## Runtime (secondary: front-public)

| Item | Value |
|------|-------|
| Framework | Remix v2 (React Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 (PostCSS) |
| Package manager | npm |

## Tooling

| Check | Command (front-admin) |
|-------|----------------------|
| Unit tests | *not configured* |
| Lint | *not configured* |
| Typecheck | `cd front-admin && npx tsc --noEmit` |
| Visual regression | *not configured* |
| Accessibility | *not configured* |

## Paths

| Item | Path |
|------|------|
| App root (primary) | `front-admin/` |
| Components | `front-admin/app/components/` |
| Screens | `front-admin/app/routes/` (Remix file-routing) |
| Tokens | `front-admin/app/app.css` |
| Framework config | `front-admin/vite.config.ts`, `front-admin/tailwind.config.ts` |

## Docker

| Service | Workdir |
|---------|---------|
| `front-admin` | `/app` |
| `front-public` | `/app` |

## Design references

- Inputs: `.ai.ui/inputs/`
- Screen SPECs: `.work.ui/screens/`
