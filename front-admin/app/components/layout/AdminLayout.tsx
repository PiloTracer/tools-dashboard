import { NavLink } from "@remix-run/react";
import type { ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  {
    to: "/features/user-management",
    label: "User management",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.127A9 9 0 1 0 4.873 9M15 19.127A8.969 8.969 0 0 1 9 21a8.969 8.969 0 0 1-6-2.247M15 19.127A8.969 8.969 0 0 1 21 12a8.97 8.97 0 0 0-2.003-5.625M9 12h.008v.008H9Zm6 0h.008v.008H15Z"
        />
      </svg>
    ),
  },
  {
    to: "/features/task-scheduler",
    label: "Task scheduler",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-badge">TD</div>
          <div className="sidebar-brand-text">
            <strong>Tools Dashboard</strong>
            <span>Admin console</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              prefetch="intent"
              className={({ isActive }) => ["sidebar-link", isActive ? "is-active" : ""].join(" ").trim()}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          Environment: <strong>Local development</strong>
          <br />
          Status: Connected
        </div>
      </aside>
      <div className="admin-main">
        <div className="admin-header">
          <div className="header-title">
            <h1>Welcome back</h1>
            <p>Manage product operations, users, and scheduled tasks from one workspace.</p>
          </div>
          <div className="header-actions">
            <span className="badge-light">Admin suite</span>
            <span className="badge-dot">
              <span /> Online
            </span>
          </div>
        </div>
        <div className="admin-content">{children}</div>
        <footer className="admin-footer">&copy; {new Date().getFullYear()} Tools Dashboard Platform.</footer>
      </div>
    </div>
  );
}
