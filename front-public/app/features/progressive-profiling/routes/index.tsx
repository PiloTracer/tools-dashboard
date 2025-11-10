import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader(_args: LoaderFunctionArgs) {
  const isComplete = false;
  if (!isComplete) {
    return json({ stage: "basic" });
  }
  return redirect("/dashboard");
}

export default function ProgressiveProfilingIndex() {
  const data = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>Profile Completion</h1>
      <p>Current stage: {data.stage}</p>
    </main>
  );
}
