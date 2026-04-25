import { useState } from 'react';
import { launchAppWithOAuth } from '../utils/oauth';
import type { AppConfig } from '../utils/api';
import { useAppReachability } from '../hooks/useAppReachability';
import { ReachabilityBadge } from './ReachabilityBadge';

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
  const [logoFailed, setLogoFailed] = useState(false);
  const showInitials = !app.logo_url || logoFailed;
  const linkUrl = app.dev_url || app.prod_url;
  const reachability = useAppReachability(linkUrl);

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
      {/* Logo Section — tight vertical padding so cards stay compact */}
      <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-3 px-4 min-h-0 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-300">
        {!showInitials ? (
          <img
            src={app.logo_url}
            alt={`${app.client_name} logo`}
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-lg"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white text-lg sm:text-xl font-bold shadow-sm">
            {app.client_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-1.5">
          {app.client_name}
        </h3>
        <div className="mb-2">
          <ReachabilityBadge state={reachability} titleUrl={linkUrl} />
        </div>

        {/* App URL */}
        {linkUrl && (
          <div className="mb-2">
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {linkUrl}
            </a>
          </div>
        )}

        {/* Description */}
        {app.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {app.description}
          </p>
        )}

        {/* Scopes */}
        {app.allowed_scopes && app.allowed_scopes.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Permissions</p>
            <div className="flex flex-wrap gap-1">
              {app.allowed_scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-block px-1.5 py-0.5 text-[10px] sm:text-xs bg-blue-100 text-blue-700 rounded font-medium"
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
          aria-label={`Launch ${app.client_name}`}
        >
          Launch App
        </button>
      </div>
    </div>
  );
}
