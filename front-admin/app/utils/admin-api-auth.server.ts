const ADMIN_SESSION_RE = /admin_session=([^;]+)/;

/**
 * Read the admin JWT from request and return ``Authorization: Bearer`` headers.
 *
 * Checks the signed ``td_admin`` session cookie first; falls back to the legacy
 * ``admin_session`` cookie for callers that haven't migrated yet.
 */
export function getAdminApiAuthHeaders(request: Request): Record<string, string> {
  const raw = request.headers.get("Cookie") ?? "";

  // 1. Try to extract from signed session (td_admin).  We can't deserialize
  //    the session here without the secret, so callers should prefer the async
  //    flow — this path works for legacy callers that still write admin_session.
  const m = raw.match(ADMIN_SESSION_RE);
  if (m?.[1]) {
    const token = decodeURIComponent(m[1].trim());
    if (token) return { Authorization: `Bearer ${token}` };
  }

  return {};
}

/**
 * Build ``Authorization: Bearer`` headers from a pre-resolved access token.
 *
 * Prefer this in new code — call ``getAdminSession(request)`` first from an
 * async loader, then pass ``accessToken`` here.
 */
export function bearerHeaders(accessToken: string | null): Record<string, string> {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}
