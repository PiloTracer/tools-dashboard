# Internationalization (i18n) Guide for front-public

## Overview

The front-public application now supports multiple languages (English and Spanish) using **remix-i18next**. The system is designed to be:
- **Centralized**: All translations in JSON files
- **Persistent**: Language preference saved in cookies (persists across sessions)
- **Scalable**: Easy to add more languages
- **Fast**: Server-side rendering with hydration

## Architecture

### Core Files

1. **`app/i18n.ts`** - Client-side i18n configuration
2. **`app/i18next.server.ts`** - Server-side i18n setup with cookie management
3. **`app/entry.client.tsx`** - Client hydration with i18n provider
4. **`public/locales/{lang}/common.json`** - Translation files

### Translation Files

Located in `public/locales/`:
```
public/locales/
├── en/
│   └── common.json  (English translations)
└── es/
    └── common.json  (Spanish translations)
```

## Usage

### In Components

```tsx
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("header.brand")}</h1>
      <p>{t("home.hero.description")}</p>
    </div>
  );
}
```

### With Variables

```tsx
// In translation file
{
  "footer": {
    "copyright": "© {{year}} Tools Dashboard Platform."
  }
}

// In component
{t("footer.copyright", { year: 2025 })}
```

### Language Switcher

The `<LanguageSwitcher />` component is already integrated in the PublicLayout header. It:
- Shows current language
- Allows switching between English/Spanish
- Persists choice in cookies
- Reloads page with new language

## Adding New Languages

### 1. Add Language Code

Update `app/i18n.ts`:
```typescript
export default {
  supportedLngs: ["en", "es", "fr"], // Add "fr" for French
  fallbackLng: "en",
  // ...
};
```

### 2. Create Translation File

Create `public/locales/fr/common.json` with all translation keys.

### 3. Update Language Switcher

Edit `app/components/LanguageSwitcher.tsx`:
```tsx
<select>
  <option value="en">{t("language.en")}</option>
  <option value="es">{t("language.es")}</option>
  <option value="fr">{t("language.fr")}</option> {/* Add this */}
</select>
```

### 4. Add Language Labels

In each `common.json`:
```json
{
  "language": {
    "en": "English",
    "es": "Español",
    "fr": "Français"
  }
}
```

## Adding New Translation Keys

### 1. Add to All Language Files

Add the key to both `en/common.json` and `es/common.json`:

**en/common.json:**
```json
{
  "newSection": {
    "title": "My New Title",
    "description": "My new description"
  }
}
```

**es/common.json:**
```json
{
  "newSection": {
    "title": "Mi Nuevo Título",
    "description": "Mi nueva descripción"
  }
}
```

### 2. Use in Components

```tsx
{t("newSection.title")}
{t("newSection.description")}
```

## Translation Key Structure

Follow this hierarchical structure:

```json
{
  "section": {
    "subsection": {
      "key": "value"
    }
  }
}
```

**Examples:**
- `header.brand` - Header brand name
- `header.nav.register` - Navigation register link
- `home.hero.title` - Homepage hero title
- `auth.register.title` - Registration page title

## Features

✅ **Cookie-based persistence** - Language choice survives page reloads and browser restarts
✅ **SSR + Hydration** - Fast initial load with server-side rendering
✅ **Automatic detection** - Detects browser language on first visit
✅ **Fallback support** - Falls back to English if translation missing
✅ **Type-safe** - Works with TypeScript
✅ **Hot reloading** - Changes to translations reflect immediately in dev mode

## Best Practices

1. **Organize by feature** - Group related translations together
2. **Use semantic keys** - `auth.login.submit` not `loginButtonText`
3. **Keep it flat** - Don't nest more than 3 levels deep
4. **Consistent naming** - Use camelCase for keys
5. **Complete translations** - Ensure all keys exist in all languages
6. **Use variables** - For dynamic content like dates, names, counts

## Extending to Other Apps

To add i18n to **front-admin** or other apps:

1. Copy `i18n.ts`, `i18next.server.ts`, `entry.client.tsx`
2. Create `public/locales/{lang}/common.json` files
3. Update `root.tsx` with i18n loader and hooks
4. Add `<LanguageSwitcher />` to layout
5. Replace hardcoded strings with `t()` calls

## Migration Checklist

When translating a new component:

- [ ] Identify all user-visible strings
- [ ] Add keys to both `en/common.json` and `es/common.json`
- [ ] Import `useTranslation` hook
- [ ] Replace strings with `t()` calls
- [ ] Test in both languages
- [ ] Check for text overflow/layout issues

## Troubleshooting

**Translations not showing:**
- Check browser console for i18next errors
- Verify translation files are in `public/locales/`
- Ensure key exists in both language files
- Clear browser cookies and try again

**Language not persisting:**
- Check `i18next` cookie in browser DevTools
- Verify cookie is set with correct domain
- Check cookie is not being cleared by other code

**New language not working:**
- Restart dev server after adding new language
- Verify language code matches in all files
- Check `supportedLngs` array in `i18n.ts`
