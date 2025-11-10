import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader(_args: LoaderFunctionArgs) {
  return json({ status: "pending" });
}

export default function VerifyRoute() {
  const { status } = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>Verify Email</h1>
      <p>Current status: {status}</p>
    </main>
  );
}
