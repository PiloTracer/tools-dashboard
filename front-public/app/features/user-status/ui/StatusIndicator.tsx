/**
 * User Status Feature - Status Indicator Component
 * Displays the current authentication status in the header
 */

import { useState, useEffect, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useUserStatus } from "../hooks/useUserStatus";
import type { SessionStatus } from "../store/types";

export const StatusIndicator: FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, isLoading } = useUserStatus();
  const [hydrated, setHydrated] = useState(false);

  // Only show dynamic status after client hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  const getSessionStatus = (): SessionStatus => {
    if (isLoading || !hydrated) return "unknown";
    if (isAuthenticated && user) return "authenticated";
    if (!isAuthenticated && user?.email) return "pending";
    return "anonymous";
  };

  const status = getSessionStatus();

  return (
    <div className="session-indicator" data-status={status}>
      {hydrated && status === "authenticated" && user ? (
        <>
          <span className="session-dot" aria-hidden="true" />
          <span className="session-label">{t("header.session.signedIn")}</span>
          <strong className="session-value">{user.email}</strong>
        </>
      ) : hydrated && status === "pending" && user?.email ? (
        <>
          <span className="session-dot pending" aria-hidden="true" />
          <span className="session-label">{t("header.session.pendingVerification")}</span>
          <strong className="session-value">{user.email}</strong>
        </>
      ) : (
        <>
          <span className="session-dot unknown" aria-hidden="true" />
          <span className="session-label">{t("header.session.statusUnknown")}</span>
        </>
      )}
    </div>
  );
};
