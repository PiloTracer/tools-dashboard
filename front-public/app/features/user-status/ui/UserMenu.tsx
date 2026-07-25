/**
 * User Status Feature — compact header account block (language lives beside this in PublicLayout).
 */

import { useState, useEffect, type FC } from "react";
import { NavLink } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { useUserStatus } from "../hooks/useUserStatus";

type UserMenuProps = {
  basePath: string;
};

function InitialsAvatar({ label }: { label: string }) {
  const raw = label.trim() || "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
      : raw.slice(0, 2).toUpperCase();
  return (
    <div className="header-account-avatar" aria-hidden="true">
      {initials}
    </div>
  );
}

export const UserMenu: FC<UserMenuProps> = ({ basePath }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useUserStatus();
  const [hydrated, setHydrated] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loginHref = `${basePath}/features/user-registration?mode=login`;
  const registerHref = `${basePath}/features/user-registration`;
  const logoutPath = `${basePath}/features/user-logout`;
  const homePath = `${basePath}/`;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout(logoutPath, homePath);
    setLoggingOut(false);
  };

  const guestChrome = (
    <>
      <NavLink to={loginHref} prefetch="intent" className="btn-ghost-sm">
        {t("header.actions.signIn")}
      </NavLink>
      <NavLink to={registerHref} prefetch="intent" className="btn-solid-sm">
        {t("header.actions.register")}
      </NavLink>
    </>
  );

  if (!hydrated) {
    return <div className="auth-links">{guestChrome}</div>;
  }

  if (isAuthenticated && user) {
    const display = user.name?.trim() || user.email?.split("@")[0] || t("header.session.account");
    return (
      <div className="header-account">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="header-account-photo" width={36} height={36} />
        ) : (
          <InitialsAvatar label={display} />
        )}
        <div className="header-account-meta">
          <div className="header-account-line1">
            <span className="header-account-name">{display}</span>
            <span className="header-account-plan">{user.subscriptionTier}</span>
          </div>
          {user.email ? (
            <span className="header-account-email" title={user.email}>
              {user.email}
            </span>
          ) : null}
        </div>
        <div className="logout-form">
          <button
            type="button"
            className="btn-header-logout"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            {loggingOut ? t("header.actions.loggingOut") : t("header.actions.logout")}
          </button>
        </div>
      </div>
    );
  }

  if (user?.email) {
    return (
      <div className="header-account-pending">
        <span className="session-dot pending" aria-hidden="true" />
        <div className="header-account-pending-text">
          <span className="header-account-pending-label">{t("header.session.pendingVerification")}</span>
          <span className="header-account-email" title={user.email}>
            {user.email}
          </span>
        </div>
      </div>
    );
  }

  return <div className="auth-links">{guestChrome}</div>;
};
