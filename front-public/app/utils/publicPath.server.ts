import { isExternalUrl, joinBasePath, normalizeBasePath } from "./publicPaths";

let cachedBasePath: string | null = null;

function deriveBasePathFromEnv(): string | null {
  const explicitPath = process.env.PUBLIC_APP_BASE_PATH?.trim();
  if (explicitPath) {
    return normalizeBasePath(explicitPath);
  }

  const baseUrl = process.env.PUBLIC_APP_BASE_URL;
  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      return normalizeBasePath(parsed.pathname);
    } catch (error) {
      console.error("Failed to parse PUBLIC_APP_BASE_URL", error);
    }
  }

  return null;
}

function inferBasePathFromRequest(request?: Request | string | URL): string | null {
  if (!request) {
    return null;
  }

  let url: URL;
  try {
    if (request instanceof Request) {
      url = new URL(request.url);
    } else if (request instanceof URL) {
      url = request;
    } else {
      url = new URL(request, "http://epicdev.com");
    }
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  if (segments[0] === "app") {
    return "/app";
  }

  return null;
}

function deriveBasePath(request?: Request | string | URL): string {
  if (cachedBasePath !== null) {
    return cachedBasePath;
  }

  const envPath = deriveBasePathFromEnv();
  if (envPath) {
    cachedBasePath = envPath;
    return cachedBasePath;
  }

  const inferredPath = inferBasePathFromRequest(request);
  if (inferredPath) {
    cachedBasePath = inferredPath;
    return cachedBasePath;
  }

  // Default to '/app' so the public app remains functional behind the nginx prefix without extra configuration.
  cachedBasePath = "/app";
  return cachedBasePath;
}

export function getPublicAppBasePath(request?: Request | string | URL): string {
  return deriveBasePath(request);
}

export function resolvePublicPath(target: string): string {
  return joinBasePath(getPublicAppBasePath(), target);
}

export function resolveRedirectTarget(target?: string | null): string | null {
  if (!target) {
    return null;
  }

  if (isExternalUrl(target) || target.startsWith("mailto:") || target.startsWith("tel:")) {
    return target;
  }

  return resolvePublicPath(target);
}

