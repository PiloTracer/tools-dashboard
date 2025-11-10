import { NavLink } from "@remix-run/react";
import type { ReactNode } from "react";

type PublicLayoutProps = {
  children: ReactNode;
};

const LINKS = [
  { to: "/features/user-registration", label: "Register" },
  { to: "/features/progressive-profiling", label: "Complete profile" },
];

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
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
            {LINKS.map((item) => (
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
            {LINKS.map((item) => (
              <NavLink key={item.to} to={item.to} prefetch="intent" className="header-link">
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
