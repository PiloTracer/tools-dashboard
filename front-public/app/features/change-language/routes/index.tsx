import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { resolvePublicPath } from "../../../utils/publicPath.server";
import { i18nCookie } from "../../../i18next.server";

/**
 * Loader function for change-language route
 * If someone accesses this route directly via GET, redirect to app home
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const referer = request.headers.get("Referer");
  const redirectPath = referer ? new URL(referer).pathname : resolvePublicPath("/");
  return redirect(redirectPath);
}

/**
 * Action function for change-language route
 * Handles POST requests to change the user's language preference
 * Sets a cookie with the selected locale and redirects back to the referring page
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const locale = formData.get("lng");

  // Validate locale parameter
  if (typeof locale !== "string" || !locale.trim()) {
    const referer = request.headers.get("Referer");
    const redirectPath = referer ? new URL(referer).pathname : resolvePublicPath("/");
    return redirect(redirectPath);
  }

  // Prepare redirect to the referring page or app home
  const referer = request.headers.get("Referer");
  const redirectPath = referer ? new URL(referer).pathname : resolvePublicPath("/");
  const response = redirect(redirectPath);

  // Set the i18next cookie with the selected locale
  response.headers.append("Set-Cookie", await i18nCookie.serialize(locale));

  return response;
}

/**
 * Resource route - no UI component needed
 * This route only handles form submissions and redirects
 */
export default function ChangeLanguage() {
  return null;
}
