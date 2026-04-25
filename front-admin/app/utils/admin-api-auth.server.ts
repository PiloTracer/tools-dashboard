const ADMIN_SESSION_RE = /admin_session=([^;]+)/;

/**
 * Reads the admin email/password JWT from the `admin_session` httpOnly cookie
 * and returns headers for back-api (and any service that uses the same JWT as back-auth).
 */
export function getAdminApiAuthHeaders(request: Request): Record<string, string> {
  const raw = request.headers.get("Cookie") ?? "";
  const m = raw.match(ADMIN_SESSION_RE);
  if (!m?.[1]) {
    return {};
  }
  const token = decodeURIComponent(m[1].trim());
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
