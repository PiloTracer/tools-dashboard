import { randomBytes } from "node:crypto";

const COOKIE_NAME = "td_admin_csrf";
const MAX_AGE_SEC = 3600;

/** Double-submit: random token; match hidden field to HttpOnly cookie in action. */
export function newAdminCsrf() {
  const token = randomBytes(32).toString("hex");
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
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
