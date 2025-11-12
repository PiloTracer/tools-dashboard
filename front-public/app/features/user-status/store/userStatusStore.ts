/**
 * User Status Feature - Store
 * Manages user authentication state, navigation, and storage
 */

import { DEFAULT_NAVIGATION_STATE, ROUTE_PATTERNS, STORAGE_KEYS } from "./constants";
import type {
  NavigationState,
  NavigationUpdateRequest,
  UserMetadata,
  UserStatusResponse,
  UserStatusState,
} from "./types";

type StateListener = (state: UserStatusState) => void;

class UserStatusStore {
  private state: UserStatusState = {
    isAuthenticated: false,
    user: null,
    navigation: DEFAULT_NAVIGATION_STATE,
    isLoading: true,
    timestamp: Date.now(),
  };

  private listeners: Set<StateListener> = new Set();

  constructor() {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      this.loadFromStorage();
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state snapshot
   */
  getState(): UserStatusState {
    return { ...this.state };
  }

  /**
   * Initialize and check authentication status
   */
  async initialize(): Promise<void> {
    this.updateState({ isLoading: true });

    try {
      const response = await fetch("/app/features/user-status", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        // Check if response is actually JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data: UserStatusResponse = await response.json();
          this.updateState({
            isAuthenticated: data.isAuthenticated,
            user: data.user,
            navigation: data.navigation || DEFAULT_NAVIGATION_STATE,
            timestamp: data.timestamp || Date.now(),
            isLoading: false,
          });
        } else {
          console.error("Expected JSON but received:", contentType);
          this.clearAuthentication();
        }
      } else {
        this.clearAuthentication();
      }
    } catch (error) {
      console.error("Failed to initialize user status:", error);
      this.clearAuthentication();
    }
  }

  /**
   * Set user as authenticated
   */
  setAuthenticated(userData: UserMetadata): void {
    this.updateState({
      isAuthenticated: true,
      user: userData,
      timestamp: Date.now(),
    });
    this.persistToStorage();
  }

  /**
   * Clear authentication state
   */
  clearAuthentication(): void {
    this.updateState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      timestamp: Date.now(),
    });
    this.clearStorage();
  }

  /**
   * Update navigation state
   */
  updateNavigation(navigation: Partial<NavigationState>): void {
    this.updateState({
      navigation: {
        ...this.state.navigation,
        ...navigation,
      },
      timestamp: Date.now(),
    });
    this.persistToStorage();
  }

  /**
   * Set next location for post-login redirect
   */
  setNextLocation(path: string): void {
    const previousLocation = this.state.navigation.currentLocation;
    this.updateNavigation({
      nextLocation: path,
      previousLocation,
    });
  }

  /**
   * Update current location
   */
  setCurrentLocation(path: string): void {
    const previousLocation = this.state.navigation.currentLocation;
    this.updateNavigation({
      currentLocation: path,
      previousLocation: previousLocation !== path ? previousLocation : this.state.navigation.previousLocation,
    });
  }

  /**
   * Clear next location after redirect
   */
  clearNextLocation(): void {
    this.updateNavigation({
      nextLocation: null,
    });
  }

  /**
   * Get redirect path after login
   */
  getRedirectPath(): string {
    return this.state.navigation.nextLocation || "/app/dashboard";
  }

  /**
   * Check if route requires authentication
   */
  requiresAuthentication(path: string): boolean {
    // Remove query parameters and hash
    const cleanPath = path.split("?")[0].split("#")[0];

    // Check against protected route pattern
    return ROUTE_PATTERNS.PROTECTED_PATTERN.test(cleanPath);
  }

  /**
   * Check if route is public
   */
  isPublicRoute(path: string): boolean {
    // Remove query parameters and hash
    const cleanPath = path.split("?")[0].split("#")[0];

    // Check against public route pattern
    return ROUTE_PATTERNS.PUBLIC_PATTERN.test(cleanPath);
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<UserStatusState>): void {
    this.state = {
      ...this.state,
      ...updates,
    };
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("Error in user status listener:", error);
      }
    });
  }

  /**
   * Persist state to localStorage
   */
  private persistToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      // Store user metadata (non-sensitive)
      if (this.state.user) {
        const safeData = {
          id: this.state.user.id,
          email: this.state.user.email,
          name: this.state.user.name,
          subscriptionTier: this.state.user.subscriptionTier,
          features: this.state.user.features,
        };
        localStorage.setItem(STORAGE_KEYS.USER_STATUS, JSON.stringify(safeData));
      }

      // Store navigation state
      localStorage.setItem(STORAGE_KEYS.NAVIGATION, JSON.stringify(this.state.navigation));

      // Store timestamp
      localStorage.setItem(STORAGE_KEYS.TIMESTAMP, String(this.state.timestamp));
    } catch (error) {
      console.error("Failed to persist user status to storage:", error);
    }
  }

  /**
   * Load state from localStorage
   */
  private loadFromStorage(): void {
    try {
      const userDataStr = localStorage.getItem(STORAGE_KEYS.USER_STATUS);
      const navigationStr = localStorage.getItem(STORAGE_KEYS.NAVIGATION);
      const timestampStr = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);

      if (userDataStr) {
        const user = JSON.parse(userDataStr) as UserMetadata;
        this.state.user = user;
        this.state.isAuthenticated = true;
      }

      if (navigationStr) {
        this.state.navigation = JSON.parse(navigationStr) as NavigationState;
      }

      if (timestampStr) {
        this.state.timestamp = parseInt(timestampStr, 10);
      }

      this.state.isLoading = false;
    } catch (error) {
      console.error("Failed to load user status from storage:", error);
      this.clearStorage();
    }
  }

  /**
   * Clear all storage
   */
  private clearStorage(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEYS.USER_STATUS);
      localStorage.removeItem(STORAGE_KEYS.NAVIGATION);
      localStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
    } catch (error) {
      console.error("Failed to clear user status storage:", error);
    }
  }

  /**
   * Send navigation update to backend
   */
  async syncNavigationToBackend(request: NavigationUpdateRequest): Promise<void> {
    try {
      await fetch("/app/features/user-status", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error("Failed to sync navigation to backend:", error);
    }
  }
}

// Singleton instance
let storeInstance: UserStatusStore | null = null;

export function getUserStatusStore(): UserStatusStore {
  if (typeof window === "undefined") {
    // Server-side: create a new instance each time
    return new UserStatusStore();
  }

  // Client-side: use singleton
  if (!storeInstance) {
    storeInstance = new UserStatusStore();
  }

  return storeInstance;
}

export { UserStatusStore };
