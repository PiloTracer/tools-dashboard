/**
 * JWKS (JSON Web Key Set) Endpoint
 * Provides public keys for JWT token verification
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const BACK_AUTH_URL = process.env.BACK_AUTH_URL || "http://localhost:8101";

  try {
    // Fetch JWKS from back-auth
    const response = await fetch(`${BACK_AUTH_URL}/internal/oauth/jwks`);

    if (!response.ok) {
      throw new Error("Failed to fetch JWKS");
    }

    const jwks = await response.json();

    return json(jwks, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("JWKS fetch error:", error);
    return json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
