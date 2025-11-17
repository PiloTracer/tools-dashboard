/**
 * OAuth 2.0 Authorization Endpoint
 * Handles user consent for external applications
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

interface OAuthClient {
  client_id: string;
  client_name: string;
  description: string | null;
  logo_url: string | null;
  redirect_uris: string[];
}

interface LoaderData {
  client: OAuthClient;
  scope: string[];
  redirectUri: string;
  state: string;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const scope = url.searchParams.get("scope");
  const state = url.searchParams.get("state");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const responseType = url.searchParams.get("response_type");

  // Validate required parameters
  // Note: code_challenge is OPTIONAL for pre-initiated OAuth flows from App Library
  if (!clientId || !redirectUri || !scope || !state) {
    return redirect(`${redirectUri}?error=invalid_request&error_description=Missing+required+parameters&state=${state || ""}`);
  }

  // Validate response_type
  if (responseType !== "code") {
    return redirect(`${redirectUri}?error=unsupported_response_type&state=${state}`);
  }

  // Validate code_challenge_method if PKCE is used
  if (codeChallenge && codeChallengeMethod !== "S256") {
    return redirect(`${redirectUri}?error=invalid_request&error_description=Only+S256+PKCE+method+is+supported&state=${state}`);
  }

  // Validate user session via back-auth
  const BACK_AUTH_URL = process.env.AUTH_API_URL || "http://back-auth:8001";

  let userId: number;
  try {
    const statusResponse = await fetch(`${BACK_AUTH_URL}/user-registration/status`, {
      method: "GET",
      headers: {
        "Cookie": request.headers.get("Cookie") || "",
      },
    });

    if (!statusResponse.ok) {
      // User not authenticated - redirect to login
      const returnTo = encodeURIComponent(request.url);
      return redirect(`/app/features/user-registration?return_to=${returnTo}`);
    }

    const statusData = await statusResponse.json();

    // Check if user is verified (authenticated) and has userId
    if (statusData.status !== "verified" || !statusData.userId) {
      // User not authenticated or not verified - redirect to login
      const returnTo = encodeURIComponent(request.url);
      return redirect(`/app/features/user-registration?return_to=${returnTo}`);
    }

    userId = statusData.userId;
  } catch (error) {
    console.error("Failed to validate session:", error);
    const returnTo = encodeURIComponent(request.url);
    return redirect(`/app/features/user-registration?return_to=${returnTo}`);
  }

  // Get OAuth client details from back-api
  const BACK_API_URL = process.env.BACKEND_API_URL || "http://back-api:8000";

  try {
    const clientResponse = await fetch(`${BACK_API_URL}/api/oauth-clients/${clientId}`);

    if (!clientResponse.ok) {
      return redirect(`${redirectUri}?error=unauthorized_client&error_description=Invalid+client_id&state=${state}`);
    }

    const client: OAuthClient = await clientResponse.json();

    // Validate redirect_uri is registered
    if (!client.redirect_uris.includes(redirectUri)) {
      return redirect(`${redirectUri}?error=invalid_request&error_description=Invalid+redirect_uri&state=${state}`);
    }

    // Check if user has already consented
    // TODO: Implement consent checking
    const hasConsented = false; // Placeholder

    if (hasConsented) {
      // Skip consent screen - generate code and redirect
      const BACK_AUTH_URL = process.env.BACK_AUTH_URL || "http://localhost:8101";

      const codeResponse = await fetch(`${BACK_AUTH_URL}/internal/oauth/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          client_id: clientId,
          scope,
          code_challenge: codeChallenge || null,
          code_challenge_method: codeChallengeMethod || null,
          redirect_uri: redirectUri,
          expires_in: 600,
        }),
      });

      const { code } = await codeResponse.json();

      return redirect(`${redirectUri}?code=${code}&state=${state}`);
    }

    // Show consent screen
    return json<LoaderData>({
      client,
      scope: scope.split(" "),
      redirectUri,
      state,
      codeChallenge: codeChallenge || null,
      codeChallengeMethod: codeChallengeMethod || null,
    });
  } catch (error) {
    console.error("OAuth authorization error:", error);
    return redirect(`${redirectUri}?error=server_error&error_description=Internal+server+error&state=${state}`);
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("action");
  const clientId = formData.get("client_id");
  const redirectUri = formData.get("redirect_uri");
  const state = formData.get("state");
  const scope = formData.get("scope");
  const codeChallenge = formData.get("code_challenge");
  const codeChallengeMethod = formData.get("code_challenge_method");

  if (!clientId || !redirectUri || !state || !scope) {
    throw new Error("Missing required parameters");
  }

  // Validate user session via back-auth
  const BACK_AUTH_URL = process.env.AUTH_API_URL || "http://back-auth:8001";

  let userId: number;
  try {
    const statusResponse = await fetch(`${BACK_AUTH_URL}/user-registration/status`, {
      method: "GET",
      headers: {
        "Cookie": request.headers.get("Cookie") || "",
      },
    });

    if (!statusResponse.ok) {
      throw new Error("User not authenticated");
    }

    const statusData = await statusResponse.json();

    // Check if user is verified (authenticated) and has userId
    if (statusData.status !== "verified" || !statusData.userId) {
      throw new Error("User not authenticated");
    }

    userId = statusData.userId;
  } catch (error) {
    console.error("Failed to validate session:", error);
    throw new Error("User not authenticated");
  }

  // User denied
  if (action === "deny") {
    return redirect(`${redirectUri}?error=access_denied&error_description=User+denied+access&state=${state}`);
  }

  // User approved - generate authorization code
  try {
    const codeResponse = await fetch(`${BACK_AUTH_URL}/internal/oauth/generate-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        client_id: clientId,
        scope,
        code_challenge: codeChallenge || null,
        code_challenge_method: codeChallengeMethod || null,
        redirect_uri: redirectUri,
        expires_in: 600,
      }),
    });

    if (!codeResponse.ok) {
      throw new Error("Failed to generate authorization code");
    }

    const { code } = await codeResponse.json();

    // Store user consent
    // TODO: Implement consent storage

    // Redirect back to external app with code
    return redirect(`${redirectUri}?code=${code}&state=${state}`);
  } catch (error) {
    console.error("OAuth code generation error:", error);
    return redirect(`${redirectUri}?error=server_error&error_description=Failed+to+generate+authorization+code&state=${state}`);
  }
}

export default function OAuthAuthorize() {
  const { client, scope, redirectUri, state, codeChallenge, codeChallengeMethod } = useLoaderData<typeof loader>();

  const scopeDescriptions: Record<string, string> = {
    profile: "Read your profile information (name, email)",
    email: "Access your email address",
    subscription: "View your subscription status and limits",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authorize Application
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            An application wants to access your account
          </p>
        </div>

        {/* Client Info */}
        <div className="border-t border-b border-gray-200 py-4">
          <div className="flex items-center space-x-4">
            {client.logo_url && (
              <img
                src={client.logo_url}
                alt={client.client_name}
                className="w-16 h-16 rounded-lg"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{client.client_name}</h3>
              {client.description && (
                <p className="text-sm text-gray-600">{client.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">
            This application will be able to:
          </h4>
          <ul className="space-y-2">
            {scope.map((s) => (
              <li key={s} className="flex items-start">
                <svg
                  className="h-5 w-5 text-green-500 mr-2 mt-0.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-sm text-gray-700">
                  {scopeDescriptions[s] || s}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <Form method="post" className="space-y-4">
          <input type="hidden" name="client_id" value={client.client_id} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="scope" value={scope.join(" ")} />
          {codeChallenge && <input type="hidden" name="code_challenge" value={codeChallenge} />}
          {codeChallengeMethod && <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />}

          <div className="flex space-x-4">
            <button
              type="submit"
              name="action"
              value="approve"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Allow
            </button>
            <button
              type="submit"
              name="action"
              value="deny"
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Deny
            </button>
          </div>
        </Form>

        <p className="text-xs text-gray-500 text-center">
          By clicking "Allow", you authorize {client.client_name} to access your account information
          according to the permissions listed above.
        </p>
      </div>
    </div>
  );
}
