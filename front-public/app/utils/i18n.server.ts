const SUPPORTED_LOCALES = ["en", "es"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function normalizeLocale(raw: string | null | undefined): SupportedLocale {
  const base = String(raw ?? "en").split("-")[0].toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(base) ? (base as SupportedLocale) : "en";
}

export function resolveSameOriginReferer(request: Request, fallbackPath: string): string {
  const referer = request.headers.get("Referer");
  if (!referer) {
    return fallbackPath;
  }

  try {
    const refUrl = new URL(referer);
    const reqUrl = new URL(request.url);
    // Behind a TLS-terminating proxy request.url is http: while the browser Referer is https:.
    const forwardedProto = request.headers.get("X-Forwarded-Proto");
    if (forwardedProto) {
      reqUrl.protocol = `${forwardedProto.split(",")[0].trim()}:`;
    }
    if (refUrl.origin !== reqUrl.origin) {
      return fallbackPath;
    }
    return `${refUrl.pathname}${refUrl.search}${refUrl.hash}`;
  } catch {
    return fallbackPath;
  }
}
