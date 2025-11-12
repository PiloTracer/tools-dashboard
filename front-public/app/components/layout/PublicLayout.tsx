import { Form, NavLink } from "@remix-run/react";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { joinBasePath, normalizeBasePath } from "../../utils/publicPaths";
import { LanguageSwitcher } from "../LanguageSwitcher";

type PublicLayoutProps = {
  basePath?: string;
  children: ReactNode;
  session?: SessionSnapshot;
};

type NavigationLink = {
  to: string;
  label: string;
};

type SessionSnapshot =
  | { status: "anonymous"; message?: string }
  | { status: "pending"; email?: string; message?: string }
  | { status: "authenticated"; email: string; message?: string }
  | { status: "unknown"; message?: string };

const BasePathContext = createContext("/");

export function PublicLayout({
  basePath = "/app",
  children,
  session = { status: "unknown" },
}: PublicLayoutProps) {
  const { t } = useTranslation();
  const normalizedBasePath = useMemo(() => normalizeBasePath(basePath), [basePath]);

  const LINKS: NavigationLink[] = useMemo(
    () => [
      { to: "/features/user-registration", label: t("header.nav.register") },
      { to: "/features/progressive-profiling", label: t("header.nav.completeProfile") },
      { to: "/features/user-subscription", label: t("header.nav.pricing") },
    ],
    [t]
  );

  const navigationLinks = useMemo(
    () => LINKS.map((link) => ({ ...link, to: joinBasePath(normalizedBasePath, link.to) })),
    [normalizedBasePath, LINKS],
  );

  const loginHref = joinBasePath(normalizedBasePath, "/features/user-registration?mode=login");
  const registerHref = joinBasePath(normalizedBasePath, "/features/user-registration");

  return (
    <BasePathContext.Provider value={normalizedBasePath}>
      <div className="public-shell">
        <header className="public-header">
          <div className="header-inner">
            <div className="header-brand">
              <div className="header-logo">TD</div>
              <div className="header-title">
                <strong>{t("header.brand")}</strong>
                <span>{t("header.subtitle")}</span>
              </div>
            </div>
            <nav className="header-nav">
              {navigationLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  prefetch="intent"
                  className={({ isActive }) => ["header-link", isActive ? "is-active" : ""].join(" ").trim()}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="header-controls">
              <LanguageSwitcher />
              <div className="session-indicator" data-status={session.status}>
                {session.status === "authenticated" ? (
                  <>
                    <span className="session-dot" aria-hidden="true" />
                    <span className="session-label">{t("header.session.signedIn")}</span>
                    <strong className="session-value">{session.email}</strong>
                  </>
                ) : session.status === "pending" && session.email ? (
                  <>
                    <span className="session-dot pending" aria-hidden="true" />
                    <span className="session-label">{t("header.session.pendingVerification")}</span>
                    <strong className="session-value">{session.email}</strong>
                  </>
                ) : session.status === "unknown" ? (
                  <>
                    <span className="session-dot unknown" aria-hidden="true" />
                    <span className="session-label">{t("header.session.statusUnknown")}</span>
                  </>
                ) : (
                  <>
                    <span className="session-dot" aria-hidden="true" />
                    <span className="session-label">{t("header.session.guest")}</span>
                  </>
                )}
              </div>
              {session.status === "authenticated" ? (
                <Form
                  method="post"
                  action={joinBasePath(normalizedBasePath, "/features/user-logout")}
                  className="logout-form"
                >
                  <button type="submit" className="btn-ghost-sm">
                    {t("header.actions.logout")}
                  </button>
                </Form>
              ) : (
                <div className="auth-links">
                  <NavLink to={loginHref} prefetch="intent" className="btn-ghost-sm">
                    {t("header.actions.signIn")}
                  </NavLink>
                  <NavLink to={registerHref} prefetch="intent" className="btn-solid-sm">
                    {t("header.actions.register")}
                  </NavLink>
                </div>
              )}
              <span className="build-badge" aria-label="Public build version">
                v0.1.0
              </span>
            </div>
          </div>
        </header>
        <main className="public-main">
          <div className="public-main-inner">{children}</div>
        </main>
        <footer className="public-footer">
          <div className="footer-inner">
            <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
            <div className="footer-actions">
              {navigationLinks.map((item) => (
                <NavLink key={item.to} to={item.to} prefetch="intent" className="header-link">
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </BasePathContext.Provider>
  );
}

export function usePublicBasePath() {
  return useContext(BasePathContext);
}

export function usePublicHref(path: string) {
  const basePath = usePublicBasePath();
  return joinBasePath(basePath, path);
}
