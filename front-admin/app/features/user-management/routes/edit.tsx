import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useNavigation } from "@remix-run/react";

export async function action(_args: ActionFunctionArgs) {
  // Use full path including /admin/ prefix for proper routing through nginx
  return redirect("/admin/features/user-management");
}

export default function EditUser() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  return (
    <main>
      <h1>Edit User</h1>
      <Form method="post">
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </Form>
    </main>
  );
}
