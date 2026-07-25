import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";

import { usePublicBasePath } from "../components/layout/PublicLayout";
import i18next from "../i18next.server";
import { joinBasePath } from "../utils/publicPaths";

type LoaderData = {
  meta: {
    title: string;
    description: string;
  };
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);

  return json<LoaderData>({
    meta: {
      title: t("home.meta.title"),
      description: t("home.meta.description"),
    },
  });
}

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  const parentMeta = matches
    .flatMap((match) => match.meta ?? [])
    .filter((meta): meta is { charset: string } | { name: string; content: string } => {
      return "charset" in meta || ("name" in meta && meta.name === "viewport");
    });

  return [
    ...parentMeta,
    { title: data?.meta.title ?? "Tools Dashboard" },
    {
      name: "description",
      content: data?.meta.description ?? "",
    },
  ];
};

const FEATURE_CARD_KEYS = [
  {
    titleKey: "home.features.adaptiveOnboarding.title",
    descriptionKey: "home.features.adaptiveOnboarding.description",
    ctaKey: "home.features.adaptiveOnboarding.cta",
    to: "/features/progressive-profiling",
  },
  {
    titleKey: "home.features.trustedAuth.title",
    descriptionKey: "home.features.trustedAuth.description",
    ctaKey: "home.features.trustedAuth.cta",
    to: "/features/user-registration",
  },
  {
    titleKey: "home.features.appLibrary.title",
    descriptionKey: "home.features.appLibrary.description",
    ctaKey: "home.features.appLibrary.cta",
    to: "/features/app-library",
  },
] as const;

export default function HomePage() {
  const { t } = useTranslation();
  const basePath = usePublicBasePath();
  const registerHref = joinBasePath(basePath, "/features/user-registration");
  const resumeHref = joinBasePath(basePath, "/features/progressive-profiling");
  const featureCards = FEATURE_CARD_KEYS.map((card) => ({
    ...card,
    href: joinBasePath(basePath, card.to),
  }));

  return (
    <>
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="tag">{t("home.hero.tag")}</span>
            <h1>{t("home.hero.title")}</h1>
            <p>{t("home.hero.description")}</p>
            <div className="hero-actions">
              <Link to={registerHref} className="btn-solid">
                {t("home.hero.createAccount")}
              </Link>
              <Link to={resumeHref} className="btn-ghost">
                {t("home.hero.resumeProfile")}
              </Link>
            </div>
          </div>
          <div className="hero-cards">
            <div className="hero-card-item">
              <h3>{t("home.cards.oneFlow.title")}</h3>
              <p>{t("home.cards.oneFlow.description")}</p>
            </div>
            <div className="hero-card-item">
              <h3>{t("home.cards.securityFirst.title")}</h3>
              <p>{t("home.cards.securityFirst.description")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {featureCards.map((card) => (
          <article key={card.titleKey} className="feature-tile">
            <h3>{t(card.titleKey)}</h3>
            <p>{t(card.descriptionKey)}</p>
            <Link to={card.href} className="feature-link">
              {t(card.ctaKey)}
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
