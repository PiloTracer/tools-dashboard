import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { getBackAuthEnv } from "../../../utils/env.server";
import { resolvePublicHomeUrl } from "../../../utils/publicPath.server";
import { getAllSetCookieHeaders } from "../../../utils/setCookie.server";
import { LogoutMessage } from "../ui/LogoutMessage";

export async function loader({ request }: LoaderFunctionArgs) {
  return proxyLogout(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return proxyLogout(request);
}

async function proxyLogout(request: Request) {
  const { backAuthBaseUrl } = getBackAuthEnv();
  const logoutUrl = new URL("/user-registration/logout", backAuthBaseUrl);
  const cookieHeader = request.headers.get("cookie");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  let response: Response | null = null;

  try {
    response = await fetch(logoutUrl, {
      method: "POST",
      headers,
    });
  } catch (error) {
    console.error("Logout request failed", error);
  }

  const redirectPath = resolvePublicHomeUrl(request);
  const redirectResponse = redirect(redirectPath);

  if (response) {
    for (const cookie of getAllSetCookieHeaders(response)) {
      redirectResponse.headers.append("Set-Cookie", cookie);
    }
    if (!response.ok) {
      const payload = await safeReadJson(response);
      console.error("Logout request returned non-OK status", response.status, payload);
    }
  }

  return redirectResponse;
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

export default LogoutMessage;
