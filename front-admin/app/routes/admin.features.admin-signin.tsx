import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { AdminSigninForm } from "../features/admin-signin/ui/AdminSigninForm";

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
  console.log("🔐 Admin signin action called");

  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const intent = formData.get("intent");

  console.log("📧 Email:", email);
  console.log("🎯 Intent:", intent);

  // Validate intent
  if (intent !== "admin-signin") {
    console.error("❌ Invalid intent:", intent);
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
    console.error("❌ Field validation errors:", fieldErrors);
    return json<ActionData>({ fieldErrors }, { status: 400 });
  }

  // Call back-auth login endpoint
  const authApiUrl = process.env.AUTH_API_URL || "http://back-auth:8001";
  const loginUrl = `${authApiUrl}/email/login`;

  console.log("🌐 Calling auth API:", loginUrl);

  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    console.log("📡 Auth API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Auth API error:", errorData);

      // Handle specific error cases
      if (response.status === 401) {
        console.error("❌ 401: Invalid credentials");
        return json<ActionData>(
          { formError: "Invalid email or password. Please check your credentials and try again." },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        console.error("❌ 403: Forbidden -", errorData.detail);
        return json<ActionData>(
          { formError: errorData.detail || "Email not verified. Please verify your email before logging in." },
          { status: 403 }
        );
      }

      console.error("❌ Unknown error:", response.status);
      return json<ActionData>(
        { formError: "An error occurred. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("✅ Auth API success, user role:", data.user?.role);

    // CRITICAL: Verify user has admin role
    if (data.user?.role !== "admin") {
      console.error("❌ Access denied: User role is", data.user?.role, "but admin required");
      return json<ActionData>(
        { formError: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    console.log("✅ Admin role verified, redirecting to dashboard");

    // Store tokens in httpOnly cookies and redirect to admin dashboard
    return redirect("/admin/", {
      headers: {
        "Set-Cookie": `admin_session=${data.access_token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`, // 30 minutes
      },
    });
  } catch (error) {
    console.error("💥 Admin signin exception:", error);
    return json<ActionData>(
      { formError: `Failed to connect to authentication service: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * Component: Admin signin page (standalone, no layout)
 */
export default function AdminSigninIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <AdminSigninForm
      csrfToken={loaderData.csrfToken}
      fieldErrors={actionData?.fieldErrors}
      formError={actionData?.formError}
      isSubmitting={isSubmitting}
    />
  );
}
