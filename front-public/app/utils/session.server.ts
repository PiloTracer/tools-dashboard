/**
 * Session utilities for front-public
 * Manages user authentication state via cookies
 */

import { createCookieSessionStorage } from "@remix-run/node";

// Create session storage
const sessionSecret = process.env.SESSION_SECRET || "default-dev-secret-change-in-production";

const { getSession, commitSession, destroySession} = createCookieSessionStorage({
  cookie: {
    name: "td_session", // Changed from "user_session" to match back-auth cookie name
    // In dev, use secure=false but in prod use secure=true
    // SameSite=None requires Secure=true, but we can't use HTTPS in dev
    // So we use SameSite=Lax in dev (works for top-level navigations)
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    domain: undefined, // Let browser set domain automatically
  },
});

export { getSession, commitSession, destroySession };
