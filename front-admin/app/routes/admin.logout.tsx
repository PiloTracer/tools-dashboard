import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { clearAdminAuthCookies } from "../utils/admin-csrf.server";

const SIGNIN = "/admin/features/admin-signin";

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = await clearAdminAuthCookies(request);
  return redirect(SIGNIN, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const headers = await clearAdminAuthCookies(request);
  return redirect(SIGNIN, { headers });
}

export default function AdminLogout() {
  return null;
}
