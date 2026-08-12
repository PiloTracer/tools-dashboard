/**
 * App role holders proxy route
 * GET: list effective holders (appsuper assignees + appglobal holders)
 * PUT/DELETE: grant/revoke appsuper for a user on this app
 * Forwards requests to back-api (/api/admin/app-library/{app_id}/roles[...])
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
  const { appId } = params;

  if (!appId) {
    return json({ detail: "Application ID is required" }, { status: 400 });
  }

  try {
    const headers = await forwardHeaders(request);
    const response = await fetch(
      `${backendBaseUrl()}/api/admin/app-library/${appId}/roles`,
      { headers }
    );
    return await passThrough(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      { detail: `Role holders list failed: ${message}` },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { appId } = params;

  if (!appId) {
    return json({ detail: "Application ID is required" }, { status: 400 });
  }

  if (request.method !== "PUT" && request.method !== "DELETE") {
    return json({ detail: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { user_id?: unknown; role?: unknown };
    const userId = Number(body.user_id);
    const role = typeof body.role === "string" ? body.role : "";

    if (!Number.isFinite(userId) || userId <= 0 || !role) {
      return json(
        { detail: "user_id and role are required" },
        { status: 400 }
      );
    }

    const headers = await forwardHeaders(request);
    const response = await fetch(
      `${backendBaseUrl()}/api/admin/app-library/${appId}/roles/${userId}/${encodeURIComponent(role)}`,
      { method: request.method, headers }
    );
    return await passThrough(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      { detail: `App role update failed: ${message}` },
      { status: 500 }
    );
  }
}
