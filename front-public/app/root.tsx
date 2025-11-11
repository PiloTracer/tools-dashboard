import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";

import stylesheet from "./app.css?url";
import { PublicLayout } from "./components/layout/PublicLayout";
import { getPublicAppBasePath } from "./utils/publicPath.server";

type RootLoaderData = {
  publicBasePath: string;
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: LoaderFunctionArgs) {
  return json<RootLoaderData>({
    publicBasePath: getPublicAppBasePath(request),
  });
}

export default function App() {
  const { publicBasePath } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
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
