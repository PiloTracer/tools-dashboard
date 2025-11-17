/**
 * Session utilities for front-public
 * Manages user authentication state via cookies
 */

import { createCookieSessionStorage } from "@remix-run/node";

// Create session storage
const sessionSecret = process.env.SESSION_SECRET || "default-dev-secret-change-in-production";

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "user_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export { getSession, commitSession, destroySession };
