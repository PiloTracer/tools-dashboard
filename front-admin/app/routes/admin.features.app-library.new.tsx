import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useActionData } from "@remix-run/react";
import { AppForm } from "../features/app-library/ui/AppForm";
import { getAdminApiAuthHeaders } from "../utils/admin-api-auth.server";

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
  const auth = getAdminApiAuthHeaders(request);

  try {
    // Create application via backend API
    const response = await fetch(`${apiUrl}/api/admin/app-library`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...auth,
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
    <div className="mx-auto max-w-3xl space-y-6 px-3 pb-12 pt-2 sm:px-4 lg:px-0">
      <div>
        <Link
          to="/admin/features/app-library"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Application library
        </Link>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create application</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Register an OAuth 2.0 client. You will receive the client secret once; copy it before leaving the next screen.
        </p>
      </div>

      <AppForm mode="create" actionData={actionData} />
    </div>
  );
}
