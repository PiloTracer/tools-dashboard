import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation } from "@remix-run/react";

import stylesheet from "./app.css?url";
import { AdminLayout } from "./components/layout/AdminLayout";
import { getAdminSession } from "./utils/admin-session.server";

const SIGNIN_PATH = "/admin/features/admin-signin";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { accessToken, email } = await getAdminSession(request);

  // Expired / missing session on a protected page → redirect to sign-in
  // instead of silently hiding the sidebar and leaving a broken page.
  // Exclude sign-in (needs to load without session) and logout (clears cookies).
  const url = new URL(request.url);
  const isPublicPath =
    url.pathname.includes("admin-signin") || url.pathname.endsWith("/admin/logout");
  if (!accessToken && !isPublicPath) {
    throw redirect(SIGNIN_PATH);
  }

  return json({ userEmail: email, hasAdminSession: Boolean(accessToken) });
}

export default function App() {
  const { userEmail, hasAdminSession } = useLoaderData<typeof loader>();
  const location = useLocation();
  const isSignInRoute = location.pathname.includes("admin-signin");
  const showAdminShell = hasAdminSession && !isSignInRoute;

  return (
    <html lang="en">
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
