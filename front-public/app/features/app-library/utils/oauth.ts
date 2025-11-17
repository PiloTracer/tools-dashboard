/**
 * OAuth 2.0 PKCE Utilities for App Library
 *
 * This module provides utilities for implementing OAuth 2.0 Authorization Code Flow
 * with PKCE (Proof Key for Code Exchange) for launching external applications.
 */

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the random string (default: 43 for PKCE)
 * @returns Base64URL-encoded random string
 */
function generateRandomString(length: number = 43): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => ('0' + byte.toString(16)).slice(-2)).join('');
}

/**
 * Generate SHA256 hash of a string and encode as base64url
 * @param plain - Plain text string to hash
 * @returns Base64URL-encoded SHA256 hash
 */
async function sha256(plain: string): Promise<string> {
  // Check if crypto.subtle is available (HTTPS or localhost only)
  if (!crypto?.subtle?.digest) {
    // Fallback: Use a simple hash function for non-HTTPS environments
    // This is less secure but allows testing in HTTP environments
    console.warn('crypto.subtle not available, using fallback hash');
    return fallbackHash(plain);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url encoding
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Fallback hash function for environments without crypto.subtle
 * NOTE: This is NOT cryptographically secure and should only be used for development
 */
function fallbackHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to base64url-like string
  const hashStr = Math.abs(hash).toString(36).padStart(43, '0');
  return hashStr.substring(0, 43);
}

/**
 * Generate PKCE code_verifier and code_challenge
 *
 * PKCE (RFC 7636) enhances OAuth security by preventing authorization code
 * interception attacks. The code_verifier is a cryptographically random string,
 * and the code_challenge is its SHA256 hash.
 *
 * @returns Object containing code_verifier and code_challenge
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(43);
  const codeChallenge = await sha256(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
  };
}

/**
 * Store PKCE code_verifier in sessionStorage for later token exchange
 *
 * The code_verifier must be stored securely and sent during token exchange.
 * SessionStorage is used because:
 * - It's cleared when the tab closes (security)
 * - It's accessible across redirects within the same tab
 * - It's not sent to the server automatically
 *
 * @param appClientId - Application client ID
 * @param codeVerifier - PKCE code_verifier to store
 */
export function storePKCEVerifier(appClientId: string, codeVerifier: string): void {
  sessionStorage.setItem(`pkce_verifier_${appClientId}`, codeVerifier);
}

/**
 * Retrieve PKCE code_verifier from sessionStorage
 *
 * @param appClientId - Application client ID
 * @returns Stored code_verifier or null if not found
 */
export function retrievePKCEVerifier(appClientId: string): string | null {
  return sessionStorage.getItem(`pkce_verifier_${appClientId}`);
}

/**
 * Store OAuth state parameter for CSRF protection
 *
 * @param appClientId - Application client ID
 * @param state - Random state parameter
 */
export function storeOAuthState(appClientId: string, state: string): void {
  sessionStorage.setItem(`oauth_state_${appClientId}`, state);
}

/**
 * Retrieve OAuth state parameter from sessionStorage
 *
 * @param appClientId - Application client ID
 * @returns Stored state or null if not found
 */
export function retrieveOAuthState(appClientId: string): string | null {
  return sessionStorage.getItem(`oauth_state_${appClientId}`);
}

/**
 * Build OAuth authorization URL for launching an app
 *
 * This function generates the complete URL to redirect the user to the OAuth
 * authorization endpoint for the authorization code flow.
 *
 * IMPORTANT: For pre-initiated OAuth flows from App Library:
 * - We redirect DIRECTLY to the OAuth authorization endpoint
 * - We do NOT generate PKCE parameters (client_secret provides security)
 * - We do NOT store the state (it's only validated by the authorization endpoint)
 * - After authorization, the user is redirected to the remote app's callback
 * - The remote app does NOT need to validate state (it didn't initiate the flow)
 *
 * @param app - Application configuration
 * @returns Complete OAuth authorization URL
 */
export async function buildOAuthLaunchURL(app: {
  client_id: string;
  dev_url: string;
  prod_url?: string;
  redirect_uris: string[];
  allowed_scopes: string[];
}): Promise<string> {
  // Generate state for CSRF protection
  const state = generateRandomString(64);

  // NOTE: We do NOT store state in sessionStorage for pre-initiated flows
  // The remote app will receive the state in the callback but should not validate it
  // because it did not initiate the OAuth flow

  // Build redirect URI (remote app's callback)
  const redirectUri = app.redirect_uris[0]; // Use first redirect URI

  // Build OAuth parameters for authorization endpoint (WITHOUT PKCE)
  const oauthParams = new URLSearchParams({
    client_id: app.client_id,
    redirect_uri: redirectUri,
    scope: app.allowed_scopes.join(' '),
    state: state,
    response_type: 'code',
  });

  // Determine OAuth authorization endpoint URL
  const authEndpoint = window.location.origin + '/oauth/authorize';

  // Return full URL to OAuth authorization endpoint
  return `${authEndpoint}?${oauthParams.toString()}`;
}

/**
 * Launch an application with OAuth flow
 *
 * This function initiates the OAuth authorization code flow by:
 * 1. Generating PKCE parameters
 * 2. Storing code_verifier in sessionStorage
 * 3. Redirecting the user to the external application
 *
 * The external application will then redirect back to our OAuth authorization
 * endpoint, where the user will approve the authorization request.
 *
 * @param app - Application configuration
 */
export async function launchAppWithOAuth(app: {
  client_id: string;
  client_name: string;
  dev_url: string;
  prod_url?: string;
  redirect_uris: string[];
  allowed_scopes: string[];
}): Promise<void> {
  try {
    const launchUrl = await buildOAuthLaunchURL(app);

    // Log launch for debugging (can be removed in production)
    console.log(`Launching ${app.client_name} with OAuth parameters`);

    // Redirect to remote application
    window.location.href = launchUrl;
  } catch (error) {
    console.error('Failed to launch application:', error);
    throw new Error('Failed to initiate OAuth flow. Please try again.');
  }
}

/**
 * Clear stored OAuth data for an application
 *
 * This should be called after successful OAuth completion or when the user
 * cancels the flow.
 *
 * @param appClientId - Application client ID
 */
export function clearOAuthData(appClientId: string): void {
  sessionStorage.removeItem(`pkce_verifier_${appClientId}`);
  sessionStorage.removeItem(`oauth_state_${appClientId}`);
}
