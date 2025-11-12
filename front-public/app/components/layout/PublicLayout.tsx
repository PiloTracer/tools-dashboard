import { NavLink } from "@remix-run/react";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { joinBasePath, normalizeBasePath } from "../../utils/publicPaths";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { StatusIndicator, UserMenu } from "../../features/user-status";

type PublicLayoutProps = {
  basePath?: string;
  children: ReactNode;
};

type NavigationLink = {
  to: string;
  label: string;
};

const BasePathContext = createContext("/");

export function PublicLayout({
  basePath = "/app",
  children,
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
              <StatusIndicator />
              <UserMenu basePath={normalizedBasePath} />
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
