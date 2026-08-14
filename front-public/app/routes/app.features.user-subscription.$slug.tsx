import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { resolvePublicPath } from "../utils/publicPath.server";

// Temporarily hidden: user-subscription checkout is a placeholder (mock data,
// stub POST). Direct visits redirect to the app library; the feature code stays
// intact under features/user-subscription for later enablement.
export async function loader(_args: LoaderFunctionArgs) {
  return redirect(resolvePublicPath("/features/app-library"));
}

export async function action(_args: ActionFunctionArgs) {
  return redirect(resolvePublicPath("/features/app-library"));
}

export { default } from "../features/user-subscription/routes/checkout";
