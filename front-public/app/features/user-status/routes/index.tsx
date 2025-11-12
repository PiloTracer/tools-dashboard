/**
 * User Status Feature - Route Handler
 * Handles API proxy requests to the backend user-status service
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getBackAuthEnv } from "../../../utils/env.server";

/**
 * GET /features/user-status - Get current user status
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { backAuthBaseUrl } = getBackAuthEnv();
  const statusUrl = new URL("/user-registration/status", backAuthBaseUrl);
  const cookieHeader = request.headers.get("cookie");

  try {
    const response = await fetch(statusUrl, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!response.ok) {
      return json(
        {
          isAuthenticated: false,
          user: null,
          navigation: {
            currentLocation: "/app",
            nextLocation: null,
            previousLocation: null,
          },
          timestamp: Date.now(),
        },
        { status: 200 }
      );
    }

    const data = await response.json();

    // Transform backend response to user-status format
    const userStatus = {
      isAuthenticated: data.status === "verified",
      user: data.status === "verified" && data.email
        ? {
            id: data.email, // TODO: Use actual user ID when available
            email: data.email,
            name: data.email.split("@")[0], // TODO: Use actual name when available
            subscriptionTier: "free", // TODO: Fetch from subscription service
            features: [],
          }
        : null,
      navigation: {
        currentLocation: "/app",
        nextLocation: null,
        previousLocation: null,
      },
      timestamp: Date.now(),
    };

    return json(userStatus, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch user status:", error);
    return json(
      {
        isAuthenticated: false,
        user: null,
        navigation: {
          currentLocation: "/app",
          nextLocation: null,
          previousLocation: null,
        },
        timestamp: Date.now(),
      },
      { status: 200 }
    );
  }
}

/**
 * POST /features/user-status - Update navigation state
 */
export async function action({ request }: ActionFunctionArgs) {
  // For now, just acknowledge the update
  // In a full implementation, this would persist to backend
  const body = await request.json();
  console.log("Navigation state update:", body);

  return json({ success: true }, { status: 200 });
}

// Resource route - no default export needed
// This ensures the route only returns JSON from loader/action
