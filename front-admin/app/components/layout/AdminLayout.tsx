import { Form, NavLink } from "@remix-run/react";
import type { ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
  /** From JWT when present; shell still shows without it. */
  userEmail?: string | null;
};

const NAV_ITEMS = [
  {
    to: "/admin",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: "/admin/features/app-library",
    label: "Application library",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z" />
      </svg>
    ),
  },
  {
    to: "/admin/features/user-management",
    label: "User management",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.127A9 9 0 1 0 4.873 9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.127A8.969 8.969 0 0 1 9 21a8.969 8.969 0 0 1-6-2.247" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.127A8.969 8.969 0 0 1 21 12a8.97 8.97 0 0 0-2.003-5.625" />
        <circle cx={9} cy={12} r={0.75} fill="currentColor" />
        <circle cx={15} cy={12} r={0.75} fill="currentColor" />
      </svg>
    ),
  },
  {
    to: "/admin/features/task-scheduler",
    label: "Task scheduler",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

const styles = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#edf1f7",
  } as const,
  sidebar: {
    width: "260px",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    padding: "28px 22px",
  } as const,
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "32px",
  } as const,
  badge: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "linear-gradient(135deg,#6366f1,#4338ca)",
    display: "grid",
    placeItems: "center",
    fontWeight: 600,
  } as const,
  navList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flexGrow: 1,
  } as const,
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    color: "rgba(248,250,252,0.75)",
    textDecoration: "none",
    transition: "background 0.15s ease, color 0.15s ease",
  } as const,
  navLinkActive: {
    backgroundColor: "rgba(99,102,241,0.22)",
    color: "#fff",
  } as const,
  footer: {
    fontSize: "12px",
    color: "rgba(248,250,252,0.65)",
    marginTop: "auto",
    paddingTop: "16px",
    borderTop: "1px solid rgba(148,163,184,0.2)",
  } as const,
  main: {
    flexGrow: 1,
    padding: "36px 48px",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  } as const,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  } as const,
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    letterSpacing: "-0.01em",
  } as const,
  headerSubtitle: {
    marginTop: "6px",
    color: "#475569",
  } as const,
  headerBadges: {
    display: "flex",
    gap: "10px",
  } as const,
  badgePrimary: {
    backgroundColor: "rgba(99,102,241,0.12)",
    color: "#4f46e5",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: 600,
    fontSize: "13px",
  } as const,
  badgeStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "999px",
    backgroundColor: "rgba(34,197,94,0.14)",
    color: "#16a34a",
    fontWeight: 600,
    fontSize: "13px",
  } as const,
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "currentColor",
  } as const,
  content: {
    display: "grid",
    gap: "26px",
  } as const,
  footerNote: {
    marginTop: "auto",
    textAlign: "center",
    fontSize: "13px",
    color: "#64748b",
    paddingTop: "18px",
    borderTop: "1px solid rgba(148,163,184,0.4)",
  } as const,
};

export function AdminLayout({ children, userEmail }: AdminLayoutProps) {
  const username = userEmail?.includes("@") ? userEmail.split("@")[0] : userEmail?.trim() || null;

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.badge}>TD</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "16px" }}>Tools Dashboard</div>
            <div style={{ fontSize: "12px", color: "rgba(248,250,252,0.65)" }}>Admin console</div>
          </div>
        </div>
        <nav style={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              prefetch="intent"
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {item.icon}
              <span style={{ fontSize: "14px" }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={styles.footer}>
          <div
            style={{
              marginBottom: "12px",
              paddingBottom: "12px",
              borderBottom: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "rgba(248,250,252,0.5)",
                marginBottom: "4px",
              }}
            >
              {username ? "Signed in as" : "Session"}
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#6366f1",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              {username || "Authenticated"}
            </div>
          </div>
          <Form method="post" action="/admin/logout" style={{ marginBottom: "14px" }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.6)",
                color: "rgba(248,250,252,0.9)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </Form>
          Environment: <strong style={{ color: "#fff" }}>Local development</strong>
          <br /> Connected to stack
        </div>
      </aside>
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Welcome back</h1>
            <p style={styles.headerSubtitle}>
              Manage operations, users, and automation without leaving this workspace.
            </p>
          </div>
          <div style={styles.headerBadges}>
            <span style={styles.badgePrimary}>Admin suite</span>
            <span style={styles.badgeStatus}>
              <span style={styles.dot} /> Online
            </span>
          </div>
        </header>
        <div style={styles.content}>{children}</div>
        <div style={styles.footerNote}>© {new Date().getFullYear()} Tools Dashboard Platform</div>
      </main>
    </div>
  );
}
