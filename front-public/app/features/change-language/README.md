# Change Language Feature

## Overview

The `change-language` feature provides internationalization (i18n) language switching functionality for the front-public application. It handles user language preference changes and persists the selection via cookies.

## Architecture

This feature follows the standard feature-based architecture pattern used throughout the application:

```
app/features/change-language/
├── feature.yaml           # Feature specification
├── routes/
│   └── index.tsx         # Route implementation (loader, action)
└── README.md             # This file
```

## Route Configuration

**Path:** `/app/change-language`
**Type:** Resource route (no UI)
**Methods:** GET (loader), POST (action)

### Loader (GET)

When accessed directly via GET request, the loader redirects the user back to the referring page or to the app home (`/app`).

### Action (POST)

Handles language change requests:

1. Accepts form data with `lng` parameter containing the desired locale code
2. Validates the locale parameter
3. Sets the `i18next` cookie with the selected locale
4. Redirects back to the referring page

## Cookie Details

**Cookie Name:** `i18next`
**Path:** `/`
**SameSite:** `lax`
**Format:** Serialized locale string (e.g., `"en"`, `"es"`)

This cookie is read by the i18next server-side configuration to determine the user's language preference on subsequent requests.

## Integration

### Route File

The feature is exposed via `/app/routes/app.change-language.tsx`:

```typescript
export { action, default, loader } from "../features/change-language/routes/index";
```

### Usage in Components

Components can submit language changes using the Remix `<Form>` component:

```typescript
import { Form } from "@remix-run/react";

<Form method="post" action="/app/change-language">
  <select name="lng" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
    <option value="en">English</option>
    <option value="es">Español</option>
  </select>
</Form>
```

See `app/components/LanguageSwitcher.tsx` for the reference implementation.

## Dependencies

- `@remix-run/node` - For cookie handling and redirects
- i18next server configuration (`app/i18next.server.ts`) - For consistent cookie configuration

## Testing

### Via localhost
```bash
curl -X POST http://localhost:4101/app/change-language \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "lng=es"
```

### Via domain (nginx proxy)
```bash
curl -X POST http://epicdev.com/app/change-language \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "lng=en"
```

Both should return a 302 redirect with a `Set-Cookie` header containing the i18next cookie.

## Version History

**1.0.0** - Initial implementation
- Cookie-based language persistence
- Form-based language switching
- Redirect to referring page after change
