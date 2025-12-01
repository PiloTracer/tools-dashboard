/**
 * OAuth Clients Management Page
 * List and manage OAuth client applications
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";

interface OAuthClient {
  id: string;
  client_id: string;
  client_name: string;
  description: string | null;
  logo_url: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  is_active: boolean;
  created_at: string;
}

interface LoaderData {
  clients: OAuthClient[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const BACK_API_URL = process.env.BACK_API_URL || "http://localhost:8100";

  try {
    // Fetch OAuth clients
    const response = await fetch(`${BACK_API_URL}/api/oauth-clients`);

    if (!response.ok) {
      throw new Error("Failed to fetch OAuth clients");
    }

    const clients: OAuthClient[] = await response.json();

    return json<LoaderData>({ clients });
  } catch (error) {
    console.error("Error loading OAuth clients:", error);
    return json<LoaderData>({ clients: [] });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");

  const BACK_API_URL = process.env.BACK_API_URL || "http://localhost:8100";

  if (action === "create") {
    const clientName = formData.get("client_name");
    const description = formData.get("description");
    const redirectUris = formData.get("redirect_uris");
    const allowedScopes = formData.getAll("allowed_scopes");

    if (!clientName || !redirectUris) {
      return json(
        { error: "Client name and redirect URIs are required" },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${BACK_API_URL}/api/oauth-clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          description: description || null,
          redirect_uris: String(redirectUris).split("\n").filter(Boolean),
          allowed_scopes: allowedScopes.length > 0 ? allowedScopes : ["profile", "email"],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return json({ error: error.message || "Failed to create client" }, { status: 400 });
      }

      const client = await response.json();

      // Show client secret (only shown once!)
      return json({
        success: true,
        client,
        message: "OAuth client created successfully! Save the client secret - it won't be shown again.",
      });
    } catch (error) {
      console.error("Error creating OAuth client:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  if (action === "delete") {
    const clientId = formData.get("client_id");

    if (!clientId) {
      return json({ error: "Client ID is required" }, { status: 400 });
    }

    try {
      const response = await fetch(`${BACK_API_URL}/api/oauth-clients/${clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return json({ error: "Failed to delete client" }, { status: 400 });
      }

      return redirect("/oauth-clients");
    } catch (error) {
      console.error("Error deleting OAuth client:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function OAuthClients() {
  const { clients } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">OAuth Clients</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? "Cancel" : "New OAuth Client"}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New OAuth Client</h2>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="_action" value="create" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                name="client_name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Application"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Application description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redirect URIs * (one per line)
              </label>
              <textarea
                name="redirect_uris"
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="http://localhost:7300/oauth/complete&#10;https://app.example.com/oauth/callback"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Scopes
              </label>
              <div className="space-y-2">
                {["profile", "email", "subscription"].map((scope) => (
                  <label key={scope} className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowed_scopes"
                      value={scope}
                      defaultChecked={scope === "profile" || scope === "email"}
                      className="mr-2"
                    />
                    <span className="text-sm">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? "Creating..." : "Create OAuth Client"}
            </button>
          </Form>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scopes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No OAuth clients found. Create one to get started.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.client_name}</div>
                    {client.description && (
                      <div className="text-sm text-gray-500">{client.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{client.client_id}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {client.allowed_scopes.map((scope) => (
                        <span
                          key={scope}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        client.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(client.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Form method="post" className="inline">
                      <input type="hidden" name="_action" value="delete" />
                      <input type="hidden" name="client_id" value={client.client_id} />
                      <button
                        type="submit"
                        onClick={(e) => {
                          if (!confirm("Are you sure you want to delete this OAuth client?")) {
                            e.preventDefault();
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </Form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
