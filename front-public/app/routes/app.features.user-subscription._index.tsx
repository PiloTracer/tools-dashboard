import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { resolvePublicPath } from "../utils/publicPath.server";

// Temporarily hidden: user-subscription is a placeholder (hardcoded packages,
// stub checkout). Direct visits redirect to the app library; the feature code
// stays intact under features/user-subscription for later enablement.
export async function loader(_args: LoaderFunctionArgs) {
  return redirect(resolvePublicPath("/features/app-library"));
}

export { default } from "../features/user-subscription/routes/index";
