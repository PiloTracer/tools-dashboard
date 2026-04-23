import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

/** Job creation is not implemented; avoid a misleading fake form. */
export async function loader(_args: LoaderFunctionArgs) {
  return redirect("/admin/features/task-scheduler");
}

export default function TaskSchedulerCreateRedirect() {
  return null;
}
