import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { z } from "zod";

import stylesheet from "./app.css?url";
import { PublicLayout } from "./components/layout/PublicLayout";
import { getBackAuthEnv } from "./utils/env.server";
import { getPublicAppBasePath } from "./utils/publicPath.server";

type RootLoaderData = {
  publicBasePath: string;
  session: SessionState;
};

type SessionState =
  | { status: "anonymous"; message?: string }
  | { status: "pending"; email?: string; message?: string }
  | { status: "authenticated"; email: string; message?: string }
  | { status: "unknown"; message?: string };

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

const sessionStatusSchema = z
  .object({
    status: z.enum(["pending", "verified"]),
    email: z.string().email().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionState = await resolveSessionState(request);
  return json<RootLoaderData>({
    publicBasePath: getPublicAppBasePath(request),
    session: sessionState,
  });
}

export default function App() {
  const { publicBasePath, session } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <PublicLayout basePath={publicBasePath} session={session}>
          <Outlet />
        </PublicLayout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

async function resolveSessionState(request: Request): Promise<SessionState> {
  const { backAuthBaseUrl } = getBackAuthEnv();
  const statusUrl = new URL("/user-registration/status", backAuthBaseUrl);
  const cookieHeader = request.headers.get("cookie");

  try {
    const response = await fetch(statusUrl, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!response.ok) {
      return { status: "unknown", message: "Unable to confirm session status." };
    }

    const parsed = sessionStatusSchema.safeParse(await safeReadJson(response));
    if (!parsed.success) {
      return { status: "unknown", message: "Received an unexpected session payload." };
    }

    if (parsed.data.status === "verified" && parsed.data.email) {
      return {
        status: "authenticated",
        email: parsed.data.email,
        message: parsed.data.message,
      };
    }

    if (parsed.data.email) {
      return {
        status: "pending",
        email: parsed.data.email,
        message: parsed.data.message,
      };
    }

    return {
      status: "anonymous",
      message: parsed.data.message,
    };
  } catch (error) {
    console.error("Failed to resolve session state", error);
    return { status: "unknown", message: "Unable to reach authentication service." };
  }
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}
