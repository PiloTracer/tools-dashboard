import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";

import stylesheet from "./app.css?url";
import { AdminLayout } from "./components/layout/AdminLayout";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export async function loader({ request }: LoaderFunctionArgs) {
  // Try to decode user email from session cookie
  const cookie = request.headers.get("Cookie");
  console.log("📍 Root loader - Cookies:", cookie ? "present" : "none");

  const adminSession = cookie?.match(/admin_session=([^;]+)/)?.[1];
  console.log("🔑 Admin session cookie:", adminSession ? "found" : "not found");

  let userEmail: string | null = null;

  if (adminSession) {
    try {
      // Decode JWT token to extract user email
      // JWT format: header.payload.signature
      const parts = adminSession.split(".");
      console.log("🧩 JWT parts count:", parts.length);

      if (parts.length === 3) {
        const payload = parts[1];
        // JWT uses base64url encoding, which needs special handling
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(Buffer.from(base64, "base64").toString());
        console.log("✅ Decoded JWT payload:", JSON.stringify(decoded, null, 2));
        userEmail = decoded.email || null;
        console.log("📧 Extracted email:", userEmail);
      }
    } catch (error) {
      console.error("❌ Failed to decode session token:", error);
    }
  } else {
    console.log("⚠️  No admin_session cookie found");
  }

  return json({ userEmail });
}

export default function App() {
  const { userEmail } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <base href="/admin/" />
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {/* Only wrap in AdminLayout if user is authenticated */}
        {userEmail ? (
          <AdminLayout userEmail={userEmail}>
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
