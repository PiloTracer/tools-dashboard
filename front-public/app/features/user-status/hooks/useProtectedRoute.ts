/**
 * User Status Feature - useProtectedRoute Hook
 * Hook for protecting routes and handling redirects
 */

import { useEffect } from "react";
import { useLocation, useNavigate } from "@remix-run/react";
import { useUserStatus } from "./useUserStatus";
import { PUBLIC_ROUTES } from "../store/constants";

export function useProtectedRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoading,
    setCurrentLocation,
    setNextLocation,
    requiresAuthentication,
  } = useUserStatus();

  useEffect(() => {
    // Update current location
    setCurrentLocation(location.pathname);

    // Skip if still loading
    if (isLoading) {
      return;
    }

    // Check if route requires authentication
    if (requiresAuthentication(location.pathname) && !isAuthenticated) {
      // Store intended destination
      setNextLocation(location.pathname + location.search);

      // Redirect to login
      navigate(PUBLIC_ROUTES.LOGIN, { replace: true });
    }
  }, [location.pathname, location.search, isAuthenticated, isLoading, setCurrentLocation, setNextLocation, requiresAuthentication, navigate]);

  return {
    isProtected: requiresAuthentication(location.pathname),
    isLoading,
    isAuthenticated,
  };
}
