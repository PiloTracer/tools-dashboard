import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { AppForm } from "../features/app-library/ui/AppForm";

type ActionData = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  appId?: string;
  clientSecret?: string;
};

/**
 * Action: Handle application creation
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

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

  // Parse redirect URIs and scopes (newline-separated)
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

  const apiUrl = process.env.API_URL || "http://back-api:8000";

  try {
    // Create application via backend API
    const response = await fetch(`${apiUrl}/api/admin/app-library`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: Add Authorization header
        // "Authorization": `Bearer ${token}`,
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
    });

    if (!response.ok) {
      const errorData = await response.json();
      return json<ActionData>({
        error: errorData.detail || `Failed to create application: ${response.status}`,
      });
    }

    const data = await response.json();

    // Redirect to the detail page with success message and show client secret
    return redirect(
      `/admin/features/app-library/${data.id}?new=true&secret=${encodeURIComponent(data.client_secret)}`
    );
  } catch (error) {
    console.error("Error creating application:", error);
    return json<ActionData>({
      error: "Failed to create application. Please try again.",
    });
  }
}

export default function NewApplication() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Application
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Register a new OAuth 2.0 application to integrate with the platform
        </p>
      </div>

      {/* Form */}
      <AppForm mode="create" actionData={actionData} />
    </div>
  );
}
