import type { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

import stylesheet from "./app.css?url";
import { PublicLayout } from "./components/layout/PublicLayout";

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
        <PublicLayout>
          <Outlet />
        </PublicLayout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
