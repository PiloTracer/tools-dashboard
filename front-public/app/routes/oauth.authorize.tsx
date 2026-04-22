/**
 * OAuth 2.0 Authorization Endpoint (Tools Dashboard ecosystem)
 *
 * All registered apps are first-party: a signed-in user who passes validation is
 * authorized immediately (Launch App in the Application Library is the consent action).
 * Set OAUTH_REQUIRE_INTERACTIVE_CONSENT_UI=1 to restore the legacy Allow/Deny page.
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
  allowed_scopes?: string[];
}

interface LoaderData {
  client: OAuthClient;
  scope: string[];
  redirectUri: string;
  state: string;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}

function oauthClientFromApiJson(json: unknown): OAuthClient | null {
  if (!json || typeof json !== "object") {
    return null;
  }
  const record = json as Record<string, unknown>;
  const app = record.app;
  if (app && typeof app === "object") {
    return app as OAuthClient;
  }
  return json as OAuthClient;
}

function interactiveConsentUiEnabled(): boolean {
  const v = (process.env.OAUTH_REQUIRE_INTERACTIVE_CONSENT_UI || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function requestedScopesAllowedForClient(requested: string[], allowed: string[] | undefined): boolean {
  if (!allowed?.length) {
    return false;
  }
  const allow = new Set(allowed.map((s) => s.trim()).filter(Boolean));
  return requested.every((s) => allow.has(s));
}

function internalBackAuthBaseUrl(): string {
  return process.env.AUTH_API_URL || "http://localhost:8101";
}

function internalBackApiBaseUrl(): string {
  return process.env.BACKEND_API_URL || "http://localhost:8100";
}

async function issueAuthorizationCodeRedirect(options: {
  userId: number;
  clientId: string;
  scope: string;
  redirectUri: string;
  state: string;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}): Promise<Response> {
  const codeResponse = await fetch(`${internalBackAuthBaseUrl()}/internal/oauth/generate-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: options.userId,
      client_id: options.clientId,
      scope: options.scope,
      code_challenge: options.codeChallenge || null,
      code_challenge_method: options.codeChallengeMethod || null,
      redirect_uri: options.redirectUri,
      expires_in: 600,
    }),
  }).catch(() => null);

  if (!codeResponse?.ok) {
    return redirect(
      `${options.redirectUri}?error=server_error&error_description=Failed+to+issue+authorization+code&state=${options.state}`,
    );
  }

  const body = (await codeResponse.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code;
  if (!code) {
    return redirect(
      `${options.redirectUri}?error=server_error&error_description=Missing+authorization+code&state=${options.state}`,
    );
  }

  return redirect(
    `${options.redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(options.state)}`,
  );
}

/** Best-effort audit row in oauth_consents (optional secret in env). */
async function storeOAuthConsent(userId: number, clientId: string, grantedScopes: string[]): Promise<void> {
  const secret = (process.env.OAUTH_CONSENT_SERVICE_SECRET || "").trim();
  if (!secret) {
    return;
  }
  const url = `${internalBackApiBaseUrl()}/api/internal/oauth/consent/store`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OAuth-Consent-Service-Secret": secret,
    },
    body: JSON.stringify({
      user_id: userId,
      client_id: clientId,
      scopes: grantedScopes,
    }),
  }).catch((err) => {
    console.error("Failed to persist OAuth consent", err);
  });
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

  if (!clientId || !redirectUri || !scope || !state) {
    return redirect(
      `${redirectUri}?error=invalid_request&error_description=Missing+required+parameters&state=${state || ""}`,
    );
  }

  if (responseType !== "code") {
    return redirect(`${redirectUri}?error=unsupported_response_type&state=${state}`);
  }

  if (codeChallenge && codeChallengeMethod !== "S256") {
    return redirect(
      `${redirectUri}?error=invalid_request&error_description=Only+S256+PKCE+method+is+supported&state=${state}`,
    );
  }

  const BACK_AUTH_URL = internalBackAuthBaseUrl();

  let userId: number;
  try {
    const statusResponse = await fetch(`${BACK_AUTH_URL}/user-registration/status`, {
      method: "GET",
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    if (!statusResponse.ok) {
      const returnTo = encodeURIComponent(request.url);
      return redirect(`/app/features/user-registration?return_to=${returnTo}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status !== "verified" || !statusData.userId) {
      const returnTo = encodeURIComponent(request.url);
      return redirect(`/app/features/user-registration?return_to=${returnTo}`);
    }

    userId = statusData.userId;
  } catch (error) {
    console.error("Failed to validate session:", error);
    const returnTo = encodeURIComponent(request.url);
    return redirect(`/app/features/user-registration?return_to=${returnTo}`);
  }

  const BACK_API_URL = process.env.BACKEND_API_URL || "http://back-api:8000";

  try {
    const clientResponse = await fetch(`${BACK_API_URL}/api/oauth-clients/${clientId}`);

    if (!clientResponse.ok) {
      return redirect(`${redirectUri}?error=unauthorized_client&error_description=Invalid+client_id&state=${state}`);
    }

    const client = oauthClientFromApiJson(await clientResponse.json());
    if (!client?.redirect_uris?.length) {
      return redirect(`${redirectUri}?error=unauthorized_client&error_description=Invalid+client+payload&state=${state}`);
    }

    if (!client.redirect_uris.includes(redirectUri)) {
      return redirect(`${redirectUri}?error=invalid_request&error_description=Invalid+redirect_uri&state=${state}`);
    }

    const requestedScopes = scope.split(" ").map((s) => s.trim()).filter(Boolean);
    if (!requestedScopes.length) {
      return redirect(`${redirectUri}?error=invalid_request&error_description=Missing+or+empty+scope&state=${state}`);
    }

    if (!requestedScopesAllowedForClient(requestedScopes, client.allowed_scopes)) {
      return redirect(
        `${redirectUri}?error=invalid_scope&error_description=Requested+scopes+are+not+allowed+for+this+application&state=${state}`,
      );
    }

    if (interactiveConsentUiEnabled()) {
      return json<LoaderData>({
        client,
        scope: requestedScopes,
        redirectUri,
        state,
        codeChallenge: codeChallenge || null,
        codeChallengeMethod: codeChallengeMethod || null,
      });
    }

    await storeOAuthConsent(userId, clientId, requestedScopes);
    return issueAuthorizationCodeRedirect({
      userId,
      clientId,
      scope,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
    });
  } catch (error) {
    console.error("OAuth authorization error:", error);
    return redirect(`${redirectUri}?error=server_error&error_description=Internal+server+error&state=${state}`);
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (!interactiveConsentUiEnabled()) {
    return new Response("Interactive consent is disabled", { status: 404 });
  }

  const formData = await request.formData();
  const actionName = formData.get("action");
  const clientId = formData.get("client_id");
  const redirectUri = formData.get("redirect_uri");
  const state = formData.get("state");
  const scope = formData.get("scope");
  const codeChallenge = formData.get("code_challenge");
  const codeChallengeMethod = formData.get("code_challenge_method");

  if (!clientId || !redirectUri || !state || !scope) {
    throw new Error("Missing required parameters");
  }

  const BACK_AUTH_URL = internalBackAuthBaseUrl();

  let userId: number;
  try {
    const statusResponse = await fetch(`${BACK_AUTH_URL}/user-registration/status`, {
      method: "GET",
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    if (!statusResponse.ok) {
      throw new Error("User not authenticated");
    }

    const statusData = await statusResponse.json();

    if (statusData.status !== "verified" || !statusData.userId) {
      throw new Error("User not authenticated");
    }

    userId = statusData.userId;
  } catch (error) {
    console.error("Failed to validate session:", error);
    throw new Error("User not authenticated");
  }

  if (actionName === "deny") {
    return redirect(`${redirectUri}?error=access_denied&error_description=User+denied+access&state=${state}`);
  }

  try {
    const grantedScopes = String(scope)
      .split(" ")
      .map((s) => s.trim())
      .filter(Boolean);

    await storeOAuthConsent(userId, String(clientId), grantedScopes);

    return await issueAuthorizationCodeRedirect({
      userId,
      clientId: String(clientId),
      scope: String(scope),
      redirectUri: String(redirectUri),
      state: String(state),
      codeChallenge: codeChallenge ? String(codeChallenge) : null,
      codeChallengeMethod: codeChallengeMethod ? String(codeChallengeMethod) : null,
    });
  } catch (error) {
    console.error("OAuth code generation error:", error);
    return redirect(`${redirectUri}?error=server_error&error_description=Failed+to+generate+authorization+code&state=${state}`);
  }
}

export default function OAuthAuthorize() {
  const { client, scope, redirectUri, state, codeChallenge, codeChallengeMethod } =
    useLoaderData() as LoaderData;

  const scopeDescriptions: Record<string, string> = {
    profile: "Read your profile information (name, email)",
    email: "Access your email address",
    subscription: "View your subscription status and limits",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Authorize Application</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Interactive consent is enabled (OAUTH_REQUIRE_INTERACTIVE_CONSENT_UI). Approve or deny below.
          </p>
        </div>

        <div className="border-b border-t border-gray-200 py-4">
          <div className="flex items-center space-x-4">
            {client.logo_url ? (
              <img src={client.logo_url} alt={client.client_name} className="h-16 w-16 rounded-lg" />
            ) : null}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{client.client_name}</h3>
              {client.description ? <p className="text-sm text-gray-600">{client.description}</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">This application will be able to:</h4>
          <ul className="space-y-2">
            {scope.map((s) => (
              <li key={s} className="flex items-start">
                <svg
                  className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">{scopeDescriptions[s] || s}</span>
              </li>
            ))}
          </ul>
        </div>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="client_id" value={client.client_id} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="scope" value={scope.join(" ")} />
          {codeChallenge ? <input type="hidden" name="code_challenge" value={codeChallenge} /> : null}
          {codeChallengeMethod ? (
            <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />
          ) : null}

          <div className="flex space-x-4">
            <button
              type="submit"
              name="action"
              value="approve"
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Allow
            </button>
            <button
              type="submit"
              name="action"
              value="deny"
              className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Deny
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
