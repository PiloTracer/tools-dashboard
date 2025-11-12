/**
 * User Status Feature - Constants
 * Defines protected routes, public routes, and storage keys
 */

export const PROTECTED_ROUTES = {
  PRICING_CHECKOUT: "/app/features/user-subscription/",
  PROFILE: "/app/profile",
  DASHBOARD: "/app/dashboard",
  BILLING: "/app/billing",
} as const;

export const PUBLIC_ROUTES = {
  HOME: "/app",
  REGISTER: "/app/features/user-registration",
  LOGIN: "/app/features/user-registration?mode=login",
  PRICING: "/app/features/user-subscription",
  PROFILING: "/app/features/progressive-profiling",
} as const;

export const STORAGE_KEYS = {
  USER_STATUS: "user_status_metadata",
  NAVIGATION: "user_status_navigation",
  TIMESTAMP: "user_status_timestamp",
} as const;

export const DEFAULT_NAVIGATION_STATE = {
  currentLocation: "/app",
  nextLocation: null,
  previousLocation: null,
} as const;

export const STATUS_CHECK_INTERVAL = 60000; // 1 minute

export const ROUTE_PATTERNS = {
  // Routes that require authentication
  PROTECTED_PATTERN: /^\/(app\/)?(profile|dashboard|billing|features\/user-subscription\/[^/]+)/,
  // Routes that are always public
  PUBLIC_PATTERN: /^\/(app\/)?(features\/(user-registration|progressive-profiling|user-subscription))?$/,
} as const;
