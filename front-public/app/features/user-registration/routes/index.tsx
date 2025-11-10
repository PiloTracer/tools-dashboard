import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

export async function loader(_args: LoaderFunctionArgs) {
  return json({});
}

export async function action(_args: ActionFunctionArgs) {
  return redirect("/features/user-registration/verify");
}

export default function RegistrationRoute() {
  const actionData = useActionData<typeof action>();
  return (
    <main>
      <h1>Register</h1>
      <Form method="post">
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" minLength={12} required />
        </label>
        <button type="submit">Register</button>
        {actionData && <p role="status">Submitting...</p>}
      </Form>
    </main>
  );
}
