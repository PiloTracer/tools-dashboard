import { getBackAuthEnv } from "./env.server";
import { fetchWithTransientRetry } from "./http.server";

/**
 * Reads back-auth session status for the incoming request. Returns `null` if
 * the status could not be determined (guest or transient error).
 */
export async function getVerifiedRegistrationSession(request: Request): Promise<
  | {
      verified: true;
    }
  | { verified: false; status?: string }
  | null
> {
  const { backAuthBaseUrl } = getBackAuthEnv();
  const statusUrl = new URL("/user-registration/status", backAuthBaseUrl);
  const cookieHeader = request.headers.get("cookie");
  try {
    const response = await fetchWithTransientRetry(
      statusUrl,
      {
        headers: {
          Accept: "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        cache: "no-store",
      }
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { status?: string; userId?: number | null };
    if (data.status === "verified" && data.userId != null) {
      return { verified: true };
    }
    return { verified: false, status: data.status };
  } catch {
    return null;
  }
}
