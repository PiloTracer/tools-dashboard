import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { resolvePublicPath } from "../utils/publicPath.server";

// Catch-all for any non-existent /app/* URL: send the visitor to the app
// library instead of a 404 page.
export async function loader(_args: LoaderFunctionArgs) {
  return redirect(resolvePublicPath("/features/app-library"));
}
