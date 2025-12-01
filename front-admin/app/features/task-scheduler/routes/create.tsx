import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";

export async function action(_args: ActionFunctionArgs) {
  // Use full path including /admin/ prefix for proper routing through nginx
  return redirect("/admin/features/task-scheduler");
}

export default function CreateTask() {
  return (
    <main>
      <h1>Create Task</h1>
      <Form method="post">
        <label>
          Task Name
          <input type="text" name="name" required />
        </label>
        <label>
          Schedule
          <input type="text" name="schedule" placeholder="0 0 * * *" required />
        </label>
        <button type="submit">Create</button>
      </Form>
    </main>
  );
}
