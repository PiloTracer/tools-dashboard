/**
 * User Status Feature - Type Definitions
 * Defines the core types for user authentication state and navigation management
 */

export interface UserMetadata {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscriptionTier: "free" | "standard" | "premium" | "enterprise";
  features: string[];
}

export interface NavigationState {
  currentLocation: string;
  nextLocation: string | null;
  previousLocation: string | null;
}

export interface UserStatusState {
  isAuthenticated: boolean;
  user: UserMetadata | null;
  navigation: NavigationState;
  isLoading: boolean;
  timestamp: number;
}

export interface UserStatusResponse {
  isAuthenticated: boolean;
  user: UserMetadata | null;
  navigation: NavigationState;
  timestamp: number;
}

export interface NavigationUpdateRequest {
  currentLocation: string;
  nextLocation?: string | null;
}

export type SessionStatus = "anonymous" | "pending" | "authenticated" | "unknown";

export interface SessionSnapshot {
  status: SessionStatus;
  email?: string;
  message?: string;
}
