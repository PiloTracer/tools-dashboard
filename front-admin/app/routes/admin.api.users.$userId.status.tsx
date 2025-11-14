/**
 * User status update proxy route
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
    console.log("📦 Status update request body:", JSON.stringify(body));

    const backendUrl = process.env.BACKEND_API_URL || "http://back-api:8000";
    const statusUrl = `${backendUrl}/admin/users/${userId}/status`;
    console.log("🎯 Forwarding to:", statusUrl);

    // Get auth cookie from request
    const cookie = request.headers.get("Cookie");
    console.log("🍪 Cookie:", cookie);

    // Forward the request to back-api
    const response = await fetch(statusUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { "Cookie": cookie } : {}),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log("📥 Backend response:", response.status, responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { detail: responseText };
    }

    return json(data, { status: response.status });
  } catch (error: any) {
    console.error("❌ Status update proxy error:", error);
    return json(
      {
        detail: `Status update failed: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
