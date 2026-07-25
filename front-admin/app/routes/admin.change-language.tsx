import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { i18nCookie } from "../i18next.server";
import i18nConfig from "../i18n";

const SUPPORTED_LOCALES = new Set(i18nConfig.supportedLngs);
const DEFAULT_REDIRECT = "/admin/";

function resolveRedirectPath(request: Request): string {
  const referer = request.headers.get("Referer");
  if (!referer) {
    return DEFAULT_REDIRECT;
  }

  try {
    const refUrl = new URL(referer);
    const reqUrl = new URL(request.url);
    if (refUrl.origin !== reqUrl.origin) {
      return DEFAULT_REDIRECT;
    }
    return `${refUrl.pathname}${refUrl.search}${refUrl.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

/**
 * Loader: redirect GET requests back to the referring page.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return redirect(resolveRedirectPath(request));
}

/**
 * Action: persist locale cookie and redirect to referring page (pathname + search).
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const locale = formData.get("lng");
  const redirectPath = resolveRedirectPath(request);

  if (typeof locale !== "string" || !locale.trim()) {
    return redirect(redirectPath);
  }

  const normalized = locale.split("-")[0];
  if (!SUPPORTED_LOCALES.has(normalized)) {
    return redirect(redirectPath);
  }

  const response = redirect(redirectPath);
  response.headers.append("Set-Cookie", await i18nCookie.serialize(normalized));

  return response;
}

export default function ChangeLanguage() {
  return null;
}
