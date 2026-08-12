/**
 * App list proxy route
 * GET: list all applications (admin view) — backs app pickers in the console
 * Forwards the request to back-api (/api/admin/app-library)
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getAdminSession } from "../utils/admin-session.server";
import { bearerHeaders } from "../utils/admin-api-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const backendUrl =
    process.env.API_URL ||
    process.env.BACKEND_API_URL ||
    "http://back-api:8000";

  try {
    const { accessToken } = await getAdminSession(request);
    const cookie = request.headers.get("Cookie");

    const response = await fetch(`${backendUrl}/api/admin/app-library`, {
      headers: {
        ...bearerHeaders(accessToken),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { detail: responseText };
    }

    return json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      { detail: `Application list failed: ${message}` },
      { status: 500 }
    );
  }
}
