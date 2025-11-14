/**
 * User password update proxy route
 * Forwards PATCH requests to back-api
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function action({ request, params }: ActionFunctionArgs) {
  const { userId } = params;

  if (!userId) {
    return json(
      { detail: "User ID is required" },
      { status: 400 }
    );
  }

  if (request.method !== "PATCH") {
    return json(
      { detail: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const body = await request.json();
    const backendUrl = process.env.BACKEND_API_URL || "http://back-api:8000";
    const passwordUrl = `${backendUrl}/admin/users/${userId}/password`;

    // Get auth cookie from request
    const cookie = request.headers.get("Cookie");

    // Forward the request to back-api
    const response = await fetch(passwordUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { "Cookie": cookie } : {}),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { detail: responseText };
    }

    return json(data, { status: response.status });
  } catch (error: any) {
    console.error("Password update proxy error:", error);
    return json(
      {
        detail: `Password update failed: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
