import i18next from "../i18next.server";

const SUPPORTED_LOCALES = ["en", "es"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function normalizeLocale(raw: string | null | undefined): SupportedLocale {
  const base = String(raw ?? "en").split("-")[0].toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(base) ? (base as SupportedLocale) : "en";
}

export async function getRequestT(request: Request) {
  return i18next.getFixedT(request);
}

export function resolveSameOriginReferer(request: Request, fallbackPath: string): string {
  const referer = request.headers.get("Referer");
  if (!referer) {
    return fallbackPath;
  }

  try {
    const refUrl = new URL(referer);
    const reqUrl = new URL(request.url);
    if (refUrl.origin !== reqUrl.origin) {
      return fallbackPath;
    }
    return `${refUrl.pathname}${refUrl.search}${refUrl.hash}`;
  } catch {
    return fallbackPath;
  }
}
