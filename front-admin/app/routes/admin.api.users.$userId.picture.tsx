/**
 * Profile picture upload proxy route
 * Forwards multipart/form-data uploads to back-api
 */

import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request, params }: ActionFunctionArgs) {
  const { userId } = params;

  if (!userId) {
    return new Response(
      JSON.stringify({ detail: "User ID is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Forward the multipart/form-data request to back-api
    const backendUrl = process.env.BACKEND_API_URL || "http://back-api:8000";
    const uploadUrl = `${backendUrl}/admin/users/${userId}/picture`;

    // Forward the request with the same body and headers
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: await request.arrayBuffer(),
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "",
      },
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Upload proxy error:", error);
    return new Response(
      JSON.stringify({
        detail: `Upload failed: ${error.message}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
