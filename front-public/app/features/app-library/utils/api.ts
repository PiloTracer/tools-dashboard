/**
 * API client for app-library feature
 *
 * This module provides functions to interact with the back-api endpoints
 * for fetching available applications.
 */

/**
 * Application configuration returned from the API
 */
export interface AppConfig {
  id: string;
  client_id: string;
  client_name: string;
  description?: string;
  logo_url?: string;
  dev_url: string;
  prod_url?: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch available applications from back-api
 *
 * This function calls the /api/oauth-clients endpoint to retrieve all
 * applications that the current user has access to. The backend enforces
 * access control rules based on the user's session.
 *
 * @returns Promise resolving to array of AppConfig objects
 * @throws Error if the request fails
 */
export async function fetchAvailableApps(): Promise<AppConfig[]> {
  const response = await fetch('/api/app-library/oauth-clients', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session authentication
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch apps: ${response.status} ${errorText}`);
  }

  // The backend returns { apps: [...], total, favorites, recently_used }
  // We need to extract just the apps array
  const data = await response.json();
  const apps: AppConfig[] = data.apps || data;
  return apps;
}

/**
 * Fetch a single application by client ID
 *
 * @param clientId - Application client ID
 * @returns Promise resolving to AppConfig
 * @throws Error if the request fails
 */
export async function fetchAppByClientId(clientId: string): Promise<AppConfig> {
  const response = await fetch(`/api/app-library/oauth-clients/${clientId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch app: ${response.status} ${errorText}`);
  }

  // The backend returns { app: {...}, access_rule, user_preference }
  // We need to extract just the app object
  const data = await response.json();
  const app: AppConfig = data.app || data;
  return app;
}
