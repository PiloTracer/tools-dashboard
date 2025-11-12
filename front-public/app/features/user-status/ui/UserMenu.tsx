/**
 * User Status Feature - User Menu Component
 * Displays user menu with navigation and logout
 */

import type { FC } from "react";
import { Form, NavLink } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { useUserStatus } from "../hooks/useUserStatus";

type UserMenuProps = {
  basePath: string;
};

export const UserMenu: FC<UserMenuProps> = ({ basePath }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useUserStatus();

  const loginHref = `${basePath}/features/user-registration?mode=login`;
  const registerHref = `${basePath}/features/user-registration`;
  const logoutAction = `${basePath}/features/user-logout`;

  if (isAuthenticated && user) {
    return (
      <div className="auth-links">
        <div className="user-info" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user.avatar && (
            <img
              src={user.avatar}
              alt={user.name}
              className="user-avatar"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}
          <div style={{ fontSize: "14px" }}>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: "var(--color-text-secondary)", fontSize: "12px" }}>
              {user.subscriptionTier}
            </div>
          </div>
        </div>
        <Form method="post" action={logoutAction} className="logout-form">
          <button type="submit" className="btn-ghost-sm">
            {t("header.actions.logout")}
          </button>
        </Form>
      </div>
    );
  }

  return (
    <div className="auth-links">
      <NavLink to={loginHref} prefetch="intent" className="btn-ghost-sm">
        {t("header.actions.signIn")}
      </NavLink>
      <NavLink to={registerHref} prefetch="intent" className="btn-solid-sm">
        {t("header.actions.register")}
      </NavLink>
    </div>
  );
};
