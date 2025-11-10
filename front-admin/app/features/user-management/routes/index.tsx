import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader(_args: LoaderFunctionArgs) {
  return json({ users: [] });
}

export default function UserManagementIndex() {
  const data = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>User Management</h1>
      <p>Total users: {data.users.length}</p>
    </main>
  );
}
