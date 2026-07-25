import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Trans, useTranslation } from "react-i18next";

import { usePublicHref } from "../../../components/layout/PublicLayout";
import i18next from "../../../i18next.server";

type LoaderData = {
  error: string;
  errorDescription: string;
  appName?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  const url = new URL(request.url);

  const error = url.searchParams.get("error") || "unknown_error";
  const errorDescription = url.searchParams.get("error_description") || t("oauthError.unknownDescription");
  const appName = url.searchParams.get("app_name") || undefined;

  return json<LoaderData>({
    error,
    errorDescription,
    appName,
  });
}

export default function OAuthError() {
  const { error, errorDescription, appName } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const libraryHref = usePublicHref("/features/app-library");
  const dashboardHref = usePublicHref("/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full mx-auto mb-6 shadow-inner">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">{t("oauthError.title")}</h1>

          {appName && (
            <p className="text-center text-gray-600 mb-4">
              <Trans
                i18nKey="oauthError.appName"
                values={{ appName }}
                components={{ strong: <strong className="font-semibold text-gray-900" /> }}
              />
            </p>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 text-center">{errorDescription}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium">{t("oauthError.errorCode")}</span>{" "}
              <code className="font-mono bg-gray-200 px-2 py-1 rounded text-xs">{error}</code>
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to={libraryHref}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t("oauthError.returnToLibrary")}
              </div>
            </Link>

            <Link
              to={dashboardHref}
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg text-center transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t("oauthError.goToDashboard")}
            </Link>

            <div className="pt-2 text-center">
              <a
                href="mailto:support@tools-dashboard.io?subject=OAuth%20Authentication%20Error"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {t("oauthError.contactSupport")}
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">{t("oauthError.helpText")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
