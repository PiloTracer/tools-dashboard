/**
 * OAuth 2.0 Token Revocation Endpoint
 * Revokes access or refresh tokens
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json(
      { error: "invalid_request", error_description: "Method not allowed" },
      { status: 405 }
    );
  }

  const formData = await request.formData();
  const token = formData.get("token");
  const tokenTypeHint = formData.get("token_type_hint"); // 'access_token' or 'refresh_token'
  const clientId = formData.get("client_id");
  const clientSecret = formData.get("client_secret");

  if (!token) {
    return json(
      { error: "invalid_request", error_description: "Missing token parameter" },
      { status: 400 }
    );
  }

  const BACK_AUTH_URL = process.env.BACK_AUTH_URL || "http://localhost:8101";

  try {
    // Revoke token via back-auth
    const response = await fetch(`${BACK_AUTH_URL}/internal/oauth/revoke-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.error("Token revocation failed:", await response.text());
    }

    // Always return 200 OK per OAuth 2.0 spec (even if token doesn't exist)
    return json({ message: "Token revoked successfully" }, { status: 200 });
  } catch (error) {
    console.error("OAuth revoke error:", error);
    // Still return 200 OK per spec
    return json({ message: "Token revoked successfully" }, { status: 200 });
  }
}

export async function loader() {
  return json(
    { error: "invalid_request", error_description: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
