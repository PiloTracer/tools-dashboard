import { NavLink } from "@remix-run/react";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { joinBasePath, normalizeBasePath } from "../../utils/publicPaths";

type PublicLayoutProps = {
  basePath?: string;
  children: ReactNode;
};

type NavigationLink = {
  to: string;
  label: string;
};

const BasePathContext = createContext("/");

const LINKS: NavigationLink[] = [
  { to: "/features/user-registration", label: "Register" },
  { to: "/features/progressive-profiling", label: "Complete profile" },
];

export function PublicLayout({ basePath = "/", children }: PublicLayoutProps) {
  const normalizedBasePath = useMemo(() => normalizeBasePath(basePath), [basePath]);

  const navigationLinks = useMemo(
    () => LINKS.map((link) => ({ ...link, to: joinBasePath(normalizedBasePath, link.to) })),
    [normalizedBasePath],
  );

  return (
    <BasePathContext.Provider value={normalizedBasePath}>
      <div className="public-shell">
        <header className="public-header">
          <div className="header-inner">
            <div className="header-brand">
              <div className="header-logo">TD</div>
              <div className="header-title">
                <strong>Tools Dashboard</strong>
                <span>Public experience</span>
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
            <div className="header-status">
              <span>Secure sessions</span>
              <span>v0.1.0</span>
            </div>
          </div>
        </header>
        <main className="public-main">
          <div className="public-main-inner">{children}</div>
        </main>
        <footer className="public-footer">
          <div className="footer-inner">
            <p>&copy; {new Date().getFullYear()} Tools Dashboard Platform.</p>
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

