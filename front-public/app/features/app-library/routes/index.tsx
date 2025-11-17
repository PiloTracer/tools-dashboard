import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import type { AppConfig } from '../utils/api';
import { AppGrid } from '../ui/AppGrid';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';

/**
 * Loader data type
 */
type LoaderData = {
  apps: AppConfig[];
  error?: string;
};

/**
 * Loader function
 *
 * Fetches available applications from back-api.
 * The backend enforces access control based on the user's session.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8100';

  try {
    // Fetch available apps from back-api (server-side)
    const response = await fetch(`${BACKEND_API_URL}/api/app-library/oauth-clients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies from the original request for session authentication
        'Cookie': request.headers.get('Cookie') || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to fetch apps: ${response.status} ${errorText}`);
    }

    // The backend returns { apps: [...], total, favorites, recently_used }
    const data = await response.json();
    const apps: AppConfig[] = data.apps || [];

    return json<LoaderData>({
      apps,
    });
  } catch (error) {
    console.error('Failed to load apps:', error);

    // Return error state instead of throwing
    // This allows the UI to display a friendly error message
    return json<LoaderData>(
      {
        apps: [],
        error: error instanceof Error ? error.message : 'Failed to load applications',
      },
      { status: 500 }
    );
  }
}

/**
 * App Library Route
 *
 * Main application library interface where authenticated users can:
 * - View all available applications
 * - Click on apps to launch with OAuth
 * - See loading, error, and empty states
 */
export default function AppLibrary() {
  const { apps, error } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const handleRetry = () => {
    revalidator.revalidate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Application Library
            </h1>
            <p className="text-lg text-gray-600">
              Launch integrated applications with seamless authentication
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {revalidator.state === 'loading' && <LoadingState />}

        {/* Error State */}
        {error && revalidator.state !== 'loading' && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}

        {/* Empty State */}
        {!error && apps.length === 0 && revalidator.state !== 'loading' && (
          <EmptyState />
        )}

        {/* App Grid */}
        {!error && apps.length > 0 && revalidator.state !== 'loading' && (
          <AppGrid apps={apps} />
        )}
      </div>

      {/* Footer Info */}
      {!error && apps.length > 0 && revalidator.state !== 'loading' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  About OAuth Authentication
                </h3>
                <p className="text-sm text-blue-800">
                  When you launch an application, you'll be redirected to complete a secure OAuth
                  authentication flow. You'll be asked to authorize the application to access your profile
                  information. Once authorized, you'll be automatically signed in without needing to enter
                  your credentials again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
