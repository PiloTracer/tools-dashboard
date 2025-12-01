import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader(_args: LoaderFunctionArgs) {
  return json({ tasks: [] });
}

export default function TaskSchedulerIndex() {
  const data = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>Task Scheduler</h1>
      <p>Scheduled tasks: {data.tasks.length}</p>
    </main>
  );
}
