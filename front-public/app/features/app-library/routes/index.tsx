import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { Trans, useTranslation } from "react-i18next";

import { resolvePublicPath } from "../../../utils/publicPath.server";
import type { AppConfig } from "../utils/api";
import { AppGrid } from "../ui/AppGrid";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../ui/LoadingState";
import { ErrorState } from "../ui/ErrorState";

type LoaderData = {
  apps: AppConfig[];
  error?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8100";

  try {
    const response = await fetch(`${BACKEND_API_URL}/api/app-library/oauth-clients`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    if (response.status === 401) {
      return redirect(resolvePublicPath("/features/user-registration?mode=login"));
    }
    if (response.status === 403) {
      return redirect(resolvePublicPath("/features/user-registration/verify?source=email"));
    }
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Failed to fetch apps: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const apps: AppConfig[] = data.apps || [];

    return json<LoaderData>({
      apps,
    });
  } catch (error) {
    console.error("Failed to load apps:", error);

    return json<LoaderData>(
      {
        apps: [],
        error: error instanceof Error ? error.message : "Failed to load applications",
      },
      { status: 500 },
    );
  }
}

export default function AppLibrary() {
  const { apps, error } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const revalidator = useRevalidator();

  const handleRetry = () => {
    revalidator.revalidate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("appLibrary.title")}</h1>
            <p className="text-lg text-gray-600">{t("appLibrary.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {revalidator.state === "loading" && <LoadingState />}

        {error && revalidator.state !== "loading" && <ErrorState message={error} onRetry={handleRetry} />}

        {!error && apps.length === 0 && revalidator.state !== "loading" && <EmptyState />}

        {!error && apps.length > 0 && revalidator.state !== "loading" && <AppGrid apps={apps} />}
      </div>

      {!error && apps.length > 0 && revalidator.state !== "loading" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">{t("appLibrary.connected.title")}</h3>
                <p className="text-sm text-blue-800">
                  <Trans i18nKey="appLibrary.connected.body" />
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
