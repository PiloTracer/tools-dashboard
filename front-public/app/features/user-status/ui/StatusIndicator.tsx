/**
 * User Status Feature - Status Indicator Component
 * Displays the current authentication status in the header
 */

import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useUserStatus } from "../hooks/useUserStatus";
import type { SessionStatus } from "../store/types";

export const StatusIndicator: FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, isLoading } = useUserStatus();

  const getSessionStatus = (): SessionStatus => {
    if (isLoading) return "unknown";
    if (isAuthenticated && user) return "authenticated";
    if (!isAuthenticated && user?.email) return "pending";
    return "anonymous";
  };

  const status = getSessionStatus();

  // Get className based on status to avoid hydration mismatch
  const getDotClassName = (): string => {
    switch (status) {
      case "pending":
        return "session-dot pending";
      case "unknown":
        return "session-dot unknown";
      default:
        return "session-dot";
    }
  };

  return (
    <div className="session-indicator" data-status={status}>
      {status === "authenticated" && user ? (
        <>
          <span className={getDotClassName()} aria-hidden="true" />
          <span className="session-label">{t("header.session.signedIn")}</span>
          <strong className="session-value">{user.email}</strong>
        </>
      ) : status === "pending" && user?.email ? (
        <>
          <span className={getDotClassName()} aria-hidden="true" />
          <span className="session-label">{t("header.session.pendingVerification")}</span>
          <strong className="session-value">{user.email}</strong>
        </>
      ) : status === "unknown" ? (
        <>
          <span className={getDotClassName()} aria-hidden="true" />
          <span className="session-label">{t("header.session.statusUnknown")}</span>
        </>
      ) : (
        <>
          <span className={getDotClassName()} aria-hidden="true" />
          <span className="session-label">{t("header.session.guest")}</span>
        </>
      )}
    </div>
  );
};
