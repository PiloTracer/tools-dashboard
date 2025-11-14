import { NavLink } from "@remix-run/react";
import type { ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
  userEmail?: string;
};

const NAV_ITEMS = [
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
  // Extract username from email (part before @)
  const username = userEmail ? userEmail.split("@")[0] : null;

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
          {username && (
            <>
              <div style={{
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid rgba(148,163,184,0.2)"
              }}>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(248,250,252,0.5)",
                  marginBottom: "4px"
                }}>
                  Signed in as
                </div>
                <div style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#6366f1",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {username}
                </div>
              </div>
            </>
          )}
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
