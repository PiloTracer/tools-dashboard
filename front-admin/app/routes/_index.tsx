import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "Tools Dashboard · Admin Console" },
  {
    name: "description",
    content: "Administrative surface for managing users, tasks, and scheduling.",
  },
];

const STATS = [
  { label: "Active admins", value: "6", detail: "+2 this week" },
  { label: "Pending invites", value: "14", detail: "Send reminders" },
  { label: "Scheduled jobs", value: "18", detail: "4 require attention" },
];

const CARDS = [
  {
    title: "User management",
    body: "Review accounts, adjust access levels, and audit recent changes across tenants.",
    to: "/features/user-management",
    cta: "Open user management",
  },
  {
    title: "Task scheduler",
    body: "Configure background jobs, tune retry policies, and monitor execution health.",
    to: "/features/task-scheduler",
    cta: "Configure tasks",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-card">
        <div className="hero-heading">
          <h2>Keep operations aligned with a dependable admin workspace</h2>
          <p>
            Track the status of your ecosystem, manage permissions, and launch new features alongside AI
            agents in minutes.
          </p>
        </div>
        <div className="hero-actions">
          <Link to="/features/user-management" className="btn-primary">
            Go to user management
          </Link>
          <Link to="/features/task-scheduler" className="btn-secondary">
            View scheduler queue
          </Link>
        </div>
        <dl className="stats-grid">
          {STATS.map((item) => (
            <div key={item.label} className="stat-card">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
              <span>{item.detail}</span>
            </div>
          ))}
        </dl>
      </section>

      <section className="cards-grid">
        {CARDS.map((card) => (
          <article key={card.title} className="feature-card">
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <Link to={card.to} className="card-link">
              {card.cta}
              <span>→</span>
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
