import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation } from "@remix-run/react";
import { useChangeLanguage } from "remix-i18next/react";
import { useTranslation } from "react-i18next";

import stylesheet from "./app.css?url";
import { AdminLayout } from "./components/layout/AdminLayout";
import { getAdminSession } from "./utils/admin-session.server";
import i18next from "./i18next.server";

const SIGNIN_PATH = "/admin/features/admin-signin";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = await i18next.getLocale(request);
  const { accessToken, email } = await getAdminSession(request);

  // Expired / missing session on a protected page → redirect to sign-in
  // instead of silently hiding the sidebar and leaving a broken page.
  // Exclude sign-in (needs to load without session) and logout (clears cookies).
  const url = new URL(request.url);
  const isPublicPath =
    url.pathname.includes("admin-signin") ||
    url.pathname.endsWith("/admin/logout") ||
    url.pathname.endsWith("/admin/change-language");
  if (!accessToken && !isPublicPath) {
    throw redirect(SIGNIN_PATH);
  }

  return json({ userEmail: email, hasAdminSession: Boolean(accessToken), locale });
}

export default function App() {
  const { userEmail, hasAdminSession, locale } = useLoaderData<typeof loader>();
  const { i18n } = useTranslation();
  const location = useLocation();
  const isSignInRoute = location.pathname.includes("admin-signin");
  const showAdminShell = hasAdminSession && !isSignInRoute;

  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <base href="/admin/" />
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {showAdminShell ? (
          <AdminLayout userEmail={userEmail ?? undefined}>
            <Outlet />
          </AdminLayout>
        ) : (
          <Outlet />
        )}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
