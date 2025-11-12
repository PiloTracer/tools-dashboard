/**
 * User Status Feature - Public API
 * Exports all public hooks, components, and types
 */

// Hooks
export { useUserStatus } from "./hooks/useUserStatus";
export { useProtectedRoute } from "./hooks/useProtectedRoute";

// Components
export { StatusIndicator } from "./ui/StatusIndicator";
export { UserMenu } from "./ui/UserMenu";
export { ProtectedRoute } from "./ui/ProtectedRoute";

// Types
export type {
  UserMetadata,
  UserStatusState,
  NavigationState,
  SessionStatus,
  SessionSnapshot,
} from "./store/types";

// Constants
export { PROTECTED_ROUTES, PUBLIC_ROUTES } from "./store/constants";
