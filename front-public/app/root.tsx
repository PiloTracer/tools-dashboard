import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { useChangeLanguage } from "remix-i18next/react";
import { useTranslation } from "react-i18next";

import stylesheet from "./app.css?url";
import { PublicLayout } from "./components/layout/PublicLayout";
import { getPublicAppBasePath } from "./utils/publicPath.server";
import i18next from "./i18next.server";

type RootLoaderData = {
  publicBasePath: string;
  locale: string;
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const meta = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = await i18next.getLocale(request);

  return json<RootLoaderData>({
    publicBasePath: getPublicAppBasePath(request),
    locale,
  });
}

export default function App() {
  const { publicBasePath, locale } = useLoaderData<typeof loader>();
  const { i18n } = useTranslation();

  // This hook will change the i18n instance language to the current locale
  // detected by the loader
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <PublicLayout basePath={publicBasePath}>
          <Outlet />
        </PublicLayout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
