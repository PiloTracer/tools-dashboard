/** Collect every Set-Cookie header from a fetch Response (undici exposes raw headers). */

export function getAllSetCookieHeaders(response: Response): string[] {
  const rawHeaders = (response.headers as unknown as { raw?: () => Record<string, string[]> }).raw?.();
  if (rawHeaders && Array.isArray(rawHeaders["set-cookie"])) {
    return rawHeaders["set-cookie"];
  }
  const singleHeader = response.headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}
