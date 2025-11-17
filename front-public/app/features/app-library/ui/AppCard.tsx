import { launchAppWithOAuth } from '../utils/oauth';
import type { AppConfig } from '../utils/api';

interface AppCardProps {
  app: AppConfig;
}

/**
 * AppCard Component
 *
 * Displays an individual application as a card with:
 * - Application logo
 * - Application name
 * - Description
 * - Scope badges
 * - Launch button
 *
 * When the user clicks "Launch App", it initiates the OAuth flow.
 */
export function AppCard({ app }: AppCardProps) {
  const handleLaunch = async () => {
    try {
      await launchAppWithOAuth(app);
    } catch (error) {
      console.error('Failed to launch app:', error);
      alert('Failed to launch application. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {/* Logo Section */}
      <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-8 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-300">
        {app.logo_url ? (
          <img
            src={app.logo_url}
            alt={`${app.client_name} logo`}
            className="w-20 h-20 object-contain rounded-xl"
          />
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {app.client_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* App Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
          {app.client_name}
        </h3>

        {/* App URL */}
        <div className="mb-3">
          <a
            href={app.dev_url || app.prod_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {app.dev_url || app.prod_url}
          </a>
        </div>

        {/* Description */}
        {app.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3 min-h-[60px]">
            {app.description}
          </p>
        )}

        {/* Scopes */}
        {app.allowed_scopes && app.allowed_scopes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1.5">Permissions:</p>
            <div className="flex flex-wrap gap-1.5">
              {app.allowed_scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-md font-medium"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
          aria-label={`Launch ${app.client_name}`}
        >
          Launch App
        </button>
      </div>
    </div>
  );
}
