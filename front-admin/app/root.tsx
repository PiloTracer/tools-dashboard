import type { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

import stylesheet from "./app.css?url";
import { AdminLayout } from "./components/layout/AdminLayout";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <AdminLayout>
          <Outlet />
        </AdminLayout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
