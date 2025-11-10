import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "Tools Dashboard · Public Portal" },
  {
    name: "description",
    content: "Welcome to the public onboarding experience for the Tools Dashboard ecosystem.",
  },
];

const FEATURE_CARDS = [
  {
    title: "Adaptive onboarding",
    description: "Serve contextual steps based on segment, geography, and progression stage.",
    to: "/features/progressive-profiling",
    cta: "Explore profiling",
  },
  {
    title: "Trusted authentication",
    description: "Offer Google and email login paths with progressive security requirements.",
    to: "/features/user-registration",
    cta: "Review auth flows",
  },
  {
    title: "Telemetry & insight",
    description: "Monitor conversion health and inform subscription recommendations in real time.",
    to: "/features/progressive-profiling",
    cta: "See journey analytics",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="tag">Launch-ready onboarding</span>
            <h1>Design a customer journey that learns and responds instantly</h1>
            <p>
              Empower visitors to register, authenticate, and complete their profile with crystal-clear steps and
              responsive guidance. Every screen is tuned for accessibility and mobile responsiveness.
            </p>
            <div className="hero-actions">
              <Link to="/features/user-registration" className="btn-solid">
                Create an account
              </Link>
              <Link to="/features/progressive-profiling" className="btn-ghost">
                Resume profile
              </Link>
            </div>
          </div>
          <div className="hero-cards">
            <div className="hero-card-item">
              <h3>One flow, all devices</h3>
              <p>Delight users with a consistent path from welcome screen to activation in under three steps.</p>
            </div>
            <div className="hero-card-item">
              <h3>Security-first foundations</h3>
              <p>Guard sessions with rotating tokens, managed secrets, and AI-assisted alerts.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {FEATURE_CARDS.map((card) => (
          <article key={card.title} className="feature-tile">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <Link to={card.to} className="feature-link">
              {card.cta}
              <span>→</span>
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
