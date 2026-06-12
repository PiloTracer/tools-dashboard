/**
 * Admin Session Storage
 *
 * Replaces the ad-hoc ``admin_session=<jwt>`` cookie with a
 * **Remix signed session** stored in an httpOnly cookie.
 *
 * The internal payload carries:
 *   - ``accessToken`` — the JWT (forwarded to back-api as ``Authorization: Bearer``)
 *   - ``email`` — the admin's email (for shell display)
 *
 * JWT expiry is checked by decoding the stored token's ``exp`` claim
 * (no full JWT library required for this read-only check).
 */

import {
  createCookieSessionStorage,
  redirect,
} from "@remix-run/node";

/* ------------------------------------------------------------------ */
/*  Session configuration                                              */
/* ------------------------------------------------------------------ */

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  "dev-admin-session-secret-change-in-production";

const storage = createCookieSessionStorage({
  cookie: {
    name: "td_admin",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30, // 30 minutes (matches JWT TTL)
  },
});

/* ------------------------------------------------------------------ */
/*  Session keys                                                       */
/* ------------------------------------------------------------------ */

const KEY_ACCESS_TOKEN = "accessToken";
const KEY_EMAIL = "email";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Decode a JWT payload (base64url) and return its ``exp`` timestamp, or 0.
 * Does NOT verify the signature — that is delegated to back-auth.
 */
function jwtExpiry(token: string): number {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = 4 - (b64.length % 4);
    const raw = Buffer.from(
      padding === 4 ? b64 : b64 + "=".repeat(padding),
      "base64",
    ).toString();
    const payload = JSON.parse(raw);
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

/** Has the stored JWT expired? */
function isExpired(token: string): boolean {
  const exp = jwtExpiry(token);
  return exp === 0 || Date.now() >= exp * 1000;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Read and validate the admin session from the request.
 *
 * Returns the session data (may be empty) — callers check ``has("accessToken")``.
 */
export async function getAdminSession(request: Request) {
  const session = await storage.getSession(request.headers.get("Cookie"));

  const accessToken = session.get(KEY_ACCESS_TOKEN);
  if (accessToken && isExpired(accessToken)) {
    // JWT expired — destroy the session
    session.unset(KEY_ACCESS_TOKEN);
    session.unset(KEY_EMAIL);
    return { session, accessToken: null as string | null, email: null as string | null };
  }

  return {
    session,
    accessToken: (accessToken as string) ?? null,
    email: (session.get(KEY_EMAIL) as string) ?? null,
  };
}

/**
 * Like ``getAdminSession`` but **redirects** to the sign-in page when the
 * session is missing or the stored token has expired.  Use this in loaders
 * that require authentication.
 */
export async function requireAdminSession(request: Request) {
  const { session, accessToken, email } = await getAdminSession(request);

  if (!accessToken) {
    throw redirect("/admin/features/admin-signin");
  }

  return { session, accessToken, email };
}

/**
 * Store a new session after successful sign-in.
 *
 * Returns the ``Set-Cookie`` header value.
 */
export async function commitAdminSession(
  request: Request,
  accessToken: string,
  email: string,
): Promise<string> {
  const { session } = await getAdminSession(request);
  session.set(KEY_ACCESS_TOKEN, accessToken);
  session.set(KEY_EMAIL, email);
  return storage.commitSession(session);
}

/**
 * Destroy the session (logout).  Returns the ``Set-Cookie`` header value.
 */
export async function destroyAdminSession(request: Request): Promise<string> {
  const { session } = await getAdminSession(request);
  return storage.destroySession(session);
}
