/**
 * User app-roles proxy route
 * GET: list a user's client-app role assignments (appsuper rows + appglobal)
 * PUT/DELETE: grant/revoke appglobal for the user
 * Forwards requests to back-api (/api/admin/users/{user_id}/app-roles[/{role}])
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getAdminSession } from "../utils/admin-session.server";
import { bearerHeaders } from "../utils/admin-api-auth.server";

function backendBaseUrl(): string {
  return (
    process.env.API_URL ||
    process.env.BACKEND_API_URL ||
    "http://back-api:8000"
  );
}

async function forwardHeaders(request: Request): Promise<Record<string, string>> {
  const { accessToken } = await getAdminSession(request);
  const cookie = request.headers.get("Cookie");
  return {
    ...bearerHeaders(accessToken),
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

async function passThrough(response: Response) {
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = responseText ? { detail: responseText } : { ok: true };
  }
  return json(data, { status: response.status });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { userId } = params;

  if (!userId) {
    return json({ detail: "User ID is required" }, { status: 400 });
  }

  try {
    const headers = await forwardHeaders(request);
    const response = await fetch(
      `${backendBaseUrl()}/api/admin/users/${userId}/app-roles`,
      { headers }
    );
    return await passThrough(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      { detail: `User app-roles list failed: ${message}` },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { userId } = params;

  if (!userId) {
    return json({ detail: "User ID is required" }, { status: 400 });
  }

  if (request.method !== "PUT" && request.method !== "DELETE") {
    return json({ detail: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { role?: unknown };
    const role = typeof body.role === "string" ? body.role : "";

    if (!role) {
      return json({ detail: "role is required" }, { status: 400 });
    }

    const headers = await forwardHeaders(request);
    const response = await fetch(
      `${backendBaseUrl()}/api/admin/users/${userId}/app-roles/${encodeURIComponent(role)}`,
      { method: request.method, headers }
    );
    return await passThrough(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      { detail: `User app-role update failed: ${message}` },
      { status: 500 }
    );
  }
}
