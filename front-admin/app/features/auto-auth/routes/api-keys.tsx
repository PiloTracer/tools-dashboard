/**
 * API Keys Management Page
 * Generate and manage API keys for OAuth clients
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";

interface OAuthClient {
  id: string;
  client_id: string;
  client_name: string;
  is_active: boolean;
}

interface OAuthApiKey {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface LoaderData {
  apiKeys: OAuthApiKey[];
  clients: OAuthClient[];
}

interface ActionData {
  success?: boolean;
  error?: string;
  apiKey?: {
    id: string;
    key: string;
    client_id: string;
    name: string;
  };
  message?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const BACK_API_URL = process.env.BACK_API_URL || "http://localhost:8100";

  try {
    // Fetch API keys and clients in parallel
    const [apiKeysResponse, clientsResponse] = await Promise.all([
      fetch(`${BACK_API_URL}/api/api-keys`),
      fetch(`${BACK_API_URL}/api/oauth-clients`),
    ]);

    if (!apiKeysResponse.ok || !clientsResponse.ok) {
      throw new Error("Failed to fetch data");
    }

    const apiKeys: OAuthApiKey[] = await apiKeysResponse.json();
    const clients: OAuthClient[] = await clientsResponse.json();

    return json<LoaderData>({ apiKeys, clients });
  } catch (error) {
    console.error("Error loading API keys:", error);
    return json<LoaderData>({ apiKeys: [], clients: [] });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");

  const BACK_API_URL = process.env.BACK_API_URL || "http://localhost:8100";

  if (action === "create") {
    const clientId = formData.get("client_id");
    const name = formData.get("name");
    const expiresInDays = formData.get("expires_in_days");

    if (!clientId || !name) {
      return json<ActionData>(
        { error: "Client ID and name are required" },
        { status: 400 }
      );
    }

    try {
      const requestBody: any = {
        client_id: clientId,
        name: name,
      };

      // Add expiration if provided
      if (expiresInDays && expiresInDays !== "never") {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(String(expiresInDays)));
        requestBody.expires_at = expiresAt.toISOString();
      }

      const response = await fetch(`${BACK_API_URL}/api/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        return json<ActionData>(
          { error: error.message || "Failed to create API key" },
          { status: 400 }
        );
      }

      const apiKey = await response.json();

      // Show API key (only shown once!)
      return json<ActionData>({
        success: true,
        apiKey,
        message:
          "API key created successfully! Save the key - it won't be shown again.",
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      return json<ActionData>(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  if (action === "revoke") {
    const keyId = formData.get("key_id");

    if (!keyId) {
      return json<ActionData>(
        { error: "Key ID is required" },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${BACK_API_URL}/api/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return json<ActionData>(
          { error: "Failed to revoke API key" },
          { status: 400 }
        );
      }

      return redirect("/admin/api-keys");
    } catch (error) {
      console.error("Error revoking API key:", error);
      return json<ActionData>(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  return json<ActionData>(
    { error: "Invalid action" },
    { status: 400 }
  );
}

export default function ApiKeys() {
  const { apiKeys, clients } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  // Show modal when API key is created
  const createdApiKey = actionData?.success ? actionData.apiKey : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? "Cancel" : "Generate New API Key"}
        </button>
      </div>

      {/* Success/Error Messages */}
      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {actionData.error}
        </div>
      )}

      {/* API Key Created Modal */}
      {createdApiKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-green-600">
              ✓ API Key Created Successfully!
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ Important: Save this API key now - it will not be shown again!
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdApiKey.key}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdApiKey.key);
                    alert("API key copied to clipboard!");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>Client ID:</strong> {createdApiKey.client_id}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Key Name:</strong> {createdApiKey.name}
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(false);
                window.location.reload();
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && !createdApiKey && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Generate New API Key</h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="_action" value="create" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OAuth Client *
              </label>
              <select
                name="client_id"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a client...</option>
                {clients
                  .filter((client) => client.is_active)
                  .map((client) => (
                    <option key={client.id} value={client.client_id}>
                      {client.client_name} ({client.client_id})
                    </option>
                  ))}
              </select>
              {clients.filter((c) => c.is_active).length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  No active OAuth clients. Create one first in the OAuth Clients page.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Production API Key"
              />
              <p className="text-xs text-gray-500 mt-1">
                A descriptive name to help you identify this key
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration
              </label>
              <select
                name="expires_in_days"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="never">Never expires</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                API Key Usage
              </h3>
              <p className="text-sm text-blue-800">
                Use this API key to authenticate backend-to-backend API calls to
                access user data. Include it in the Authorization header:
              </p>
              <code className="block mt-2 text-xs bg-blue-100 p-2 rounded">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || clients.filter((c) => c.is_active).length === 0}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? "Generating..." : "Generate API Key"}
            </button>
          </Form>
        </div>
      )}

      {/* API Keys Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Key Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Used
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No API keys found. Generate one to get started.
                </td>
              </tr>
            ) : (
              apiKeys.map((apiKey) => (
                <tr key={apiKey.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {apiKey.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {apiKey.client_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {apiKey.client_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        apiKey.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {apiKey.is_active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {apiKey.last_used_at
                      ? new Date(apiKey.last_used_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {apiKey.expires_at ? (
                      <>
                        {new Date(apiKey.expires_at).toLocaleDateString()}
                        {new Date(apiKey.expires_at) < new Date() && (
                          <span className="ml-2 text-red-600 font-semibold">
                            (Expired)
                          </span>
                        )}
                      </>
                    ) : (
                      "Never"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(apiKey.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {apiKey.is_active && (
                      <Form method="post" className="inline">
                        <input type="hidden" name="_action" value="revoke" />
                        <input type="hidden" name="key_id" value={apiKey.id} />
                        <button
                          type="submit"
                          onClick={(e) => {
                            if (
                              !confirm(
                                "Are you sure you want to revoke this API key? This action cannot be undone."
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Revoke
                        </button>
                      </Form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">About API Keys</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <strong>API keys</strong> are used for backend-to-backend authentication
            when your external application needs to access user data from the
            tools-dashboard API.
          </p>
          <p>
            Unlike OAuth access tokens (which are user-specific and short-lived),
            API keys are client-specific and can be long-lived. They're ideal for
            server-side operations.
          </p>
          <p className="text-blue-600">
            <strong>Security Best Practices:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Store API keys securely in environment variables</li>
            <li>Never commit API keys to version control</li>
            <li>Rotate keys regularly (use expiration)</li>
            <li>Revoke keys immediately if compromised</li>
            <li>Use different keys for development and production</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
