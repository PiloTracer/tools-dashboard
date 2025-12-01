import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { AdminSigninForm } from "../ui/AdminSigninForm";

type ActionData = {
  fieldErrors?: {
    email?: string;
    password?: string;
  };
  formError?: string;
};

/**
 * Loader: Check if user is already authenticated
 * If authenticated as admin, redirect to dashboard
 * If authenticated but not admin, clear session and show form
 * If not authenticated, show form
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is authenticated
  const cookie = request.headers.get("Cookie");
  const hasSession = cookie?.includes("admin_session");

  // If authenticated, redirect to dashboard
  // Use full path including /admin/ prefix for proper routing through nginx
  if (hasSession) {
    // TODO: Verify session token and check admin role
    return redirect("/admin/");
  }

  // Not authenticated, show signin form
  return json({
    csrfToken: "csrf-token-placeholder", // TODO: Generate real CSRF token
  });
}

/**
 * Action: Handle admin signin form submission
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const intent = formData.get("intent");

  // Validate intent
  if (intent !== "admin-signin") {
    return json<ActionData>(
      { formError: "Invalid form submission" },
      { status: 400 }
    );
  }

  // Validate fields
  const fieldErrors: ActionData["fieldErrors"] = {};

  if (typeof email !== "string" || !email) {
    fieldErrors.email = "Email is required";
  } else if (!email.includes("@")) {
    fieldErrors.email = "Please enter a valid email address";
  }

  if (typeof password !== "string" || !password) {
    fieldErrors.password = "Password is required";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json<ActionData>({ fieldErrors }, { status: 400 });
  }

  // Call back-auth login endpoint
  const authApiUrl = process.env.AUTH_API_URL || "http://back-auth:8001";

  try {
    const response = await fetch(`${authApiUrl}/email/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle specific error cases
      if (response.status === 401) {
        return json<ActionData>(
          { formError: "Invalid email or password" },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return json<ActionData>(
          { formError: errorData.detail || "Email not verified. Please verify your email before logging in." },
          { status: 403 }
        );
      }

      return json<ActionData>(
        { formError: "An error occurred. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();

    // CRITICAL: Verify user has admin role
    if (data.user?.role !== "admin") {
      return json<ActionData>(
        { formError: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    // Store tokens in httpOnly cookies
    // TODO: Implement secure cookie storage using Remix sessions
    // For now, we'll use a simple approach (this should be enhanced in production)

    // Redirect to admin dashboard
    // Use full path including /admin/ prefix for proper routing through nginx
    return redirect("/admin/", {
      headers: {
        "Set-Cookie": `admin_session=${data.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`, // 30 minutes
      },
    });
  } catch (error) {
    console.error("Admin signin error:", error);
    return json<ActionData>(
      { formError: "Failed to connect to authentication service. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Component: Admin signin page
 */
export default function AdminSigninIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <AdminSigninForm
          csrfToken={loaderData.csrfToken}
          fieldErrors={actionData?.fieldErrors}
          formError={actionData?.formError}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
