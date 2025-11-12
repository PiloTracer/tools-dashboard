/**
 * User Status Feature - Protected Route Component
 * Wrapper component for routes that require authentication
 */

import type { FC, ReactNode } from "react";
import { useProtectedRoute } from "../hooks/useProtectedRoute";

type ProtectedRouteProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const { isLoading, isAuthenticated, isProtected } = useProtectedRoute();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container" style={{ padding: "40px", textAlign: "center" }}>
        <div className="loading-spinner" style={{ fontSize: "18px", color: "var(--color-text-secondary)" }}>
          Loading...
        </div>
      </div>
    );
  }

  // If route is protected and user is not authenticated, show fallback or null
  // (navigation to login will happen via useProtectedRoute hook)
  if (isProtected && !isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  // Render children if authenticated or route is public
  return <>{children}</>;
};
