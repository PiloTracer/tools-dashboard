import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useFetcher,
  Link,
  Form,
} from "@remix-run/react";
import { useState } from "react";
import type { App } from "../features/app-library/ui/AppTable";

type LoaderData = {
  app: App;
  accessRule?: any; // Placeholder for access control rules
  newSecret?: string; // Only populated when ?new=true&secret=xxx
};

type ActionData = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

/**
 * Loader: Fetch application details
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const appId = params.appId;

  if (!appId) {
    throw new Response("Application ID is required", { status: 400 });
  }

  const url = new URL(request.url);
  const isNew = url.searchParams.get("new") === "true";
  const secret = url.searchParams.get("secret");

  const apiUrl = process.env.API_URL || "http://back-api:8000";

  try {
    // Fetch app details
    const response = await fetch(`${apiUrl}/api/admin/app-library/${appId}`, {
      headers: {
        // TODO: Add Authorization header with admin JWT token
        // "Authorization": `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      throw new Response("Application not found", { status: 404 });
    }

    if (!response.ok) {
      throw new Response("Failed to fetch application", {
        status: response.status,
      });
    }

    const data = await response.json();

    // TODO: Fetch access rules when implemented
    // const accessRuleResponse = await fetch(`${apiUrl}/api/admin/app-library/${appId}/access-rules`);
    // const accessRule = accessRuleResponse.ok ? await accessRuleResponse.json() : null;

    return json<LoaderData>({
      app: data.app,
      accessRule: data.access_rule || undefined,
      newSecret: isNew && secret ? secret : undefined,
    });
  } catch (error) {
    console.error("Error fetching application:", error);
    throw error;
  }
}

/**
 * Action: Handle application updates, secret regeneration, status toggle, and deletion
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const appId = params.appId;

  if (!appId) {
    return json<ActionData>(
      { error: "Application ID is required" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const _action = formData.get("_action")?.toString();

  const apiUrl = process.env.API_URL || "http://back-api:8000";

  try {
    switch (_action) {
      case "update": {
        // Update application details
        const client_name = formData.get("client_name")?.toString();
        const description = formData.get("description")?.toString() || null;
        const logo_url = formData.get("logo_url")?.toString() || null;
        const dev_url = formData.get("dev_url")?.toString();
        const prod_url = formData.get("prod_url")?.toString() || null;
        const redirect_uris_raw = formData.get("redirect_uris")?.toString();
        const allowed_scopes_raw = formData.get("allowed_scopes")?.toString();
        const is_active = formData.get("is_active") === "on";

        // Validation
        const fieldErrors: Record<string, string> = {};

        if (!client_name) {
          fieldErrors.client_name = "Application name is required";
        }

        if (!dev_url) {
          fieldErrors.dev_url = "Development URL is required";
        }

        if (!redirect_uris_raw) {
          fieldErrors.redirect_uris = "At least one redirect URI is required";
        }

        if (Object.keys(fieldErrors).length > 0) {
          return json<ActionData>({ fieldErrors });
        }

        // Parse redirect URIs and scopes
        const redirect_uris = redirect_uris_raw!
          .split("\n")
          .map((uri) => uri.trim())
          .filter((uri) => uri.length > 0);

        const allowed_scopes = allowed_scopes_raw
          ? allowed_scopes_raw
              .split("\n")
              .map((scope) => scope.trim())
              .filter((scope) => scope.length > 0)
          : ["profile", "email"];

        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              // TODO: Add Authorization header
            },
            body: JSON.stringify({
              client_name,
              description,
              logo_url,
              dev_url,
              prod_url,
              redirect_uris,
              allowed_scopes,
              is_active,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail || `Failed to update application: ${response.status}`,
          });
        }

        return json<ActionData>({ success: true });
      }

      case "regenerate_secret": {
        // Regenerate client secret
        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}/regenerate-secret`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // TODO: Add Authorization header
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail ||
              `Failed to regenerate secret: ${response.status}`,
          });
        }

        const data = await response.json();
        // Redirect to show the new secret
        return redirect(
          `/admin/features/app-library/${appId}?new=true&secret=${encodeURIComponent(data.client_secret)}`
        );
      }

      case "toggle_status": {
        // Toggle active status
        const currentStatus = formData.get("current_status") === "true";
        const newStatus = !currentStatus;

        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              // TODO: Add Authorization header
            },
            body: JSON.stringify({
              is_active: newStatus,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail || `Failed to toggle status: ${response.status}`,
          });
        }

        return json<ActionData>({ success: true });
      }

      case "delete": {
        // Soft delete application
        const response = await fetch(
          `${apiUrl}/api/admin/app-library/${appId}`,
          {
            method: "DELETE",
            headers: {
              // TODO: Add Authorization header
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          return json<ActionData>({
            error:
              errorData.detail ||
              `Failed to delete application: ${response.status}`,
          });
        }

        // Redirect to app library index
        return redirect("/admin/features/app-library");
      }

      default:
        return json<ActionData>(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error performing action:", error);
    return json<ActionData>(
      { error: "Network error. Please try again." },
      { status: 500 }
    );
  }
}

export default function AppLibraryDetail() {
  const { app, newSecret } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [activeTab, setActiveTab] = useState<
    "overview" | "details" | "oauth" | "access"
  >("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);
  const statusFetcher = useFetcher();

  const copyToClipboard = async (text: string, type: "secret" | "clientId") => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
          if (type === "secret") {
            setSecretCopied(true);
            setTimeout(() => setSecretCopied(false), 2000);
          } else {
            setClientIdCopied(true);
            setTimeout(() => setClientIdCopied(false), 2000);
          }
        } finally {
          document.body.removeChild(textArea);
        }
        return;
      }

      await navigator.clipboard.writeText(text);
      if (type === "secret") {
        setSecretCopied(true);
        setTimeout(() => setSecretCopied(false), 2000);
      } else {
        setClientIdCopied(true);
        setTimeout(() => setClientIdCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard. Please copy manually.");
    }
  };

  const maskSecret = (secret: string) => {
    return "*".repeat(secret.length - 8) + secret.slice(-8);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isActive =
    statusFetcher.formData?.get("current_status") === "false"
      ? true
      : statusFetcher.formData?.get("current_status") === "true"
      ? false
      : app.is_active;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/admin/features/app-library"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 mb-3 inline-block"
        >
          ← Back to Application Library
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {app.logo_url ? (
              <img
                src={app.logo_url}
                alt={app.client_name}
                className="h-16 w-16 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-2xl font-semibold">
                  {app.client_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {app.client_name}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {app.description || "No description provided"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* New App Secret Alert */}
      {newSecret && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Save your client secret now! This is the only time it will be shown.
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <div className="flex items-center gap-3">
                  <code className="bg-yellow-100 px-3 py-2 rounded font-mono text-xs flex-1">
                    {newSecret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newSecret, "secret")}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    {secretCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {actionData?.error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {actionData.error}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {actionData?.success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Application updated successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "overview", label: "Overview" },
              { id: "details", label: "Details" },
              { id: "oauth", label: "OAuth Configuration" },
              { id: "access", label: "Access Control" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Credentials Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                OAuth Credentials
              </h3>
              <dl className="grid grid-cols-1 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">
                    Client ID
                  </dt>
                  <dd className="flex items-center gap-3">
                    <code className="flex-1 bg-gray-50 px-4 py-2 rounded border border-gray-200 font-mono text-sm">
                      {app.client_id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(app.client_id, "clientId")}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {clientIdCopied ? "Copied!" : "Copy"}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">
                    Client Secret
                  </dt>
                  <dd className="flex items-center gap-3">
                    <code className="flex-1 bg-gray-50 px-4 py-2 rounded border border-gray-200 font-mono text-sm text-gray-400">
                      {maskSecret(app.client_id)}
                    </code>
                    <button
                      onClick={() => setShowRegenerateModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Regenerate
                    </button>
                  </dd>
                  <p className="mt-2 text-xs text-gray-500">
                    The client secret is hidden for security. Click regenerate to create a new secret.
                  </p>
                </div>
              </dl>
            </div>

            {/* Metadata Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Application Metadata
              </h3>
              <dl className="grid grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    Application ID
                  </dt>
                  <dd className="text-sm text-gray-900">{app.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    Status
                  </dt>
                  <dd>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    Created At
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {formatDate(app.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    Last Updated
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {formatDate(app.updated_at)}
                  </dd>
                </div>
                {app.deleted_at && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-red-500 mb-1">
                      Deleted At
                    </dt>
                    <dd className="text-sm text-red-900">
                      {formatDate(app.deleted_at)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="bg-white shadow rounded-lg p-6">
            {!isEditing ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Application Details
                  </h3>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Details
                  </button>
                </div>
                <dl className="grid grid-cols-1 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">
                      Application Name
                    </dt>
                    <dd className="text-sm text-gray-900">{app.client_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">
                      Description
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {app.description || "No description provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">
                      Logo URL
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {app.logo_url || "No logo URL"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">
                      Development URL
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {app.dev_url || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">
                      Production URL
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {app.prod_url || "Not set"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <Form method="post" onSubmit={() => setIsEditing(false)}>
                <input type="hidden" name="_action" value="update" />
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Edit Application Details
                  </h3>

                  {/* Application Name */}
                  <div>
                    <label
                      htmlFor="client_name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Application Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      id="client_name"
                      required
                      defaultValue={app.client_name}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {actionData?.fieldErrors?.client_name && (
                      <p className="mt-2 text-sm text-red-600">
                        {actionData.fieldErrors.client_name}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      defaultValue={app.description || ""}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Brief description of the application..."
                    />
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label
                      htmlFor="logo_url"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Logo URL
                    </label>
                    <input
                      type="url"
                      name="logo_url"
                      id="logo_url"
                      defaultValue={app.logo_url || ""}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  {/* Development URL */}
                  <div>
                    <label
                      htmlFor="dev_url"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Development URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      name="dev_url"
                      id="dev_url"
                      required
                      defaultValue={app.dev_url || ""}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="http://localhost:3000"
                    />
                  </div>

                  {/* Production URL */}
                  <div>
                    <label
                      htmlFor="prod_url"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Production URL
                    </label>
                    <input
                      type="url"
                      name="prod_url"
                      id="prod_url"
                      defaultValue={app.prod_url || ""}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="https://app.example.com"
                    />
                  </div>

                  {/* Redirect URIs */}
                  <div>
                    <label
                      htmlFor="redirect_uris"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Redirect URIs <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="redirect_uris"
                      id="redirect_uris"
                      rows={4}
                      required
                      defaultValue={app.redirect_uris.join("\n")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      One URI per line
                    </p>
                  </div>

                  {/* Allowed Scopes */}
                  <div>
                    <label
                      htmlFor="allowed_scopes"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Allowed Scopes
                    </label>
                    <textarea
                      name="allowed_scopes"
                      id="allowed_scopes"
                      rows={3}
                      defaultValue={app.allowed_scopes.join("\n")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      One scope per line
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={app.is_active}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">
                        Active (Users can access this application)
                      </span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </div>
        )}

        {/* OAuth Configuration Tab */}
        {activeTab === "oauth" && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              OAuth Configuration
            </h3>
            <dl className="grid grid-cols-1 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-2">
                  Redirect URIs
                </dt>
                <dd className="space-y-2">
                  {app.redirect_uris.map((uri, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 px-4 py-2 rounded border border-gray-200 font-mono text-sm"
                    >
                      {uri}
                    </div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-2">
                  Allowed Scopes
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {app.allowed_scopes.map((scope, index) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                    >
                      {scope}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Access Control Tab */}
        {activeTab === "access" && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Access Control Rules
            </h3>
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Access Control Coming Soon
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure who can access this application based on roles, permissions, or custom rules.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
        <div className="space-y-4">
          {/* Toggle Status */}
          <div className="flex items-center justify-between py-4 border-b">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Application Status
              </h4>
              <p className="text-sm text-gray-500">
                {isActive
                  ? "Application is currently active and accessible to users"
                  : "Application is currently inactive and not accessible to users"}
              </p>
            </div>
            <statusFetcher.Form method="post">
              <input type="hidden" name="_action" value="toggle_status" />
              <input
                type="hidden"
                name="current_status"
                value={isActive.toString()}
              />
              <button
                type="submit"
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  isActive
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-green-600 hover:bg-green-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {isActive ? "Deactivate" : "Activate"}
              </button>
            </statusFetcher.Form>
          </div>

          {/* Delete Application */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Delete Application
              </h4>
              <p className="text-sm text-gray-500">
                Permanently delete this application and all associated data
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Application
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowDeleteModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Delete Application
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete "{app.client_name}"? This action cannot be undone. All OAuth tokens and authorizations for this application will be revoked.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <Form method="post">
                  <input type="hidden" name="_action" value="delete" />
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Delete
                  </button>
                </Form>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Secret Confirmation Modal */}
      {showRegenerateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowRegenerateModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Regenerate Client Secret
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to regenerate the client secret? The old secret will be invalidated immediately and all applications using it will need to be updated with the new secret.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <Form method="post">
                  <input type="hidden" name="_action" value="regenerate_secret" />
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Regenerate Secret
                  </button>
                </Form>
                <button
                  type="button"
                  onClick={() => setShowRegenerateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
