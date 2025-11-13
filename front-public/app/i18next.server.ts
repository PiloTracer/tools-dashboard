import { resolve, join } from "node:path";
import { createCookie } from "@remix-run/node";
import { RemixI18Next } from "remix-i18next/server";
import Backend from "i18next-fs-backend";
import * as i18n from "./i18n";

export const i18nCookie = createCookie("i18next", {
  sameSite: "lax",
  path: "/",
  maxAge: 31536000, // 1 year - persist language preference across sessions
  httpOnly: false,  // Allow client-side access for i18next language detector
});

const i18nextServer = new RemixI18Next({
  detection: {
    supportedLanguages: i18n.default.supportedLngs,
    fallbackLanguage: i18n.default.fallbackLng,
    cookie: i18nCookie,
  },
  i18next: {
    ...i18n.default,
  },
  backend: Backend,
  i18nextOptions: {
    ...i18n.default,
    backend: {
      loadPath: join(process.cwd(), "public", "locales", "{{lng}}", "{{ns}}.json"),
    },
  },
});

export default i18nextServer;
