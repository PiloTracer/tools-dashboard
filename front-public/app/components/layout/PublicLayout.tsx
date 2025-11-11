import { Form, NavLink } from "@remix-run/react";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { joinBasePath, normalizeBasePath } from "../../utils/publicPaths";

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

const LINKS: NavigationLink[] = [
  { to: "/features/user-registration", label: "Register" },
  { to: "/features/progressive-profiling", label: "Complete profile" },
];

export function PublicLayout({
  basePath = "/app",
  children,
  session = { status: "unknown" },
}: PublicLayoutProps) {
  const normalizedBasePath = useMemo(() => normalizeBasePath(basePath), [basePath]);

  const navigationLinks = useMemo(
    () => LINKS.map((link) => ({ ...link, to: joinBasePath(normalizedBasePath, link.to) })),
    [normalizedBasePath],
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
            <div className="header-controls">
              <div className="session-indicator" data-status={session.status}>
                {session.status === "authenticated" ? (
                  <>
                    <span className="session-dot" aria-hidden="true" />
                    <span className="session-label">Signed in</span>
                    <strong className="session-value">{session.email}</strong>
                  </>
                ) : session.status === "pending" && session.email ? (
                  <>
                    <span className="session-dot pending" aria-hidden="true" />
                    <span className="session-label">Pending verification</span>
                    <strong className="session-value">{session.email}</strong>
                  </>
                ) : session.status === "unknown" ? (
                  <>
                    <span className="session-dot unknown" aria-hidden="true" />
                    <span className="session-label">Status unknown</span>
                  </>
                ) : (
                  <>
                    <span className="session-dot" aria-hidden="true" />
                    <span className="session-label">Guest</span>
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
                    Logout
                  </button>
                </Form>
              ) : (
                <div className="auth-links">
                  <NavLink to={loginHref} prefetch="intent" className="btn-ghost-sm">
                    Sign in
                  </NavLink>
                  <NavLink to={registerHref} prefetch="intent" className="btn-solid-sm">
                    Register
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
