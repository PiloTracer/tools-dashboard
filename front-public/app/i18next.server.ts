import { resolve, join } from "node:path";
import { createCookie } from "@remix-run/node";
import { RemixI18Next } from "remix-i18next/server";
import Backend from "i18next-fs-backend";
import * as i18n from "./i18n";

const i18nCookie = createCookie("i18next", {
  sameSite: "lax",
  path: "/",
});

export default new RemixI18Next({
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
