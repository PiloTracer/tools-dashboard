import { join } from "node:path";
import { createCookie } from "@remix-run/node";
import { RemixI18Next } from "remix-i18next/server";
import Backend from "i18next-fs-backend";
import * as i18n from "./i18n";

const baseCookie = createCookie("i18next", {
  sameSite: "lax",
  path: "/",
  maxAge: 31536000, // 1 year - persist language preference across sessions
  httpOnly: false, // Allow client-side access for i18next language detector
});

// Plain-value parse/serialize: Remix's createCookie always base64-JSON-encodes values,
// which ignores the plain `i18next=es` cookie written by the static landing page
// (infra/nginx/landing/index.html) and used across the i18next ecosystem.
export const i18nCookie = {
  ...baseCookie,
  async parse(cookieHeader: string | null): Promise<string | null> {
    if (!cookieHeader) return null;
    for (const pair of cookieHeader.split(";")) {
      const [key, ...rest] = pair.trim().split("=");
      if (key === "i18next") return decodeURIComponent(rest.join("="));
    }
    return null;
  },
  async serialize(value: string): Promise<string> {
    return `i18next=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  },
};

const i18nextServer = new RemixI18Next({
  detection: {
    supportedLanguages: i18n.default.supportedLngs,
    fallbackLanguage: i18n.default.fallbackLng,
    cookie: i18nCookie,
  },
  i18next: {
    ...i18n.default,
    backend: {
      loadPath: join(process.cwd(), "public", "locales", "{{lng}}", "{{ns}}.json"),
    },
  },
  backend: Backend,
});

export default i18nextServer;
