/**
 * User Status Feature - useUserStatus Hook
 * Primary hook for accessing user authentication state and actions
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "@remix-run/react";
import { getUserStatusStore } from "../store/userStatusStore";
import type { UserMetadata, UserStatusState } from "../store/types";

export function useUserStatus() {
  const store = getUserStatusStore();
  const location = useLocation();
  const [state, setState] = useState<UserStatusState>(store.getState());

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [store]);

  // Initialize/refresh status when navigation changes (including same-path redirects).
  useEffect(() => {
    store.initialize();
  }, [store, location.pathname, location.key]);

  const setNextLocation = useCallback(
    (path: string) => {
      store.setNextLocation(path);
    },
    [store]
  );

  const setCurrentLocation = useCallback(
    (path: string) => {
      store.setCurrentLocation(path);
    },
    [store]
  );

  const clearNextLocation = useCallback(() => {
    store.clearNextLocation();
  }, [store]);

  const logout = useCallback(
    async (logoutPath = "/app/features/user-logout", homePath = "/app/") => {
      try {
        await fetch(logoutPath, {
          method: "POST",
          credentials: "include",
        });
        store.clearAuthentication();
        // Full URL + trailing slash: avoids Remix/nginx edge cases on `/app` vs `/app/` and wrong host.
        const normalizedHome = homePath.endsWith("/") ? homePath : `${homePath}/`;
        window.location.replace(`${window.location.origin}${normalizedHome}`);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    },
    [store]
  );

  const getRedirectPath = useCallback(() => {
    return store.getRedirectPath();
  }, [store]);

  const requiresAuthentication = useCallback(
    (path: string) => {
      return store.requiresAuthentication(path);
    },
    [store]
  );

  const isPublicRoute = useCallback(
    (path: string) => {
      return store.isPublicRoute(path);
    },
    [store]
  );

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    navigation: state.navigation,
    isLoading: state.isLoading,
    timestamp: state.timestamp,

    // Computed
    currentLocation: state.navigation.currentLocation,
    nextLocation: state.navigation.nextLocation,
    previousLocation: state.navigation.previousLocation,

    // Actions
    setNextLocation,
    setCurrentLocation,
    clearNextLocation,
    logout,
    getRedirectPath,
    requiresAuthentication,
    isPublicRoute,
  };
}
