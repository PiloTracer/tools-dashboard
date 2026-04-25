import { NavLink } from "@remix-run/react";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { joinBasePath, normalizeBasePath } from "../../utils/publicPaths";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { UserMenu, useUserStatus } from "../../features/user-status";

const PRIMARY_NAV = [
  { path: "/features/app-library", labelKey: "header.nav.appLibrary" as const },
  { path: "/features/user-registration", labelKey: "header.nav.register" as const },
  { path: "/features/progressive-profiling", labelKey: "header.nav.completeProfile" as const },
  { path: "/features/user-subscription", labelKey: "header.nav.pricing" as const },
] as const;

type PublicLayoutProps = {
  basePath?: string;
  children: ReactNode;
};

const BasePathContext = createContext("/");

export function PublicLayout({
  basePath = "/app",
  children,
}: PublicLayoutProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useUserStatus();
  const normalizedBasePath = useMemo(() => normalizeBasePath(basePath), [basePath]);

  const navigationLinks = useMemo(() => {
    const items = isAuthenticated
      ? PRIMARY_NAV.filter((item) => item.path !== "/features/user-registration")
      : [...PRIMARY_NAV];
    return items.map((item) => ({ ...item, to: joinBasePath(normalizedBasePath, item.path) }));
  }, [normalizedBasePath, isAuthenticated]);

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
            <nav className="header-nav" aria-label="Primary">
              {navigationLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  prefetch="intent"
                  className={({ isActive }) => ["header-link", isActive ? "is-active" : ""].join(" ").trim()}
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
            <div className="header-controls">
              <div className="header-toolbar" aria-label={t("header.toolbarLabel")}>
                <div className="header-toolbar-lang">
                  <LanguageSwitcher />
                </div>
                <span className="header-toolbar-divider" aria-hidden="true" />
                <UserMenu basePath={normalizedBasePath} />
              </div>
            </div>
          </div>
        </header>
        <main className="public-main">
          <div className="public-main-inner">{children}</div>
        </main>
        <footer className="public-footer">
          <div className="footer-inner">
            <p className="footer-copyright">
              {t("footer.copyright", { year: new Date().getFullYear() })}
              <span className="footer-build" aria-label="Public build version">
                {" "}
                · v0.1.0
              </span>
            </p>
            <nav className="footer-actions" aria-label="Footer">
              {navigationLinks.map((item) => (
                <NavLink key={item.to} to={item.to} prefetch="intent" className="header-link footer-link">
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
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
