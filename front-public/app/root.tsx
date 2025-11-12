import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { useChangeLanguage } from "remix-i18next/react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import stylesheet from "./app.css?url";
import { PublicLayout } from "./components/layout/PublicLayout";
import { getBackAuthEnv } from "./utils/env.server";
import { getPublicAppBasePath } from "./utils/publicPath.server";
import i18next from "./i18next.server";

type RootLoaderData = {
  publicBasePath: string;
  session: SessionState;
  locale: string;
};

type SessionState =
  | { status: "anonymous"; message?: string }
  | { status: "pending"; email?: string; message?: string }
  | { status: "authenticated"; email: string; message?: string }
  | { status: "unknown"; message?: string };

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const meta = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" },
];

const sessionStatusSchema = z
  .object({
    status: z.enum(["pending", "verified"]),
    email: z.string().email().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = await i18next.getLocale(request);
  const sessionState = await resolveSessionState(request);

  return json<RootLoaderData>({
    publicBasePath: getPublicAppBasePath(request),
    session: sessionState,
    locale,
  });
}

export default function App() {
  const { publicBasePath, session, locale } = useLoaderData<typeof loader>();
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
