import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { clearAdminAuthCookies } from "../utils/admin-csrf.server";

const SIGNIN = "/admin/features/admin-signin";

export async function loader({ request }: LoaderFunctionArgs) {
  return redirect(SIGNIN, { headers: clearAdminAuthCookies(request) });
}

export async function action({ request }: ActionFunctionArgs) {
  return redirect(SIGNIN, { headers: clearAdminAuthCookies(request) });
}

export default function AdminLogout() {
  return null;
}
