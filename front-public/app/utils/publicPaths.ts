const EXTERNAL_PROTOCOL_REGEX = /^[a-z][a-z0-9+\-.]*:/i;

export function normalizeBasePath(input?: string | null): string {
  if (!input) {
    return "/";
  }

  let normalized = input.trim();

  if (!normalized) {
    return "/";
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  // Remove duplicate trailing slashes unless the path is just "/".
  normalized = normalized.replace(/\/+$/, "");

  return normalized === "" ? "/" : normalized;
}

export function isExternalUrl(target: string): boolean {
  return EXTERNAL_PROTOCOL_REGEX.test(target) || target.startsWith("//");
}

export function joinBasePath(basePath: string, target: string): string {
  if (!target) {
    return normalizeBasePath(basePath);
  }

  if (isExternalUrl(target) || target.startsWith("mailto:") || target.startsWith("tel:")) {
    return target;
  }

  if (target.startsWith("#")) {
    return target;
  }

  const normalizedBase = normalizeBasePath(basePath);

  if (target.startsWith("?")) {
    const prefix = normalizedBase === "/" ? "" : normalizedBase;
    return `${prefix}${target}`;
  }

  const normalizedTarget = target.startsWith("/") ? target : `/${target}`;

  if (normalizedTarget === "/") {
    return normalizedBase;
  }

  if (normalizedBase === "/") {
    return normalizedTarget;
  }

  if (normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}/`)) {
    return normalizedTarget;
  }

  return `${normalizedBase}${normalizedTarget}`;
}

