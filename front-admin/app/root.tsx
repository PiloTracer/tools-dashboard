import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation } from "@remix-run/react";

import stylesheet from "./app.css?url";
import { AdminLayout } from "./components/layout/AdminLayout";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("Cookie") ?? "";
  const adminSession = cookie.match(/admin_session=([^;]+)/)?.[1];
  const hasAdminSession = Boolean(adminSession);

  let userEmail: string | null = null;

  if (adminSession) {
    try {
      const parts = adminSession.split(".");
      if (parts.length === 3) {
        const payload = parts[1];
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(Buffer.from(base64, "base64").toString()) as Record<string, unknown>;
        const email = decoded.email;
        const sub = decoded.sub;
        if (typeof email === "string" && email.includes("@")) {
          userEmail = email;
        } else if (typeof sub === "string" && sub.includes("@")) {
          userEmail = sub;
        }
      }
    } catch (error) {
      console.error("Failed to decode admin_session JWT:", error);
    }
  }

  return json({ userEmail, hasAdminSession });
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
