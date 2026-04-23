import { randomBytes } from "node:crypto";

const COOKIE_NAME = "td_admin_csrf";
const MAX_AGE_SEC = 3600;

/** Browsers require Secure on cookies when the page is HTTPS, even if NODE_ENV is not production. */
export function adminCookieSecureSuffix(request?: Request): string {
  if (process.env.NODE_ENV === "production") return "; Secure";
  const raw = request?.headers.get("x-forwarded-proto");
  const proto = raw?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https") return "; Secure";
  try {
    if (request?.url && new URL(request.url).protocol === "https:") return "; Secure";
  } catch {
    /* ignore */
  }
  return "";
}

/** Double-submit: random token; match hidden field to HttpOnly cookie in action. */
export function newAdminCsrf(request?: Request) {
  const token = randomBytes(32).toString("hex");
  const secure = adminCookieSecureSuffix(request);
  const setCookie = `${COOKIE_NAME}=${token}; Path=/admin; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`;
  return { token, setCookie };
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1].trim()) : null;
}

export function isValidAdminCsrf(request: Request, formData: FormData): boolean {
  const fromBody = formData.get("csrfToken");
  if (typeof fromBody !== "string" || !fromBody) return false;
  const fromCookie = cookieValue(request.headers.get("Cookie"), COOKIE_NAME);
  if (!fromCookie) return false;
  return fromCookie.length > 0 && fromCookie === fromBody;
}

/** Clear admin JWT cookie and CSRF cookie (same Path/Secure as when set). */
export function clearAdminAuthCookies(request: Request): Headers {
  const secure = adminCookieSecureSuffix(request);
  const h = new Headers();
  h.append("Set-Cookie", `admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${secure}`);
  h.append("Set-Cookie", `${COOKIE_NAME}=; Path=/admin; HttpOnly; Max-Age=0; SameSite=Lax${secure}`);
  return h;
}
