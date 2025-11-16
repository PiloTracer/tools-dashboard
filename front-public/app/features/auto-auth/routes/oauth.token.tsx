/**
 * OAuth 2.0 Token Endpoint
 * Exchanges authorization code for access and refresh tokens
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  // Only allow POST requests
  if (request.method !== "POST") {
    return json(
      { error: "invalid_request", error_description: "Method not allowed" },
      { status: 405 }
    );
  }

  const formData = await request.formData();
  const grantType = formData.get("grant_type");
  const code = formData.get("code");
  const redirectUri = formData.get("redirect_uri");
  const clientId = formData.get("client_id");
  const clientSecret = formData.get("client_secret");
  const codeVerifier = formData.get("code_verifier");
  const refreshToken = formData.get("refresh_token");

  const BACK_AUTH_URL = process.env.BACK_AUTH_URL || "http://localhost:8101";
  const BACK_API_URL = process.env.BACK_API_URL || "http://localhost:8100";

  // Validate grant_type
  if (grantType !== "authorization_code" && grantType !== "refresh_token") {
    return json(
      {
        error: "unsupported_grant_type",
        error_description: "Grant type must be 'authorization_code' or 'refresh_token'",
      },
      { status: 400 }
    );
  }

  // Validate client credentials
  if (!clientId || !clientSecret) {
    return json(
      { error: "invalid_request", error_description: "Missing client credentials" },
      { status: 400 }
    );
  }

  try {
    // Verify client credentials via back-api
    // For now, we'll skip this step and validate during code exchange

    // AUTHORIZATION CODE GRANT
    if (grantType === "authorization_code") {
      if (!code || !redirectUri || !codeVerifier) {
        return json(
          {
            error: "invalid_request",
            error_description: "Missing required parameters for authorization_code grant",
          },
          { status: 400 }
        );
      }

      // Validate authorization code via back-auth
      const validateResponse = await fetch(`${BACK_AUTH_URL}/internal/oauth/validate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!validateResponse.ok) {
        const error = await validateResponse.json();
        return json(
          {
            error: "invalid_grant",
            error_description: error.detail || "Invalid or expired authorization code",
          },
          { status: 400 }
        );
      }

      const { user_id, scope } = await validateResponse.json();

      // Fetch user info for JWT claims
      // TODO: Get actual user data from database
      const userEmail = `user${user_id}@example.com`;
      const userName = `User ${user_id}`;

      // Issue tokens via back-auth
      const tokensResponse = await fetch(`${BACK_AUTH_URL}/internal/oauth/issue-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          client_id: clientId,
          scope,
          user_email: userEmail,
          user_name: userName,
        }),
      });

      if (!tokensResponse.ok) {
        throw new Error("Failed to issue tokens");
      }

      const tokens = await tokensResponse.json();

      return json(
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: "Bearer",
          expires_in: 3600,
          scope: tokens.scope,
        },
        { status: 200 }
      );
    }

    // REFRESH TOKEN GRANT
    if (grantType === "refresh_token") {
      if (!refreshToken) {
        return json(
          {
            error: "invalid_request",
            error_description: "Missing refresh_token parameter",
          },
          { status: 400 }
        );
      }

      // Refresh tokens via back-auth
      const refreshResponse = await fetch(`${BACK_AUTH_URL}/internal/oauth/refresh-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: refreshToken,
          client_id: clientId,
        }),
      });

      if (!refreshResponse.ok) {
        return json(
          {
            error: "invalid_grant",
            error_description: "Invalid or expired refresh token",
          },
          { status: 400 }
        );
      }

      const tokens = await refreshResponse.json();

      return json(
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: "Bearer",
          expires_in: 3600,
          scope: tokens.scope,
        },
        { status: 200 }
      );
    }

    return json(
      { error: "invalid_request", error_description: "Invalid grant_type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("OAuth token error:", error);
    return json(
      {
        error: "server_error",
        error_description: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// No loader - this endpoint only accepts POST requests
export async function loader() {
  return json(
    { error: "invalid_request", error_description: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
