import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";
import type { CSSProperties } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is authenticated
  const cookie = request.headers.get("Cookie");
  const hasSession = cookie?.includes("admin_session");

  // If not authenticated, redirect to signin
  // Use full path including /admin/ prefix for proper routing through nginx
  if (!hasSession) {
    return redirect("/admin/features/admin-signin");
  }

  // TODO: Verify session token and check admin role
  // For now, just allow access if session cookie exists

  return json({});
}

export const meta: MetaFunction = () => [
  { title: "Tools Dashboard · Admin Console" },
  {
    name: "description",
    content: "Administrative overview for managing users and scheduled tasks.",
  },
];

const cardStyles: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  padding: "22px",
  border: "1px solid rgba(148,163,184,0.25)",
  boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  display: "grid",
  gap: "12px",
};

const headingStyles: CSSProperties = {
  margin: 0,
  fontSize: "22px",
};

const paragraphStyles: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  color: "#475569",
  lineHeight: 1.6,
};

const ctaStyles: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "#4f46e5",
  fontWeight: 600,
  textDecoration: "none",
};

const statCardStyles: CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "18px",
  border: "1px solid rgba(148,163,184,0.22)",
  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
};

const stats = [
  { label: "Active admins", value: "6", detail: "+2 this week" },
  { label: "Pending invites", value: "14", detail: "Send reminders" },
  { label: "Scheduled jobs", value: "18", detail: "4 require attention" },
];

export default function HomePage() {
  return (
    <div style={{ display: "grid", gap: "26px" }}>
      <section style={{ ...cardStyles, gap: "18px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", letterSpacing: "-0.01em" }}>
            Keep daily operations aligned with confidence
          </h2>
          <p style={paragraphStyles}>
            Track core signals, manage access, and jump straight into the work that matters most. This
            snapshot is tuned for local development with the Codex workflow.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <Link to="/admin/features/user-management" style={{ ...ctaStyles, backgroundColor: "#4f46e5", color: "#fff", padding: "10px 18px", borderRadius: "999px" }}>
            Open user management →
          </Link>
          <Link to="/admin/features/task-scheduler" style={{ ...ctaStyles, padding: "10px 18px", borderRadius: "999px", border: "1px solid rgba(79,70,229,0.4)" }}>
            Review task queue →
          </Link>
        </div>
        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
          {stats.map((item) => (
            <div key={item.label} style={statCardStyles}>
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "26px", fontWeight: 700, marginTop: "10px" }}>{item.value}</div>
              <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "6px" }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        <article style={cardStyles}>
          <h3 style={headingStyles}>User management</h3>
          <p style={paragraphStyles}>
            Review accounts, adjust access levels, and audit recent changes across your tenants.
          </p>
          <Link to="/admin/features/user-management" style={ctaStyles}>
            Go to user management →
          </Link>
        </article>
        <article style={cardStyles}>
          <h3 style={headingStyles}>Task scheduler</h3>
          <p style={paragraphStyles}>
            Configure background jobs, review last run status, and refine retry policies quickly.
          </p>
          <Link to="/admin/features/task-scheduler" style={ctaStyles}>
            Configure tasks →
          </Link>
        </article>
      </section>
    </div>
  );
}
