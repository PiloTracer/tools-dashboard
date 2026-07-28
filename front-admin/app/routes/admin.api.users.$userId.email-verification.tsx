/**
 * User email verification proxy — forwards PATCH to back-api.
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function action({ request, params }: ActionFunctionArgs) {
  const { userId } = params;

  if (!userId) {
    return json({ detail: "User ID is required" }, { status: 400 });
  }

  if (request.method !== "PATCH") {
    return json({ detail: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const backendUrl = process.env.BACKEND_API_URL || "http://back-api:8000";
    const url = `${backendUrl}/admin/users/${userId}/email-verification`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("Cookie") ? { Cookie: request.headers.get("Cookie")! } : {}),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let payload: unknown = responseText;
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { detail: responseText || "Unexpected response" };
    }

    return json(payload, { status: response.status });
  } catch (error) {
    console.error("Email verification proxy error:", error);
    return json({ detail: "Failed to update email verification" }, { status: 500 });
  }
}
