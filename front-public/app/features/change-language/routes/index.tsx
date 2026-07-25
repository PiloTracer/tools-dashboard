import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { i18nCookie } from "../../../i18next.server";
import { normalizeLocale, resolveSameOriginReferer } from "../../../utils/i18n.server";
import { resolvePublicPath } from "../../../utils/publicPath.server";

/**
 * Loader function for change-language route
 * If someone accesses this route directly via GET, redirect to app home
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const redirectPath = resolveSameOriginReferer(request, resolvePublicPath("/"));
  return redirect(redirectPath);
}

/**
 * Action function for change-language route
 * Handles POST requests to change the user's language preference
 * Sets a cookie with the selected locale and redirects back to the referring page
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const locale = normalizeLocale(typeof formData.get("lng") === "string" ? formData.get("lng") as string : null);
  const redirectPath = resolveSameOriginReferer(request, resolvePublicPath("/"));
  const response = redirect(redirectPath);

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
